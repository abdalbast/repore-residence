#!/usr/bin/env python3
"""Capture the exact image variants negotiated by the reference CDN."""

import argparse
import hashlib
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from http.client import HTTPException
from urllib.request import Request, urlopen

from audit_reference import REFERENCE, ROOT, RUNTIME_DIRECTORIES

ACCEPT = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg", ".gif"}
MIME_EXTENSIONS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/avif": ".avif",
    "image/svg+xml": ".svg",
    "image/gif": ".gif",
}


def capture(path):
    relative = path.relative_to(ROOT).as_posix()
    with path.open("rb") as stream:
        original_hash = hashlib.file_digest(stream, "sha256").hexdigest()
    result = {
        "path": relative,
        "url": REFERENCE + relative,
        "original_sha256": original_hash,
    }
    try:
        request = Request(
            result["url"],
            headers={"Accept": ACCEPT, "Accept-Encoding": "identity"},
        )
        with urlopen(request, timeout=25) as response:
            result["status"] = response.status
            result["content_type"] = response.headers.get_content_type()
            data = response.read()
        result["bytes"] = len(data)
        result["sha256"] = hashlib.sha256(data).hexdigest()
        result["same_as_original"] = result["sha256"] == original_hash
        if not result["same_as_original"]:
            extension = MIME_EXTENSIONS[result["content_type"]]
            variant = ROOT / "browser-variants" / (relative + extension)
            variant.parent.mkdir(parents=True, exist_ok=True)
            variant.write_bytes(data)
            result["variant"] = variant.relative_to(ROOT).as_posix()
    except (OSError, HTTPException, KeyError) as error:
        result["error"] = str(error)
    result["checked_at"] = datetime.now(UTC).isoformat()
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()
    files = []
    for directory in RUNTIME_DIRECTORIES:
        files.extend(
            sorted(
                path
                for path in (ROOT / directory).rglob("*")
                if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
            )
        )
    report_path = ROOT / "verification" / "browser-image-variants.json"
    results = {}
    if args.resume and report_path.exists():
        previous = json.loads(report_path.read_text())
        results = {
            item["path"]: item for item in previous["files"] if "error" not in item
        }

    def save():
        report = {
            "reference": REFERENCE,
            "accept": ACCEPT,
            "expected_images": len(files),
            "checked_images": len(results),
            "variant_images": sum("variant" in item for item in results.values()),
            "errors": sum("error" in item for item in results.values()),
            "files": sorted(results.values(), key=lambda item: item["path"]),
        }
        temporary = report_path.with_suffix(".json.tmp")
        try:
            temporary.write_text(json.dumps(report, indent=2) + "\n")
            temporary.replace(report_path)
        finally:
            temporary.unlink(missing_ok=True)
        return report

    pending = [
        path for path in files if path.relative_to(ROOT).as_posix() not in results
    ]
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(capture, path) for path in pending]
        for index, future in enumerate(as_completed(futures), start=1):
            result = future.result()
            results[result["path"]] = result
            if "error" in result:
                print(json.dumps(result), flush=True)
            if index % 25 == 0:
                report = save()
                print(
                    f"Checked {report['checked_images']}/{len(files)} images; "
                    f"captured {report['variant_images']} CDN variants.",
                    flush=True,
                )
    report = save()
    print(
        f"Final: {report['checked_images']}/{len(files)} checked; "
        f"{report['variant_images']} variants; {report['errors']} errors.",
        flush=True,
    )
    if report["errors"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
