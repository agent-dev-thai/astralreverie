import argparse
import os
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "tmp/gacha-rarity-warps"
DEFAULT_DESTINATION = ROOT / "assets/generated/rarity-warps"
SIZE = (900, 1600)
RARITIES = ["c", "r", "sr", "ssr", "ur"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build rarity-warp WebPs from source PNG files.")
    parser.add_argument(
        "--source",
        type=Path,
        default=Path(os.environ.get("GACHA_RARITY_WARP_SOURCE", DEFAULT_SOURCE)),
        help="Directory containing warp-<rarity>.png sources (or set GACHA_RARITY_WARP_SOURCE).",
    )
    parser.add_argument("--destination", type=Path, default=DEFAULT_DESTINATION)
    parser.add_argument(
        "--artifacts-dir",
        type=Path,
        default=Path(os.environ.get("GACHA_ARTIFACTS_DIR", tempfile.gettempdir())),
        help="Directory for the contact-sheet preview.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    missing = [rarity for rarity in RARITIES if not (args.source / f"warp-{rarity}.png").is_file()]
    if missing:
        raise SystemExit(f"Missing {len(missing)} source PNGs in {args.source}: {', '.join(missing)}")

    args.destination.mkdir(parents=True, exist_ok=True)
    args.artifacts_dir.mkdir(parents=True, exist_ok=True)
    contact = Image.new("RGB", (900, 348), "#100d1a")
    draw = ImageDraw.Draw(contact)

    for index, rarity in enumerate(RARITIES):
        asset_id = f"warp-{rarity}"
        source_path = args.source / f"{asset_id}.png"
        destination_path = args.destination / f"{asset_id}.webp"
        with Image.open(source_path) as source:
            final = ImageOps.fit(source.convert("RGB"), SIZE, method=Image.Resampling.LANCZOS, centering=(0.5, 0.46))
            final.save(destination_path, "WEBP", quality=82, method=6)
            preview = final.copy()
            preview.thumbnail((180, 320), Image.Resampling.LANCZOS)
            contact.paste(preview, (index * 180, 0))
            draw.text((index * 180 + 8, 326), rarity.upper(), fill="#eadcbf")
            print(f"{asset_id}: {source.size} -> {SIZE} ({destination_path.stat().st_size // 1024} KiB)")

    contact.save(args.artifacts_dir / "gacha-rarity-warps-contact.jpg", "JPEG", quality=88, optimize=True)


if __name__ == "__main__":
    main()
