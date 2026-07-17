import { mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED_DIR = resolve(ROOT_DIR, "assets/generated");
const DESTINATION_DIR = resolve(GENERATED_DIR, "card-art");
const CARD_WIDTH = 720;
const CARD_HEIGHT = 900;

const LEGACY_CARDS = [
  {
    id: "seren",
    source: "seren-ur.png",
    backdrop: "rarity-warps/warp-ur.webp",
    foregroundHeight: 890,
    foregroundOffsetX: 10,
  },
  {
    id: "aurelia",
    source: "aurelia-ssr.png",
    backdrop: "rarity-warps/warp-ssr.webp",
    foregroundHeight: 880,
    foregroundOffsetX: -4,
  },
  {
    id: "cyra",
    source: "cyra-sr.png",
    backdrop: "rarity-warps/warp-sr.webp",
    foregroundHeight: 888,
    foregroundOffsetX: 0,
  },
];

const VIGNETTE = Buffer.from(`
  <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="focus" cx="50%" cy="38%" r="68%">
        <stop offset="0%" stop-color="#f7e8cf" stop-opacity="0.08" />
        <stop offset="62%" stop-color="#100d1a" stop-opacity="0.04" />
        <stop offset="100%" stop-color="#07050d" stop-opacity="0.52" />
      </radialGradient>
      <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="58%" stop-color="#08060f" stop-opacity="0" />
        <stop offset="100%" stop-color="#08060f" stop-opacity="0.42" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#focus)" />
    <rect width="100%" height="100%" fill="url(#floor)" />
  </svg>
`);

async function prepareForeground(sourcePath, foregroundHeight) {
  const input = await sharp(sourcePath)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({
      width: CARD_WIDTH - 24,
      height: foregroundHeight,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();
  const metadata = await sharp(input).metadata();
  return { input, width: metadata.width, height: metadata.height };
}

async function buildCard(card) {
  const sourcePath = resolve(GENERATED_DIR, card.source);
  const backdropPath = resolve(GENERATED_DIR, card.backdrop);
  const destinationPath = resolve(DESTINATION_DIR, `${card.id}.webp`);
  const foreground = await prepareForeground(sourcePath, card.foregroundHeight);
  const left = Math.round((CARD_WIDTH - foreground.width) / 2 + card.foregroundOffsetX);
  const top = CARD_HEIGHT - foreground.height + 4;

  const backdrop = await sharp(backdropPath)
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover", position: "attention" })
    .modulate({ brightness: 0.5, saturation: 0.82 })
    .blur(0.7)
    .composite([{ input: VIGNETTE, blend: "over" }])
    .png()
    .toBuffer();

  const shadow = await sharp(foreground.input)
    .modulate({ brightness: 0.08, saturation: 0.2 })
    .blur(9)
    .png()
    .toBuffer();

  await sharp(backdrop)
    .composite([
      { input: shadow, left: left + 4, top: top + 8, blend: "over" },
      { input: foreground.input, left, top, blend: "over" },
    ])
    .webp({ quality: 84, effort: 6, smartSubsample: true })
    .toFile(destinationPath);

  const [metadata, fileStats] = await Promise.all([
    sharp(destinationPath).metadata(),
    stat(destinationPath),
  ]);
  console.log(`${card.id}: ${metadata.width}x${metadata.height} (${Math.round(fileStats.size / 1024)} KiB)`);
}

await mkdir(DESTINATION_DIR, { recursive: true });
await Promise.all(LEGACY_CARDS.map(buildCard));
