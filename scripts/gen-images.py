"""生成小窝用的暖色调图片：暮色海报 + 4 张摄影占位 + OG。"""
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join("public", "images")
os.makedirs(OUT, exist_ok=True)
FONT_SERIF = r"C:\Windows\Fonts\simsun.ttc"
FONT_SANS = r"C:\Windows\Fonts\msyh.ttc"
FONT_LIGHT = r"C:\Windows\Fonts\msyhl.ttc"


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def gradient(w, h, stops):
    ys = np.linspace(0, 1, h)
    rgb = np.zeros((h, 3))
    for i in range(len(stops) - 1):
        p0, c0 = stops[i]
        p1, c1 = stops[i + 1]
        m = (ys >= p0) & (ys <= p1)
        t = smoothstep((ys[m] - p0) / max(p1 - p0, 1e-6))
        for k in range(3):
            rgb[m, k] = c0[k] + (c1[k] - c0[k]) * t
    return np.repeat(rgb[:, None, :], w, axis=1)


def radial(w, h, cx, cy, radius):
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / radius
    return np.clip(1 - d, 0, 1)


def bokeh(w, h, rng, count, color, rmin, rmax, blur):
    layer = Image.new("RGB", (w, h), (0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(count):
        r = rng.uniform(rmin, rmax)
        x = rng.uniform(0, w)
        y = rng.uniform(0, h)
        a = rng.uniform(0.25, 0.85)
        c = tuple(int(v * a) for v in color)
        d.ellipse([x - r, y - r, x + r, y + r], fill=c)
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(layer, dtype=float)


def finish(arr, seed, grain=2.6, vignette=0.55):
    h, w = arr.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx / w - 0.5) * 1.06) ** 2 + ((yy / h - 0.5) * 1.06) ** 2)
    vig = np.clip(1 - (d**2.3) * vignette, 0.42, 1)[..., None]
    arr = arr * vig
    noise = np.random.default_rng(seed).normal(0, grain, (h, w, 1))
    return Image.fromarray(np.clip(arr + noise, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------- 暮色海报
def make_poster(w=1600, h=900):
    base = gradient(w, h, [
        (0.0, (36, 30, 44)),
        (0.42, (86, 62, 78)),
        (0.68, (196, 122, 92)),
        (0.86, (242, 178, 118)),
        (1.0, (255, 222, 170)),
    ])
    # 窗外的光
    base = base + radial(w, h, w * 0.66, h * 0.72, w * 0.5)[..., None] * np.array([255, 196, 130]) * 0.55
    base = base + radial(w, h, w * 0.66, h * 0.72, w * 0.12)[..., None] * np.array([255, 240, 210]) * 0.5

    rng = random.Random(11)
    # 浮尘
    base = base + bokeh(w, h, rng, 90, (255, 214, 150), 3, 16, 6)
    # 远处的城市剪影
    sil = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(sil)
    x = 0
    yline = int(h * 0.78)
    while x < w:
        bw = rng.randint(int(w * 0.012), int(w * 0.07))
        bh = rng.randint(0, int(h * 0.16))
        d.rectangle([x, yline - bh, x + bw, h], fill=255)
        x += bw
    sil = sil.filter(ImageFilter.GaussianBlur(w / 1200))
    sa = np.asarray(sil, dtype=float)[..., None] / 255.0
    base = base * (1 - sa * 0.9) + np.array([26, 20, 28]) * (sa * 0.9)

    img = finish(base, 3, grain=3.0, vignette=0.6)
    return img


# ---------------------------------------------------------------- 摄影占位
JOBS = [
    ("photo-window", [(0.0, (58, 46, 46)), (0.5, (128, 92, 70)), (0.8, (232, 176, 118)), (1.0, (255, 236, 198))], (0.62, 0.55), 4),
    ("photo-coffee", [(0.0, (32, 24, 20)), (0.45, (86, 58, 38)), (0.78, (168, 110, 62)), (1.0, (232, 178, 116))], (0.42, 0.5), 8),
    ("photo-street", [(0.0, (28, 26, 42)), (0.4, (72, 62, 92)), (0.7, (176, 118, 96)), (1.0, (255, 208, 158))], (0.7, 0.62), 12),
    ("photo-desk", [(0.0, (30, 24, 22)), (0.42, (74, 52, 40)), (0.72, (152, 104, 66)), (1.0, (226, 172, 112))], (0.3, 0.42), 16),
]

for name, stops, sun, seed in JOBS:
    w, h = 1400, 1050
    arr = gradient(w, h, stops)
    rng = random.Random(seed)
    arr = arr + radial(w, h, w * sun[0], h * sun[1], w * 0.55)[..., None] * np.array([255, 200, 140]) * 0.5
    arr = arr + radial(w, h, w * sun[0], h * sun[1], w * 0.1)[..., None] * np.array([255, 244, 216]) * 0.55
    arr = arr + bokeh(w, h, rng, 60, (255, 206, 140), 4, 26, 10)
    img = finish(arr, seed, grain=2.4, vignette=0.62)
    img.save(os.path.join(OUT, f"{name}.jpg"), quality=86, optimize=True)
    print("saved", name, img.size)

# ---------------------------------------------------------------- OG
def make_og():
    w, h = 1200, 630
    img = make_poster(1600, 900).resize((w, h), Image.LANCZOS).convert("RGBA")
    overlay = Image.new("RGBA", (w, h), (24, 18, 24, 96))
    img = Image.alpha_composite(img, overlay)
    d = ImageDraw.Draw(img)
    try:
        f_big = ImageFont.truetype(FONT_LIGHT, 120)
        f_small = ImageFont.truetype(FONT_SANS, 26)
    except OSError:
        f_big = f_small = None
    if f_big:
        d.text((84, 200), "mm333", font=f_big, fill=(255, 246, 232))
        d.text((88, 350), "在自己的小窝里，慢慢来。", font=f_small, fill=(240, 220, 196))
    img.convert("RGB").save(os.path.join(OUT, "og.jpg"), quality=88, optimize=True)
    print("saved og.jpg")


poster = make_poster()
poster.save(os.path.join(OUT, "poster.jpg"), quality=86, optimize=True)
print("saved poster.jpg", poster.size)
make_og()
