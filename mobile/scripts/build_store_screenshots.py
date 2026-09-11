#!/usr/bin/env python3
"""
Build App Store marketing screenshots for RBT Genius.

Takes the raw in-app captures in `store-assets/<version>/en-US/iphone-6.9`
and `.../ipad-13` and wraps each one in a solid, saturated marketing frame
with a benefit-led headline.

Design rules (do not "soften" these -- they exist because the pale variant
was unreadable at App Store search-result thumbnail size):
  * Solid saturated background, one colour per screenshot. No pale gradients.
  * White headline, heavy weight, two lines max, a concrete number when possible.
  * Device capture bleeds off the bottom edge so the crop reads as deliberate.

Usage:  python3 mobile/scripts/build_store_screenshots.py [--version 1.1.3]
Requires: pip install pillow
"""

import argparse
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT_CANDIDATES_BOLD = [
    "/System/Library/Fonts/SFNSDisplay-Bold.otf",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
FONT_CANDIDATES_REGULAR = [
    "/System/Library/Fonts/SFNSText.ttf",
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def pick_font(candidates):
    for path in candidates:
        if os.path.exists(path):
            return path
    raise SystemExit("No usable font found. Install Liberation or DejaVu fonts.")


BOLD = pick_font(FONT_CANDIDATES_BOLD)
REGULAR = pick_font(FONT_CANDIDATES_REGULAR)

# Saturated palette. Each screenshot gets its own colour so the set reads as a
# sequence in the App Store carousel instead of one undifferentiated block.
BLUE = (29, 78, 216)
EMERALD = (4, 120, 87)
VIOLET = (109, 40, 217)
ORANGE = (194, 65, 12)
TEAL = (14, 116, 144)

IPHONE = {
    "dir": "iphone-6.9",
    "out": "iphone-6.9-marketing",
    "width": 1320,
    "height": 2868,
    "eyebrow_y": 150,
    "eyebrow_size": 34,
    "eyebrow_tracking": 9,
    "title_y": 232,
    "title_size": 108,
    "line_height": 126,
    "subtitle_y": 548,
    "subtitle_size": 41,
    "device_x": 130,
    "device_y": 768,
    "device_w": 1060,
    "radius": 68,
    "items": [
        {
            "file": "01-dashboard.png",
            "bg": BLUE,
            "title": ["Built for the", "2026 RBT exam"],
            "subtitle": "Aligned to the 3rd Edition outline — all 43 items",
        },
        {
            "file": "02-practice.png",
            "bg": EMERALD,
            "title": ["1,100+ questions", "with explanations"],
            "subtitle": "Every answer explained, not just marked right or wrong",
        },
        {
            "file": "03-analytics.png",
            "bg": VIOLET,
            "title": ["See exactly", "where you stand"],
            "subtitle": "Readiness score, accuracy and domain-by-domain breakdown",
        },
        {
            "file": "04-mock-exam.png",
            "bg": ORANGE,
            "title": ["85 questions.", "90 minutes."],
            "subtitle": "Full-length mock exams weighted like the real thing",
        },
        {
            "file": "05-flashcards.png",
            "bg": TEAL,
            "title": ["Drill your", "weak spots"],
            "subtitle": "Flashcards that target what you keep missing",
        },
    ],
}

IPAD = {
    "dir": "ipad-13",
    "out": "ipad-13-marketing",
    "width": 2064,
    "height": 2752,
    "eyebrow_y": 176,
    "eyebrow_size": 40,
    "eyebrow_tracking": 11,
    "title_y": 268,
    "title_size": 126,
    "line_height": 148,
    "subtitle_y": 632,
    "subtitle_size": 48,
    "device_x": 252,
    "device_y": 836,
    "device_w": 1560,
    "radius": 60,
    "items": [
        {
            "file": "01-practice.png",
            "bg": BLUE,
            "title": ["1,100+ questions", "with explanations"],
            "subtitle": "Aligned to the 3rd Edition outline — all 43 items",
        },
        {
            "file": "02-analytics.png",
            "bg": VIOLET,
            "title": ["See exactly", "where you stand"],
            "subtitle": "Readiness, accuracy and domain-by-domain breakdown",
        },
        {
            "file": "03-mock-exam.png",
            "bg": ORANGE,
            "title": ["85 questions.", "90 minutes."],
            "subtitle": "Full-length mock exams weighted like the real thing",
        },
        {
            "file": "04-flashcards.png",
            "bg": TEAL,
            "title": ["Drill your", "weak spots"],
            "subtitle": "Flashcards that target what you keep missing",
        },
    ],
}

EYEBROW = "RBT GENIUS · RBT EXAM PREP"


def mix(color, other, amount):
    """Blend `color` toward `other` by `amount` (0-1)."""
    return tuple(round(c + (o - c) * amount) for c, o in zip(color, other))


def draw_tracked_text(draw, xy, text, font, fill, tracking):
    """PIL has no letter-spacing, so place each glyph by hand."""
    x, y = xy
    for char in text:
        draw.text((x, y), char, font=font, fill=fill)
        x += draw.textlength(char, font=font) + tracking


def tracked_width(draw, text, font, tracking):
    return sum(draw.textlength(c, font=font) for c in text) + tracking * (len(text) - 1)


def _pad_to(layer, size, offset):
    """Place a small RGBA layer onto a transparent canvas of `size`."""
    base = Image.new("RGBA", size, (0, 0, 0, 0))
    base.paste(layer, offset)
    return base


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return mask


def build(spec, asset_root):
    in_dir = os.path.join(asset_root, spec["dir"])
    out_dir = os.path.join(asset_root, spec["out"])
    os.makedirs(out_dir, exist_ok=True)

    W, H = spec["width"], spec["height"]
    font_eyebrow = ImageFont.truetype(BOLD, spec["eyebrow_size"])
    font_title = ImageFont.truetype(BOLD, spec["title_size"])
    font_subtitle = ImageFont.truetype(REGULAR, spec["subtitle_size"])

    written = []
    for item in spec["items"]:
        bg = item["bg"]
        canvas = Image.new("RGB", (W, H), bg)

        # Depth: a slightly lighter wash in the upper third and a darker one at
        # the foot, so the flat fill doesn't read as a plain rectangle.
        glow = Image.new("RGB", (W, H), bg)
        gd = ImageDraw.Draw(glow)
        gd.ellipse(
            [int(W * 0.05), int(-H * 0.10), int(W * 1.20), int(H * 0.42)],
            fill=mix(bg, (255, 255, 255), 0.14),
        )
        gd.ellipse(
            [int(-W * 0.35), int(H * 0.52), int(W * 0.70), int(H * 1.25)],
            fill=mix(bg, (0, 0, 0), 0.13),
        )
        canvas = Image.blend(canvas, glow.filter(ImageFilter.GaussianBlur(W // 10)), 0.85)

        draw = ImageDraw.Draw(canvas)

        # Eyebrow, centred, with manual tracking.
        ew = tracked_width(draw, EYEBROW, font_eyebrow, spec["eyebrow_tracking"])
        draw_tracked_text(
            draw,
            ((W - ew) / 2, spec["eyebrow_y"]),
            EYEBROW,
            font_eyebrow,
            mix(bg, (255, 255, 255), 0.78),
            spec["eyebrow_tracking"],
        )

        # Headline.
        for i, line in enumerate(item["title"]):
            y = spec["title_y"] + i * spec["line_height"]
            draw.text((W / 2, y), line, font=font_title, fill=(255, 255, 255), anchor="ma")

        # Subtitle.
        draw.text(
            (W / 2, spec["subtitle_y"]),
            item["subtitle"],
            font=font_subtitle,
            fill=mix(bg, (255, 255, 255), 0.86),
            anchor="ma",
        )

        # Device capture: scaled to width, bleeding off the bottom edge.
        shot = Image.open(os.path.join(in_dir, item["file"])).convert("RGB")
        dw = spec["device_w"]
        dh = round(shot.height * dw / shot.width)
        shot = shot.resize((dw, dh), Image.LANCZOS)
        mask = rounded_mask((dw, dh), spec["radius"])

        dx, dy = spec["device_x"], spec["device_y"]

        # Drop shadow.
        shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle(
            [dx, dy + 26, dx + dw, dy + dh], radius=spec["radius"], fill=(0, 0, 0, 105)
        )
        shadow = shadow.filter(ImageFilter.GaussianBlur(38))
        canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow).convert("RGB")

        canvas.paste(shot, (dx, dy), mask)

        # Fade the very bottom of the capture into the background so the crop
        # never chops a line of UI text in half.
        fade_h = round(H * 0.07)
        fade = Image.new("RGBA", (W, fade_h), bg + (0,))
        fd = ImageDraw.Draw(fade)
        for row in range(fade_h):
            fd.line([(0, row), (W, row)], fill=bg + (round(255 * (row / fade_h) ** 1.4),))
        canvas = Image.alpha_composite(
            canvas.convert("RGBA"), _pad_to(fade, (W, H), (0, H - fade_h))
        ).convert("RGB")

        # Hairline so the white UI doesn't melt into a light background.
        ImageDraw.Draw(canvas).rounded_rectangle(
            [dx, dy, dx + dw, dy + dh],
            radius=spec["radius"],
            outline=mix(bg, (255, 255, 255), 0.45),
            width=4,
        )

        out_path = os.path.join(out_dir, item["file"])
        canvas.save(out_path, "PNG", optimize=True)
        written.append(out_path)
        print(out_path)
    return written


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", default="1.1.3")
    parser.add_argument("--root", default=None, help="path to mobile/store-assets")
    args = parser.parse_args()

    root = args.root or os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "store-assets"
    )
    asset_root = os.path.join(root, args.version, "en-US")
    build(IPHONE, asset_root)
    build(IPAD, asset_root)


if __name__ == "__main__":
    main()
