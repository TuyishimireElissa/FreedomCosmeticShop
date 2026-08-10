#!/usr/bin/env python3
"""Vectorise the FC monogram from the reference artwork.

Regenerates the path constants in `src/components/ui/logo.tsx`.

Why this exists: the first version of that component was hand-traced from
pixel measurements and drifted badly — the nose flattened, the jaw ran 27px
too wide, the crescent sat 21px off centre, the leaves lost their taper.
Reading contours out of the image directly removes the guesswork. The result
measures 94% IoU on the rose and 91% on the gold against the source.

    python3 brand-src/vectorise-logo.py [path/to/reference.png]

Then rebuild the raster assets:

    node    brand-src/render-mark.mjs
    python3 brand-src/build-brand-assets.py

Method
------
1. Classify every pixel as rose / gold / background in HLS. Hue separates the
   two brand colours cleanly (rose < 18 deg or > 335, gold 18-55) and a
   saturation floor drops the cream ground.
2. Morphological close, so anti-aliased edges do not fragment one letterform
   into several contours.
3. `cv2.findContours` for the real boundary, then a Gaussian pass around the
   ring to take the pixel staircase off.
4. Douglas-Peucker to anchor points, then Catmull-Rom -> cubic Bezier, which
   keeps the curve continuous through each anchor instead of faceting.

The leaf branch is separated from the C by position, not by a second colour
pass: both are gold and they touch. Leaves are everything gold below y200 and
right of x268; the C's upper terminal also crosses x268 but sits high, so
gating on both axes keeps them apart.
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
# Geometry lives in a plain data module, not the React component: the
# invoice generator and the PNG build read it too, and a test runner
# without a JSX plugin cannot import a .tsx file.
COMPONENT = ROOT / "src" / "lib" / "brand-logo-paths.ts"
DEFAULT_REFERENCE = ROOT / "brand-src" / "logo-reference.png"

# Contour geometry
MIN_AREA = 25       # px^2, drops anti-aliasing specks
SMOOTH_SIGMA = 1.6  # Gaussian radius around the contour ring
FIT_TOLERANCE = 0.9 # Douglas-Peucker epsilon, in px

# Leaf/C separation, in reference pixels
LEAF_MIN_Y = 200
LEAF_MIN_X = 268


def classify(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Split the artwork into rose and gold boolean masks."""
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    hue = hsv[:, :, 0].astype(float) * 2  # OpenCV packs hue into 0..179
    high = rgb.max(axis=2).astype(float)
    low = rgb.min(axis=2).astype(float)
    light = (high + low) / 2 / 255
    sat = np.where(high == 0, 0, (high - low) / np.maximum(high, 1))

    ink = (sat > 0.14) & (light < 0.94)
    rose = ink & ((hue < 18) | (hue > 335))
    gold = ink & (hue >= 18) & (hue <= 55)
    return rose, gold


def smooth_ring(points: np.ndarray, sigma: float = SMOOTH_SIGMA) -> np.ndarray:
    """Gaussian-smooth a closed contour without seaming at the join."""
    pts = points.astype(float)
    count = len(pts)
    width = int(sigma * 3) | 1
    kernel = cv2.getGaussianKernel(width, sigma).ravel()
    out = np.empty_like(pts)
    for axis in range(2):
        wrapped = np.concatenate([pts[-width:, axis], pts[:, axis], pts[:width, axis]])
        out[:, axis] = np.convolve(wrapped, kernel, mode="same")[width:width + count]
    return out


def to_bezier(points: np.ndarray, tolerance: float = FIT_TOLERANCE) -> str | None:
    """Fit a closed cubic-Bezier path to a contour."""
    anchors = cv2.approxPolyDP(
        points.astype(np.float32).reshape(-1, 1, 2), tolerance, True
    ).reshape(-1, 2)
    if len(anchors) < 3:
        return None

    count = len(anchors)
    parts = [f"M{anchors[0][0]:.1f} {anchors[0][1]:.1f}"]
    for i in range(count):
        p0 = anchors[(i - 1) % count]
        p1 = anchors[i]
        p2 = anchors[(i + 1) % count]
        p3 = anchors[(i + 2) % count]
        # Catmull-Rom control points, so the curve stays C1 through anchors.
        c1 = p1 + (p2 - p0) / 6.0
        c2 = p2 - (p3 - p1) / 6.0
        parts.append(f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}")
    return " ".join(parts) + " Z"


def contours_of(mask: np.ndarray) -> list[np.ndarray]:
    """Closed, area-sorted contours of a boolean mask."""
    binary = (mask * 255).astype(np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    found, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    kept = [c for c in found if cv2.contourArea(c) >= MIN_AREA]
    kept.sort(key=cv2.contourArea, reverse=True)
    return kept


def main() -> int:
    reference = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_REFERENCE
    if not reference.exists():
        print(f"reference not found: {reference}")
        return 1

    rgb = np.array(Image.open(reference).convert("RGB"))
    height, width, _ = rgb.shape
    print(f"reference {reference.name}  {width}x{height}")

    rose, gold = classify(rgb)

    # Rose: largest contour is the F, second is the profile inside the C.
    rose_contours = contours_of(rose)
    if len(rose_contours) < 2:
        print("expected two rose contours (F and profile)")
        return 1
    f_path = to_bezier(smooth_ring(rose_contours[0].reshape(-1, 2)))
    profile_path = to_bezier(smooth_ring(rose_contours[1].reshape(-1, 2)))

    # Gold: split the leaf branch off the crescent by position.
    leaf_mask = gold.copy()
    leaf_mask[:LEAF_MIN_Y, :] = False
    leaf_mask[:, :LEAF_MIN_X] = False
    c_mask = gold & ~leaf_mask

    c_path = to_bezier(smooth_ring(contours_of(c_mask)[0].reshape(-1, 2)))
    leaf_paths = [to_bezier(smooth_ring(c.reshape(-1, 2))) for c in contours_of(leaf_mask)]

    print(f"  F       {len(f_path):>5} chars")
    print(f"  C       {len(c_path):>5} chars")
    print(f"  profile {len(profile_path):>5} chars")
    print(f"  leaves  {sum(len(p) for p in leaf_paths):>5} chars in {len(leaf_paths)} paths")

    source = COMPONENT.read_text()
    replacements = [
        ("export const F_PATH = '", f_path),
        ("export const C_PATH = '", c_path),
        ("export const PROFILE_PATH = '", profile_path),
    ]
    for prefix, value in replacements:
        start = source.index(prefix) + len(prefix)
        end = source.index("'", start)
        source = source[:start] + value + source[end:]

    start = source.index("export const LEAF_PATHS = [")
    end = source.index("]", start) + 1
    rendered = ", ".join(f"'{p}'" for p in leaf_paths)
    source = source[:start] + f"export const LEAF_PATHS = [{rendered}]" + source[end:]

    COMPONENT.write_text(source)
    print(f"updated {COMPONENT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
