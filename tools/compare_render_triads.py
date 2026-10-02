"""Compare local renders with two independently loaded reference controls."""

import json
from itertools import combinations

import numpy as np
from compare_checkpoint_frames import ROOT, compare, pixels


def main():
    captures = json.loads((ROOT / "desktop-render-triad-captures.json").read_text())
    origins = ("reference", "reference2", "local")
    report = []
    for pose in captures:
        first = {}
        samples = []
        for sample in pose["samples"]:
            frames = {
                origin: pixels(
                    ROOT
                    / f"screenshots/triad-{pose['name']}-{origin}-{sample['index']}.png"
                )
                for origin in origins
            }
            if not first:
                first = frames
            pairs = []
            for left, right in combinations(origins, 2):
                a, b = sample[left], sample[right]
                result = {
                    "left": left,
                    "right": right,
                    "visual_states_identical": a["visual"] == b["visual"],
                    "visible_computed_styles_and_geometry_identical": a["render"]
                    == b["render"],
                }
                if frames[left].shape == frames[right].shape:
                    result.update(compare(frames[left], frames[right]))
                else:
                    result["excluded"] = "Different captured pixel dimensions"
                pairs.append(result)
            samples.append(
                {
                    "index": sample["index"],
                    "origin_matches_first_frame": {
                        origin: bool(np.array_equal(first[origin], frames[origin]))
                        for origin in origins
                    },
                    "pairs": pairs,
                }
            )
        item = {"name": pose["name"], "target": pose["target"], "samples": samples}
        if "localComparisonExcludedReason" in pose:
            item["local_comparison_excluded_reason"] = pose[
                "localComparisonExcludedReason"
            ]
        report.append(item)
    (ROOT / "desktop-render-triad-comparison.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    for pose in report:
        print(pose["name"])
        for pair in pose["samples"][0]["pairs"]:
            print(pair)


if __name__ == "__main__":
    main()
