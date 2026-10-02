#!/usr/bin/env python3
"""Check archive fidelity, opening sequences and deployed module syntax."""

import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path, PurePosixPath
from urllib.request import Request, urlopen
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
RUNTIME_DIRECTORIES = {"assets", "floor-explorer", "models"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--url", help="Also verify browser image delivery from this server"
    )
    args = parser.parse_args()
    errors = []
    hashes = {}
    with ZipFile(ROOT / "reposeresidence-offline.zip") as archive:
        for entry in archive.infolist():
            parts = PurePosixPath(entry.filename).parts
            if entry.is_dir() or len(parts) < 2:
                continue
            relative = PurePosixPath(*parts[1:])
            if relative.parts[0] not in RUNTIME_DIRECTORIES | {"index.html"}:
                continue
            path = ROOT / str(relative)
            expected = archive.read(entry)
            if not path.is_file():
                errors.append(f"Missing: {relative}")
                continue
            actual = path.read_bytes()
            if actual != expected:
                errors.append(f"Archive mismatch: {relative}")
            hashes[str(relative)] = hashlib.sha256(actual).hexdigest()

    archive_file_count = len(hashes)
    additions = json.loads(
        (ROOT / "verification" / "additional-live-assets.json").read_text()
    )
    for asset in additions:
        path = ROOT / asset["path"]
        if "error" in asset or not path.is_file():
            errors.append(f"Missing live asset: {asset['path']}")
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != asset["sha256"]:
            errors.append(f"Live asset mismatch: {asset['path']}")
        hashes[asset["path"]] = digest

    variant_hashes = {}
    browser_report = json.loads(
        (ROOT / "verification" / "browser-image-variants.json").read_text()
    )
    if browser_report["checked_images"] != browser_report["expected_images"]:
        errors.append("Browser image audit is incomplete")
    for image in browser_report["files"]:
        if "error" in image:
            errors.append(f"Browser image audit failed: {image['path']}")
            continue
        if image["original_sha256"] != hashes.get(image["path"]):
            errors.append(f"Browser image source changed: {image['path']}")
        if "variant" not in image:
            continue
        variant = ROOT / image["variant"]
        if not variant.is_file():
            errors.append(f"Missing browser variant: {image['variant']}")
            continue
        digest = hashlib.sha256(variant.read_bytes()).hexdigest()
        if digest != image["sha256"]:
            errors.append(f"Browser variant mismatch: {image['variant']}")
        variant_hashes[image["variant"]] = digest

    served_images = 0
    if args.url:
        for image in browser_report["files"]:
            request = Request(
                args.url.rstrip("/") + "/" + image["path"],
                headers={"Accept": browser_report["accept"]},
            )
            with urlopen(request, timeout=10) as response:
                digest = hashlib.file_digest(response, "sha256").hexdigest()
                mime = response.headers.get_content_type()
            if digest != image.get("sha256") or mime != image.get("content_type"):
                errors.append(f"Browser delivery mismatch: {image['path']}")
            else:
                served_images += 1

    floor_root = ROOT / "floor-explorer" / "repose-floor-explorer-assets"
    floor_data = json.loads((floor_root / "residences-map.json").read_text())
    for collection, field in (("unitPlans", "file"), ("floorplates", "webFile")):
        items = floor_data[collection]
        for asset in items.values() if isinstance(items, dict) else items:
            if not (floor_root / asset[field]).is_file():
                errors.append(f"Missing original plan: {asset[field]}")

    for sequence, count in (("01", 200), ("02", 240)):
        for frame in range(1, count + 1):
            path = (
                ROOT / f"assets/opening/sequence-{sequence}/webp/frame-{frame:04}.webp"
            )
            if not path.is_file():
                errors.append(f"Missing opening frame: {path.relative_to(ROOT)}")

    for stylesheet in (ROOT / "assets").glob("*.css"):
        for target in re.findall(r"url\([\"\']?(/[^\)\"\']+)", stylesheet.read_text()):
            if not (ROOT / target.lstrip("/")).is_file():
                errors.append(f"Missing CSS resource: {target}")

    scripts = sorted((ROOT / "assets").glob("*.js"))
    for script in scripts:
        result = subprocess.run(
            ["node", "--check", "--input-type=module"],
            input=script.read_text(),
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode:
            errors.append(f"Invalid module: {script.name}\n{result.stderr}")
        for target in re.findall(r"from[\"\'](\./[^\"\']+)[\"\']", script.read_text()):
            if not (script.parent / target).is_file():
                errors.append(f"Missing module import: {script.name} -> {target}")

    report = {
        "runtime_files": len(hashes),
        "archive_files": archive_file_count,
        "additional_live_assets": len(additions),
        "opening_frames": 440,
        "module_syntax_checks": len(scripts),
        "browser_images_checked": browser_report["checked_images"],
        "browser_variants": len(variant_hashes),
        "served_browser_images": served_images,
        "browser_variant_sha256": variant_hashes,
        "errors": errors,
        "sha256": hashes,
    }
    output = ROOT / "verification" / "archive-integrity.json"
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n")
    if errors:
        raise SystemExit("\n".join(errors))
    print(
        f"Verified {archive_file_count} archive files, {len(additions)} live additions, "
        f"440 frames, {len(scripts)} modules and {len(variant_hashes)} CDN variants."
    )
    if args.url:
        print(f"Verified {served_images} browser image HTTP responses.")


if __name__ == "__main__":
    main()
