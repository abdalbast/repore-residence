#!/usr/bin/env python3
"""Placeholder asset generator for the Repose-style clone.

Renders everything through `tools/scenes.py` (original procedural imagery),
then builds the short looping videos with ffmpeg.
"""
import os
import subprocess
import sys

from PIL import Image

import scenes

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, "assets")


def ensure(*parts):
    p = os.path.join(*parts)
    os.makedirs(p, exist_ok=True)
    return p


def save(img, path, quality=82):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "WEBP", quality=quality, method=5)


def save_png(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG")


def build_video(src, dst, frames=150, zoom=0.0006, seconds=6):
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", src,
            "-vf", f"scale=960:-2,zoompan=z='min(zoom+{zoom},1.08)':d={frames}:s=960x540:fps=25",
            "-t", str(seconds), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "30", dst,
        ],
        check=True,
    )


def main():
    w, h = 1600, 900
    only = sys.argv[1] if len(sys.argv) > 1 else None
    want = lambda part: only in (None, part)  # noqa: E731

    if want("seq1"):
        print("sequence-01 ...", flush=True)
        out = ensure(A, "opening", "sequence-01", "webp")
        for i in range(200):
            save(scenes.scene_approach(w, h, i / 199, seed=11),
                 os.path.join(out, f"frame-{i+1:04d}.webp"), 78)

    if want("seq2"):
        print("sequence-02 ...", flush=True)
        out = ensure(A, "opening", "sequence-02", "webp")
        for i in range(240):
            save(scenes.scene_ascend(w, h, i / 239, seed=12),
                 os.path.join(out, f"frame-{i+1:04d}.webp"), 78)

    if want("stills"):
        print("stills ...", flush=True)
        save(scenes.final_frame(1920, 1080, seed=3),
             os.path.join(A, "opening", "building", "final-frame.webp"), 84)
        save(scenes.final_frame(1920, 1080, seed=5),
             os.path.join(A, "reception-entry", "building-final.webp"), 84)
        save(scenes.reception(4000, 1761, seed=21),
             os.path.join(A, "reception-entry", "reception-final.webp"), 86)
        save_png(scenes.elevation(2047, 1331, seed=31),
                 os.path.join(A, "repose-experience", "tower-original.png"))
        save(scenes.logo(), os.path.join(A, "opening", "branding", "saion-logo.png"))

    if want("interiors"):
        print("interiors ...", flush=True)
        for room in ("living-room", "kitchen", "bedroom", "bathroom"):
            key = room.split("-")[0]
            save(scenes.interior(900, 1200, key, seed=40 + len(room)),
                 os.path.join(A, "interiors", f"{room}-card.webp"), 80)
            save(scenes.interior(1600, 900, key, seed=40 + len(room)),
                 os.path.join(A, "interiors", f"{room}-still.webp"), 80)

    if want("amen"):
        print("amenities ...", flush=True)
        amen = {
            "pool-01": ("pool", 1204), "pool-02": ("pool", 1148), "gym-01": ("gym", 1164),
            "gym-02": ("gym", 1000), "steam-room-01": ("steam", 1100),
            "open-terrace-01": ("terrace", 1400), "kids-play-01": ("zen", 1000),
            "yoga-01": ("yoga", 1100), "zen-garden-01": ("zen", 1200),
            "walking-track-01": ("zen", 1200), "interior-living-01": ("terrace", 1300),
            "interior-kitchen-01": ("yoga", 900), "interior-bedroom-01": ("yoga", 900),
            "interior-dining-01": ("steam", 1100), "al-furjan-01": ("terrace", 1600),
            "family-01": ("yoga", 1300),
        }
        for name, (kind, width) in amen.items():
            hh = int(width * 0.66)
            save(scenes.amenity(width, hh, kind, seed=hash(name) % 999),
                 os.path.join(A, "repose-experience", f"{name}.webp"), 78)
        index_amen = {
            "zen-garden": ("zen", 1200), "yoga-studio": ("yoga", 1100), "gym": ("gym", 1164),
            "walking-track": ("zen", 1200), "adults-pool": ("pool", 1204),
            "steam-room": ("steam", 1100), "open-terrace": ("terrace", 1400),
            "jacuzzi": ("pool", 1000), "adults-outdoor-gym": ("gym", 1000),
            "kids-play": ("zen", 1000), "pickleball-court": ("gym", 1000),
            "cricket-simulator": ("gym", 1000),
        }
        for name, (kind, width) in index_amen.items():
            save(scenes.amenity(width, int(width * 1.2), kind, seed=hash(name) % 999),
                 os.path.join(A, "repose-experience", f"{name}.webp"), 78)
        save(scenes.amenity(1754, 987, "map", seed=3),
             os.path.join(A, "amenities", "map.webp"), 82)
        for name in ("jacuzzi", "adults-outdoor-gym", "kids-play-area", "cricket-simulator",
                     "for-every-generation"):
            kind = "pool" if "jacuzzi" in name else "zen"
            save(scenes.amenity(1000, 660, kind, seed=hash(name) % 999),
                 os.path.join(A, "amenities", "web", f"{name}.webp"), 78)
        for name, kind in (("plate-sports-court", "gym"), ("plate-garden", "zen"),
                           ("plate-fitness", "gym")):
            save(scenes.amenity(1200, 800, kind, seed=hash(name) % 999),
                 os.path.join(A, "terrace", f"{name}.webp"), 78)

    if want("videos"):
        print("videos ...", flush=True)
        vids = {
            "amenity-videos/gym": "repose-experience/gym-01.webp",
            "amenity-videos/steam-room": "repose-experience/steam-room-01.webp",
            "amenity-videos/pool": "repose-experience/pool-01.webp",
            "interiors/living-room": "interiors/living-room-still.webp",
            "interiors/kitchen": "interiors/kitchen-still.webp",
            "interiors/bedroom": "interiors/bedroom-still.webp",
            "interiors/bathroom": "interiors/bathroom-still.webp",
        }
        for out_rel, src_rel in vids.items():
            src = os.path.join(A, src_rel)
            build_video(src, os.path.join(A, out_rel + ".mp4"))
            poster = Image.open(src).resize((960, 540))
            if "amenity" in out_rel:
                poster.save(os.path.join(A, out_rel + "-poster.webp"), "WEBP", quality=78)
            else:
                poster.save(os.path.join(A, out_rel + "-still.webp"), "WEBP", quality=78)
        for name in ("one-bedroom", "two-bedroom"):
            src = os.path.join(A, "interiors", "living-room-still.webp")
            build_video(src, os.path.join(A, "walkthrough", f"{name}-walkthrough.mp4"),
                        frames=200, zoom=0.0008, seconds=8)
            Image.open(src).resize((960, 540)).save(
                os.path.join(A, "walkthrough", f"{name}-walkthrough-poster.webp"),
                "WEBP", quality=78)

    print("done", flush=True)


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    main()
