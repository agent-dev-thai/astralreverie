# AGENTS.md

## Commands

- `pnpm start`: run the production static server on `0.0.0.0:${PORT:-3000}`.
- `PORT=4173 pnpm start`: run locally on the port expected by browser QA.
- `pnpm check`: syntax-check the server and browser JavaScript modules.
- `pnpm test`: run the built-in Node server tests.
- `python3 tools/qa_playwright.py`: run full desktop/mobile interaction QA against a server already listening on port 4173. It requires Python Playwright and Chromium.
- `python3 tools/process_card_art.py` and `python3 tools/process_rarity_warps.py`: regenerate optimized visual assets; both require Pillow.

## Architecture

This is a dependency-free static web app with no compilation step. `index.html` owns the page structure, `styles.css` owns responsive presentation and motion, and `app.js` owns DOM rendering, interactions, audio, and persisted browser state. Browser code uses native ES modules.

Gacha rules are isolated in `gacha-core.js`; player-visible text, item definitions, rarity metadata, and top-up packages live in `strings.js`. Persisted simulator state uses the `gachasim-v1` localStorage key. `logic.js` is only the single-player deployment stub.

`server.mjs` is the production/Railway entrypoint. It binds Railway's injected `PORT`, exposes `/health`, and deliberately serves only the app shell plus supported files under `assets/`. If a new root-level browser module or asset extension is added, update its allowlist and the server tests together. `railway.json` selects Railpack and defines the start command and health check.

`assets/generated/` contains shipped artwork. The scripts under `tools/` and prompt/source material under `design/` are the regeneration pipeline and provenance, not public runtime content. `Gacha Simulator.dc.html` and `ios-frame.jsx` are retained design references and are not shipped by the production server.

## Change Boundaries

- Keep probability, pity, and pull behavior changes in `gacha-core.js`; keep player-facing vocabulary in `strings.js`.
- Preserve seeded runs via `?seed=<number>` and the debug overlay via `?dev=1`; browser QA depends on both.
- Do not replace the static architecture with a framework or add a build pipeline unless the requested feature needs it.
- Do not expose the repository root through the production server.

