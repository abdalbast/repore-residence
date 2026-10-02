#!/usr/bin/env python3
"""Compare unfrozen motion traces without conflating scroll and clock parity."""

import argparse
import bisect
import json
from collections import Counter
from itertools import pairwise
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAX_INPUT_BYTES = 64 * 1024 * 1024
MAX_STATE_PAIRS = 120
QUANTILES = (0.1, 0.25, 0.5, 0.75, 0.9, 0.99)


def numeric(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def frames(trace):
    return sorted(
        (
            frame
            for frame in trace.get("frames", [])
            if numeric(frame.get("t")) and numeric(frame.get("y"))
        ),
        key=lambda frame: frame["t"],
    )


def delivery(trace):
    events = trace.get("wheelEvents", [])
    return events[0] if events and numeric(events[0].get("t")) else None


def profile(trace, target):
    rows, event = frames(trace), delivery(trace)
    if not rows:
        return {"valid_frames": 0, "error": "No numeric timestamp/scroll frames"}
    initial = event.get("y") if event else None
    initial = initial if numeric(initial) else rows[0]["y"]
    tail_rows = [row for row in rows if row["t"] >= rows[-1]["t"] - 250]
    tail = [row["y"] for row in tail_rows]
    tail_observed = tail_rows[-1]["t"] - tail_rows[0]["t"]
    return {
        "valid_frames": len(rows),
        "discarded_frames": len(trace.get("frames", [])) - len(rows),
        "wheel_events": [
            {
                "after_input_ms": row["t"] - event["t"],
                "delta_y": row.get("deltaY"),
                "y": row.get("y"),
            }
            for row in trace.get("wheelEvents", [])[:100]
            if event and numeric(row.get("t"))
        ],
        "wheel_event_count": len(trace.get("wheelEvents", [])),
        "input_start_available": event is not None,
        "initial_y": initial,
        "final_y": rows[-1]["y"],
        "final_target_gap": rows[-1]["y"] - target if numeric(target) else None,
        "duration_ms": rows[-1]["t"] - rows[0]["t"],
        "first_frame_after_input_ms": rows[0]["t"] - event["t"] if event else None,
        "last_frame_after_input_ms": rows[-1]["t"] - event["t"] if event else None,
        "largest_frame_gap_ms": max(
            (b["t"] - a["t"] for a, b in pairwise(rows)), default=0
        ),
        "tail_window_ms": 250,
        "tail_observed_ms": tail_observed,
        "minimum_tail_observation_ms": 200,
        "tail_y_range": max(tail) - min(tail),
        "final_position_stable_in_sampled_tail": tail_observed >= 200
        and max(tail) == min(tail),
    }


def crossing(trace, initial, endpoint, quantile):
    event = delivery(trace)
    if not event or initial == endpoint:
        return None
    threshold = initial + (endpoint - initial) * quantile
    direction = 1 if endpoint > initial else -1
    previous = {"t": event["t"], "y": initial}
    for row in frames(trace):
        if row["t"] < event["t"]:
            continue
        if (row["y"] - threshold) * direction >= 0:
            dy = row["y"] - previous["y"]
            fraction = (threshold - previous["y"]) / dy if dy else 1
            timestamp = previous["t"] + fraction * (row["t"] - previous["t"])
            return timestamp - event["t"]
        previous = row
    return None


def trigger_map(frame):
    triggers = frame.get("triggers", [])
    counts = Counter(row.get("id") for row in triggers)
    return {
        row["id"]: row
        for row in triggers
        if row.get("id") is not None and counts[row["id"]] == 1
    }, [key for key, count in counts.items() if count > 1]


def flatten(value, prefix=""):
    if isinstance(value, dict):
        return {
            key: item
            for name, child in value.items()
            for key, item in flatten(child, f"{prefix}.{name}").items()
        }
    if isinstance(value, list):
        return {
            key: item
            for index, child in enumerate(value)
            for key, item in flatten(child, f"{prefix}[{index}]").items()
        }
    return {prefix: value}


def nearest_states(reference, local):
    ref_rows, loc_rows = frames(reference), frames(local)
    ref_event, loc_event = delivery(reference), delivery(local)
    if not ref_rows or not loc_rows:
        return {"error": "Both traces need numeric frames"}
    ordered = sorted(loc_rows, key=lambda row: row["y"])
    positions = [row["y"] for row in ordered]
    indices = sorted(
        {
            round(
                index
                * (len(ref_rows) - 1)
                / max(1, min(MAX_STATE_PAIRS, len(ref_rows)) - 1)
            )
            for index in range(min(MAX_STATE_PAIRS, len(ref_rows)))
        }
    )
    summary = {
        "reference_frames": len(ref_rows),
        "local_frames": len(loc_rows),
        "sampled_reference_frames": len(indices),
        "common_trigger_comparisons": 0,
        "static_config_mismatches": 0,
        "max_y_gap": 0,
        "max_input_relative_time_gap_ms": None,
        "max_progress_difference": 0,
        "max_animation_progress_difference": 0,
        "max_numeric_scalar_difference": 0,
        "scalar_structure_or_value_mismatches": 0,
        "numeric_scalar_pairs": 0,
        "progress_pairs": 0,
        "animation_progress_pairs": 0,
        "missing_config_fields": 0,
        "unmatched_trigger_occurrences": 0,
        "duplicate_trigger_ids": [],
        "examples": [],
    }
    matched = set()
    for index in indices:
        ref = ref_rows[index]
        offset = bisect.bisect_left(positions, ref["y"])
        nearby = positions[max(0, offset - 1) : min(len(positions), offset + 1)]
        candidate_y = min(nearby, key=lambda y: abs(y - ref["y"]))
        candidates = ordered[
            bisect.bisect_left(positions, candidate_y) : bisect.bisect_right(
                positions, candidate_y
            )
        ]
        elapsed = ref["t"] - ref_event["t"] if ref_event else None
        loc = min(
            candidates,
            key=lambda row: (
                abs(row["t"] - loc_event["t"] - elapsed)
                if elapsed is not None and loc_event
                else row["t"]
            ),
        )
        matched.add(loc["t"])
        gap = abs(loc["y"] - ref["y"])
        summary["max_y_gap"] = max(summary["max_y_gap"], gap)
        time_gap = (
            abs(loc["t"] - loc_event["t"] - elapsed)
            if loc_event and elapsed is not None
            else None
        )
        if time_gap is not None:
            summary["max_input_relative_time_gap_ms"] = max(
                summary["max_input_relative_time_gap_ms"] or 0, time_gap
            )
        ref_map, ref_duplicates = trigger_map(ref)
        loc_map, loc_duplicates = trigger_map(loc)
        summary["duplicate_trigger_ids"] = list(
            dict.fromkeys(
                summary["duplicate_trigger_ids"] + ref_duplicates + loc_duplicates
            )
        )[:20]
        summary["unmatched_trigger_occurrences"] += len(ref_map.keys() ^ loc_map.keys())
        for key in ref_map.keys() & loc_map.keys():
            a, b = ref_map[key], loc_map[key]
            summary["common_trigger_comparisons"] += 1
            summary["missing_config_fields"] += sum(
                field not in row for field in ("start", "end") for row in (a, b)
            )
            config_equal = all(
                a.get(field) == b.get(field) for field in ("start", "end")
            )
            summary["static_config_mismatches"] += not config_equal
            differences = {}
            for field, metric in (
                ("progress", "max_progress_difference"),
                ("animationProgress", "max_animation_progress_difference"),
            ):
                if numeric(a.get(field)) and numeric(b.get(field)):
                    summary[
                        "progress_pairs"
                        if field == "progress"
                        else "animation_progress_pairs"
                    ] += 1
                    delta = abs(a[field] - b[field])
                    summary[metric] = max(summary[metric], delta)
                    differences[field] = delta
            flat_a, flat_b = (
                flatten(a.get("scalars", [])),
                flatten(b.get("scalars", [])),
            )
            summary["scalar_structure_or_value_mismatches"] += len(
                flat_a.keys() ^ flat_b.keys()
            )
            for scalar in flat_a.keys() & flat_b.keys():
                x, y = flat_a[scalar], flat_b[scalar]
                if numeric(x) and numeric(y):
                    summary["numeric_scalar_pairs"] += 1
                    summary["max_numeric_scalar_difference"] = max(
                        summary["max_numeric_scalar_difference"], abs(x - y)
                    )
                elif x != y:
                    summary["scalar_structure_or_value_mismatches"] += 1
            if len(summary["examples"]) < 8 and (
                not config_equal or any(differences.values())
            ):
                summary["examples"].append(
                    {
                        "trigger": key,
                        "reference_y": ref["y"],
                        "local_y": loc["y"],
                        "y_gap": gap,
                        "input_relative_time_gap_ms": time_gap,
                        "reference_config": {
                            field: a.get(field) for field in ("start", "end")
                        },
                        "local_config": {
                            field: b.get(field) for field in ("start", "end")
                        },
                        "progress_differences": differences,
                    }
                )
    summary["distinct_local_frames_matched"] = len(matched)
    summary["method"] = (
        "Nearest measured y; same-y ties use nearest input-relative time when available"
    )
    return summary


def compare(segment):
    reference, local, target = (
        segment["reference"],
        segment["local"],
        segment.get("target"),
    )
    ref, loc = profile(reference, target), profile(local, target)
    result = {
        "name": segment.get("name"),
        "requested_target": target,
        "reference": ref,
        "local": loc,
    }
    if not ref["valid_frames"] or not loc["valid_frames"]:
        return result
    result["final_y_equal"] = ref["final_y"] == loc["final_y"]
    result["settled_final_positions_equal"] = result["final_y_equal"] and all(
        row["final_position_stable_in_sampled_tail"] for row in (ref, loc)
    )
    result["crossings"] = []
    for q in QUANTILES:
        ref_end = target if numeric(target) else ref["final_y"]
        loc_end = target if numeric(target) else loc["final_y"]
        a = crossing(reference, ref["initial_y"], ref_end, q)
        b = crossing(local, loc["initial_y"], loc_end, q)
        result["crossings"].append(
            {
                "quantile": q,
                "reference_threshold_y": ref["initial_y"]
                + (ref_end - ref["initial_y"]) * q,
                "local_threshold_y": loc["initial_y"]
                + (loc_end - loc["initial_y"]) * q,
                "reference_after_input_ms": a,
                "local_after_input_ms": b,
                "local_minus_reference_ms": b - a
                if a is not None and b is not None
                else None,
            }
        )
    result["nearest_scroll_states"] = nearest_states(reference, local)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input", type=Path, default=ROOT / "verification/native-motion-traces.json"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "verification/native-motion-comparison.json",
    )
    args = parser.parse_args()
    if args.input.stat().st_size > MAX_INPUT_BYTES:
        raise SystemExit("Input exceeds the 64 MiB resource limit")
    segments = json.loads(args.input.read_text())
    if not isinstance(segments, list) or len(segments) > 100:
        raise SystemExit("Expected at most 100 motion segments")
    results = [compare(segment) for segment in segments]
    report = {
        "input": str(args.input),
        "segments": results,
        "limits": [
            "Crossings interpolate sampled frames relative to the first delivered wheel event.",
            "Quantiles use the requested target when numeric, otherwise each trace's final y; unobserved crossings remain null.",
            "Nearest-scroll pairs may have different clock phases and retain their measured y/time gaps.",
            "At most 120 reference frames per segment are paired; no screenshot pixels are inspected.",
            "Final position equality does not establish native clock or full-motion equivalence.",
            "Scalar arrays are compared by recorded array position; duplicate trigger IDs are excluded.",
        ],
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    for row in results:
        state = row.get("nearest_scroll_states", {})
        print(
            f"{row['name']}: final_y_equal={row.get('final_y_equal')}, "
            f"settled={row.get('settled_final_positions_equal')}, "
            f"nearest_y_gap={state.get('max_y_gap')}, "
            f"progress_gap={state.get('max_progress_difference')}, "
            f"config_mismatches={state.get('static_config_mismatches')}"
        )


if __name__ == "__main__":
    main()
