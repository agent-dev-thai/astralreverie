# Astral Reverie — runnable implementation

The root now contains a standalone one-page web implementation of the design handoff. It uses plain HTML, CSS, and JavaScript; generated artwork and fonts are vendored locally, and all persistent simulator state stays in `localStorage`.

Run the production server from the repository root:

```bash
pnpm start
```

Then open `http://127.0.0.1:3000/`. Add `?seed=123` for a reproducible pull sequence or `?seed=123&dev=1` for the FPS/debug overlay. The app has no runtime dependencies and no build step.

## Railway deployment

The repository is ready for a Railway service:

1. In Railway, create a project from the `agent-dev-thai/fake-gacha` GitHub repository.
2. Deploy the repository root. No environment variables are required; Railway injects `PORT` automatically.
3. Generate a public domain for the service after the health check passes.

`railway.json` selects Railpack, starts the app with `pnpm start`, and checks `/health`. `server.mjs` binds `0.0.0.0` and serves only runtime app files and assets.

For the existing browser QA port, run:

```bash
PORT=4173 pnpm start
```

Key implementation files:

- `index.html`, `styles.css`, `app.js`: the one-page interface and interactions
- `gacha-core.js`: seeded RNG, rarity rates, soft/hard pity, and SR+ guarantee
- `strings.js`: player-visible copy, item pool, rarity metadata, and packages
- `logic.js`: the single-player deployment stub
- `assets/generated/`: final generated artwork, including unique art for all 32 cards
- `design/assets.csv`, `design/style-formula.txt`, `design/asset-prompts.md`, `design/card-art-prompts.md`, `design/rarity-warp-prompts.md`: asset provenance, prompt sets, and style contract
- `tools/process_card_art.py`: repeatable PNG-to-WebP card optimization and contact-sheet generation
- `tools/process_rarity_warps.py`: repeatable rarity-warp optimization and contact-sheet generation
- `tools/qa_playwright.py`: desktop/mobile interaction and screenshot QA

The original design-handoff documentation and prototype files are retained below and remain unchanged reference material.

---

# Handoff: Gacha Simulator — "Astral Reverie"

## Overview
A satirical, mobile-first gacha pull simulator built to reproduce the full dopamine loop of HSR-era gacha games — with fake currency and self-aware copy. Core loop: spend gems → skippable cinematic warp buildup (with near-miss fakeouts) → staggered card reveals → 10-pull summary with an "Again ×10" button. Includes pity system (soft + hard), fake top-up shop that tallies "money you didn't spend," collection album, luck-audit stats, and pull history. Synth SFX via WebAudio.

## About the Design Files
The files in this bundle are **design references created in HTML** — a working prototype showing intended look and behavior, not production code to copy directly. Your task is to **recreate this design in the target codebase's existing environment** (React Native, Flutter, SwiftUI, web React, etc.) using its established patterns and libraries. If no environment exists yet, choose the most appropriate framework and implement the design there.

`Gacha Simulator.dc.html` contains the entire design: an HTML template (markup + inline styles) and a `Component` logic class (all state, gacha math, audio) near the bottom of the file. `ios-frame.jsx` is only a presentational iPhone bezel for previewing — do not ship it.

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, and animation timings are final. Recreate pixel-perfectly using your codebase's conventions.

## Screens / Views
All screens live inside a phone-sized viewport (~430×~900), dark theme. Persistent chrome: top bar + bottom tab bar; full-screen overlays sit above both.

### Shell (always visible)
- **Background**: `linear-gradient(180deg, #0c0a1c 0%, #131028 45%, #1a1230 100%)`; text `#eae6f7`.
- **Top bar** (row, gap 8, padding 58px 14px 6px — top padding clears iOS status bar):
  - Wordmark "ASTRAL REVERIE" — Marcellus 15px, letter-spacing 2px, `#ffd75e`.
  - Spacer, then mute pill button (🔊/🔇, 12px, bg `rgba(255,255,255,.07)`, border `rgba(255,255,255,.12)`, radius 20).
  - Gems pill button: gold diamond (12×12 rotated square, gradient `#ffe89a→#ffab4a`), gem count (Rajdhani 700 14px `#ffd75e`), "＋". Bg `rgba(255,215,94,.1)`, border `rgba(255,215,94,.35)`, radius 20. Opens Top-up sheet. Hover: bg `rgba(255,215,94,.2)`.
- **Tab bar** (bottom): 4 equal buttons — BANNER / ALBUM / STATS / LOG. Rajdhani 700 13px, letter-spacing 1px, padding 8px 0, radius 10. Active: `#ffd75e` on `rgba(255,215,94,.1)`; inactive `#6f6790`. Bar bg `rgba(8,7,14,.7)` + blur(8px), top border `rgba(255,255,255,.08)`.

### 1. Banner (home)
Column, gap 12, padding 8px 14px 16px.
- **Banner card**: radius 18, min-height 270, border `rgba(255,215,94,.25)`, bg `linear-gradient(135deg,#241a4d,#3d2160 55%,#5c2a52)`. Decorations: radial gold glow top-right; a 150px "sun" orb (radial `#ffe9b0→#ff9d5e→#7b3fa0`) floating (4s Y-bounce ±8px); 182px dashed gold circle rotating 24s. Badge top-left: "RATE UP · LIMITED" (11px 700 ls1.5 `#ffd75e` on `rgba(0,0,0,.4)` blur). Bottom text block over a dark fade: title "Duskfall Requiem" (Marcellus 26px white), sub "Featured UR — Seren · the Dusk Warden" (14px 600 `#d9c8ff`), footnote "Ends in 27d 11h — don't worry, another one starts immediately" (12px `#8f87ab`).
- **Pity panel**: card (bg `rgba(255,255,255,.05)`, border `rgba(255,255,255,.09)`, radius 14, padding 12 14). Row: "UR PITY" (13px 700 ls1.5 `#bfb8dd`), current pity (16px 700 `#ffd75e`), "/ 80" (13px `#8f87ab`), right hint: "guaranteed UR at 80", or at ≥80% pity: "SOFT PITY — it knows you can feel it". Progress bar: 10px track `rgba(0,0,0,.45)` radius 5; fill = pity/hardPity %, gradient `#7b5cff→#ff8ad4→#ffd75e` with 3s shimmer (background-position sweep), width transition .6s cubic-bezier(.2,.8,.2,1).
- **Snark ticker**: centered italic 13px `#8f87ab`, quote rotates per pull (see copy list below).
- **Pull buttons** (row, gap 10):
  - "Warp ×1 / ◆ 160" — flex 1, ghost style (bg `rgba(255,255,255,.06)`, border `rgba(255,255,255,.16)`, radius 14, padding 14 8). Label 17px 700; cost 13px 600 `#ffd75e`. Active: scale .97.
  - "Warp ×10 / ◆ 1600 · guaranteed SR+" — flex 1.4, gradient `#ffd75e→#ff9d5e`, text `#2a1a05`, radius 14, pulsing glow (box-shadow `rgba(255,215,94,.45→.75)`, 2.4s loop).
- **Money line**: centered 12px `#6f6790`: "Money this would have cost you so far: **$X** — still in your bank. You're welcome." ($ figure `#6fe0a8` 700.)

### 2. Album
- Header: "Album" (Marcellus 20px) + "N / 32 collected — the void where money goes" (13px `#8f87ab`).
- Grid 4 columns, gap 8. Cells aspect 3/4, radius 10.
  - **Owned**: border + rarity color, bg = item gradient (`c1→c2`, 160deg), glyph (first letter, Marcellus 26px `rgba(255,255,255,.9)`), name (10px 600 white), rarity tag (9px 700 ls1, rarity color), count badge "×N" top-right (10px 700 `#ffd75e`).
  - **Unowned**: bg `rgba(255,255,255,.03)`, border `rgba(255,255,255,.08)`, glyph "?" `#3a3550`, name "???" `#4a4560`, opacity .75.

### 3. Stats ("Your Luck, Audited")
- 2×2 grid of stat cards (bg `rgba(255,255,255,.05)`, border `rgba(255,255,255,.09)`, radius 12, padding 12): label 11px 700 ls1.5 `#8f87ab`, value 26px 700, sub 11px `#6f6790`.
  - TOTAL WARPS (white; sub "N this session") · UR PULLED (`#ffd75e`; sub "N SSR") · YOUR UR RATE (white %, sub "expected 0.6%") · WOULD-BE SPEND (`#6fe0a8` $; sub "≈ N burritos saved", burrito = $11.50).
- **Luck verdict** card: bg `rgba(255,215,94,.07)`, border `rgba(255,215,94,.25)`, radius 12, 14px `#e8dcb0`, line-height 1.45. Text branches on (your UR rate ÷ expected): ≥1.5 "running HOT…", ≥0.8 "perfectly average…", 0 URs "Zero URs. The pity system was designed for people exactly like you…", else "below rate…". Empty state: "Pull something first. The audit needs data. The void needs feeding."
- **Reset button**: "Delete account & pretend this never happened" — ghost, border `rgba(255,110,110,.35)`, text `#ff8a8a` 13px 600, radius 10. Clears all persisted state, toasts "Account deleted. Addiction intact."

### 4. Log ("Warp Log — the receipts")
- Rows (gap 6): bg `rgba(255,255,255,.04)`, border `rgba(255,255,255,.07)`, radius 10, padding 8 12. Contents: pull number "#N" (12px `#6f6790`, 34px wide), 9px rarity dot with matching glow, item name (14px 600; white, but `#8f87ab` for Commons), rarity label right-aligned (11px 700 ls1, rarity color). Latest first, capped at 60 shown / 200 stored.
- Empty state: "No pulls yet. Your wallet is safe. For now."

### 5. Top-up sheet (overlay, z 40)
- Scrim `rgba(5,4,10,.75)` + blur(6px); tap scrim to close. Bottom sheet: bg `#16122b`, radius 22 22 0 0, gold top border.
- Header "Stellar Shards" (Marcellus 20px `#ffd75e`) + ✕. Sub: "100% fake money. 100% real dopamine."
- 4 package rows (radius 14, bg `rgba(255,255,255,.05)`; hover: gold border): gold diamond icon 34px, "◆ N" (17px 700 white), snark quote (12px italic `#8f87ab`), price right (16px 700 `#6fe0a8`):
  - 60 — $0.99 "The gateway drug"
  - 980 — $14.99 "Just this once"
  - 3,280 — $49.99 "Payday was yesterday"
  - 6,480 — $99.99 "Cheaper than therapy (it is not)"
- Buying is instant + free: adds gems, adds price to would-be-spend tally, toast "+N shards · $X of imaginary money". Footer shows lifetime tally.

### 6. Cinematic — Buildup (overlay, z 50)
- Full-screen `#04030a`. 6 vertical star-streaks (2–3px wide, gradients to the tint color, 4 tinted + 2 white) falling top→bottom on 0.8–1.3s loops with staggered delays. Center comet: 120px radial orb (white core → tint), pulsing scale 1→1.25 + brightness, 1s loop, drop-shadow glow in tint.
- **Tint = rarity color of the best item in the pull** — except **near-miss**: if best is SSR (45% chance), tint shows SR-purple and a gold/pink radial full-screen flash fires at ~55–78% of the timeline (keyframed opacity flicker, 2.6s), caption changes to "THE LIGHT… IT LOOKS GOLD—". Normal caption: "TRAVERSING THE VOID" (13px ls3 `#8f87ab`, floating).
- SKIP ≫ pill top-right (below status bar, top 62px). Auto-advances to Reveal after `cinematicMs` (default 3200ms).

### 7. Cinematic — Reveal
- Bg: radial glow in current card's rarity glow color over `#04030a`. Counter "n / N" top-center. Tap anywhere advances.
- **Card**: 216×312, radius 16, 2px border in rarity color, bg item gradient, box-shadow rarity glow. Contents: NEW badge (gold chip, top-left) if first copy; glyph (Marcellus 74px); name (Marcellus 20px white); title (12px 600 `rgba(255,255,255,.75)`); stars (16px ls3, rarity color + glow); rarity label (11px 700 ls2).
- Entry animation: rotateY(90°) scale(.7) → overshoot −12° scale 1.05 → settle; .55s cubic-bezier(.2,.8,.3,1). (Prototype alternates two identical keyframe names to force restart between cards — in a real framework, key the card by reveal index.)
- Multi-pulls get a "REVEAL ALL ≫" pill (top-right) jumping to Summary. Single pulls close directly after the card.

### 8. Cinematic — Summary (10-pulls only)
- Bg `linear-gradient(180deg,#0a0818,#151028)`. Title "Warp Results" (Marcellus 22px).
- Grid 5×2 of mini cards (aspect 3/4.4, radius 10, 1.5px rarity border, item gradient, rarity glow, NEW chip). **Staggered pop-in**: scale 0 → 1.12 → 1, .45s, delay `index × 70ms`.
- Snark line below (rotating list). Buttons: "Collect" (ghost, flex 1) and **"Again ×10 ◆1600"** (gold gradient, flex 1.3, pulsing glow) — the re-engagement hook; it immediately starts another 10-pull.

### Toast
Pill fixed above tab bar (bottom 86px, centered, z 60): bg `rgba(20,16,40,.95)`, gold border, `#ffd75e` 13px 600, pop-in, auto-dismiss 2.6s.

## Interactions & Behavior
- **Pull flow**: Warp button → validate gems (insufficient → toast "Not enough shards — 'top up' (it's free, unlike real life)" + auto-open top-up sheet) → deduct cost → roll results → buildup → reveal(s) → summary (10x) → collect/again.
- **Whole reveal screen is a tap target**; skip/reveal-all buttons `stopPropagation`.
- **Sheet scrim click closes**; sheet body stops propagation.
- **SFX** (WebAudio oscillators, no samples; lazily create AudioContext on first interaction; global mute toggle):
  - Whoosh on buildup start (low sawtooth sweeps ~120/180Hz, 1.2s, + soft 560Hz sine).
  - Reveal ding pitched by rarity — base Hz: C 330, R 440, SR 587, SSR 740, UR 880; triangle + 1.5× sine overtone; SSR adds 2× octave; UR plays a 4-note rising arpeggio (1×, 1.25×, 1.5×, 2×).
  - UI tick: 880Hz triangle, 80ms.
- All buttons: active scale .97–.98; hover states as noted.

## State Management
State (persist everything except session/transient to localStorage, key `gachasim-v1`):
- `gems` (start 3200), `pity`, `pitySR`, `totalPulls`, `urCount`, `ssrCount`, `fakeSpendC` (cents), `owned` (id→count), `history` (array {n,id,name,rarity}, cap 200).
- Transient: `sessionPulls`, `screen`, `topupOpen`, `phase` (null|buildup|reveal|summary), `results`, `revealIdx`, `nearMiss`, `buildBest`, `muted`, `toast`.

### Gacha math (per single roll)
- Base UR rate 0.6% (configurable). **Soft pity**: from pull 65 (80% of hard pity 80), +6 percentage points per pull. **Hard pity**: pull 80 = guaranteed UR. UR resets `pity`.
- SSR 5.1%, SR 13%, R 30%, C remainder (~51.3%).
- **10-pull SR+ guarantee**: separate `pitySR` counter; 10th consecutive non-SR+ forces SR. Any SR/SSR/UR resets it.
- Near-miss flag: best-of-pull is SSR AND `random < .45`.
- Item picked uniformly within its rarity tier.

## Design Tokens
**Colors**
- Bg gradient stops: `#0c0a1c` `#131028` `#1a1230`; overlay black `#04030a`; sheet `#16122b`; page frame `#08070e`.
- Text: primary `#eae6f7`, secondary `#bfb8dd`, muted `#8f87ab`, faint `#6f6790`, disabled `#4a4560`.
- Gold accent `#ffd75e` (dark text on gold: `#2a1a05`); gold gradient `#ffe89a→#ffab4a` and `#ffd75e→#ff9d5e`; money green `#6fe0a8`; danger `#ff8a8a`.
- **Rarity**: C `#9aa3ad` ★ · R `#4da3ff` ★★ · SR `#b06bff` ★★★ · SSR `#ffd75e` ★★★★ · UR `#ff8ad4` ★★★★★ ("UR · LIMITED"). Glows = same hue at .25–.65 alpha.
- Surfaces: `rgba(255,255,255,.04–.07)` fills, `rgba(255,255,255,.07–.16)` borders.

**Typography**
- Display: Marcellus (serif) — wordmark, screen titles, card names/glyphs.
- UI: Rajdhani 500/600/700 — everything else. Scale: 9–13px meta/labels, 14–17px body/buttons, 20–26px headers/values, 74px card glyph.

**Spacing & shape**: page padding 14px; card padding 12–14px; gaps 6/8/10/12; radii 10 (cells/rows), 12–14 (cards/buttons), 16 (reveal card), 18 (banner), 20 (pills), 22 (sheet).

**Motion**: reveal flip .55s / summary pop .45s, both cubic-bezier(.2,.8,.3,1); stagger 70ms; streaks .8–1.3s linear loops; glow pulse 2.4s; float 5s; pity fill .6s; buildup default 3200ms.

## Content / Copy
- Item pool: 32 items — 3 UR characters (Seren · the Dusk Warden; Kaelis · Star Devourer; Nyx · Terminal Dawn), 6 SSR characters, 7 SR characters, 8 R trinkets ("Voidglass Charm", "Key to Nowhere"…), 8 C junk items ("Suspicious Rock", "Expired Coupon", "Cosmic Sock (one)"…). Full list with gradients in the HTML (`this.POOL`).
- Rotating snark lines (home ticker + summary) in `this.SNARK` / `this.SUMMARY_SNARK`.

## Configurable parameters (exposed as tweaks in the prototype)
- `urBaseRate` (0.1–10%, default 0.6) · `hardPity` (10–200, default 80) · `cinematicMs` (800–6000, default 3200).

## Assets
None — all visuals are CSS gradients, simple shapes, and type. Character "art" is a glyph-on-gradient placeholder; production should replace with real illustrations. Fonts: Google Fonts — Marcellus, Rajdhani.

## Files
- `Gacha Simulator.dc.html` — the full design: template markup + inline styles, and the `Component` logic class (state, gacha math, WebAudio SFX) at the bottom.
- `ios-frame.jsx` — preview-only iPhone bezel; not part of the design.
