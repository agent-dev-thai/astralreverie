import { fileURLToPath } from "node:url";
import { resolve, sep } from "node:path";

import { RARITY_ORDER } from "./gacha-core.js";

export const PULL_OG_PATH = "/og/pull-v2.jpg";
export const PULL_OG_WIDTH = 1200;
export const PULL_OG_HEIGHT = 630;

const ROOT_DIR = fileURLToPath(new URL(".", import.meta.url));
const ASSETS_DIR = resolve(ROOT_DIR, "assets");
const FONTCONFIG_DIR = resolve(ASSETS_DIR, "fonts/fontconfig");

// Sharp uses fontconfig for SVG text and server images may not ship any fonts.
// Configure the bundled faces before Sharp initializes, while preserving an
// explicit operator override for environments with their own font setup.
process.env.FONTCONFIG_PATH ??= FONTCONFIG_DIR;
const { default: sharp } = await import("sharp");

const BACKGROUND_PATH = resolve(ASSETS_DIR, "generated/astral-banner.png");
const LOGO_PATH = resolve(ASSETS_DIR, "generated/share/astral-reverie-logo.png");
const PREMIUM_CHIP_PATHS = Object.freeze({
  SSR: resolve(ASSETS_DIR, "generated/ui/rarity-chip-ssr.png"),
  UR: resolve(ASSETS_DIR, "generated/ui/rarity-chip-ur.png"),
});
const RARITY_TONES = Object.freeze({
  C: "#96a0ac",
  R: "#55a1ff",
  SR: "#b276ff",
  SSR: "#f4b63e",
  UR: "#ff7fc8",
});

let backgroundPromise;
let logoPromise;
const tileCache = new Map();
const premiumChipCache = new Map();

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(value, limit) {
  const text = String(value);
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function resolveArtPath(item) {
  const artPath = resolve(ROOT_DIR, String(item.art || "").replace(/^\.\//, ""));
  if (!artPath.startsWith(`${ASSETS_DIR}${sep}`)) throw new Error(`Invalid card art path for ${item.id}`);
  return artPath;
}

function backgroundBuffer() {
  backgroundPromise ||= sharp(BACKGROUND_PATH)
    .resize(PULL_OG_WIDTH, PULL_OG_HEIGHT, { fit: "cover", position: "entropy" })
    .modulate({ brightness: 0.36, saturation: 0.72 })
    .blur(0.7)
    .jpeg({ quality: 84 })
    .toBuffer();
  return backgroundPromise;
}

function logoBuffer() {
  logoPromise ||= sharp(LOGO_PATH)
    .resize(72, 72)
    .png()
    .toBuffer();
  return logoPromise;
}

function premiumChipBuffer(rarity, width) {
  const path = PREMIUM_CHIP_PATHS[rarity];
  if (!path) return undefined;
  const cacheKey = `${rarity}:${width}`;
  if (!premiumChipCache.has(cacheKey)) {
    premiumChipCache.set(cacheKey, sharp(path).resize({ width }).png().toBuffer());
  }
  return premiumChipCache.get(cacheKey);
}

function premiumChipLabelSvg(rarity, width, label = rarity) {
  const height = Math.round(width / 2.4);
  const fontSize = width >= 200 ? 21 : width >= 120 ? 18 : 12;
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <text x="${width / 2}" y="${height / 2 + fontSize * 0.34}" text-anchor="middle" fill="#fff8ed" stroke="#160b17" stroke-width="1.5" paint-order="stroke" font-family="Geologica, sans-serif" font-size="${fontSize}" font-weight="800" letter-spacing="1.5">${escapeXml(label)}</text>
    </svg>`);
}

function cardFrameSvg(item, width, height, artHeight, compact) {
  const tone = RARITY_TONES[item.rarity] || RARITY_TONES.C;
  const name = escapeXml(truncate(item.name, compact ? 21 : 34));
  const nameSize = compact ? 15 : 24;
  const raritySize = compact ? 10 : 14;
  const nameY = compact ? height - 24 : height - 42;
  const rarityY = compact ? height - 9 : height - 16;
  const borderWidth = ["SSR", "UR"].includes(item.rarity) ? 4 : 2;
  const rarityBadge = PREMIUM_CHIP_PATHS[item.rarity] ? "" : `
      <rect x="${width - (compact ? 48 : 72)}" y="8" width="${compact ? 40 : 60}" height="${compact ? 21 : 30}" rx="3" fill="#100b16" fill-opacity="0.9" stroke="${tone}"/>
      <text x="${width - (compact ? 28 : 42)}" y="${compact ? 23 : 30}" text-anchor="middle" fill="${tone}" font-family="Geologica, sans-serif" font-size="${compact ? 11 : 16}" font-weight="700">${escapeXml(item.rarity)}</text>`;
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="label" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#100b16" stop-opacity="0.88"/>
          <stop offset="1" stop-color="#09060d"/>
        </linearGradient>
      </defs>
      <rect x="0" y="${artHeight}" width="${width}" height="${height - artHeight}" fill="url(#label)"/>
      <rect x="${borderWidth / 2}" y="${borderWidth / 2}" width="${width - borderWidth}" height="${height - borderWidth}" fill="none" stroke="${tone}" stroke-width="${borderWidth}"/>
      ${rarityBadge}
      <text x="${compact ? 9 : 14}" y="${nameY}" fill="#f7f0e5" font-family="Geologica, sans-serif" font-size="${nameSize}" font-weight="700">${name}</text>
      <text x="${compact ? 9 : 14}" y="${rarityY}" fill="${tone}" font-family="Geologica, sans-serif" font-size="${raritySize}" font-weight="700" letter-spacing="1.4">${escapeXml(item.rarity)} SIGNAL</text>
    </svg>`);
}

async function renderCardTile(item, width, height, artHeight, compact) {
  const cacheKey = `${item.id}:${width}:${height}`;
  if (tileCache.has(cacheKey)) return tileCache.get(cacheKey);

  const art = await sharp(resolveArtPath(item))
    .resize(width - 4, artHeight - 2, {
      fit: item.artMode === "cover" ? "cover" : "contain",
      position: item.artMode === "cover" ? "attention" : "north",
      background: "#100b16",
    })
    .flatten({ background: "#100b16" })
    .png()
    .toBuffer();
  const layers = [
    { input: art, left: 2, top: 1 },
    { input: cardFrameSvg(item, width, height, artHeight, compact), left: 0, top: 0 },
  ];
  if (PREMIUM_CHIP_PATHS[item.rarity]) {
    const chipWidth = compact ? 92 : 146;
    const chipLeft = width - chipWidth - (compact ? 1 : 5);
    const chipTop = compact ? 1 : 5;
    layers.push(
      { input: await premiumChipBuffer(item.rarity, chipWidth), left: chipLeft, top: chipTop },
      { input: premiumChipLabelSvg(item.rarity, chipWidth), left: chipLeft, top: chipTop },
    );
  }
  const tile = await sharp({
    create: { width, height, channels: 4, background: "#100b16" },
  })
    .composite(layers)
    .png()
    .toBuffer();

  tileCache.set(cacheKey, tile);
  return tile;
}

function sceneSvg(results, bestRarity) {
  const tone = RARITY_TONES[bestRarity] || RARITY_TONES.C;
  const countLabel = results.length === 1 ? "1 CARD" : `${results.length}-CARD PULL`;
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${PULL_OG_WIDTH}" height="${PULL_OG_HEIGHT}">
      <defs>
        <radialGradient id="signal" cx="78%" cy="8%" r="72%">
          <stop offset="0" stop-color="${tone}" stop-opacity="0.22"/>
          <stop offset="0.55" stop-color="#100b16" stop-opacity="0.78"/>
          <stop offset="1" stop-color="#08050b" stop-opacity="0.96"/>
        </radialGradient>
        <linearGradient id="shade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#09060d" stop-opacity="0.66"/>
          <stop offset="1" stop-color="#160d1b" stop-opacity="0.88"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#shade)"/>
      <rect width="1200" height="630" fill="url(#signal)"/>
      <path d="M760 -60 L1210 390 M840 -80 L1220 300" stroke="${tone}" stroke-opacity="0.12" stroke-width="2"/>
      <text x="142" y="56" fill="#f7f0e5" font-family="Geologica, sans-serif" font-size="29" font-weight="700" letter-spacing="2">ASTRAL REVERIE</text>
      <text x="142" y="84" fill="#f4b63e" font-family="Geologica, sans-serif" font-size="14" font-weight="700" letter-spacing="2.2">SHARED TRANSMISSION</text>
      <text x="1140" y="59" text-anchor="end" fill="${tone}" font-family="Geologica, sans-serif" font-size="18" font-weight="700" letter-spacing="1.6">${escapeXml(bestRarity)} · ${countLabel}</text>
      <line x1="58" y1="108" x2="1142" y2="108" stroke="#6a4d66" stroke-width="2"/>
      <line x1="58" y1="580" x2="1142" y2="580" stroke="#6a4d66" stroke-width="2"/>
      <text x="58" y="610" fill="#f4b63e" font-family="Geologica, sans-serif" font-size="17" font-weight="700" letter-spacing="1.2">OPEN THE SIGNAL →</text>
      <text x="1142" y="610" text-anchor="end" fill="#b7a9bd" font-family="Geologica, sans-serif" font-size="15">Cinematic pulls · zero real money</text>
    </svg>`);
}

async function composePullOg(results) {
  if (!Array.isArray(results) || results.length < 1 || results.length > 10) {
    throw new Error("Pull OG requires between one and ten results");
  }
  const bestRarity = results.reduce((winner, item) => (
    RARITY_ORDER[item.rarity] > RARITY_ORDER[winner.rarity] ? item : winner
  )).rarity;
  const layers = [
    { input: sceneSvg(results, bestRarity), left: 0, top: 0 },
    { input: await logoBuffer(), left: 58, top: 24 },
  ];

  if (PREMIUM_CHIP_PATHS[bestRarity]) {
    const chipWidth = 250;
    layers.push(
      { input: await premiumChipBuffer(bestRarity, chipWidth), left: 475, top: 2 },
      { input: premiumChipLabelSvg(bestRarity, chipWidth, `${bestRarity} HIT`), left: 475, top: 2 },
    );
  }

  if (results.length === 1) {
    layers.push({
      input: await renderCardTile(results[0], 330, 430, 350, false),
      left: 435,
      top: 126,
    });
  } else {
    const width = 204;
    const height = 206;
    const gap = 16;
    const startX = 58;
    const startY = 130;
    const tiles = await Promise.all(results.map(item => renderCardTile(item, width, height, 158, true)));
    tiles.forEach((tile, index) => {
      layers.push({
        input: tile,
        left: startX + (index % 5) * (width + gap),
        top: startY + Math.floor(index / 5) * (height + gap),
      });
    });
  }

  return sharp(await backgroundBuffer())
    .composite(layers)
    .jpeg({ quality: 88, chromaSubsampling: "4:4:4", progressive: true })
    .toBuffer();
}

export function createPullOgRenderer({ cacheLimit = 128 } = {}) {
  const cache = new Map();
  const inFlight = new Map();

  async function render(token, results) {
    if (cache.has(token)) {
      const hit = cache.get(token);
      cache.delete(token);
      cache.set(token, hit);
      return hit;
    }
    if (inFlight.has(token)) return inFlight.get(token);

    const pending = composePullOg(results).then(buffer => {
      cache.set(token, buffer);
      while (cache.size > cacheLimit) cache.delete(cache.keys().next().value);
      return buffer;
    }).finally(() => inFlight.delete(token));
    inFlight.set(token, pending);
    return pending;
  }

  return {
    render,
    cacheSize: () => cache.size,
  };
}
