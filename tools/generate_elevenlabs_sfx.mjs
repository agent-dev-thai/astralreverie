import { access, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const API_URL = "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192";
const apiKey = process.env.ELEVENLAB_API;
const force = process.argv.includes("--force");
const outputFlag = process.argv.indexOf("--out-dir");
const onlyFlag = process.argv.indexOf("--only");
const selectedNames = new Set(
  onlyFlag >= 0 && process.argv[onlyFlag + 1]
    ? process.argv[onlyFlag + 1].split(",").map(name => name.trim()).filter(Boolean)
    : [],
);
const outputDirectory = resolve(
  outputFlag >= 0 && process.argv[outputFlag + 1]
    ? process.argv[outputFlag + 1]
    : "tmp/elevenlabs-sfx/source",
);

const STEMS = Object.freeze([
  {
    name: "shared-intake",
    duration: 2.4,
    influence: 0.8,
    prompt: "A continuously active 2.4-second cinematic science-fiction summoning intake with no dead air: quiet deep vacuum suction starts immediately, debris and air accelerate throughout the entire duration, pressure and tactile low-frequency movement rise without interruption until the final frame. Do not resolve and do not add an impact. No music, voice, melody or rhythmic pulse. Clean isolated dry sound-design stem.",
  },
  {
    name: "signature-c",
    duration: 0.8,
    prompt: "Weak chipped-stone portal sputter, dry rubble clicks, tired metal cough and exactly two tiny electrical sparks, deliberately disappointing and low energy, short isolated impact, almost no reverb, no music, no voice, no melody.",
  },
  {
    name: "signature-r",
    duration: 0.9,
    influence: 0.8,
    prompt: "Audible energetic 0.9-second cobalt science-fiction energy lock: thin glass rails snap into alignment with a strong clean transient, followed by a precise electrical scan and narrow blue-white pressure release that remains audible through the tail. Technical, controlled and satisfying, not quiet or distant. No music, voice or melody.",
  },
  {
    name: "signature-sr",
    duration: 1.1,
    prompt: "Rich crystalline resonance, synchronized amethyst glass harmonics, elegant spatial shimmer and confident violet energy bloom, bright but not metallic gold, isolated cinematic one-shot, no music, no voice, no melody, restrained tail.",
  },
  {
    name: "signature-ssr",
    duration: 1.3,
    prompt: "Massive antique-gold solar gate rupture, heavy concentric engraved metal rings locking, deep prestigious sub impact and radiant hot-metal pressure wave, expensive and dangerous, controlled cinematic tail, no musical braam, no music, no voice, no melody.",
  },
  {
    name: "signature-ur",
    duration: 1.5,
    prompt: "Impossible reality tear, obsidian stellar crown fracture, enormous gravitational pressure collapse, violent ember-coral and magenta energy rip, deep sub drop and transcendent white rupture, materially larger and stranger than a gold solar impact, no music, no voice, no melody.",
  },
  {
    name: "signature-near-miss",
    duration: 1.6,
    influence: 0.85,
    prompt: "Clearly staged 1.6-second fakeout with a powerful ending: audible violet crystalline resonance from 0.0 to 0.45 seconds, abrupt near-silence from 0.45 to 0.60, one warm metallic contamination tick at 0.65, then a massive loud antique-gold solar rupture from 0.80 seconds through the end. The final rupture must dominate the waveform. No music, voice or melody.",
  },
  {
    name: "reveal-flash-tail",
    duration: 0.8,
    prompt: "Short clean dimensional flash, razor-bright transient followed by a controlled cosmic air tail, polished game reward reveal, no heavy bass impact, no music, no voice, no melody, isolated one-shot.",
  },
]);

if (!apiKey) {
  console.error("ELEVENLAB_API is required in the runtime environment.");
  process.exit(2);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

await mkdir(outputDirectory, { recursive: true });

for (const stem of STEMS) {
  if (selectedNames.size && !selectedNames.has(stem.name)) continue;
  const outputPath = resolve(outputDirectory, `${stem.name}.mp3`);
  if (!force && await exists(outputPath)) {
    console.log(`skip ${stem.name}: already exists`);
    continue;
  }

  console.log(`generate ${stem.name} (${stem.duration.toFixed(1)}s)`);
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text: stem.prompt,
      duration_seconds: stem.duration,
      prompt_influence: stem.influence ?? 0.65,
      loop: false,
      model_id: "eleven_text_to_sound_v2",
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${stem.name} failed (${response.status}): ${detail}`);
  }

  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
  const cost = response.headers.get("character-cost") || "unknown";
  console.log(`saved ${outputPath} (cost ${cost})`);
}

console.log(`ElevenLabs stems ready in ${outputDirectory}`);
