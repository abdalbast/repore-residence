#!/usr/bin/env python3
"""Compare every deployed local file with the current live reference."""

import argparse
import hashlib
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from http.client import HTTPException
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
REFERENCE = "https://reposeresidence.com/"
RUNTIME_DIRECTORIES = ("assets", "floor-explorer", "models")


def compare(path):
    relative = path.relative_to(ROOT).as_posix()
    url = REFERENCE + ("" if relative == "index.html" else relative)
    with path.open("rb") as local_file:
        local_hash = hashlib.file_digest(local_file, "sha256").hexdigest()
    result = {"path": relative, "url": url, "local_sha256": local_hash}
    try:
        request = Request(url, headers={"Accept-Encoding": "identity"})
        digest = hashlib.sha256()
        length = 0
        with urlopen(request, timeout=25) as response:
            result["status"] = response.status
            result["content_type"] = response.headers.get("Content-Type")
            result["etag"] = response.headers.get("ETag")
            while chunk := response.read(64 * 1024):
                digest.update(chunk)
                length += len(chunk)
        result["live_bytes"] = length
        result["live_sha256"] = digest.hexdigest()
        result["matches"] = digest.hexdigest() == local_hash
    except (OSError, HTTPException) as error:
        result["error"] = str(error)
        result["matches"] = False
    result["checked_at"] = datetime.now(UTC).isoformat()
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, choices=(1, 2), default=2)
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()
    files = [ROOT / "index.html"]
    for directory in RUNTIME_DIRECTORIES:
        files.extend(
            sorted(path for path in (ROOT / directory).rglob("*") if path.is_file())
        )
    report_path = ROOT / "verification" / "full-live-reference.json"
    results = {}
    if args.resume and report_path.exists():
        try:
            previous = json.loads(report_path.read_text())
        except json.JSONDecodeError:
            print("Previous report is incomplete; repeating the audit.", flush=True)
        else:
            results = {
                item["path"]: item for item in previous["files"] if item["matches"]
            }
    pending = [
        path for path in files if path.relative_to(ROOT).as_posix() not in results
    ]

    def save():
        report = {
            "reference": REFERENCE,
            "expected_files": len(files),
            "checked_files": len(results),
            "matching_files": sum(item["matches"] for item in results.values()),
            "downloaded_bytes": sum(
                item.get("live_bytes", 0) for item in results.values()
            ),
            "files": sorted(results.values(), key=lambda item: item["path"]),
        }
        temporary_path = report_path.with_suffix(".json.tmp")
        try:
            temporary_path.write_text(json.dumps(report, indent=2) + "\n")
            temporary_path.replace(report_path)
        finally:
            temporary_path.unlink(missing_ok=True)
        return report

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = [executor.submit(compare, path) for path in pending]
        for index, future in enumerate(as_completed(futures), start=1):
            result = future.result()
            results[result["path"]] = result
            if not result["matches"]:
                print(json.dumps(result), flush=True)
            if index % 25 == 0:
                report = save()
                print(
                    f"Checked {report['checked_files']}/{len(files)}; "
                    f"matched {report['matching_files']}.",
                    flush=True,
                )
    report = save()
    print(
        f"Final: {report['matching_files']}/{len(files)} byte-identical; "
        f"{report['downloaded_bytes']:,} bytes compared.",
        flush=True,
    )
    if report["matching_files"] != len(files):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
