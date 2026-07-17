from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps


SOURCE = Path("/private/tmp/gacha-card-art")
DESTINATION = Path("assets/generated/card-art")
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


def build_contact_sheet(ids: list[str], destination: Path, columns: int) -> None:
    thumb_size = (180, 225)
    label_height = 28
    rows = (len(ids) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * thumb_size[0], rows * (thumb_size[1] + label_height)), "#100d1a")
    draw = ImageDraw.Draw(sheet)

    for index, asset_id in enumerate(ids):
        card = Image.open(DESTINATION / f"{asset_id}.webp").convert("RGB")
        card.thumbnail(thumb_size, Image.Resampling.LANCZOS)
        x = (index % columns) * thumb_size[0]
        y = (index // columns) * (thumb_size[1] + label_height)
        sheet.paste(card, (x, y))
        draw.text((x + 8, y + thumb_size[1] + 6), asset_id.upper(), fill="#eadcbf")

    sheet.save(destination, "JPEG", quality=88, optimize=True)


def main() -> None:
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for asset_id in CHARACTERS + OBJECTS:
        source_path = SOURCE / f"{asset_id}.png"
        destination_path = DESTINATION / f"{asset_id}.webp"
        with Image.open(source_path) as source:
            card = prepare_card(source)
            card.save(destination_path, "WEBP", quality=84, method=6)
            print(f"{asset_id}: {source.size} -> {CARD_SIZE} ({destination_path.stat().st_size // 1024} KiB)")

    build_contact_sheet(CHARACTERS, Path("/private/tmp/gacha-characters-contact.jpg"), columns=5)
    build_contact_sheet(OBJECTS, Path("/private/tmp/gacha-objects-contact.jpg"), columns=4)


if __name__ == "__main__":
    main()
