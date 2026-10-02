#!/usr/bin/env python3
"""Record reference cache headers without downloading the assets again."""

import argparse
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from http.client import HTTPException
from urllib.request import Request, urlopen

from audit_reference import REFERENCE, ROOT
from capture_browser_variants import ACCEPT

HEADERS = (
    "Content-Type",
    "Cache-Control",
    "ETag",
    "Last-Modified",
    "Vary",
    "Content-Encoding",
    "Content-Length",
)
REPORT_PATH = ROOT / "verification" / "reference-response-metadata.json"


def capture(item):
    result = dict(item)
    request = Request(
        item["url"],
        method="HEAD",
        headers={
            "Accept": ACCEPT if item["representation"] == "browser" else "*/*",
            "Accept-Encoding": "identity",
        },
    )
    try:
        with urlopen(request, timeout=25) as response:
            result["status"] = response.status
            result["headers"] = {name: response.headers.get(name) for name in HEADERS}
    except (OSError, HTTPException) as error:
        result["error"] = str(error)
    result["checked_at"] = datetime.now(UTC).isoformat()
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--resume", action="store_true", help="Retry incomplete profiles"
    )
    args = parser.parse_args()
    reference = json.loads(
        (ROOT / "verification" / "full-live-reference.json").read_text()
    )
    variants = json.loads(
        (ROOT / "verification" / "browser-image-variants.json").read_text()
    )
    items = [
        {
            "path": item["path"],
            "url": item["url"],
            "representation": "original",
            "sha256": item["live_sha256"],
        }
        for item in reference["files"]
    ] + [
        {
            "path": item["path"],
            "url": item["url"],
            "representation": "browser",
            "sha256": item["sha256"],
        }
        for item in variants["files"]
        if "variant" in item and "error" not in item
    ]
    results = {}
    if args.resume and REPORT_PATH.exists():
        results = {
            (item["path"], item["representation"]): item
            for item in json.loads(REPORT_PATH.read_text())["files"]
            if item.get("status") == 200 and "error" not in item
        }

    def save():
        report = {
            "reference": REFERENCE,
            "method": "HEAD",
            "expected_profiles": len(items),
            "checked_profiles": len(results),
            "errors": sum("error" in item for item in results.values()),
            "files": sorted(
                results.values(),
                key=lambda item: (item["path"], item["representation"]),
            ),
        }
        temporary = REPORT_PATH.with_suffix(".json.tmp")
        try:
            temporary.write_text(json.dumps(report, indent=2) + "\n")
            temporary.replace(REPORT_PATH)
        finally:
            temporary.unlink(missing_ok=True)
        return report

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [
            executor.submit(capture, item)
            for item in items
            if (item["path"], item["representation"]) not in results
        ]
        for index, future in enumerate(as_completed(futures), start=1):
            result = future.result()
            results[(result["path"], result["representation"])] = result
            if "error" in result:
                print(json.dumps(result), flush=True)
            if index % 25 == 0:
                report = save()
                print(
                    f"Headers checked: {index}/{len(items)}; {report['errors']} errors.",
                    flush=True,
                )
    report = save()
    print(
        f"Final: {len(results)}/{len(items)} profiles; {report['errors']} errors.",
        flush=True,
    )
    if report["errors"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
