from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "assets/generated"
OPTIMIZED = GENERATED / "optimized"


def resize_to_width(source: Path, destination: Path, width: int, quality: int) -> None:
    with Image.open(source) as image:
        height = round(image.height * width / image.width)
        resized = image.resize((width, height), Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        resized.save(destination, "WEBP", quality=quality, method=6, exact=True)
        print(
            f"{source.name}: {image.size} -> {resized.size} "
            f"({destination.stat().st_size // 1024} KiB)"
        )


def fit_image(
    source: Path,
    destination: Path,
    size: tuple[int, int],
    quality: int,
    centering: tuple[float, float],
) -> None:
    with Image.open(source) as image:
        fitted = ImageOps.fit(image, size, Image.Resampling.LANCZOS, centering=centering)
        destination.parent.mkdir(parents=True, exist_ok=True)
        fitted.save(destination, "WEBP", quality=quality, method=6, exact=True)
        print(
            f"{source.name}: {image.size} -> {fitted.size} "
            f"({destination.stat().st_size // 1024} KiB)"
        )


def main() -> None:
    resize_to_width(
        GENERATED / "astral-banner.png",
        OPTIMIZED / "astral-banner-768.webp",
        768,
        82,
    )
    resize_to_width(
        GENERATED / "astral-banner.png",
        OPTIMIZED / "astral-banner-1280.webp",
        1280,
        82,
    )
    fit_image(
        GENERATED / "astral-banner.png",
        OPTIMIZED / "astral-banner-mobile-768.webp",
        (768, 768),
        80,
        (0.58, 0.5),
    )
    resize_to_width(
        GENERATED / "seren-ur.png",
        OPTIMIZED / "seren-ur-512.webp",
        512,
        86,
    )
    resize_to_width(
        GENERATED / "seren-ur.png",
        OPTIMIZED / "seren-ur-768.webp",
        768,
        86,
    )
    resize_to_width(
        GENERATED / "aurelia-ssr.png",
        OPTIMIZED / "aurelia-ssr-512.webp",
        512,
        86,
    )
    resize_to_width(
        GENERATED / "cyra-sr.png",
        OPTIMIZED / "cyra-sr-512.webp",
        512,
        86,
    )
    resize_to_width(
        GENERATED / "ui/rarity-chip-ssr.png",
        GENERATED / "ui/rarity-chip-ssr.webp",
        384,
        90,
    )
    resize_to_width(
        GENERATED / "ui/rarity-chip-ur.png",
        GENERATED / "ui/rarity-chip-ur.webp",
        384,
        90,
    )


if __name__ == "__main__":
    main()
