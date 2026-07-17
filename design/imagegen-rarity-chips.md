# Imagegen rarity-chip provenance

The SSR and UR rarity frames were generated with the built-in `image_gen` tool on 2026-07-17. The generated artwork contains no text; browser-rendered rarity text remains selectable, responsive, and deterministic.

## SSR prompt

```text
Production game UI rarity chip frame for a dark cosmic gacha interface. One single wide horizontal 2.4:1 SSR badge with an empty center for live HTML text. Antique-gold engraved metal, concentric solar-eclipse rings, precise radiant sunline corners, subtle black eclipse motifs, deep-black enamel center. Front-facing orthographic polished 2D game asset, crisp and readable at 64px tall. Prestigious, expensive, restrained Japanese sci-fi gacha ornament. No text, letters, numbers, logos, stars, watermark, loose glow, shadow, reflection, smoke, mockup, or extra variants.
```

## UR prompt

```text
Production game UI rarity chip frame for a dark cosmic gacha interface. One single wide horizontal 2.4:1 UR badge with an empty center for live HTML text. Sharp black stellar crown, obsidian enamel, pink-gold fire seams, ember-coral gravitational arcs, restrained split-aperture motif, materially stranger than SSR, with a deep-plum center. Front-facing orthographic polished 2D game asset, crisp and readable at 64px tall. No text, letters, numbers, logos, stars, watermark, loose glow, shadow, reflection, smoke, mockup, or extra variants.
```

## Delivery pass

- Chroma source background: uniform `#00ff00`.
- Matte: built-in imagegen chroma-removal helper with border sampling, soft matte, and despill.
- Delivery size: 768×320 RGBA PNG.
- Assets:
  - `assets/generated/ui/rarity-chip-ssr.png`
  - `assets/generated/ui/rarity-chip-ur.png`
- Live text overlays the generated empty center; the images are decorative and remain out of the accessibility tree.
