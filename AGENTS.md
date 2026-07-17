# AGENTS.md

## Commands

- `pnpm start`: run the production static server on `0.0.0.0:${PORT:-3000}`.
- `PORT=4173 pnpm start`: run locally on the port expected by browser QA.
- `pnpm check`: syntax-check the server and browser JavaScript modules.
- `pnpm test`: run the explicit `test/*.test.mjs` suite. Keep the explicit glob; default Node discovery follows pnpm's project-store backlink recursively in this environment.
- `python3 tools/qa_playwright.py`: run full desktop/mobile interaction QA against a server already listening on port 4173. It requires Python Playwright and Chromium.
- `pnpm images:process`, `python3 tools/process_card_art.py`, and `python3 tools/process_rarity_warps.py`: regenerate optimized runtime, card, and rarity-warp assets; all require Pillow.

## Architecture

This is a static web app with no compilation step. `index.html` owns the page structure, `styles.css` owns responsive presentation, and `app.js` owns DOM rendering, interactions, audio, and persisted browser state. Browser code uses native ES modules. Motion is pinned as an npm dependency and vendored to `assets/vendor/motion-12.42.2.js`; run `pnpm vendor:motion` after changing its version.

Gacha rules are isolated in `gacha-core.js`; player-visible text, item definitions, rarity metadata, and top-up packages live in `strings.js`. Persisted simulator state uses the `gachasim-v1` localStorage key. `logic.js` is only the single-player deployment stub.

`cinematic-media.js` isolates the six Higgsfield treatments from game state; the existing WebP/CSS sequence remains the playback fallback. `cinematic-sfx.js` loads the ElevenLabs buildup/reveal samples after the critical page load and routes them through the existing SFX bus while oscillator synthesis remains the failure fallback. The Suno background loop stays on its own music bus so one-shot assets do not change music control.

`server.mjs` is the production/Railway entrypoint. It binds Railway's injected `PORT`, exposes `/health`, compresses text/font responses, supports byte ranges for audio/video, and deliberately serves only the app shell plus supported files under `assets/`. If a new root-level browser module or asset extension is added, update its allowlist and the server tests together. `railway.json` selects Railpack and defines the start command and health check.

`assets/generated/` contains shipped artwork. The scripts under `tools/` and prompt/source material under `design/` are the regeneration pipeline and provenance, not public runtime content. `Gacha Simulator.dc.html` and `ios-frame.jsx` are retained design references and are not shipped by the production server.

## Change Boundaries

- Keep probability, pity, and pull behavior changes in `gacha-core.js`; keep player-facing vocabulary in `strings.js`.
- Preserve seeded runs via `?seed=<number>` and the debug overlay via `?dev=1`; browser QA depends on both.
- Do not replace the static architecture with a framework or add a build pipeline unless the requested feature needs it.
- Do not expose the repository root through the production server.
