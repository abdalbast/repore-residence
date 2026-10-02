#!/usr/bin/env python3
"""Preserve exact reference Brotli/gzip bodies and verify their decoded bytes."""

import hashlib
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from http.client import HTTPException
from urllib.request import Request, urlopen

from audit_reference import REFERENCE, ROOT
from capture_browser_variants import ACCEPT
from capture_response_metadata import HEADERS

REPORT_PATH = ROOT / "verification" / "content-encodings.json"
DECODE_SCRIPT = """
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const body = readFileSync(0);
const coding = process.argv[1];
const decoded = coding === 'br' ? brotliDecompressSync(body) : gunzipSync(body);
console.log(createHash('sha256').update(decoded).digest('hex'));
"""


def capture(item, requested_encoding):
    result = {
        "path": item["path"],
        "url": item["url"],
        "requested_encoding": requested_encoding,
        "original_sha256": item["sha256"],
    }
    request = Request(
        item["url"],
        headers={"Accept": ACCEPT, "Accept-Encoding": requested_encoding},
    )
    try:
        with urlopen(request, timeout=25) as response:
            result["status"] = response.status
            result["headers"] = {name: response.headers.get(name) for name in HEADERS}
            body = response.read()
        encoding = result["headers"]["Content-Encoding"]
        result["encoding"] = encoding
        result["bytes"] = len(body)
        result["sha256"] = hashlib.sha256(body).hexdigest()
        if encoding in ("br", "gzip"):
            decoded = subprocess.run(
                ["node", "--input-type=module", "-e", DECODE_SCRIPT, encoding],
                input=body,
                capture_output=True,
                check=True,
            )
            result["decoded_sha256"] = decoded.stdout.decode().strip()
        elif encoding is None:
            result["decoded_sha256"] = result["sha256"]
        else:
            raise ValueError(f"Unexpected content encoding: {encoding}")
        if result["decoded_sha256"] != item["sha256"]:
            raise ValueError("Decoded reference content no longer matches the original")
        if encoding:
            path = ROOT / "content-encodings" / f"{item['path']}.{encoding}"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(body)
            result["variant"] = path.relative_to(ROOT).as_posix()
    except (OSError, HTTPException, ValueError, subprocess.CalledProcessError) as error:
        result["error"] = str(error)
    result["checked_at"] = datetime.now(UTC).isoformat()
    return result


def main():
    source = json.loads(
        (ROOT / "verification" / "reference-response-metadata.json").read_text()
    )
    files = [
        item
        for item in source["files"]
        if item["representation"] == "original"
        and "accept-encoding" in (item["headers"].get("Vary") or "").lower()
    ]
    results = []
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [
            executor.submit(capture, item, encoding)
            for item in files
            for encoding in ("br", "gzip")
        ]
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            if "error" in result:
                print(json.dumps(result), flush=True)
    report = {
        "reference": REFERENCE,
        "expected_profiles": len(files) * 2,
        "checked_profiles": len(results),
        "encoded_variants": sum("variant" in item for item in results),
        "errors": sum("error" in item for item in results),
        "files": sorted(
            results, key=lambda item: (item["path"], item["requested_encoding"])
        ),
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n")
    print(
        f"Captured {report['encoded_variants']} encoded variants from {len(results)} profiles; {report['errors']} errors."
    )
    if report["errors"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
