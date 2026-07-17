# Generated asset prompts

The banner, three original character sprites, 29 catalogue card artworks, and five rarity-specific warp backgrounds used the built-in `imagegen` path. The earlier generic warp concept used the connected Higgsfield MCP with the `soul_location` model. No CLI fallback or native-transparency model was used. The three original character sources were generated on `#00FF00` and locally keyed to alpha PNGs; `tools/process_legacy_card_art.mjs` now composites those untouched sprites over their matching rarity environments so every runtime card uses the same full-scene 720×900 WebP pipeline. The 29 catalogue additions use integrated backgrounds and were resized into 720×900 WebP cards by `tools/process_card_art.py`. The five rarity warp sources were resized into 900×1600 WebP backgrounds by `tools/process_rarity_warps.py`.

The complete per-card request/scene matrix and fixed prompt frame are recorded in [`card-art-prompts.md`](./card-art-prompts.md).
The complete rarity-warp request/scene matrix and fixed prompt frame are recorded in [`rarity-warp-prompts.md`](./rarity-warp-prompts.md).

## Shared style formula

Polished 2D anime-inspired space-opera key art with painterly cel shading and restrained metallic detail. Silhouettes are long, angular, and fashion-forward, with crisp contour edges and sweeping orbital motifs. Environments use plum-black voids and muted indigo architecture; playable characters contrast in warm ivory, ember coral, and astral gold, while rarity signals use rose-gold and electric violet sparingly. Lighting is cinematic and eclipse-bright, solemn with a wink. Maintain high contrast, uncluttered focal areas, readable silhouettes, and a consistent flat-frontal perspective across all assets.

## `assets/generated/astral-banner.png`

```text
game background of a shattered astral rail crossing a total eclipse above a distant indigo station, wide establishing view with clean negative space on the left and the rail sweeping toward the upper right, Polished 2D anime-inspired space-opera key art with painterly cel shading and restrained metallic detail. Silhouettes are long, angular, and fashion-forward, with crisp contour edges and sweeping orbital motifs. Environments use plum-black voids and muted indigo architecture; playable characters contrast in warm ivory, ember coral, and astral gold, while rarity signals use rose-gold and electric violet sparingly. Lighting is cinematic and eclipse-bright, solemn with a wink. Maintain high contrast, uncluttered focal areas, readable silhouettes, and a consistent flat-frontal perspective across all assets., no characters, no UI elements, slightly muted detail so foreground game elements stay readable, soft depth layering, no text, no logos, no watermark, original setting with no existing franchise symbols.
```

## `assets/generated/seren-ur.png`

```text
game sprite of the dusk warden, single character, full body visible, centered, original adult woman with long black hair tipped in ember coral, asymmetrical ivory military coat over plum armor, crescent glaive, poised calm stance, Polished 2D anime-inspired space-opera key art with painterly cel shading and restrained metallic detail. Silhouettes are long, angular, and fashion-forward, with crisp contour edges and sweeping orbital motifs. Environments use plum-black voids and muted indigo architecture; playable characters contrast in warm ivory, ember coral, and astral gold, while rarity signals use rose-gold and electric violet sparingly. Lighting is cinematic and eclipse-bright, solemn with a wink. Maintain high contrast, uncluttered focal areas, readable silhouettes, and a consistent flat-frontal perspective across all assets., on a solid uniform bright #00FF00 background, no shadows cast on the background, no ground plane, nothing cropped at the edges, no text, no logos, no watermark, no existing franchise character.
```

## `assets/generated/aurelia-ssr.png`

```text
game sprite of the gilded oracle, single character, full body visible, centered, original adult woman with cropped copper hair, structured ivory-and-gold coat, floating mechanical astrolabe held at shoulder height, confident stance, Polished 2D anime-inspired space-opera key art with painterly cel shading and restrained metallic detail. Silhouettes are long, angular, and fashion-forward, with crisp contour edges and sweeping orbital motifs. Environments use plum-black voids and muted indigo architecture; playable characters contrast in warm ivory, ember coral, and astral gold, while rarity signals use rose-gold and electric violet sparingly. Lighting is cinematic and eclipse-bright, solemn with a wink. Maintain high contrast, uncluttered focal areas, readable silhouettes, and a consistent flat-frontal perspective across all assets., on a solid uniform bright #00FF00 background, no shadows cast on the background, no ground plane, nothing cropped at the edges, no text, no logos, no watermark, no existing franchise character.
```

## `assets/generated/cyra-sr.png`

```text
game sprite of the echo diver, single character, full body visible, centered, original young adult woman with midnight blue bob, compact visor, practical indigo flight suit with coral signal ribbons and a handheld resonance scanner, kinetic forward stance, Polished 2D anime-inspired space-opera key art with painterly cel shading and restrained metallic detail. Silhouettes are long, angular, and fashion-forward, with crisp contour edges and sweeping orbital motifs. Environments use plum-black voids and muted indigo architecture; playable characters contrast in warm ivory, ember coral, and astral gold, while rarity signals use rose-gold and electric violet sparingly. Lighting is cinematic and eclipse-bright, solemn with a wink. Maintain high contrast, uncluttered focal areas, readable silhouettes, and a consistent flat-frontal perspective across all assets., on a solid uniform bright #00FF00 background, no shadows cast on the background, no ground plane, nothing cropped at the edges, no text, no logos, no watermark, no existing franchise character.
```

## `assets/generated/warp-void.png`

```text
game background of an abstract astral tunnel, wide establishing view with a warm white vanishing point, plum-black void, indigo architecture fragments, and sparse gold particle streaks, Polished 2D anime-inspired space-opera key art with painterly cel shading and restrained metallic detail. Silhouettes are long, angular, and fashion-forward, with crisp contour edges and sweeping orbital motifs. Environments use plum-black voids and muted indigo architecture; playable characters contrast in warm ivory, ember coral, and astral gold, while rarity signals use rose-gold and electric violet sparingly. Lighting is cinematic and eclipse-bright, solemn with a wink. Maintain high contrast, uncluttered focal areas, readable silhouettes, and a consistent flat-frontal perspective across all assets., no characters, no UI elements, slightly muted detail so foreground game elements stay readable, soft depth layering, no text, no logos, no watermark.
```
