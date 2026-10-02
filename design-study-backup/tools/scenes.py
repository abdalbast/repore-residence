#!/usr/bin/env python3
"""Scene renderer for the design study.

Produces stylised architectural imagery — dusk approaches, facades, interiors,
amenity plates, plans — from primitives. Everything is original: gradients,
silhouettes and light, no third-party photography.

All draw calls happen at `SS`x supersampling and are downsampled with Lanczos,
so edges and glows stay smooth.
"""
import math
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SS = 2

INK = (9, 12, 16)
PAPER = (246, 244, 241)

# --------------------------------------------------------------------------- #
# light + atmosphere
# --------------------------------------------------------------------------- #


def vertical_gradient(w, h, stops, horizontal=None):
    ys = np.linspace(0.0, 1.0, h)
    out = np.zeros((h, 3), float)
    ts = [s[0] for s in stops]
    cs = [np.array(s[1], float) for s in stops]
    for i in range(len(stops) - 1):
        m = (ys >= ts[i]) & (ys <= ts[i + 1])
        if not m.any():
            continue
        f = (ys[m] - ts[i]) / max(1e-6, ts[i + 1] - ts[i])
        out[m] = cs[i][None, :] * (1 - f)[:, None] + cs[i + 1][None, :] * f[:, None]
    out[ys < ts[0]] = cs[0]
    out[ys > ts[-1]] = cs[-1]
    img = out[:, None, :].repeat(w, axis=1)
    if horizontal is not None:
        xs = np.linspace(0.0, 1.0, w)
        ht = [x[0] for x in horizontal]
        hc = [np.array(x[1], float) for x in horizontal]
        hout = np.zeros((w, 3), float)
        for i in range(len(horizontal) - 1):
            m = (xs >= ht[i]) & (xs <= ht[i + 1])
            if not m.any():
                continue
            f = (xs[m] - ht[i]) / max(1e-6, ht[i + 1] - ht[i])
            hout[m] = hc[i][None, :] * (1 - f)[:, None] + hc[i + 1][None, :] * f[:, None]
        hout[xs < ht[0]] = hc[0]
        hout[xs > ht[-1]] = hc[-1]
        img *= hout[None, :, :] / 255.0
    return img


def glow(w, h, cx, cy, radius, color, strength=1.0, power=2.0):
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx - cx) / radius) ** 2 + ((yy - cy) / radius) ** 2)
    g = np.clip(1 - d, 0, 1) ** power * strength
    return g[:, :, None] * np.array(color, float)[None, None, :]


def band_glow(w, h, y0, y1, color, strength=0.5):
    ys = np.arange(h, dtype=float)
    g = np.exp(-(((ys - (y0 + y1) / 2) / max(1.0, (y1 - y0) / 2)) ** 2) * 2.2) * strength
    return g[:, None, None] * np.array(color, float)[None, None, :]


def grain(arr, amount=3.0, seed=1):
    rng = np.random.default_rng(seed)
    n = rng.normal(0, amount, arr.shape[:2])[:, :, None]
    return np.clip(arr + n, 0, 255)


def vignette(arr, amount=0.35, power=2.2):
    h, w = arr.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2) / math.sqrt(2)
    v = 1 - amount * np.clip(d, 0, 1) ** power
    return arr * v[:, :, None]


def to_img(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def finish(img, amount=3.0, vig=0.35, seed=1):
    arr = np.array(img.convert("RGB"), float)
    arr = grain(arr, amount, seed)
    arr = vignette(arr, vig)
    return to_img(arr)


def soft_light(img, mask, color, strength=0.5, blur=18):
    """Add a blurred light layer (mask: L image) in `color`."""
    layer = Image.new("RGB", img.size, tuple(int(c) for c in color))
    m = mask.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * strength))
    return Image.composite(Image.blend(img, layer, 0.55), img, m)


def down(img, w, h):
    return img.resize((w, h), Image.LANCZOS)


# --------------------------------------------------------------------------- #
# city + tower primitives
# --------------------------------------------------------------------------- #


def skyline(d, w, base_y, color, alpha, seed, scale=1.0, windows=0.0, lit=(240, 220, 180)):
    r = random.Random(seed)
    x = -w * 0.05
    while x < w * 1.05:
        bw = r.uniform(0.02, 0.075) * w * scale
        bh = r.uniform(0.04, 0.30) * w * scale
        top = base_y - bh
        d.rectangle([x, top, x + bw, base_y], fill=color + (alpha,))
        if windows > 0:
            cols = max(2, int(bw / (14 * scale)))
            rows = max(3, int(bh / (22 * scale)))
            cw = bw / cols
            ch = bh / rows
            for cx in range(cols):
                for cy in range(rows):
                    if r.random() > windows:
                        continue
                    b = r.uniform(0.35, 1.0)
                    d.rectangle(
                        [x + cx * cw + cw * 0.2, top + cy * ch + ch * 0.22,
                         x + cx * cw + cw * 0.72, top + cy * ch + ch * 0.62],
                        fill=(int(lit[0] * b), int(lit[1] * b), int(lit[2] * b), int(alpha * 0.9)),
                    )
        x += bw + r.uniform(0.002, 0.012) * w


def facade(d, x0, y0, x1, y1, floors, cols, lit, seed, warm=True, balconies=True,
           crown=True, reflection=0.35):
    """Curtain-wall tower face with slab lines, mullions, lit windows, balconies."""
    r = random.Random(seed)
    w = x1 - x0
    h = y1 - y0
    # glass base: darker at the edges, lighter toward the top-centre
    d.rectangle([x0, y0, x1, y1], fill=(17, 22, 30, 255))
    steps = 26
    for i in range(steps):
        f = i / (steps - 1)
        yy0 = y0 + h * f
        yy1 = y0 + h * (f + 1 / steps) + 1
        shade = 0.55 + 0.45 * math.sin(f * math.pi) * reflection
        edge = 1 - 0.35 * abs(f - 0.5) * 2
        c = int(20 * shade * edge + 8)
        d.rectangle([x0, yy0, x1, yy1], fill=(c, c + 4, c + 9, 255))
    floor_h = h / floors
    col_w = w / cols
    for fl in range(floors):
        fy = y0 + fl * floor_h
        d.line([x0, fy, x1, fy], fill=(8, 10, 14, 210), width=max(1, int(h / 900)))
        if balconies and fl % 3 == 1:
            d.rectangle([x0, fy + floor_h * 0.66, x1, fy + floor_h * 0.82],
                        fill=(28, 32, 40, 235))
            d.line([x0, fy + floor_h * 0.66, x1, fy + floor_h * 0.66],
                   fill=(120, 124, 132, 60), width=1)
        for cl in range(cols):
            cx = x0 + cl * col_w
            if cl and cl % max(2, cols // 6) == 0:
                d.line([cx, fy, cx, fy + floor_h], fill=(8, 10, 14, 120), width=1)
            if r.random() > lit:
                continue
            b = r.uniform(0.3, 1.0)
            if warm and r.random() > 0.25:
                col = (int(244 * b), int(226 * b), int(192 * b))
            else:
                col = (int(198 * b), int(212 * b), int(228 * b))
            d.rectangle(
                [cx + col_w * 0.16, fy + floor_h * 0.18,
                 cx + col_w * 0.84, fy + floor_h * 0.68],
                fill=col + (int(210 * b),),
            )
    if crown:
        d.rectangle([x0, y0, x1, y0 + max(2, h * 0.006)], fill=(255, 236, 205, 220))
        d.rectangle([x0 + w * 0.42, y0 - h * 0.012, x0 + w * 0.58, y0], fill=(30, 34, 42, 255))
        d.ellipse([x0 + w * 0.485, y0 - h * 0.022, x0 + w * 0.515, y0 - h * 0.008],
                  fill=(255, 210, 160, 230))
    # vertical mullion sheen
    for i in range(3):
        mx = x0 + w * (0.18 + 0.3 * i)
        d.line([mx, y0, mx, y1], fill=(255, 255, 255, 12), width=max(1, int(w / 200)))


def tower(w, h, cx, base_y, tw, th, seed, lit=0.5, floors=None, cols=None):
    """Full tower with two faces for a sense of volume."""
    x0 = cx - tw / 2
    x1 = cx + tw / 2
    y0 = base_y - th
    side = tw * 0.16
    # side face (darker, angled)
    d_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(d_layer, "RGBA")
    d.polygon([(x1, y0 + th * 0.02), (x1 + side, y0 + th * 0.035),
               (x1 + side, base_y), (x1, base_y)], fill=(11, 14, 19, 255))
    facade(d, x0, y0, x1, base_y, floors or max(10, int(th / 26)), cols or max(4, int(tw / 26)),
           lit, seed, reflection=0.45)
    return d_layer


def blend(img, layer):
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


# --------------------------------------------------------------------------- #
# opening film
# --------------------------------------------------------------------------- #

DUSK = [
    (0.00, (5, 9, 16)),
    (0.30, (12, 19, 31)),
    (0.55, (30, 38, 52)),
    (0.72, (80, 72, 76)),
    (0.83, (150, 114, 90)),
    (0.90, (196, 148, 106)),
    (1.00, (24, 23, 26)),
]


def _hero_composition(w, h, t, seed=11, wide=1.0):
    """Shared framing so the two film sequences join seamlessly.

    `t` 0 → far approach, 1 → tower fills the frame. `wide` stretches the city.
    """
    S = SS
    W, H = w * S, h * S
    horizon = H * (0.745 - 0.055 * t)
    arr = vertical_gradient(W, H, DUSK)
    sun_x = W * (0.70 - 0.10 * t)
    arr += glow(W, H, sun_x, horizon - H * 0.01, W * 0.5, (255, 196, 140), 0.5, 2.4)
    arr += band_glow(W, H, horizon - H * 0.16, horizon + H * 0.02, (255, 170, 110), 0.07)
    img = to_img(arr).convert("RGBA")

    d = ImageDraw.Draw(img, "RGBA")
    # three skyline layers, each parallaxing outward as we approach
    for i, (sc, alpha, dy, win) in enumerate(
        [(0.60, 62, 0.012, 0.03), (0.82, 92, 0.028, 0.06), (1.10, 128, 0.05, 0.10)]
    ):
        off = W * (0.012 * i * (1 - t)) * (1 if i % 2 == 0 else -1)
        skyline(d, W, horizon + H * dy, (9, 13, 19), alpha, seed + i * 7,
                sc * wide, windows=win * (0.4 + t))
        img = Image.alpha_composite(Image.new("RGBA", (W, H), (0, 0, 0, 0)), img) if off else img

    # podium / grounds
    pod_w = W * (0.20 + 0.30 * t)
    pod_h = H * (0.02 + 0.03 * t)
    px0 = W * 0.5 - pod_w / 2
    d.rectangle([px0, horizon + H * 0.055 - pod_h, px0 + pod_w, horizon + H * 0.055],
                fill=(12, 16, 22, 255))
    d.line([px0, horizon + H * 0.055 - pod_h, px0 + pod_w, horizon + H * 0.055 - pod_h],
           fill=(255, 226, 190, 46), width=max(1, int(H / 900)))
    for i in range(7):
        lx = px0 + pod_w * (0.08 + i * 0.14)
        d.ellipse([lx - W * 0.004, horizon + H * 0.048, lx + W * 0.004, horizon + H * 0.058],
                  fill=(24, 34, 30, 200))

    tw = W * (0.055 + 0.24 * t)
    th = H * (0.40 + 0.72 * t)
    cx = W * (0.50 + 0.012 * math.sin(t * 2.4))
    base = horizon + H * 0.055
    layer = tower(W, H, cx, base, tw, th, seed, lit=0.22 + 0.5 * t)
    img = blend(img, layer)
    # crown halo
    arr = np.array(img, float)
    arr += glow(W, H, cx, base - th, W * 0.09, (255, 236, 202), 0.55, 2.2)
    arr += glow(W, H, cx, base - th * 0.55, W * 0.30, (150, 170, 200), 0.10, 2.0)
    return down(to_img(arr), w, h)


def scene_approach(w, h, t, seed=11):
    """Far to mid approach: the tower rises out of the dusk skyline."""
    return finish(_hero_composition(w, h, t, seed), 3.0, 0.40, 1)


def scene_ascend(w, h, t, seed=12):
    """Continues from the approach framing and cranes up the facade."""
    S = SS
    W, H = w * S, h * S
    horizon = H * (0.80 + 0.16 * t)
    arr = vertical_gradient(W, H, DUSK)
    arr += glow(W, H, W * (0.62 - 0.06 * t), horizon - H * 0.02, W * 0.6, (255, 190, 136), 0.55, 2.4)
    img = to_img(arr).convert("RGBA")
    d = ImageDraw.Draw(img, "RGBA")
    for i, (sc, alpha, win) in enumerate([(0.62, 70, 0.05), (0.86, 100, 0.09), (1.12, 135, 0.13)]):
        skyline(d, W, horizon + H * (0.01 + i * 0.02), (9, 13, 19), alpha,
                seed + i * 5, sc, windows=win)
    # passing floor slabs give the crane move parallax
    for i in range(7):
        p = (t * 1.5 + i * 0.17) % 1.0
        y = H * (-0.25 + p * 1.7)
        depth = (0.25 + 0.75 * abs(math.sin(p * math.pi))) * (0.35 + 0.65 * t)
        x0 = -W * 0.15 + i * W * 0.19
        d.rectangle([x0, y, x0 + W * 0.5, y + H * 0.045 * depth], fill=(15, 19, 26, int(150 * depth)))
        d.line([x0, y, x0 + W * 0.5, y], fill=(226, 206, 176, int(38 * depth)), width=1)
        win_h = max(H * 0.006, H * 0.024 * depth)
        for k in range(7):
            d.rectangle([x0 + k * W * 0.07, y + H * 0.006, x0 + k * W * 0.07 + W * 0.03,
                         y + H * 0.006 + win_h],
                        fill=(236, 218, 184, int(120 * depth)))
    # hero tower: matches approach t=1 framing then grows and drifts
    tw = W * (0.295 + 0.10 * t)
    th = H * (1.12 + 0.42 * t)
    base = H * (1.10 + 0.08 * t)
    cx = W * (0.50 + 0.045 * t)
    layer = tower(W, H, cx, base, tw, th, seed, lit=0.48 + 0.22 * t)
    img = blend(img, layer)
    arr = np.array(img, float)
    arr += glow(W, H, cx, base - th, W * 0.10, (255, 236, 202), 0.42, 2.2)
    return finish(down(to_img(arr), w, h), 3.2, 0.42, 2)


def final_frame(w, h, seed=3):
    """The completed building, dusk, symmetric — the anchor still."""
    S = SS
    W, H = w * S, h * S
    horizon = H * 0.84
    arr = vertical_gradient(W, H, DUSK)
    arr += glow(W, H, W * 0.66, horizon - H * 0.05, W * 0.6, (255, 196, 146), 0.6, 2.3)
    img = to_img(arr).convert("RGBA")
    d = ImageDraw.Draw(img, "RGBA")
    for i, (sc, alpha, win) in enumerate([(0.58, 58, 0.05), (0.84, 92, 0.09), (1.14, 130, 0.12)]):
        skyline(d, W, horizon + H * (0.0 + i * 0.012), (9, 13, 19), alpha, seed + i * 3, sc, windows=win)
    # podium with pools + planting
    pod_w, pod_h = W * 0.66, H * 0.075
    px0 = W * 0.5 - pod_w / 2
    py0 = horizon + H * 0.02 - pod_h
    d.rectangle([px0, py0, px0 + pod_w, horizon + H * 0.03], fill=(13, 17, 23, 255))
    d.line([px0, py0, px0 + pod_w, py0], fill=(255, 228, 194, 110), width=max(1, int(H / 620)))
    for i in range(5):
        lx = px0 + pod_w * (0.08 + i * 0.21)
        d.ellipse([lx - W * 0.018, py0 + pod_h * 0.25, lx + W * 0.018, py0 + pod_h * 0.78],
                  fill=(22, 62, 78, 190))
        d.ellipse([lx - W * 0.016, py0 + pod_h * 0.3, lx + W * 0.016, py0 + pod_h * 0.72],
                  fill=(34, 96, 118, 200))
    for i in range(10):
        lx = px0 + pod_w * (0.03 + i * 0.1)
        d.ellipse([lx - W * 0.005, py0 + pod_h * 0.02, lx + W * 0.005, py0 + pod_h * 0.2],
                  fill=(22, 34, 28, 220))
    layer = tower(W, H, W * 0.5, py0 + H * 0.004, W * 0.235, H * 0.80, seed, lit=0.52,
                  floors=52, cols=13)
    img = blend(img, layer)
    arr = np.array(img, float)
    arr += glow(W, H, W * 0.5, py0 - H * 0.8, W * 0.12, (255, 236, 204), 0.3, 2.2)
    return finish(down(to_img(arr), w, h), 3.0, 0.38, 3)


# --------------------------------------------------------------------------- #
# interiors
# --------------------------------------------------------------------------- #


def interior(w, h, room, seed=40, ss=None):
    S = ss or SS
    W, H = w * S, h * S
    r = random.Random(seed)
    palettes = {
        "living": [(28, 24, 21), (74, 62, 50), (22, 20, 18)],
        "kitchen": [(22, 24, 24), (64, 64, 60), (19, 20, 20)],
        "bedroom": [(26, 22, 25), (68, 56, 54), (21, 18, 19)],
        "bathroom": [(24, 26, 28), (66, 67, 65), (20, 21, 22)],
        "lobby": [(24, 20, 17), (58, 48, 40), (18, 16, 15)],
    }
    p = palettes.get(room, palettes["living"])
    arr = vertical_gradient(W, H, [(0.0, p[0]), (0.55, p[1]), (1.0, p[2])])
    arr += glow(W, H, W * 0.74, H * 0.32, W * 0.5, (255, 234, 202), 0.62, 2.2)
    img = to_img(arr).convert("RGBA")
    d = ImageDraw.Draw(img, "RGBA")

    # window / arch of light
    if room in ("living", "bedroom"):
        wx0, wx1 = W * 0.60, W * 0.94
        d.rounded_rectangle([wx0, H * 0.08, wx1, H * 0.94], radius=int(W * 0.17),
                            fill=(255, 240, 216, 230))
        d.rounded_rectangle([wx0 + W * 0.02, H * 0.12, wx1 - W * 0.02, H * 0.90],
                            radius=int(W * 0.14), fill=(255, 248, 234, 255))
        for i in range(4):
            gx = wx0 + (wx1 - wx0) * (0.2 + i * 0.2)
            d.line([(gx, H * 0.08), (gx, H * 0.94)], fill=(24, 26, 30, 40), width=2)
        d.line([(wx0, H * 0.5), (wx1, H * 0.5)], fill=(24, 26, 30, 50), width=2)
    elif room == "kitchen":
        d.rectangle([W * 0.55, H * 0.06, W * 0.96, H * 0.9], fill=(255, 242, 220, 210))
        d.line([(W * 0.755, H * 0.06), (W * 0.755, H * 0.9)], fill=(20, 22, 26, 120), width=3)
    elif room == "bathroom":
        d.rectangle([W * 0.62, H * 0.10, W * 0.9, H * 0.7], fill=(255, 246, 230, 190))
        d.rectangle([W * 0.62, H * 0.10, W * 0.9, H * 0.7], outline=(30, 32, 36, 90), width=3)

    # furniture silhouettes per room
    if room == "living":
        d.rounded_rectangle([W * 0.08, H * 0.62, W * 0.5, H * 0.86], radius=int(W * 0.02),
                            fill=(15, 17, 21, 225))
        d.rounded_rectangle([W * 0.10, H * 0.60, W * 0.34, H * 0.72], radius=int(W * 0.015),
                            fill=(24, 26, 31, 220))
        d.ellipse([W * 0.30, H * 0.80, W * 0.46, H * 0.90], fill=(34, 30, 26, 220))
        d.ellipse([W * 0.06, H * 0.84, W * 0.6, H * 0.98], fill=(20, 22, 26, 120))
    elif room == "kitchen":
        d.rounded_rectangle([W * 0.08, H * 0.58, W * 0.56, H * 0.88], radius=8,
                            fill=(20, 22, 24, 235))
        d.rectangle([W * 0.08, H * 0.56, W * 0.56, H * 0.60], fill=(52, 52, 50, 220))
        for i in range(3):
            lx = W * (0.18 + i * 0.14)
            d.line([(lx, H * 0.06), (lx, H * 0.34)], fill=(18, 20, 22, 200), width=3)
            d.ellipse([lx - W * 0.02, H * 0.32, lx + W * 0.02, H * 0.38],
                      fill=(255, 232, 190, 220))
    elif room == "bedroom":
        d.rounded_rectangle([W * 0.10, H * 0.62, W * 0.62, H * 0.92], radius=10,
                            fill=(18, 19, 23, 235))
        d.rounded_rectangle([W * 0.08, H * 0.46, W * 0.64, H * 0.64], radius=10,
                            fill=(30, 29, 33, 230))
        for i in range(2):
            lx = W * (0.14 + i * 0.44)
            d.rectangle([lx, H * 0.50, lx + W * 0.05, H * 0.62], fill=(28, 28, 32, 220))
            d.ellipse([lx + W * 0.005, H * 0.46, lx + W * 0.045, H * 0.52],
                      fill=(255, 226, 186, 190))
        d.rectangle([W * 0.86, H * 0.06, W * 0.92, H * 0.94], fill=(255, 246, 232, 90))
    elif room == "bathroom":
        d.ellipse([W * 0.12, H * 0.62, W * 0.46, H * 0.86], fill=(240, 238, 232, 235))
        d.ellipse([W * 0.15, H * 0.65, W * 0.43, H * 0.82], fill=(210, 212, 210, 220))
        d.rounded_rectangle([W * 0.52, H * 0.56, W * 0.92, H * 0.72], radius=6,
                            fill=(34, 34, 36, 235))
        d.rectangle([W * 0.62, H * 0.16, W * 0.82, H * 0.5], fill=(255, 250, 240, 150))
        d.rectangle([W * 0.62, H * 0.16, W * 0.82, H * 0.5], outline=(40, 42, 46, 120), width=3)
    elif room == "lobby":
        # ceiling band + cove
        d.rectangle([0, 0, W, H * 0.18], fill=(16, 13, 11, 255))
        d.rectangle([0, H * 0.155, W, H * 0.175], fill=(255, 226, 178, 60))
        for i in range(9):
            cx = W * (0.06 + i * 0.11)
            d.ellipse([cx - W * 0.012, H * 0.06, cx + W * 0.012, H * 0.085],
                      fill=(255, 236, 202, 170))
        # glass curtain wall, right
        gx0, gx1 = W * 0.56, W * 0.985
        d.rectangle([gx0, H * 0.12, gx1, H * 0.90], fill=(255, 242, 220, 205))
        d.rectangle([gx0, H * 0.12, gx1, H * 0.46], fill=(255, 246, 228, 230))
        for i in range(1, 6):
            mx = gx0 + (gx1 - gx0) * i / 6
            d.line([(mx, H * 0.12), (mx, H * 0.90)], fill=(22, 20, 18, 120), width=3)
        d.line([(gx0, H * 0.46), (gx1, H * 0.46)], fill=(22, 20, 18, 110), width=3)
        # feature wall with slats, left
        fx0, fx1 = W * 0.04, W * 0.46
        d.rectangle([fx0, H * 0.16, fx1, H * 0.70], fill=(34, 29, 24, 255))
        for i in range(16):
            sx = fx0 + (fx1 - fx0) * i / 16
            d.rectangle([sx, H * 0.16, sx + (fx1 - fx0) / 32, H * 0.70], fill=(46, 39, 32, 220))
        d.rectangle([fx0 + (fx1 - fx0) * 0.28, H * 0.24, fx1 - (fx1 - fx0) * 0.28, H * 0.58],
                    fill=(214, 190, 158, 120))
        # console under the wall
        d.rectangle([fx0 + (fx1 - fx0) * 0.2, H * 0.70, fx1 - (fx1 - fx0) * 0.2, H * 0.755],
                    fill=(26, 22, 19, 245))
        d.rectangle([fx0 + (fx1 - fx0) * 0.2, H * 0.695, fx1 - (fx1 - fx0) * 0.2, H * 0.71],
                    fill=(120, 100, 78, 220))
        # reception desk, centre
        dx0, dx1 = W * 0.20, W * 0.64
        d.rounded_rectangle([dx0, H * 0.60, dx1, H * 0.80], radius=6, fill=(28, 24, 20, 250))
        d.rectangle([dx0 - W * 0.008, H * 0.585, dx1 + W * 0.008, H * 0.615], fill=(96, 82, 64, 240))
        d.rectangle([dx0 + W * 0.02, H * 0.615, dx1 - W * 0.02, H * 0.635],
                    fill=(255, 224, 176, 55))
        d.rectangle([dx0 + (dx1 - dx0) * 0.36, H * 0.63, dx1 - (dx1 - dx0) * 0.36, H * 0.70],
                    fill=(214, 196, 168, 45))
        # seating
        for i in range(2):
            ax = W * (0.70 + i * 0.11)
            d.rounded_rectangle([ax, H * 0.66, ax + W * 0.075, H * 0.80], radius=8,
                                fill=(22, 20, 18, 245))
            d.rounded_rectangle([ax + W * 0.006, H * 0.63, ax + W * 0.069, H * 0.68], radius=6,
                                fill=(30, 27, 24, 240))
        # planter
        d.rounded_rectangle([W * 0.50, H * 0.66, W * 0.55, H * 0.80], radius=6, fill=(20, 18, 16, 245))
        for i in range(7):
            lx = W * (0.505 + i * 0.007)
            d.line([(lx, H * 0.66), (lx + W * 0.01, H * 0.52)], fill=(38, 52, 38, 220), width=3)

    # floor sheen
    d.rectangle([0, H * 0.86, W, H], fill=(255, 240, 220, 26))
    return finish(down(img, w, h), 3.2, 0.30, seed)


def reception(w, h, seed=21):
    return interior(w, h, "lobby", seed, ss=1)


# --------------------------------------------------------------------------- #
# amenities
# --------------------------------------------------------------------------- #


def amenity(w, h, kind, seed=5):
    S = SS
    W, H = w * S, h * S
    r = random.Random(seed)
    if kind == "pool":
        arr = vertical_gradient(W, H, [
            (0.0, (14, 26, 36)), (0.32, (22, 70, 92)), (0.62, (58, 138, 156)), (1.0, (12, 28, 40)),
        ])
        yy, xx = np.mgrid[0:H, 0:W]
        caust = (np.sin(xx / 24 + np.sin(yy / 41) * 3.1) + np.cos(yy / 29 - xx / 90)) * 0.5
        arr += caust[:, :, None] * np.array([26, 44, 46])[None, None, :]
        arr += glow(W, H, W * 0.28, H * 0.26, W * 0.5, (255, 232, 198), 0.55)
        img = to_img(arr).convert("RGBA")
        d = ImageDraw.Draw(img, "RGBA")
        d.rectangle([0, 0, W, H * 0.16], fill=(18, 20, 22, 200))
        for i in range(4):
            lx = W * (0.12 + i * 0.26)
            d.rounded_rectangle([lx, H * 0.05, lx + W * 0.14, H * 0.15], radius=8,
                                fill=(238, 236, 230, 220))
        return finish(down(img, w, h), 3.2, 0.34, seed)
    if kind == "gym":
        arr = vertical_gradient(W, H, [(0.0, (10, 12, 15)), (0.55, (22, 25, 30)), (1.0, (9, 11, 14))])
        arr += glow(W, H, W * 0.62, H * 0.36, W * 0.42, (226, 176, 120), 0.35)
        img = to_img(arr).convert("RGBA")
        d = ImageDraw.Draw(img, "RGBA")
        for i in range(3):
            y = H * (0.5 + i * 0.13)
            d.rounded_rectangle([W * 0.1, y, W * 0.42, y + H * 0.035], radius=6,
                                fill=(16, 18, 22, 240))
            d.ellipse([W * 0.12, y - H * 0.012, W * 0.15, y + H * 0.01], fill=(10, 12, 15, 240))
            d.ellipse([W * 0.37, y - H * 0.012, W * 0.40, y + H * 0.01], fill=(10, 12, 15, 240))
        for i in range(4):
            x = W * (0.55 + i * 0.1)
            d.rectangle([x, H * 0.2, x + W * 0.012, H * 0.9], fill=(24, 26, 30, 220))
        d.rectangle([W * 0.6, H * 0.22, W * 0.96, H * 0.86], fill=(255, 236, 202, 22))
        return finish(down(img, w, h), 3.0, 0.36, seed)
    if kind == "steam":
        arr = vertical_gradient(W, H, [(0.0, (32, 34, 38)), (0.5, (92, 92, 96)), (1.0, (26, 28, 32))])
        arr += glow(W, H, W * 0.5, H * 0.55, W * 0.6, (255, 255, 255), 0.55)
        img = to_img(arr).convert("RGBA")
        d = ImageDraw.Draw(img, "RGBA")
        for i in range(3):
            y = H * (0.58 + i * 0.12)
            d.rounded_rectangle([W * 0.12, y, W * 0.88, y + H * 0.05], radius=8,
                                fill=(64, 58, 52, 170))
        return finish(down(img, w, h), 3.0, 0.30, seed)
    if kind == "zen":
        arr = vertical_gradient(W, H, [(0.0, (11, 19, 15)), (0.5, (28, 50, 37)), (1.0, (9, 15, 12))])
        arr += glow(W, H, W * 0.7, H * 0.28, W * 0.5, (214, 232, 190), 0.4)
        img = to_img(arr).convert("RGBA")
        d = ImageDraw.Draw(img, "RGBA")
        for i in range(14):
            x = r.uniform(0.05, 0.95) * W
            y = r.uniform(0.45, 0.95) * H
            s = r.uniform(0.02, 0.07) * W
            d.ellipse([x - s, y - s * 0.7, x + s, y + s * 0.7], fill=(18, 32, 24, 200))
            d.ellipse([x - s * 0.5, y - s * 0.9, x + s * 0.5, y + s * 0.4], fill=(24, 42, 30, 190))
        for i in range(3):
            y = H * (0.72 + i * 0.08)
            d.line([(0, y), (W, y - H * 0.03)], fill=(60, 56, 50, 150), width=int(H * 0.012))
        return finish(down(img, w, h), 3.2, 0.34, seed)
    if kind == "yoga":
        arr = vertical_gradient(W, H, [(0.0, (34, 29, 25)), (0.5, (74, 63, 52)), (1.0, (26, 22, 20))])
        arr += glow(W, H, W * 0.28, H * 0.32, W * 0.5, (255, 226, 186), 0.55)
        img = to_img(arr).convert("RGBA")
        d = ImageDraw.Draw(img, "RGBA")
        d.rectangle([W * 0.58, H * 0.06, W * 0.98, H * 0.94], fill=(255, 240, 214, 200))
        for i in range(4):
            gx = W * (0.58 + i * 0.1)
            d.line([(gx, H * 0.06), (gx, H * 0.94)], fill=(28, 26, 22, 80), width=3)
        for i in range(4):
            x = W * (0.08 + i * 0.13)
            d.rounded_rectangle([x, H * 0.68, x + W * 0.09, H * 0.74], radius=6,
                                fill=(40, 44, 40, 220))
        return finish(down(img, w, h), 3.2, 0.32, seed)
    if kind == "terrace":
        arr = vertical_gradient(W, H, [
            (0.0, (7, 11, 18)), (0.45, (26, 36, 50)), (0.74, (140, 112, 96)), (1.0, (18, 20, 24)),
        ])
        arr += glow(W, H, W * 0.66, H * 0.70, W * 0.55, (255, 196, 142), 0.6)
        img = to_img(arr).convert("RGBA")
        d = ImageDraw.Draw(img, "RGBA")
        skyline(d, W, H * 0.74, (10, 14, 20), 120, seed, 0.9, windows=0.09)
        for i in range(5):
            lx = W * (0.06 + i * 0.22)
            d.rounded_rectangle([lx, H * 0.66, lx + W * 0.15, H * 0.74], radius=8,
                                fill=(20, 24, 28, 220))
            d.ellipse([lx + W * 0.01, H * 0.60, lx + W * 0.05, H * 0.68],
                      fill=(22, 34, 28, 230))
        d.rectangle([0, H * 0.86, W, H], fill=(14, 16, 20, 240))
        return finish(down(img, w, h), 3.2, 0.36, seed)
    if kind == "map":
        arr = vertical_gradient(W, H, [(0.0, (11, 15, 20)), (1.0, (17, 23, 29))])
        img = to_img(arr).convert("RGBA")
        d = ImageDraw.Draw(img, "RGBA")
        # podium outline
        d.rounded_rectangle([W * 0.04, H * 0.06, W * 0.96, H * 0.94], radius=int(W * 0.02),
                            outline=(246, 244, 241, 46), width=3)
        # pools
        d.rounded_rectangle([W * 0.12, H * 0.34, W * 0.32, H * 0.52], radius=int(W * 0.01),
                            fill=(30, 92, 112, 190), outline=(246, 244, 241, 40))
        d.rounded_rectangle([W * 0.34, H * 0.10, W * 0.46, H * 0.22], radius=int(W * 0.01),
                            fill=(30, 92, 112, 170), outline=(246, 244, 241, 40))
        d.ellipse([W * 0.18, H * 0.80, W * 0.27, H * 0.92], fill=(28, 86, 106, 180))
        # courts
        d.rectangle([W * 0.48, H * 0.08, W * 0.60, H * 0.20], outline=(246, 244, 241, 50), width=2)
        d.line([(W * 0.54, H * 0.08), (W * 0.54, H * 0.20)], fill=(246, 244, 241, 50), width=2)
        d.rectangle([W * 0.06, H * 0.58, W * 0.20, H * 0.72], outline=(246, 244, 241, 50), width=2)
        # walking track
        d.rounded_rectangle([W * 0.05, H * 0.04, W * 0.95, H * 0.96], radius=int(W * 0.05),
                            outline=(246, 244, 241, 26), width=6)
        # paths
        d.line([(W * 0.5, H * 0.02), (W * 0.5, H * 0.98)], fill=(246, 244, 241, 30), width=3)
        d.line([(W * 0.02, H * 0.5), (W * 0.98, H * 0.5)], fill=(246, 244, 241, 30), width=3)
        # planting clusters
        for i in range(26):
            x, y = r.uniform(0.05, 0.95) * W, r.uniform(0.05, 0.95) * H
            s = r.uniform(0.006, 0.018) * W
            d.ellipse([x - s, y - s, x + s, y + s], fill=(30, 52, 38, 150))
        # building footprint
        d.rounded_rectangle([W * 0.42, H * 0.34, W * 0.62, H * 0.70], radius=6,
                            fill=(22, 26, 32, 230), outline=(246, 244, 241, 60), width=2)
        return finish(down(img, w, h), 2.4, 0.28, seed)
    # fallback
    arr = vertical_gradient(W, H, [(0.0, (13, 17, 23)), (1.0, (24, 30, 38))])
    return finish(down(to_img(arr), w, h), 3.0, 0.34, seed)


# --------------------------------------------------------------------------- #
# plans + elevation + brand
# --------------------------------------------------------------------------- #


def floorplate(w, h, level, seed=21):
    """Architectural plate: light ground, dark walls, core, dimension ticks."""
    S = SS
    W, H = w * S, h * S
    r = random.Random(seed)
    img = Image.new("RGB", (W, H), (246, 244, 241))
    d = ImageDraw.Draw(img, "RGBA")
    grid = (234, 232, 228)
    for gx in range(0, W, 40 * S):
        d.line([(gx, 0), (gx, H)], fill=grid, width=1)
    for gy in range(0, H, 40 * S):
        d.line([(0, gy), (W, gy)], fill=grid, width=1)

    m = 70 * S
    env = (m, 60 * S, W - m, H - 60 * S)
    core = (600 * S, 300 * S, 800 * S, 600 * S)
    corridor = 26 * S
    d.rectangle(env, outline=(18, 22, 28), width=5 * S)
    d.rectangle(core, outline=(18, 22, 28), width=4 * S)
    d.line([(core[0] + 20 * S, (core[1] + core[3]) / 2, core[2] - 20 * S, (core[1] + core[3]) / 2)],
           fill=(18, 22, 28), width=2 * S)
    d.rectangle((core[0] + 20 * S, core[1] + 20 * S, core[0] + 80 * S, core[1] + 100 * S),
                outline=(150, 152, 156), width=2 * S)
    d.rectangle((core[2] - 80 * S, core[3] - 100 * S, core[2] - 20 * S, core[3] - 20 * S),
                outline=(150, 152, 156), width=2 * S)
    d.rectangle((core[0] - corridor, core[1] - corridor, core[2] + corridor, core[3] + corridor),
                outline=(150, 152, 156), width=2 * S)

    split = core[1] + (core[3] - core[1]) * r.uniform(0.42, 0.58)
    boxes = [
        ((m, 60 * S, core[0] - corridor, split), "a"),
        ((m, split, core[0] - corridor, H - 60 * S), "b"),
        ((core[2] + corridor, 60 * S, W - m, split), "c"),
        ((core[2] + corridor, split, W - m, H - 60 * S), "d"),
        ((core[0] - corridor, 60 * S, core[2] + corridor, core[1] - corridor), "e"),
        ((core[0] - corridor, core[3] + corridor, core[2] + corridor, H - 60 * S), "f"),
    ]
    if level in ("03", "07", "11"):
        boxes = [b for b in boxes if b[1] != "e"]
    if level in ("05", "13"):
        boxes = [b for b in boxes if b[1] != "f"]
    for box, tag in boxes:
        x0, y0, x1, y1 = box
        if x1 - x0 < 60 * S or y1 - y0 < 60 * S:
            continue
        d.rectangle(box, outline=(18, 22, 28), width=3 * S)
        if r.random() < 0.7:
            if x1 - x0 > y1 - y0:
                d.line([(x0 + 20 * S, y1 + 14 * S), (x1 - 20 * S, y1 + 14 * S)],
                       fill=(150, 152, 156), width=2 * S)
            else:
                d.line([(x1 + 14 * S, y0 + 20 * S), (x1 + 14 * S, y1 - 20 * S)],
                       fill=(150, 152, 156), width=2 * S)
    for x in range(100 * S, W - 80 * S, 100 * S):
        d.line([(x, 34 * S), (x, 46 * S)], fill=(150, 152, 156), width=1)
    for y in range(90 * S, H - 60 * S, 100 * S):
        d.line([(40 * S, y), (52 * S, y)], fill=(150, 152, 156), width=1)
    # north arrow + title block
    ax, ay = W - 90 * S, 90 * S
    d.line([(ax, ay + 26 * S), (ax, ay - 10 * S)], fill=(18, 22, 28), width=2 * S)
    d.polygon([(ax, ay - 22 * S), (ax - 7 * S, ay - 6 * S), (ax + 7 * S, ay - 6 * S)],
              fill=(18, 22, 28))
    d.rectangle((60 * S, H - 52 * S, 320 * S, H - 26 * S), outline=(18, 22, 28), width=2 * S)
    d.line([(200 * S, H - 52 * S), (200 * S, H - 26 * S)], fill=(18, 22, 28), width=2 * S)
    return down(img, w, h)


def unit_plan(w, h, variant, seed=30):
    S = SS
    W, H = w * S, h * S
    img = Image.new("RGB", (W, H), (246, 244, 241))
    d = ImageDraw.Draw(img, "RGBA")
    for gx in range(0, W, 40 * S):
        d.line([(gx, 0), (gx, H)], fill=(234, 232, 228), width=1)
    for gy in range(0, H, 40 * S):
        d.line([(0, gy), (W, gy)], fill=(234, 232, 228), width=1)
    d.rectangle((50 * S, 50 * S, W - 50 * S, H - 50 * S), outline=(18, 22, 28), width=5 * S)
    if variant == "1-bedroom":
        d.line([(620 * S, 50 * S), (620 * S, H - 50 * S)], fill=(18, 22, 28), width=4 * S)
        d.rounded_rectangle((90 * S, 90 * S, 470 * S, 330 * S), radius=10 * S,
                            fill=(226, 224, 220, 200))
        d.ellipse((150 * S, 380 * S, 470 * S, 700 * S), fill=(230, 228, 224, 180))
        d.rounded_rectangle((90 * S, 380 * S, 300 * S, 470 * S), radius=8 * S,
                            fill=(220, 218, 214, 200))
        d.rectangle((700 * S, 90 * S, 780 * S, 170 * S), outline=(150, 152, 156), width=2 * S)
        d.rectangle((700 * S, 240 * S, W - 90 * S, 420 * S), outline=(150, 152, 156), width=2 * S)
    elif variant == "2-bedroom":
        d.line([(640 * S, 50 * S), (640 * S, H - 50 * S)], fill=(18, 22, 28), width=4 * S)
        d.line([(640 * S, 420 * S), (W - 50 * S, 420 * S)], fill=(18, 22, 28), width=4 * S)
        d.rounded_rectangle((80 * S, 80 * S, 520 * S, 340 * S), radius=10 * S,
                            fill=(226, 224, 220, 200))
        d.ellipse((120 * S, 400 * S, 420 * S, 720 * S), fill=(230, 228, 224, 180))
        d.rectangle((700 * S, 90 * S, W - 90 * S, 380 * S), outline=(150, 152, 156), width=2 * S)
        d.rectangle((700 * S, 460 * S, W - 90 * S, 700 * S), outline=(150, 152, 156), width=2 * S)
    else:
        d.line([(560 * S, 50 * S), (560 * S, H - 50 * S)], fill=(18, 22, 28), width=4 * S)
        d.line([(560 * S, 300 * S), (W - 50 * S, 300 * S)], fill=(18, 22, 28), width=4 * S)
        d.line([(560 * S, 560 * S), (W - 50 * S, 560 * S)], fill=(18, 22, 28), width=4 * S)
        d.rounded_rectangle((80 * S, 80 * S, 480 * S, 360 * S), radius=10 * S,
                            fill=(226, 224, 220, 200))
        d.ellipse((110 * S, 420 * S, 460 * S, 730 * S), fill=(230, 228, 224, 180))
        d.rectangle((620 * S, 90 * S, W - 90 * S, 260 * S), outline=(150, 152, 156), width=2 * S)
        d.rectangle((620 * S, 340 * S, W - 90 * S, 520 * S), outline=(150, 152, 156), width=2 * S)
        d.rectangle((620 * S, 600 * S, W - 90 * S, 740 * S), outline=(150, 152, 156), width=2 * S)
    d.rectangle((50 * S, 50 * S, W - 50 * S, H - 50 * S), outline=(18, 22, 28), width=5 * S)
    return down(img, w, h)


def elevation(w, h, seed=31):
    """Tall facade elevation for the finale portal."""
    S = SS
    W, H = w * S, h * S
    arr = vertical_gradient(W, H, [(0.0, (10, 14, 20)), (0.6, (22, 30, 40)), (1.0, (12, 16, 22))])
    img = to_img(arr).convert("RGBA")
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    facade(d, W * 0.06, H * 0.02, W * 0.94, H * 0.98, 54, 15, 0.6, seed, reflection=0.5)
    img = blend(img, layer)
    return finish(down(img, w, h), 2.8, 0.34, seed)


def logo(w=710, h=328):
    """Original placeholder wordmark — a simple serif lockup, no borrowed mark."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    try:
        big = ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia.ttf", 92)
        small = ImageFont.truetype("/System/Library/Fonts/Supplemental/Georgia.ttf", 24)
    except OSError:
        big = ImageFont.load_default(size=92)
        small = ImageFont.load_default(size=24)
    d.text((48, 96), "SAION", fill=(246, 244, 241, 240), font=big)
    # tracking rule + descriptor
    d.line([(52, 224), (w - 120, 224)], fill=(246, 244, 241, 90), width=2)
    d.text((52, 240), "P R O P E R T I E S", fill=(246, 244, 241, 170), font=small)
    d.rectangle([w - 84, 96, w - 56, 124], outline=(246, 244, 241, 150), width=2)
    d.rectangle([w - 78, 102, w - 62, 118], fill=(246, 244, 241, 120))
    return img
