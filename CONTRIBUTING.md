# Contributing

Thanks for helping improve Astral Reverie. Small, focused pull requests are easiest to review.

## Local setup

Requirements:

- Node.js 20.9 or newer
- pnpm 10 (the exact package-manager version is declared in `package.json`)
- Python 3.9+ only for image tooling and browser QA
- ffmpeg only for regenerating the processed cinematic sound effects

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
```

For full interaction QA:

```bash
python3 -m pip install -r requirements-dev.txt
python3 -m playwright install chromium
PORT=4173 pnpm start
# In another terminal:
python3 tools/qa_playwright.py
```

Set `QA_ARTIFACTS_DIR` to choose where browser screenshots are written.

## Project boundaries

- Keep probability, pity, and roll behavior in `gacha-core.js`.
- Keep player-visible text and item metadata in `strings.js`.
- Keep pull media selection in `cinematic-media.js` and sound loading in `cinematic-sfx.js`.
- Preserve `?seed=<number>` and `?dev=1`; automated QA relies on both.
- Do not introduce a framework or build pipeline for changes that fit the static architecture.
- Update `server.mjs` and its tests when adding a public root module or asset type.
- Never commit provider credentials, `.env` files, source-media masters, or generated QA output.

Generated media changes should include updated provenance and a reproducible processing command. Do not add recognizable third-party game characters, logos, names, UI chrome, or copied media.

## Pull requests

Before opening a pull request:

1. Run `pnpm check`, `pnpm test`, and `git diff --check`.
2. Run browser QA for interaction, layout, audio, sharing, or cinematic changes.
3. Explain user-visible behavior and list the verification you actually ran.
4. Keep unrelated cleanup out of the change.

By contributing code, you agree that your contribution is licensed under the repository's MIT License. Do not contribute media you do not have the right to redistribute.
