#!/usr/bin/env python3
"""Serve the supplied site locally, including seekable MP4 responses."""

import argparse
import hashlib
import json
import re
from datetime import UTC
from email.utils import parsedate_to_datetime
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import ClassVar
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
PUBLIC_DIRECTORIES = {"assets", "floor-explorer", "models"}


def load_browser_variants():
    manifest = ROOT / "verification" / "browser-image-variants.json"
    if not manifest.exists():
        return {}
    report = json.loads(manifest.read_text())
    return {
        item["path"]: item
        for item in report["files"]
        if "variant" in item and "error" not in item
    }


BROWSER_VARIANTS = load_browser_variants()
REFERENCE_REPORT = ROOT / "verification" / "full-live-reference.json"
REFERENCE_CONTENT_TYPES = (
    {
        item["path"]: item["content_type"]
        for item in json.loads(REFERENCE_REPORT.read_text())["files"]
        if "content_type" in item
    }
    if REFERENCE_REPORT.exists()
    else {}
)
RESPONSE_METADATA_PATH = ROOT / "verification" / "reference-response-metadata.json"
RESPONSE_METADATA = (
    {
        (item["path"], item["representation"]): item["headers"]
        for item in json.loads(RESPONSE_METADATA_PATH.read_text())["files"]
        if item.get("status") == HTTPStatus.OK and "error" not in item
    }
    if RESPONSE_METADATA_PATH.exists()
    else {}
)
CUSTOMIZED_HASHES = (
    {
        item["path"]: digest
        for item in json.loads(RESPONSE_METADATA_PATH.read_text())["files"]
        if item.get("representation") == "original"
        and Path(item["path"]).suffix in {".html", ".js", ".css", ".json"}
        and (ROOT / item["path"]).is_file()
        and (digest := hashlib.sha256((ROOT / item["path"]).read_bytes()).hexdigest())
        != item.get("sha256")
    }
    if RESPONSE_METADATA_PATH.exists()
    else {}
)
ENCODINGS_PATH = ROOT / "verification" / "content-encodings.json"
CONTENT_ENCODINGS = (
    {
        (item["path"], item["encoding"]): item
        for item in json.loads(ENCODINGS_PATH.read_text())["files"]
        if "variant" in item and "error" not in item
    }
    if ENCODINGS_PATH.exists()
    else {}
)


def choose_encoding(header, resource_path):
    qualities = {}
    for entry in header.lower().split(","):
        coding, *parameters = entry.strip().split(";")
        quality = next(
            (part.strip()[2:] for part in parameters if part.strip().startswith("q=")),
            "1",
        )
        try:
            qualities[coding] = float(quality)
        except ValueError:
            continue
    candidates = [
        (qualities.get(coding, qualities.get("*", 0)), coding == "br", coding)
        for coding in ("br", "gzip")
        if (resource_path, coding) in CONTENT_ENCODINGS
    ]
    best = max(candidates, default=(0, False, None))
    if qualities.get("identity", 0) > best[0]:
        return None
    return best[2] if best[0] > 0 else None


def http_date(value):
    if not value:
        return None
    try:
        parsed = parsedate_to_datetime(value)
        return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed
    except (TypeError, ValueError, OverflowError):
        return None


def unchanged(headers, metadata):
    tags = headers.get("If-None-Match")
    if tags is not None:
        if tags.strip() == "*":
            return True
        current = metadata.get("ETag")
        return bool(current) and any(
            tag.removeprefix("W/") == current.removeprefix("W/")
            for tag in re.findall(r'(?:W/)?"[^"\r\n]*"', tags)
        )
    since = http_date(headers.get("If-Modified-Since"))
    modified = http_date(metadata.get("Last-Modified"))
    return since is not None and modified is not None and modified <= since


def range_validator_matches(value, metadata):
    if not value:
        return True
    value = value.strip()
    if value.startswith(('"', 'W/"')):
        return not value.startswith("W/") and value == metadata.get("ETag")
    date = http_date(value)
    modified = http_date(metadata.get("Last-Modified"))
    return date is not None and modified is not None and date == modified


def accepted_image_types(header):
    accepted = set()
    for entry in header.lower().split(","):
        media_type, *parameters = entry.strip().split(";")
        quality = next(
            (part.strip()[2:] for part in parameters if part.strip().startswith("q=")),
            "1",
        )
        try:
            if float(quality) > 0:
                accepted.add(media_type)
        except ValueError:
            continue
    return accepted


class Handler(SimpleHTTPRequestHandler):
    extensions_map: ClassVar[dict[str, str]] = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".json": "application/json",
        ".webp": "image/webp",
        ".avif": "image/avif",
        ".woff2": "font/woff2",
        ".glb": "model/gltf-binary",
        ".mp4": "video/mp4",
    }

    def send_cache_headers(self, metadata, negotiated, encoded=False):
        cache_control = metadata.get("Cache-Control") if metadata else "no-cache"
        if cache_control:
            self.send_header("Cache-Control", cache_control)
        for name in ("ETag", "Last-Modified"):
            if metadata.get(name):
                self.send_header(name, metadata[name])
        vary = [
            part.strip()
            for part in (metadata.get("Vary") or "").split(",")
            if part.strip()
        ]
        if negotiated and not any(part.lower() == "accept" for part in vary):
            vary.append("Accept")
        if encoded and not any(part.lower() == "accept-encoding" for part in vary):
            vary.append("Accept-Encoding")
        if vary:
            self.send_header("Vary", ", ".join(vary))

    def send_head(self):
        request_path = unquote(urlsplit(self.path).path)
        path = Path(self.translate_path(self.path)).resolve()
        try:
            relative = path.relative_to(ROOT)
        except ValueError:
            self.send_error(HTTPStatus.NOT_FOUND)
            return None
        if request_path in ("/", "/index.html"):
            path = ROOT / "index.html"
        elif (
            not relative.parts
            or relative.parts[0] not in PUBLIC_DIRECTORIES
            or not path.is_file()
        ):
            self.send_error(HTTPStatus.NOT_FOUND)
            return None

        resource_path = path.relative_to(ROOT).as_posix()
        content_type = REFERENCE_CONTENT_TYPES.get(
            resource_path, self.guess_type(str(path))
        )
        variant = BROWSER_VARIANTS.get(resource_path)
        representation = "original"
        accepted = accepted_image_types(self.headers.get("Accept", ""))
        if variant and variant["content_type"] in accepted:
            variant_path = (ROOT / variant["variant"]).resolve()
            if variant_path.is_relative_to(ROOT / "browser-variants"):
                path = variant_path
                content_type = variant["content_type"]
                representation = "browser"

        metadata = RESPONSE_METADATA.get((resource_path, representation), {})
        if resource_path in CUSTOMIZED_HASHES:
            metadata = {
                "Cache-Control": "no-cache",
                "ETag": f'"{CUSTOMIZED_HASHES[resource_path]}"',
            }
        encoding = (
            choose_encoding(self.headers.get("Accept-Encoding", ""), resource_path)
            if representation == "original" and resource_path not in CUSTOMIZED_HASHES
            else None
        )
        if encoding:
            encoded = CONTENT_ENCODINGS[(resource_path, encoding)]
            encoded_path = (ROOT / encoded["variant"]).resolve()
            if encoded_path.is_relative_to(ROOT / "content-encodings"):
                path = encoded_path
                metadata = encoded["headers"]
            else:
                encoding = None

        try:
            size = path.stat().st_size
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND)
            return None

        if unchanged(self.headers, metadata):
            self.send_response(HTTPStatus.NOT_MODIFIED)
            self.send_cache_headers(metadata, bool(variant), bool(encoding))
            self.end_headers()
            return None

        start, end = 0, size - 1
        byte_range = self.headers.get("Range") if self.command == "GET" else None
        if byte_range and not range_validator_matches(
            self.headers.get("If-Range"), metadata
        ):
            byte_range = None
        if byte_range:
            match = re.fullmatch(r"bytes=(\d*)-(\d*)", byte_range)
            if match and any(match.groups()):
                first, last = match.groups()
                if first:
                    start = int(first)
                    end = min(int(last), end) if last else end
                else:
                    start = max(0, size - int(last))
                if start > end or start >= size:
                    self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.send_header("Content-Length", "0")
                    self.send_cache_headers(metadata, bool(variant), bool(encoding))
                    self.end_headers()
                    return None
            else:
                # Ignore unsupported multi-range or malformed headers.
                byte_range = None

        try:
            stream = path.open("rb")
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND)
            return None

        length = end - start + 1
        self.send_response(HTTPStatus.PARTIAL_CONTENT if byte_range else HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        if encoding:
            self.send_header("Content-Encoding", encoding)
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_cache_headers(metadata, bool(variant), bool(encoding))
        if byte_range:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        stream.seek(start)
        self.response_bytes = length
        return stream

    def copyfile(self, source, outputfile):
        remaining = self.response_bytes
        while remaining:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            try:
                outputfile.write(chunk)
            except (BrokenPipeError, ConnectionResetError):
                break
            remaining -= len(chunk)

    def log_message(self, format_string, *args):
        if args and str(args[1] if len(args) > 1 else "").startswith(("4", "5")):
            super().log_message(format_string, *args)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("port", nargs="?", type=int, default=4173)
    args = parser.parse_args()
    handler = partial(Handler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    server.daemon_threads = True
    print(f"Reposé Residence: http://127.0.0.1:{args.port}/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
