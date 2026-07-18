import argparse
import os
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "tmp/gacha-card-art"
DEFAULT_DESTINATION = ROOT / "assets/generated/card-art"
CARD_SIZE = (720, 900)

CHARACTERS = [
    "kaelis", "nyx", "vance", "miko", "thorne", "ilsa", "rho", "bram",
    "dov", "ember", "fenn", "gale", "hana",
]
OBJECTS = [
    "charm", "lens", "coil", "map", "key", "vial", "quill", "bell",
    "cog", "canteen", "rock", "coupon", "sock", "manual", "battery", "receipt",
]


def prepare_card(source: Image.Image) -> Image.Image:
    rgb = source.convert("RGB")
    backdrop = ImageOps.fit(rgb, CARD_SIZE, method=Image.Resampling.LANCZOS)
    backdrop = backdrop.filter(ImageFilter.GaussianBlur(24))
    backdrop = ImageEnhance.Brightness(backdrop).enhance(0.42)

    foreground = ImageOps.contain(rgb, (CARD_SIZE[0] - 16, CARD_SIZE[1] - 16), Image.Resampling.LANCZOS)
    left = (CARD_SIZE[0] - foreground.width) // 2
    top = (CARD_SIZE[1] - foreground.height) // 2
    backdrop.paste(foreground, (left, top))
    return backdrop


def build_contact_sheet(ids: list[str], cards: Path, destination: Path, columns: int) -> None:
    thumb_size = (180, 225)
    label_height = 28
    rows = (len(ids) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * thumb_size[0], rows * (thumb_size[1] + label_height)), "#100d1a")
    draw = ImageDraw.Draw(sheet)

    for index, asset_id in enumerate(ids):
        card = Image.open(cards / f"{asset_id}.webp").convert("RGB")
        card.thumbnail(thumb_size, Image.Resampling.LANCZOS)
        x = (index % columns) * thumb_size[0]
        y = (index // columns) * (thumb_size[1] + label_height)
        sheet.paste(card, (x, y))
        draw.text((x + 8, y + thumb_size[1] + 6), asset_id.upper(), fill="#eadcbf")

    sheet.save(destination, "JPEG", quality=88, optimize=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build runtime WebP card art from source PNG files.")
    parser.add_argument(
        "--source",
        type=Path,
        default=Path(os.environ.get("GACHA_CARD_ART_SOURCE", DEFAULT_SOURCE)),
        help="Directory containing <card-id>.png sources (or set GACHA_CARD_ART_SOURCE).",
    )
    parser.add_argument("--destination", type=Path, default=DEFAULT_DESTINATION)
    parser.add_argument(
        "--artifacts-dir",
        type=Path,
        default=Path(os.environ.get("GACHA_ARTIFACTS_DIR", tempfile.gettempdir())),
        help="Directory for contact-sheet previews.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    missing = [asset_id for asset_id in CHARACTERS + OBJECTS if not (args.source / f"{asset_id}.png").is_file()]
    if missing:
        raise SystemExit(f"Missing {len(missing)} source PNGs in {args.source}: {', '.join(missing)}")

    args.destination.mkdir(parents=True, exist_ok=True)
    args.artifacts_dir.mkdir(parents=True, exist_ok=True)
    for asset_id in CHARACTERS + OBJECTS:
        source_path = args.source / f"{asset_id}.png"
        destination_path = args.destination / f"{asset_id}.webp"
        with Image.open(source_path) as source:
            card = prepare_card(source)
            card.save(destination_path, "WEBP", quality=84, method=6)
            print(f"{asset_id}: {source.size} -> {CARD_SIZE} ({destination_path.stat().st_size // 1024} KiB)")

    build_contact_sheet(
        CHARACTERS,
        args.destination,
        args.artifacts_dir / "gacha-characters-contact.jpg",
        columns=5,
    )
    build_contact_sheet(
        OBJECTS,
        args.destination,
        args.artifacts_dir / "gacha-objects-contact.jpg",
        columns=4,
    )


if __name__ == "__main__":
    main()
