#!/usr/bin/env python3
"""Generates stylised floorplate drawings + matching unit geometry data.

Outputs:
  assets/floorplates/level-XX.webp   (15 plates, white ground, ink lines)
  assets/units/{1,2,3}-bedroom.webp  (unit plan enlargements)
  js/floor-data.js                   (levels, units, polygons, statuses)
"""
import json
import math
import os
import random

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, "assets")
W, H = 1400, 900

INK = (9, 12, 16)
LINE = (18, 22, 28)
SOFT = (150, 152, 156)

rng = random.Random(21)

# core rectangle in image px
CORE = (600, 300, 800, 600)

LEVELS = [f"{i:02d}" for i in range(1, 16)]


def draw_plate(level, seed):
    r = random.Random(seed)
    img = Image.new("RGB", (W, H), (246, 244, 241))
    d = ImageDraw.Draw(img)

    def rect(box, width=3, fill=None, outline=LINE):
        d.rectangle(box, fill=fill, outline=outline, width=width)

    def line(xy, width=2, fill=LINE):
        d.line(xy, fill=fill, width=width)

    # outer envelope
    rect((70, 60, W - 70, H - 60), 5)

    # core
    rect(CORE, 4)
    line((CORE[0] + 20, (CORE[1] + CORE[3]) / 2, CORE[2] - 20, (CORE[1] + CORE[3]) / 2), 2)
    rect((CORE[0] + 20, CORE[1] + 20, CORE[0] + 80, CORE[1] + 100), 2)
    rect((CORE[2] - 80, CORE[3] - 100, CORE[2] - 20, CORE[3] - 20), 2)

    # corridor ring
    corridor = 26
    rect((CORE[0] - corridor, CORE[1] - corridor, CORE[2] + corridor, CORE[3] + corridor), 2, outline=SOFT)

    units = []
    # left column: 2 units stacked
    split = CORE[1] + (CORE[3] - CORE[1]) * r.uniform(0.42, 0.58)
    left_top = (70, 60, CORE[0] - corridor, split)
    left_bot = (70, split, CORE[0] - corridor, H - 60)
    # right column: 2 units
    right_top = (CORE[2] + corridor, 60, W - 70, split)
    right_bot = (CORE[2] + corridor, split, W - 70, H - 60)
    # top and bottom bands
    top_band = (CORE[0] - corridor, 60, CORE[2] + corridor, CORE[1] - corridor)
    bot_band = (CORE[0] - corridor, CORE[3] + corridor, CORE[2] + corridor, H - 60)

    boxes = [
        (left_top, "a", "1-bedroom"),
        (left_bot, "b", "2-bedroom"),
        (right_top, "c", "2-bedroom"),
        (right_bot, "d", "3-bedroom"),
        (top_band, "e", "1-bedroom"),
        (bot_band, "f", "3-bedroom"),
    ]
    # vary: some floors drop a unit (merged)
    if level in ("03", "07", "11"):
        boxes = [b for b in boxes if b[1] not in ("e",)]
    if level in ("05", "13"):
        boxes = [b for b in boxes if b[1] not in ("f",)]

    for box, tag, variant in boxes:
        x0, y0, x1, y1 = box
        if x1 - x0 < 60 or y1 - y0 < 60:
            continue
        rect(box, 3)
        units.append({
            "id": f"l{level}-{tag}",
            "variant": variant,
            "polygon": [
                [round(x0 / W * 100, 3), round(y0 / H * 100, 3)],
                [round(x1 / W * 100, 3), round(y0 / H * 100, 3)],
                [round(x1 / W * 100, 3), round(y1 / H * 100, 3)],
                [round(x0 / W * 100, 3), round(y1 / H * 100, 3)],
            ],
            "labelAt": [round((x0 + x1) / 2 / W * 100, 3), round((y0 + y1) / 2 / H * 100, 3)],
            "sold": r.random() < (0.18 if level not in ("15",) else 0.3),
        })
        # balcony ticks
        if r.random() < 0.7:
            if x1 - x0 > y1 - y0:
                d.line((x0 + 20, y1 + 14, x1 - 20, y1 + 14), fill=SOFT, width=2)
            else:
                d.line((x1 + 14, y0 + 20, x1 + 14, y1 - 20), fill=SOFT, width=2)

    # dimension ticks
    for x in range(100, W - 80, 100):
        d.line((x, 34, x, 46), fill=SOFT, width=1)
    for y in range(90, H - 60, 100):
        d.line((40, y, 52, y), fill=SOFT, width=1)

    # subtle grid
    for gx in range(0, W, 40):
        d.line((gx, 0, gx, H), fill=(236, 234, 230), width=1)
    for gy in range(0, H, 40):
        d.line((0, gy, W, gy), fill=(236, 234, 230), width=1)
    # redraw envelope over grid
    rect((70, 60, W - 70, H - 60), 5)
    rect(CORE, 4)

    return img, units


def draw_unit(variant, seed):
    r = random.Random(seed)
    w, h = 1200, 800
    img = Image.new("RGB", (w, h), (246, 244, 241))
    d = ImageDraw.Draw(img)
    d.rectangle((50, 50, w - 50, h - 50), outline=LINE, width=5)
    if variant == "1-bedroom":
        d.line((620, 50, 620, h - 50), fill=LINE, width=4)
        d.rectangle((700, 90, 780, 170), outline=SOFT, width=2)
        d.arc((90, 90, 490, 490), 0, 360, fill=SOFT, width=2)
        d.text((80, h - 90), "LIVING / DINING", fill=INK)
    elif variant == "2-bedroom":
        d.line((640, 50, 640, h - 50), fill=LINE, width=4)
        d.line((640, 420, w - 50, 420), fill=LINE, width=4)
        d.rectangle((80, 80, 160, 160), outline=SOFT, width=2)
        d.text((80, h - 90), "LIVING / DINING / 2 BED", fill=INK)
    else:
        d.line((560, 50, 560, h - 50), fill=LINE, width=4)
        d.line((560, 300, w - 50, 300), fill=LINE, width=4)
        d.line((560, 560, w - 50, 560), fill=LINE, width=4)
        d.rectangle((90, 90, 170, 170), outline=SOFT, width=2)
        d.text((80, h - 90), "LIVING / DINING / 3 BED", fill=INK)
    for gx in range(0, w, 40):
        d.line((gx, 0, gx, h), fill=(236, 234, 230), width=1)
    for gy in range(0, h, 40):
        d.line((0, gy, w, gy), fill=(236, 234, 230), width=1)
    d.rectangle((50, 50, w - 50, h - 50), outline=LINE, width=5)
    return img


def main():
    os.makedirs(os.path.join(A, "floorplates"), exist_ok=True)
    os.makedirs(os.path.join(A, "units"), exist_ok=True)
    model = {"levels": [], "units": {}}
    for level in LEVELS:
        img, units = draw_plate(level, seed=int(level) * 17)
        img.save(os.path.join(A, "floorplates", f"level-{level}.webp"), "WEBP", quality=86)
        model["levels"].append({
            "id": level,
            "types": sorted({u["variant"] for u in units}),
            "units": [u["id"] for u in units],
        })
        for u in units:
            model["units"][u["id"]] = u
    for variant in ("1-bedroom", "2-bedroom", "3-bedroom"):
        draw_unit(variant, seed=hash(variant) % 100).save(
            os.path.join(A, "units", f"{variant}.webp"), "WEBP", quality=88)
    with open(os.path.join(ROOT, "js", "floor-data.js"), "w") as f:
        f.write("// Generated floorplate geometry (placeholder data).\n")
        f.write("window.REPOSE_FLOORS = ")
        json.dump(model, f, separators=(",", ":"))
        f.write(";\n")
    print("floors done", len(model["levels"]), len(model["units"]))


if __name__ == "__main__":
    main()
