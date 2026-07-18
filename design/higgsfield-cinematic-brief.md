# Higgsfield cinematic production brief

## Delivery contract

Produce six silent 3.2-second treatments in portrait and landscape. The browser chooses the orientation at pull time and keeps the current WebP/CSS effect as its fallback.

| Treatment | Portrait | Landscape |
| --- | --- | --- |
| C | `assets/generated/cinematics/portrait/warp-c.mp4` | `assets/generated/cinematics/landscape/warp-c.mp4` |
| R | `assets/generated/cinematics/portrait/warp-r.mp4` | `assets/generated/cinematics/landscape/warp-r.mp4` |
| SR | `assets/generated/cinematics/portrait/warp-sr.mp4` | `assets/generated/cinematics/landscape/warp-sr.mp4` |
| SSR | `assets/generated/cinematics/portrait/warp-ssr.mp4` | `assets/generated/cinematics/landscape/warp-ssr.mp4` |
| UR | `assets/generated/cinematics/portrait/warp-ur.mp4` | `assets/generated/cinematics/landscape/warp-ur.mp4` |
| Near miss | `assets/generated/cinematics/portrait/warp-near-miss.mp4` | `assets/generated/cinematics/landscape/warp-near-miss.mp4` |

- Portrait: 720×1280. Landscape: 1280×720.
- Frame rate: 30 fps across every treatment.
- Silent; music and effects stay browser-controlled.
- Keep all meaningful action inside the center 55% so responsive cropping remains safe.
- Start dark and readable. End on a full-frame white breach at exactly 3.2 seconds.
- Do not include text, logos, characters, UI, cards, stars with recognizable franchise shapes, or generated audio.

All twelve orientations are delivered and enabled. If a video cannot play, the current WebP/CSS treatment remains visible as the runtime fallback.

## Production run

The shipped clips were generated on 2026-07-17 with Higgsfield Cinema Studio 3.0 at 720p. Higgsfield returned silent 4.04-second masters; the web copies preserve the complete motion by retiming them to 3.2 seconds instead of truncating the final breach.

| Delivery | Higgsfield job |
| --- | --- |
| Landscape C | `1881ab90-6084-4cf6-b768-07d13bf8fd54` |
| Portrait C | `845ee84d-d11e-4eac-8511-a57e894ed075` |
| Landscape R | `eaf3ff2a-908d-425f-a49c-e6bdd00e1f23` |
| Portrait R | `2c791556-1421-4479-ab15-f20a59ca40a9` |
| Landscape SR | `79142c89-7fda-437d-b355-8fd88705d94a` |
| Portrait SR | `46aed6eb-d2f9-46c5-8485-5930e877dbb7` |
| Landscape SSR | `e16e3041-d212-409f-b845-154a2b1c97e6` |
| Portrait SSR | `a4f4d027-95b1-432c-ab84-77efef290468` |
| Landscape UR | `dba42c3e-7172-423a-9684-b20f0f178ca5` |
| Portrait UR | `cd385a8e-840d-4acb-9276-51037ad9bd2c` |
| Landscape near miss | `084fb912-26b9-42d2-8bd1-479371424999` |
| Portrait near miss | `f4e1be33-4ac3-4194-8bd0-e79b5e066951` |

The production set used 240 credits. A four-credit standard-model canary was also evaluated and rejected, bringing the total generation spend to 244 credits.

## Shared motion grammar

Every clip must feel like the same machine at a different power level.

```text
0.00  dormant aperture; nearly black
0.25  particles pull toward the center
0.70  deliberate super-dolly acceleration begins
1.80  tunnel geometry destabilizes
2.45  rarity signature breaches the aperture
3.05  camera crosses the threshold
3.20  full-frame white impact
```

Use one purposeful camera move: a centered super-dolly through the aperture with physically believable inertia. No handheld drift, random pans, cuts, orbiting camera, or speed changes that move the final breach off-center.

## Master prompt

```text
A premium original cosmic summoning machine suspended in a deep plum-black void, viewed perfectly centered. Dust and fragments are pulled toward a distant aperture, then the camera performs one deliberate super-dolly forward with believable inertia. Layered astronomical scale, editorial asymmetry only in peripheral debris, refined space-opera production design, tactile light scattering, deep blacks, restrained lens bloom, clear central silhouette, no character and no interface. Motion begins almost still, accelerates continuously, destabilizes at 1.8 seconds, breaches at 2.45 seconds, and becomes a clean full-frame white impact at exactly 3.2 seconds. Keep all essential action in the center 55 percent for responsive cropping. Silent.
```

Append exactly one treatment prompt below to the master prompt.

### C — failed salvage

```text
Power level C. A weak grey-brown aperture assembled from chipped stone, dead metal dust and two intermittent sparks. The tunnel struggles to form, sputters unevenly and never becomes majestic. Low saturation, low energy and deliberately disappointing, but still art-directed. The final white breach is small and dry with almost no bloom.
```

### R — cobalt lock

```text
Power level R. Thin cobalt light rails align into a precise needle-shaped tunnel. Clean blue electrical scans and glasslike fragments lock into place as acceleration increases. Controlled, technical and satisfying, with a narrow blue-white breach and restrained bloom.
```

### SR — violet resonance

```text
Power level SR. Violet crystalline geometry folds into a rotating diamond aperture while luminous fragments resonate in synchronized waves. Rich amethyst energy, elegant spatial distortion and a confident acceleration curve. The final breach expands into saturated violet-white light without gold.
```

### SSR — solar covenant

```text
Power level SSR. A dark solar eclipse ignites into concentric antique-gold rings, molten metallic particles and radiant sunline geometry. The machine feels prestigious, dangerous and expensive. Acceleration carries real mass; the aperture emits a huge gold-white breach with long radial rays and warm volumetric bloom.
```

### UR — impossible crown

```text
Power level UR. Reality fractures around a black stellar crown edged in pink-gold fire. Enormous magenta and ember-coral gravitational ribbons bend into the aperture while thin white cracks cross the void. Scale becomes impossible and transcendent without visual noise. The final threshold tears the entire frame into brilliant pink-gold-white light, materially larger and louder than SSR.
```

### Near miss — contaminated resonance

```text
Begin exactly like the SR violet resonance treatment. Until 1.85 seconds there must be no gold. At 1.9 seconds a single warm gold fault contaminates the violet aperture; it disappears, returns stronger, then violently converts the center into an SSR gold-white breach at 2.45 seconds. The fakeout must be readable without text and must not reveal gold early.
```

## Negative prompt

```text
No people, faces, hands, characters, spaceships, weapons, cards, text, letters, logos, HUD, interface, game footage, anime franchise iconography, recognizable copyrighted composition, blue-purple gradient fog, generic neon tunnel, kaleidoscope cuts, camera orbit, handheld shake, fisheye, low-resolution particles, compression artifacts, muddy blacks, early whiteout, or generated sound.
```

## Web delivery pass

Keep the source render outside the repository. Encode the delivery copy as H.264 MP4 with no audio:

```bash
ffmpeg -i INPUT.mp4 -vf "setpts=0.79*PTS,fps=30" -t 3.2 -an -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart OUTPUT.mp4
```

Target at most 2.5 MB per clip. Do not make the browser wait for video: the existing still begins immediately and crossfades only after the selected clip can play.
