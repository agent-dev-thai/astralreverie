import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "assets/generated"
DESTINATION = GENERATED / "share"
FONTS = ROOT / "assets/fonts"

GOLD = "#f4b63e"
PAPER = "#f7f0e5"
MUTED = "#b7a9bd"
INK = "#100b16"
CORAL = "#ff7668"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONTS / name, size=size)


def build_logo_master(size: int = 1024) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    margin = round(size * 0.055)
    draw.rounded_rectangle(
        (margin, margin, size - margin, size - margin),
        radius=round(size * 0.24),
        fill="#120d1a",
        outline="#3e2d44",
        width=round(size * 0.018),
    )

    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((290, 290, 734, 734), fill=(244, 182, 62, 110))
    image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(95)))

    orbit = Image.new("RGBA", image.size, (0, 0, 0, 0))
    orbit_draw = ImageDraw.Draw(orbit)
    orbit_draw.ellipse((170, 385, 854, 639), outline=GOLD, width=30)
    orbit = orbit.rotate(-24, resample=Image.Resampling.BICUBIC)
    image.alpha_composite(orbit)

    draw = ImageDraw.Draw(image)
    draw.ellipse((326, 326, 698, 698), outline="#f7ca68", width=24)
    draw.ellipse((420, 420, 604, 604), fill="#f4b63e", outline="#ffe6a3", width=18)
    draw.ellipse((455, 455, 569, 569), fill="#ff8f60")
    draw.ellipse((716, 258, 812, 354), fill=CORAL, outline="#ffd49a", width=13)
    draw.polygon(((190, 278), (206, 316), (244, 332), (206, 348), (190, 386), (174, 348), (136, 332), (174, 316)), fill="#fff3c6")
    return image


def save_logo_assets() -> Image.Image:
    master = build_logo_master()
    outputs = {
        "astral-reverie-logo.png": 512,
        "apple-touch-icon.png": 180,
        "favicon-32.png": 32,
        "icon-192.png": 192,
    }
    for filename, size in outputs.items():
        resized = master.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(DESTINATION / filename, "PNG", optimize=True)
        print(f"{filename}: {size}×{size} ({(DESTINATION / filename).stat().st_size // 1024} KiB)")

    maskable = Image.new("RGBA", (512, 512), "#120d1a")
    safe_logo = master.resize((410, 410), Image.Resampling.LANCZOS)
    maskable.alpha_composite(safe_logo, (51, 51))
    maskable.save(DESTINATION / "maskable-icon-512.png", "PNG", optimize=True)
    print(f"maskable-icon-512.png: 512×512 ({(DESTINATION / 'maskable-icon-512.png').stat().st_size // 1024} KiB)")
    return master


def write_manifest() -> None:
    manifest = {
        "name": "Astral Reverie",
        "short_name": "Astral",
        "description": "A consequence-free cinematic gacha simulator.",
        "start_url": "/",
        "scope": "/",
        "display": "standalone",
        "background_color": "#120d1a",
        "theme_color": "#120d1a",
        "icons": [
            {
                "src": "/assets/generated/share/icon-192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any",
            },
            {
                "src": "/assets/generated/share/astral-reverie-logo.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any",
            },
            {
                "src": "/assets/generated/share/maskable-icon-512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "maskable",
            },
        ],
    }
    destination = DESTINATION / "site.webmanifest"
    destination.write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf-8")
    print(f"{destination.name}: launch manifest")


def darken_background(source: Image.Image) -> Image.Image:
    fitted = ImageOps.fit(source.convert("RGB"), (1200, 630), Image.Resampling.LANCZOS, centering=(0.58, 0.5))
    fitted = ImageEnhance.Color(fitted).enhance(0.82)
    fitted = ImageEnhance.Contrast(fitted).enhance(1.08)
    fitted = ImageEnhance.Brightness(fitted).enhance(0.58)
    return fitted.convert("RGBA")


def add_horizontal_shade(image: Image.Image) -> None:
    shade = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shade)
    for x in range(image.width):
        progress = x / image.width
        alpha = round(218 * max(0, 1 - progress / 0.78))
        draw.line((x, 0, x, image.height), fill=(10, 6, 14, alpha))
    image.alpha_composite(shade)


def build_og_image(logo: Image.Image) -> None:
    with Image.open(GENERATED / "astral-banner.png") as background_source:
        image = darken_background(background_source)
    add_horizontal_shade(image)

    character_glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(character_glow)
    glow_draw.ellipse((760, 40, 1240, 620), fill=(255, 123, 119, 65))
    image.alpha_composite(character_glow.filter(ImageFilter.GaussianBlur(90)))

    with Image.open(GENERATED / "seren-ur.png") as source:
        character = source.convert("RGBA")
        character.thumbnail((570, 720), Image.Resampling.LANCZOS)
    image.alpha_composite(character, (1200 - character.width + 30, -28))

    draw = ImageDraw.Draw(image)
    logo_small = logo.resize((66, 66), Image.Resampling.LANCZOS)
    image.alpha_composite(logo_small, (64, 50))
    draw.text((148, 62), "ASTRAL REVERIE", font=font("unbounded-700.ttf", 25), fill=PAPER)
    draw.text((148, 94), "CONSEQUENCE-FREE SUMMONING", font=font("geologica-600.ttf", 16), fill=GOLD)

    draw.text((66, 188), "OPEN THE", font=font("unbounded-700.ttf", 61), fill=PAPER, stroke_width=1, stroke_fill=INK)
    draw.text((66, 257), "SIGNAL", font=font("unbounded-700.ttf", 88), fill=GOLD, stroke_width=1, stroke_fill=INK)
    draw.text((70, 370), "Cinematic pulls. Impossible luck. Zero real money.", font=font("geologica-600.ttf", 25), fill=PAPER)
    draw.text((70, 409), "A consequence-free gacha simulator.", font=font("geologica-400.ttf", 22), fill=MUTED)

    badge_box = (68, 485, 505, 548)
    draw.rounded_rectangle(badge_box, radius=14, fill="#241829", outline=GOLD, width=2)
    draw.text((94, 503), "TRACE YOUR LUCK  →", font=font("geologica-600.ttf", 19), fill=GOLD)

    draw.line((68, 585, 1132, 585), fill="#5d405a", width=2)
    draw.text((68, 596), "UR RATE 0.6%   •   FAKE CURRENCY   •   REAL DOPAMINE", font=font("geologica-600.ttf", 14), fill="#c7a96c")

    destination = DESTINATION / "astral-reverie-og.jpg"
    image.convert("RGB").save(destination, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"{destination.name}: 1200×630 ({destination.stat().st_size // 1024} KiB)")


def main() -> None:
    DESTINATION.mkdir(parents=True, exist_ok=True)
    logo = save_logo_assets()
    build_og_image(logo)
    write_manifest()


if __name__ == "__main__":
    main()
