# Astral Reverie — Engineering Learnings

Consolidated reference of key decisions, fixes, and patterns learned during development.

---

## Testing

### Keep Node test discovery explicit with the local pnpm store

In this environment pnpm creates `.pnpm-store/v10/projects/<hash>` as a symlink back to the project root. Bare `node --test` follows that backlink during discovery until it fails with `ENAMETOOLONG`.

```json
"test": "node --test test/*.test.mjs"
```

Key takeaway: keep `.pnpm-store/` ignored and pass the explicit test-file glob instead of relying on Node's recursive discovery.

## Frontend

### Fix catalogue art inconsistencies at the shared asset contract

Reveal cards, the archive, result summaries, and pull Open Graph images all consume the same `ITEMS` artwork metadata. Mixing transparent `contain` sprites with full-scene `cover` cards therefore creates the same visual mismatch across every surface, even if one view is patched with CSS.

Key takeaway: ship every runtime catalogue image as a bounded full-scene WebP with `artMode: "cover"`; preserve special cutouts as source assets and bake their backdrops in the asset pipeline.

### Fixed mobile navigation can cover newly added actions

The mobile view tabs are fixed to the bottom of the viewport. Adding another full-width row to `.pull-actions` pushed Auto-open behind those tabs even though the page itself remained scrollable; placing all three mobile pull choices in one grid row kept every primary action visible.

Key takeaway: whenever the pull console gains an action, assert its bounding box ends above `.view-tabs` at the 390×844 QA viewport.

### Open Graph identity must retain validated shared state

`og:url` is the permanent identity social platforms use for a graph object. Pointing every result page at the bare homepage can collapse a valid `?pull=…` share back to home even when the Facebook Sharer received the full URL.

Key takeaway: keep visible OG content and the search canonical generic, but render `og:url` with the validated shared-pull token and strip every unrelated query parameter.

### Version immutable generated social-image routes

Shared-pull JPEGs are safe to cache for a year because the token is content-addressed, but Facebook and CDN caches can retain an old composition just as aggressively. A layout change under the same `/og/pull-vN.jpg` URL may therefore remain stale after deployment.

Key takeaway: treat the renderer path as a visual schema version and increment `pull-vN` whenever the generated composition changes after launch.

### Bundle Fontconfig for server-rendered SVG text

Sharp delegates SVG text rendering to Fontconfig. Minimal deployment images can therefore turn every label into tofu squares even when the same renderer works locally; embedded SVG fonts are not supported by Sharp.

Configure `FONTCONFIG_PATH` before importing Sharp and point it at a checked-in `fonts.conf` that discovers the shipped font files.

Key takeaway: every server-rendered social image must resolve fonts from repository assets, never from the host operating system.

### Cross-origin share popups expose dismissal, not publication

The Facebook sharer does not give this app a trustworthy post-success result. The opener can poll the cross-origin window's `closed` property, but that only proves the dialog was dismissed and includes cancellation.

Key takeaway: tie cleanup to popup dismissal and the exact result snapshot that opened it; never label dismissal as a successful post or let an old popup close a newer result.

### Decode the resolved pull during the cinematic gap

The three showcase cards were still 1.0–1.37 MB PNGs, and result artwork was requested only when reveal markup appeared. Converting every runtime card to a bounded WebP and preloading only the resolved one/ten-card set during buildup reduced those showcase files to 74–81 KB and removed the reveal/download race without front-loading the whole collection.

Key takeaway: warm and decode the exact pull as soon as it is rolled, then use a bounded reveal wait so slow or failed requests never trap the flow.
