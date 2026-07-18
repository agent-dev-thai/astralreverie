# Audio provenance

## Production background loop

- Title: `The House Beyond the Stars`
- Selected Suno generation ID: `cf4e896f-0b09-489a-b9b0-49ad1692a9a4`
- Suno creation timestamp embedded in source: `2026-07-17T09:01:06Z`
- Source SHA-256: `627fc88f4f88bedbd5fd5c120e490a567aeabc0c668324fb9e2e28cfbd184936`
- Source format: 48 kHz, 16-bit stereo PCM WAV, 122.72 seconds
- Delivery asset: `assets/audio/house-beyond-stars-loop.m4a`
- Delivery processing: remove the first five seconds from the loop point; crossfade the final five seconds into the opening five seconds; normalize to approximately −18 LUFS; encode 48 kHz stereo AAC at 192 kbps with fast-start metadata
- Delivery duration: 117.72 seconds

The shorter source was selected because it has clearer tension valleys, slightly higher dynamic range, and no baked silent tail.

## Preserved alternate

- Suno generation ID: `9f1f5fd2-0ee2-439e-9365-b560e459e71b`
- Suno creation timestamp embedded in source: `2026-07-17T09:00:50Z`
- Source SHA-256: `a8e12a9778a9e34559d1aee315f36b5a903b4c00677fbd4a232e844898be6b73`
- Source format: 48 kHz, 16-bit stereo PCM WAV, 153.76 seconds
- Reason not selected: denser overall arrangement and a baked 0.86-second silent tail

The original WAV files remain outside the repository. Confirm that the selected generation was created under a Suno plan granting the intended usage rights before public/commercial deployment.

## ElevenLabs cinematic SFX

- Generation date: 2026-07-17.
- Model: `eleven_text_to_sound_v2`.
- Source format: ElevenLabs MP3, 44.1 kHz stereo at 192 kbps.
- Runtime secret: `ELEVENLAB_API`; the value is never written to the repository or generation logs.
- Source stems: shared intake, C/R/SR/SSR/UR signatures, SR→SSR near-miss signature, and reveal flash tail.
- Initial batch cost: 104 credits.
- Targeted retries: shared intake, R, and near miss; 49 credits.
- Total generation cost: 153 credits.
- Exact prompts and durations: `tools/generate_elevenlabs_sfx.mjs`.
- Delivery mixer: `tools/process_elevenlabs_sfx.mjs`.

The ignored `tmp/elevenlabs-sfx/source/` directory holds the generated masters locally. Eleven web assets are shipped under `assets/audio/sfx/`: six exact 3.2-second buildup tracks and five rarity-specific reveal hits. Delivery files are 48 kHz stereo AAC at 192 kbps with fast-start metadata.

The buildup peak ladder is intentional: C −12.1 dB, R −9.6 dB, SR −8.9 dB, SSR −4.7 dB, UR −3.9 dB, and near miss −7.4 dB. The music bus ducks independently during cinematics, and UI ticks remain synthesized for immediate response. If a sample cannot load or decode, `app.js` falls back to the previous oscillator treatment.
