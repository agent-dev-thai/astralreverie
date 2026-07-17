import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return resolve(index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback);
}

const sourceDirectory = option("--source-dir", "tmp/elevenlabs-sfx/source");
const outputDirectory = option("--out-dir", "assets/audio/sfx");

const BUILDS = Object.freeze({
  c: { signature: "signature-c", delay: 2250, intake: 0.34, signatureGain: 0.18, flash: 0.12 },
  r: { signature: "signature-r", delay: 2180, intake: 0.40, signatureGain: 0.26, flash: 0.18 },
  sr: { signature: "signature-sr", delay: 2050, intake: 0.46, signatureGain: 0.45, flash: 0.25 },
  ssr: { signature: "signature-ssr", delay: 1880, intake: 0.52, signatureGain: 0.55, flash: 0.38 },
  ur: { signature: "signature-ur", delay: 1680, intake: 0.58, signatureGain: 0.75, flash: 0.50 },
  "near-miss": { signature: "signature-near-miss", delay: 1550, intake: 0.48, signatureGain: 0.78, flash: 0.42 },
});

const REVEALS = Object.freeze({
  c: { signature: "signature-c", duration: 0.8, signatureGain: 0.22, flash: 0.12 },
  r: { signature: "signature-r", duration: 0.9, signatureGain: 0.30, flash: 0.16 },
  sr: { signature: "signature-sr", duration: 1.1, signatureGain: 0.48, flash: 0.20 },
  ssr: { signature: "signature-ssr", duration: 1.3, signatureGain: 0.60, flash: 0.30 },
  ur: { signature: "signature-ur", duration: 1.5, signatureGain: 0.78, flash: 0.42 },
});

function source(name) {
  return resolve(sourceDirectory, `${name}.mp3`);
}

function runFfmpeg(args) {
  const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(result.stderr || "ffmpeg failed");
}

function encodeArguments(outputPath) {
  return [
    "-map", "[out]",
    "-c:a", "aac",
    "-b:a", "192k",
    "-ar", "48000",
    "-ac", "2",
    "-movflags", "+faststart",
    outputPath,
  ];
}

await mkdir(outputDirectory, { recursive: true });

for (const [rarity, mix] of Object.entries(BUILDS)) {
  const outputPath = resolve(outputDirectory, `buildup-${rarity}.m4a`);
  const filter = [
    `[0:a]aresample=48000,volume=${mix.intake}[intake]`,
    `[1:a]aresample=48000,volume=${mix.signatureGain},adelay=${mix.delay}|${mix.delay}[signature]`,
    `[2:a]aresample=48000,volume=${mix.flash},adelay=2950|2950[flash]`,
    "[intake][signature][flash]amix=inputs=3:normalize=0:duration=longest,apad=pad_dur=3.2,atrim=0:3.2,afade=t=out:st=3.15:d=0.05,alimiter=limit=0.891[out]",
  ].join(";");
  runFfmpeg([
    "-i", source("shared-intake"),
    "-i", source(mix.signature),
    "-i", source("reveal-flash-tail"),
    "-filter_complex", filter,
    ...encodeArguments(outputPath),
  ]);
  console.log(`built ${outputPath}`);
}

for (const [rarity, mix] of Object.entries(REVEALS)) {
  const outputPath = resolve(outputDirectory, `reveal-${rarity}.m4a`);
  const fadeStart = Math.max(0, mix.duration - 0.08).toFixed(2);
  const filter = [
    `[0:a]aresample=48000,volume=${mix.signatureGain}[signature]`,
    `[1:a]aresample=48000,volume=${mix.flash},adelay=50|50[flash]`,
    `[signature][flash]amix=inputs=2:normalize=0:duration=longest,apad=pad_dur=${mix.duration},atrim=0:${mix.duration},afade=t=out:st=${fadeStart}:d=0.08,alimiter=limit=0.891[out]`,
  ].join(";");
  runFfmpeg([
    "-i", source(mix.signature),
    "-i", source("reveal-flash-tail"),
    "-filter_complex", filter,
    ...encodeArguments(outputPath),
  ]);
  console.log(`built ${outputPath}`);
}

console.log(`Web SFX ready in ${outputDirectory}`);
