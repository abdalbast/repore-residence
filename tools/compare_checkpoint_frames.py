"""Compare repeated, synchronized desktop checkpoint captures."""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "verification"


def pixels(path: Path) -> np.ndarray:
    with Image.open(path) as image:
        return np.asarray(image.convert("RGB"), dtype=np.int16)


def compare(reference: np.ndarray, local: np.ndarray) -> dict:
    if reference.shape != local.shape:
        raise ValueError(f"Capture sizes differ: {reference.shape} != {local.shape}")
    difference = np.abs(reference - local)
    changed = np.any(difference > 0, axis=2)
    rows, columns = np.where(changed)
    return {
        "changed_pixels": int(changed.sum()),
        "max_channel_difference": int(difference.max()),
        "bounds": [
            int(columns.min()),
            int(rows.min()),
            int(columns.max()),
            int(rows.max()),
        ]
        if len(columns)
        else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default="desktop-complete-pose-captures.json")
    parser.add_argument("--prefix", default="complete-pose")
    parser.add_argument("--output", default="desktop-complete-pose-comparison.json")
    args = parser.parse_args()
    captures = json.loads((ROOT / args.input).read_text())
    comparisons = []
    for pose in captures:
        name = pose["name"]
        first = {}
        samples = []
        for sample in pose["samples"]:
            index = sample["index"]
            frames = {
                origin: pixels(
                    ROOT / f"screenshots/{args.prefix}-{name}-{origin}-{index}.png"
                )
                for origin in ["reference", "local"]
            }
            if not first:
                first = frames
            samples.append(
                {
                    "sample": index,
                    "complete_states_identical": sample["statesIdentical"],
                    **compare(frames["reference"], frames["local"]),
                    "reference_matches_first_sample": np.array_equal(
                        first["reference"], frames["reference"]
                    ),
                    "local_matches_first_sample": np.array_equal(
                        first["local"], frames["local"]
                    ),
                }
            )
        comparisons.append({"name": name, "samples": samples})
    (ROOT / args.output).write_text(json.dumps(comparisons, indent=2) + "\n")
    for comparison in comparisons:
        samples = comparison["samples"]
        print(
            comparison["name"],
            "states:",
            all(sample["complete_states_identical"] for sample in samples),
            "pixels:",
            [sample["changed_pixels"] for sample in samples],
            "max channel:",
            max(sample["max_channel_difference"] for sample in samples),
        )


if __name__ == "__main__":
    main()
