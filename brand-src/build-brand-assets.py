#!/usr/bin/env python3
"""
Build the FreedomCosmeticShop brand asset set.

Source of truth:
  brand-src/icon-mark.png  - transparent, exact #B76E79 flower mark
  brand-src/fonts/*.ttf    - Playfair Display (serif) + Inter (sans, matches site)

Everything in /public is DERIVED. Re-run this script to regenerate.
Wordmarks are rendered from real fonts (not an image model) so the spelling
and the brand hex values are exact and reproducible.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "brand-src"
PUB = ROOT / "public"
FONTS = SRC / "fonts"

ROSE = (183, 110, 121)        # #B76E79
CHARCOAL = (26, 26, 26)       # #1a1a1a
WHITE = (255, 255, 255)
MUTED = (119, 119, 119)       # #777777, the tagline grey already used in the Navbar

SS = 4  # supersample factor for crisp text


FONT_SOURCES = {
    "playfair.ttf": "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf",
    "inter.ttf": "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf",
}


def ensure_fonts() -> None:
    """Fetch the SIL Open Font Licence typefaces this script renders with.

    They are downloaded rather than committed so the repository does not carry
    ~3 MB of binaries that are trivially reproducible.
    """
    FONTS.mkdir(parents=True, exist_ok=True)
    for name, url in FONT_SOURCES.items():
        dest = FONTS / name
        if dest.exists():
            continue
        print(f"  fetching {name} ...")
        urllib.request.urlretrieve(url, dest)


def font(name: str, size: int, weight: int | None = None) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(FONTS / name), size)
    if weight is not None:
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
    return f


def load_mark() -> Image.Image:
    return Image.open(SRC / "icon-mark.png").convert("RGBA")


def fit_mark(height: int) -> Image.Image:
    m = load_mark()
    w = round(m.width * height / m.height)
    return m.resize((w, height), Image.LANCZOS)


def text_size(draw, text, fnt):
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1], box


def build_wordmark(path: Path, w: int, h: int, bg, primary, secondary, tagline_colour):
    """Horizontal lockup: flower mark, then 'Freedom' serif over 'CosmeticShop' sans."""
    W, H = w * SS, h * SS
    canvas = Image.new("RGBA", (W, H), bg)
    d = ImageDraw.Draw(canvas)

    mark_h = int(H * 0.72)
    mark = fit_mark(mark_h)

    f_top = font("playfair.ttf", int(H * 0.40), 600)
    f_bot = font("inter.ttf", int(H * 0.175), 500)

    top_txt, bot_txt = "Freedom", "COSMETIC SHOP"
    # Letterspace the smaller line so it reads as a considered lockup, not an afterthought.
    track = int(H * 0.030)

    tw_top, th_top, box_top = text_size(d, top_txt, f_top)
    bot_widths = [d.textbbox((0, 0), c, font=f_bot)[2] - d.textbbox((0, 0), c, font=f_bot)[0] for c in bot_txt]
    tw_bot = sum(bot_widths) + track * (len(bot_txt) - 1)
    th_bot = d.textbbox((0, 0), bot_txt, font=f_bot)[3] - d.textbbox((0, 0), bot_txt, font=f_bot)[1]

    gap_mark = int(W * 0.030)
    gap_lines = int(H * 0.070)

    text_w = max(tw_top, tw_bot)
    total_w = mark.width + gap_mark + text_w
    x0 = (W - total_w) // 2

    canvas.alpha_composite(mark, (x0, (H - mark.height) // 2))

    tx = x0 + mark.width + gap_mark
    block_h = th_top + gap_lines + th_bot
    ty = (H - block_h) // 2

    d.text((tx - box_top[0], ty - box_top[1]), top_txt, font=f_top, fill=primary)

    cx = tx
    by = ty + th_top + gap_lines
    for ch, cw in zip(bot_txt, bot_widths):
        cbox = d.textbbox((0, 0), ch, font=f_bot)
        d.text((cx - cbox[0], by - cbox[1]), ch, font=f_bot, fill=secondary)
        cx += cw + track

    canvas.resize((w, h), Image.LANCZOS).save(path)
    print(f"  {path.relative_to(ROOT)}  {w}x{h}")


def solidify(mark: Image.Image, strength: float) -> Image.Image:
    """Close the hairline negative space inside the mark.

    The petal filigree is beautiful at 180px+ and turns to mush at 16px. For
    tiny favicons we grow the alpha so the lotus reads as a confident
    silhouette instead of a pink smudge.
    """
    radius = max(3, int(mark.height * strength) | 1)  # MaxFilter needs an odd radius
    a = mark.split()[3].filter(ImageFilter.MaxFilter(radius))
    # Flood the colour channels first: fully transparent pixels carry RGB 0,0,0
    # and dilating alpha over them would fringe the mark with black.
    solid = Image.new("RGBA", mark.size, ROSE + (255,))
    solid.putalpha(a)
    return solid


def build_icon(path: Path, size: int, bg, scale: float = 0.76, close: float = 0.0):
    canvas = Image.new("RGBA", (size * SS, size * SS), bg)
    mark = fit_mark(int(size * SS * scale))
    if close:
        mark = solidify(mark, close)
    canvas.alpha_composite(mark, ((canvas.width - mark.width) // 2, (canvas.height - mark.height) // 2))
    out = canvas.resize((size, size), Image.LANCZOS)
    if bg[3] == 255:
        out = out.convert("RGB")
    out.save(path)
    print(f"  {path.relative_to(ROOT)}  {size}x{size}")


def build_og(path: Path):
    w, h = 1200, 630
    W, H = w * SS, h * SS
    canvas = Image.new("RGB", (W, H), WHITE)

    # Soft warm cream -> white diagonal wash
    grad = Image.new("RGB", (W, H))
    gd = ImageDraw.Draw(grad)
    for y in range(0, H, SS):
        t = y / H
        gd.rectangle(
            [0, y, W, y + SS],
            fill=(
                int(253 - 8 * t),
                int(247 - 6 * t),
                int(241 - 3 * t),
            ),
        )
    canvas = Image.blend(canvas, grad, 0.85)
    d = ImageDraw.Draw(canvas)

    # Subtle organic texture: faint rose rings, bottom-right
    ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    for i, r in enumerate(range(int(W * 0.20), int(W * 0.40), int(W * 0.035))):
        rd.ellipse(
            [W - int(W * 0.16) - r, H - int(H * 0.10) - r, W - int(W * 0.16) + r, H - int(H * 0.10) + r],
            outline=ROSE + (16 + i * 2,),
            width=SS * 2,
        )
    canvas = Image.alpha_composite(canvas.convert("RGBA"), ring).convert("RGB")
    d = ImageDraw.Draw(canvas)

    mark = fit_mark(int(H * 0.40))
    f_name = font("playfair.ttf", int(H * 0.130), 600)
    f_tag = font("inter.ttf", int(H * 0.050), 500)

    name = "FreedomCosmeticShop"
    tag = "100% Umwimerere"

    nb = d.textbbox((0, 0), name, font=f_name)
    nw, nh = nb[2] - nb[0], nb[3] - nb[1]
    tb = d.textbbox((0, 0), tag, font=f_tag)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]

    gap = int(W * 0.028)
    total_w = mark.width + gap + max(nw, tw)
    x0 = (W - total_w) // 2
    block_h = nh + int(H * 0.055) + th
    y0 = (H - block_h) // 2

    canvas_rgba = canvas.convert("RGBA")
    canvas_rgba.alpha_composite(mark, (x0, (H - mark.height) // 2))
    canvas = canvas_rgba.convert("RGB")
    d = ImageDraw.Draw(canvas)

    tx = x0 + mark.width + gap
    d.text((tx - nb[0], y0 - nb[1]), name, font=f_name, fill=CHARCOAL)

    ty = y0 + nh + int(H * 0.055)
    d.text((tx - tb[0], ty - tb[1]), tag, font=f_tag, fill=ROSE)

    # Rose rule under the wordmark, tying the lockup together
    rule_y = ty + th + int(H * 0.045)
    d.rectangle([tx, rule_y, tx + max(nw, tw), rule_y + SS * 2], fill=ROSE)

    canvas.resize((w, h), Image.LANCZOS).save(path, quality=95)
    print(f"  {path.relative_to(ROOT)}  {w}x{h}")


COMPRESS = {
    "logo.png": 64, "logo-dark.png": 64, "logo-icon.png": 64,
    "apple-touch-icon.png": 64, "android-chrome-192x192.png": 64,
    "android-chrome-512x512.png": 64, "icon-maskable-512.png": 64, "logo-badge.png": 64,
    "og-image.png": 128,
}


def compress() -> None:
    """Palette-quantise the flat brand art.

    These files are two brand colours plus antialiasing, so a small palette is
    visually identical and roughly a third of the bytes - that matters on
    Rwandan mobile data. The 16/32px favicons are skipped: they save under a
    kilobyte and quantisation dulls their peak alpha.
    """
    total_before = total_after = 0
    for name, colors in COMPRESS.items():
        path = PUB / name
        before = path.stat().st_size
        im = Image.open(path)
        has_alpha = im.mode in ("RGBA", "LA")
        im = im.convert("RGBA") if has_alpha else im.convert("RGB")
        method = Image.FASTOCTREE if has_alpha else Image.MEDIANCUT
        im.quantize(colors=colors, method=method).save(path, optimize=True)
        total_before += before
        total_after += path.stat().st_size
    for name in ("favicon-16x16.png", "favicon-32x32.png"):
        Image.open(PUB / name).convert("RGBA").save(PUB / name, optimize=True)
    saved = 100 * (1 - total_after / total_before)
    print(f"  {total_before/1024:.0f} KB -> {total_after/1024:.0f} KB ({saved:.0f}% smaller)")


def main():
    PUB.mkdir(exist_ok=True)
    ensure_fonts()
    print("Wordmarks:")
    build_wordmark(PUB / "logo.png", 800, 200, (0, 0, 0, 0), CHARCOAL, MUTED, MUTED)
    build_wordmark(PUB / "logo-dark.png", 800, 200, CHARCOAL + (255,), WHITE, WHITE, ROSE)

    print("Icons:")
    build_icon(PUB / "logo-icon.png", 512, WHITE + (255,))
    # Badge: read at 24px, so it gets the same closed silhouette as the favicons.
    build_icon(PUB / "logo-badge.png", 128, WHITE + (255,), scale=0.86, close=0.022)
    build_icon(PUB / "icon-maskable-512.png", 512, WHITE + (255,), scale=0.60)
    build_icon(PUB / "favicon-16x16.png", 16, (0, 0, 0, 0), scale=0.86, close=0.055)
    build_icon(PUB / "favicon-32x32.png", 32, (0, 0, 0, 0), scale=0.84, close=0.030)
    build_icon(PUB / "apple-touch-icon.png", 180, WHITE + (255,))
    build_icon(PUB / "android-chrome-192x192.png", 192, WHITE + (255,))
    build_icon(PUB / "android-chrome-512x512.png", 512, WHITE + (255,))

    print("Social:")
    build_og(PUB / "og-image.png")

    # Multi-resolution .ico
    ico_sizes = [16, 32, 48]
    frames = []
    for s in ico_sizes:
        # Same treatment as the PNG favicons: dilate more the smaller we go.
        close = {16: 0.055, 32: 0.030, 48: 0.022}[s]
        c = Image.new("RGBA", (s * SS, s * SS), (0, 0, 0, 0))
        m = solidify(fit_mark(int(s * SS * 0.86)), close)
        c.alpha_composite(m, ((c.width - m.width) // 2, (c.height - m.height) // 2))
        frames.append(c.resize((s, s), Image.LANCZOS))
    frames[-1].save(PUB / "favicon.ico", format="ICO", sizes=[(s, s) for s in ico_sizes])
    print(f"  public/favicon.ico  {ico_sizes}")

    print("Compressing:")
    compress()


if __name__ == "__main__":
    main()
