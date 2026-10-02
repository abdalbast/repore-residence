#!/usr/bin/env python3
"""Check reference cache metadata, conditional requests and seekable delivery."""

import argparse
import json
from datetime import UTC, datetime
from http.client import HTTPConnection
from urllib.parse import urlsplit

from audit_reference import ROOT
from capture_browser_variants import ACCEPT


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:4173")
    args = parser.parse_args()
    address = urlsplit(args.url)
    manifest = json.loads(
        (ROOT / "verification" / "reference-response-metadata.json").read_text()
    )
    profiles = {
        (item["path"], item["representation"]): item for item in manifest["files"]
    }
    negotiated = {
        path for path, representation in profiles if representation == "browser"
    }
    errors = []
    checks = []
    if (
        len(profiles) != manifest["expected_profiles"]
        or manifest["checked_profiles"] != manifest["expected_profiles"]
        or manifest["errors"]
    ):
        raise SystemExit("Reference metadata capture is incomplete")

    def request(path, headers=None, method="GET"):
        connection = HTTPConnection(address.hostname, address.port, timeout=10)
        try:
            connection.request(method, "/" + path, headers=headers or {})
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    for item in profiles.values():
        status, headers, body = request(
            item["path"],
            {"Accept": ACCEPT if item["representation"] == "browser" else "*/*"},
            "HEAD",
        )
        expected = item["headers"]
        if status != 200 or body:
            errors.append(f"HEAD failed: {item['path']} ({item['representation']})")
        for name in ("Content-Type", "Cache-Control", "ETag", "Last-Modified"):
            if headers.get(name) != expected.get(name):
                errors.append(
                    f"{name} mismatch: {item['path']} ({item['representation']})"
                )
        vary = {
            part.strip().lower()
            for part in (expected.get("Vary") or "").split(",")
            if part.strip()
        }
        if item["path"] in negotiated:
            vary.add("accept")
        actual_vary = {
            part.strip().lower()
            for part in (headers.get("Vary") or "").split(",")
            if part.strip()
        }
        if actual_vary != vary:
            errors.append(f"Vary mismatch: {item['path']} ({item['representation']})")
        if headers.get("Content-Encoding"):
            errors.append(f"Unexpected encoding: {item['path']}")

    def check(
        name, path, expected_status, headers=None, method="GET", expected_body=None
    ):
        status, response_headers, body = request(path, headers, method)
        passed = status == expected_status and (
            expected_body is None or body == expected_body
        )
        checks.append({"name": name, "status": status, "passed": passed})
        if not passed:
            errors.append(name)
        return response_headers

    photo = "assets/amenities/web/kids-play-area.webp"
    photo_bytes = (ROOT / photo).read_bytes()
    metadata = profiles[(photo, "original")]["headers"]
    etag, modified = metadata["ETag"], metadata["Last-Modified"]
    response = check(
        "ETag revalidation", photo, 304, {"If-None-Match": etag}, expected_body=b""
    )
    for name in ("ETag", "Last-Modified", "Cache-Control"):
        if response.get(name) != metadata[name]:
            errors.append(f"304 missing {name}")
    check(
        "Weak ETag comparison",
        photo,
        304,
        {"If-None-Match": "W/" + etag},
        expected_body=b"",
    )
    check(
        "ETag list",
        photo,
        304,
        {"If-None-Match": '"other,tag", ' + etag},
        expected_body=b"",
    )
    check(
        "Wildcard revalidation", photo, 304, {"If-None-Match": "*"}, expected_body=b""
    )
    check("HEAD revalidation", photo, 304, {"If-None-Match": etag}, "HEAD", b"")
    check(
        "Modified date revalidation",
        photo,
        304,
        {"If-Modified-Since": modified},
        expected_body=b"",
    )
    check(
        "Future modified date",
        photo,
        304,
        {"If-Modified-Since": "Wed, 30 Sep 2037 17:22:30 GMT"},
        expected_body=b"",
    )
    check(
        "Invalid modified date",
        photo,
        200,
        {"If-Modified-Since": "invalid"},
        expected_body=photo_bytes,
    )
    check(
        "ETag precedes modified date",
        photo,
        200,
        {"If-None-Match": '"different"', "If-Modified-Since": modified},
        expected_body=photo_bytes,
    )
    check(
        "Revalidation precedes range",
        photo,
        304,
        {"If-None-Match": etag, "Range": "bytes=0-7"},
        expected_body=b"",
    )
    response = check(
        "Prefix range",
        photo,
        206,
        {"Range": "bytes=0-7"},
        expected_body=photo_bytes[:8],
    )
    if response.get("Content-Range") != f"bytes 0-7/{len(photo_bytes)}":
        errors.append("Prefix content range")
    check(
        "Suffix range",
        photo,
        206,
        {"Range": "bytes=-8"},
        expected_body=photo_bytes[-8:],
    )
    check(
        "Open ended range",
        photo,
        206,
        {"Range": f"bytes={len(photo_bytes) - 8}-"},
        expected_body=photo_bytes[-8:],
    )
    check(
        "Unsatisfiable range",
        photo,
        416,
        {"Range": f"bytes={len(photo_bytes)}-"},
        expected_body=b"",
    )
    check("Zero suffix range", photo, 416, {"Range": "bytes=-0"}, expected_body=b"")
    check("HEAD ignores range", photo, 200, {"Range": "bytes=0-7"}, "HEAD", b"")
    check(
        "Matching If-Range",
        photo,
        206,
        {"Range": "bytes=0-7", "If-Range": etag},
        expected_body=photo_bytes[:8],
    )
    check(
        "Matching If-Range date",
        photo,
        206,
        {"Range": "bytes=0-7", "If-Range": modified},
        expected_body=photo_bytes[:8],
    )
    check(
        "Stale If-Range",
        photo,
        200,
        {"Range": "bytes=0-7", "If-Range": '"different"'},
        expected_body=photo_bytes,
    )
    check(
        "Weak If-Range",
        photo,
        200,
        {"Range": "bytes=0-7", "If-Range": "W/" + etag},
        expected_body=photo_bytes,
    )
    tower = "assets/repose-experience/tower-original.png"
    raw_tower = (ROOT / tower).read_bytes()
    check(
        "Variant without validator ignores ETag",
        tower,
        200,
        {
            "Accept": ACCEPT,
            "If-None-Match": etag,
        },
    )
    check(
        "WebP q=0 preserves original",
        tower,
        200,
        {"Accept": "image/webp;q=0,image/png"},
        expected_body=raw_tower,
    )
    check(
        "Missing variant modified date",
        tower,
        200,
        {"Accept": ACCEPT, "If-Modified-Since": modified},
    )
    video = "assets/amenity-videos/gym.mp4"
    with (ROOT / video).open("rb") as stream:
        stream.seek(1024)
        video_bytes = stream.read(1024)
    check(
        "Video seek",
        video,
        206,
        {"Range": "bytes=1024-2047"},
        expected_body=video_bytes,
    )
    for private_path in (
        "reposeresidence-digital-asset-record.pdf",
        "reposeresidence-offline.zip",
        "verification/reference-response-metadata.json",
        "serve.py",
    ):
        check("Private path: " + private_path, private_path, 404)

    report = {
        "checked_at": datetime.now(UTC).isoformat(),
        "url": args.url,
        "reference_header_profiles_checked": len(profiles),
        "checks": checks,
        "errors": errors,
    }
    (ROOT / "verification" / "http-delivery-checks.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    if errors:
        raise SystemExit("\n".join(errors))
    print(
        f"Verified {len(profiles)} header profiles and {len(checks)} conditional/range/privacy checks."
    )


if __name__ == "__main__":
    main()
