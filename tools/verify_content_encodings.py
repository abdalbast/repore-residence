#!/usr/bin/env python3
"""Verify encoded HTTP bodies, decoded originals and encoding negotiation."""

import argparse
import hashlib
import json
import subprocess
from datetime import UTC, datetime
from http.client import HTTPConnection
from urllib.parse import urlsplit

from audit_reference import ROOT
from capture_content_encodings import DECODE_SCRIPT


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:4173")
    args = parser.parse_args()
    address = urlsplit(args.url)
    manifest = json.loads(
        (ROOT / "verification" / "content-encodings.json").read_text()
    )
    if (
        manifest["checked_profiles"] != manifest["expected_profiles"]
        or manifest["errors"]
    ):
        raise SystemExit("Reference encoding capture is incomplete")
    errors, checks = [], []

    def request(path, headers, method="GET"):
        connection = HTTPConnection(address.hostname, address.port, timeout=10)
        try:
            connection.request(method, "/" + path, headers=headers)
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    for item in manifest["files"]:
        status, headers, body = request(
            item["path"], {"Accept-Encoding": item["encoding"]}
        )
        expected = item["headers"]
        passed = status == 200 and hashlib.sha256(body).hexdigest() == item["sha256"]
        passed = passed and all(
            headers.get(name) == expected.get(name)
            for name in (
                "Content-Encoding",
                "Content-Type",
                "ETag",
                "Last-Modified",
                "Cache-Control",
            )
        )
        passed = passed and "accept-encoding" in headers.get("Vary", "").lower()
        if not passed:
            errors.append(
                f"Encoded response mismatch: {item['path']} ({item['encoding']})"
            )
        decoded = (
            subprocess.run(
                ["node", "--input-type=module", "-e", DECODE_SCRIPT, item["encoding"]],
                input=body,
                capture_output=True,
                check=True,
            )
            .stdout.decode()
            .strip()
        )
        if decoded != item["original_sha256"]:
            errors.append(
                f"Decoded response mismatch: {item['path']} ({item['encoding']})"
            )
        status, headers, body = request(
            item["path"], {"Accept-Encoding": item["encoding"]}, "HEAD"
        )
        if (
            status != 200
            or body
            or int(headers.get("Content-Length", "0")) != item["bytes"]
        ):
            errors.append(f"Encoded HEAD mismatch: {item['path']} ({item['encoding']})")
        status, _, body = request(
            item["path"],
            {"Accept-Encoding": item["encoding"], "If-None-Match": expected["ETag"]},
        )
        if status != 304 or body:
            errors.append(
                f"Encoded revalidation mismatch: {item['path']} ({item['encoding']})"
            )

    path = "assets/index-Bez0Vhn_.js"
    original = (ROOT / path).read_bytes()
    for accept, encoding in (
        ("gzip, deflate, br, zstd", "br"),
        ("gzip;q=1,br;q=0.5", "gzip"),
        ("br;q=0,gzip", "gzip"),
        ("br;q=0,gzip;q=0", None),
        ("identity;q=1,br;q=0.5", None),
        ("*;q=1,br;q=0", "gzip"),
        ("br;q=invalid,gzip", "gzip"),
    ):
        status, headers, body = request(path, {"Accept-Encoding": accept})
        passed = status == 200 and headers.get("Content-Encoding") == encoding
        if encoding is None:
            passed = passed and body == original
        checks.append(
            {
                "accept_encoding": accept,
                "encoding": headers.get("Content-Encoding"),
                "passed": passed,
            }
        )
        if not passed:
            errors.append("Negotiation: " + accept)
    status, _, _ = request("content-encodings/" + path + ".br", {})
    if status != 404:
        errors.append("Encoded storage must remain private")

    report = {
        "checked_at": datetime.now(UTC).isoformat(),
        "url": args.url,
        "encoded_profiles_checked": len(manifest["files"]),
        "get_head_revalidation_checks": len(manifest["files"]) * 3,
        "negotiation_checks": checks,
        "private_storage_checked": True,
        "errors": errors,
    }
    (ROOT / "verification" / "content-encoding-checks.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    if errors:
        raise SystemExit("\n".join(errors))
    print(
        f"Verified {len(manifest['files'])} encoded bodies and decoded originals, HEAD/revalidation, {len(checks)} negotiation cases and private storage."
    )


if __name__ == "__main__":
    main()
