from pathlib import Path
from PIL import Image, ImageDraw, ImageOps


SOURCE = Path("/private/tmp/gacha-rarity-warps")
DESTINATION = Path("assets/generated/rarity-warps")
SIZE = (900, 1600)
RARITIES = ["c", "r", "sr", "ssr", "ur"]


def main() -> None:
    DESTINATION.mkdir(parents=True, exist_ok=True)
    contact = Image.new("RGB", (900, 348), "#100d1a")
    draw = ImageDraw.Draw(contact)

    for index, rarity in enumerate(RARITIES):
        asset_id = f"warp-{rarity}"
        source_path = SOURCE / f"{asset_id}.png"
        destination_path = DESTINATION / f"{asset_id}.webp"
        with Image.open(source_path) as source:
            final = ImageOps.fit(source.convert("RGB"), SIZE, method=Image.Resampling.LANCZOS, centering=(0.5, 0.46))
            final.save(destination_path, "WEBP", quality=82, method=6)
            preview = final.copy()
            preview.thumbnail((180, 320), Image.Resampling.LANCZOS)
            contact.paste(preview, (index * 180, 0))
            draw.text((index * 180 + 8, 326), rarity.upper(), fill="#eadcbf")
            print(f"{asset_id}: {source.size} -> {SIZE} ({destination_path.stat().st_size // 1024} KiB)")

    contact.save("/private/tmp/gacha-rarity-warps-contact.jpg", "JPEG", quality=88, optimize=True)


if __name__ == "__main__":
    main()
