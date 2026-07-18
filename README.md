# Astral Reverie

A consequence-free cinematic gacha simulator: original space-fantasy cards, seeded pulls, soft and hard pity, rarity-specific openings, a collection archive, luck statistics, and deliberately fake top-ups.

![Astral Reverie social preview](assets/generated/share/astral-reverie-og.jpg)

There is no account, checkout, payment API, or item of value. All simulator progress stays in browser local storage.

## Highlights

- deterministic runs with `?seed=<number>` and a `?dev=1` QA overlay;
- single and ten-pull flows with C through UR cinematics and audio;
- rarest-first opening for multi-pulls, followed by an accessible result carousel;
- soft pity, hard pity, and an SR+ ten-pull guarantee isolated in `gacha-core.js`;
- read-only shared result links with exact-card Open Graph previews;
- responsive mobile/desktop layouts, keyboard controls, reduced-motion support, and audio fallback;
- a small allowlisted Node server with compression, byte ranges, cache validation, health checks, and security headers;
- optional, deployer-owned Google Analytics 4 with privacy-limited event data.

## Quick start

Requirements: Node.js 20.9+ and pnpm 10.

```bash
pnpm install --frozen-lockfile
pnpm start
```

Open `http://127.0.0.1:3000/`.

Useful local URLs:

- `/?seed=104` — reproducible pull sequence;
- `/?seed=104&dev=1` — reproducible sequence plus the debug overlay.

## Configuration

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | No | `3000` | HTTP listening port |
| `HOST` | No | `0.0.0.0` | HTTP bind host |
| `NODE_ENV` | No | Unset | Set to `production` for deployment origin enforcement |
| `PUBLIC_ORIGIN` | When `NODE_ENV=production` | Request origin outside production | Pins canonical and social metadata to a trusted root `http(s)` origin |
| `GA_MEASUREMENT_ID` | No | Disabled | Enables GA4 for a valid `G-...` web-stream ID |

Example:

```bash
NODE_ENV=production \
PUBLIC_ORIGIN=https://gacha.example \
GA_MEASUREMENT_ID=G-XXXXXXXXXX \
pnpm start
```

The server does not load `.env` files automatically. Use your shell, process manager, or deployment dashboard. `.env.example` documents the supported values.

## Analytics and privacy

Analytics is off by default, so forks never send data to the original maintainer's property. When configured, the app:

- skips analytics in `?dev=1` mode and when Do Not Track or Global Privacy Control is enabled;
- defaults Consent Mode v2 storage and advertising signals to denied;
- strips all query parameters from recorded page locations;
- avoids seeds, card identifiers, shared tokens, balances, and fictional spend values;
- records page views plus bounded `screen_view`, `gacha_pull`, `simulated_top_up`, `shared_result_viewed`, and `share` events.

Read [PRIVACY.md](PRIVACY.md) before enabling analytics. Deployers remain responsible for their own notice, consent flow, retention settings, and regional requirements.

## Verification

```bash
pnpm check
pnpm test
pnpm audit --audit-level high
git diff --check
```

Full browser interaction QA requires Python, Pillow, Playwright, and Chromium:

```bash
python3 -m pip install -r requirements-dev.txt
python3 -m playwright install chromium
PORT=4173 pnpm start
# In another terminal:
python3 tools/qa_playwright.py
```

Set `QA_ARTIFACTS_DIR=/path/to/output` to choose where screenshots and generated QA previews are written.

## Architecture

This is a static browser app with no compilation step.

- `index.html` — page and cinematic structure
- `styles.css` — responsive presentation and animation fallbacks
- `app.js` — rendering, interaction, audio routing, and persisted browser state
- `analytics.js` — optional GA4 loader and bounded event client
- `gacha-core.js` — seeded RNG, rarity rates, pity, and pull resolution
- `strings.js` — player-facing copy, rarity metadata, items, and fake packages
- `cinematic-media.js` / `cinematic-sfx.js` — delivered video and one-shot selection
- `pull-share.js` — versioned allowlist-only public result tokens
- `pull-og.js` — cached 1200×630 exact-result JPEG rendering
- `server.mjs` — production HTTP entrypoint and public-file allowlist
- `assets/generated/` — shipped artwork, cards, cinematics, and share assets
- `design/` — prompts, production briefs, and provenance
- `tools/` — image/audio processing and browser QA

Adding a public root module or new runtime asset extension requires a matching server allowlist and test update.

## Deployment

`railway.json` selects Railpack, starts the service with `pnpm start`, and checks `/health`. Railway supplies `PORT`; set `NODE_ENV=production` and `PUBLIC_ORIGIN` to the final public domain. The server refuses to start in production without that trusted origin. `GA_MEASUREMENT_ID` is optional.

The server exposes only the app shell, allowlisted browser modules, supported files under `assets/`, `/health`, and bounded shared-pull image routes. Repository docs, tools, source masters, and environment files are not public HTTP content.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development contract and [SECURITY.md](SECURITY.md) for private vulnerability reporting. Community participation follows [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Before changing repository visibility, work through [the public release checklist](docs/PUBLIC_RELEASE_CHECKLIST.md).

## License and media rights

Source code and project-authored documentation are available under the [MIT License](LICENSE). Vendored software and fonts retain their upstream licenses.

Generated artwork, video, sound effects, and music are not relicensed by MIT. Review [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and confirm the generation-account rights before redistributing or commercially deploying those files.

## Non-affiliation

Astral Reverie is an original satirical simulator. It is not affiliated with or endorsed by HoYoverse or any other game publisher, and it does not copy their characters, logos, names, media, or UI chrome.
