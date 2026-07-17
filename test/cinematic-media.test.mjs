import assert from "node:assert/strict";
import test from "node:test";

import {
  CINEMATIC_PRESENTATIONS,
  getCinematicPresentation,
  presentationDuration,
  selectVideoSource,
} from "../cinematic-media.js";

test("uses the dedicated near-miss presentation without changing the true rarity", () => {
  const presentation = getCinematicPresentation("SSR", true);
  assert.equal(presentation.key, "NEAR_MISS");
  assert.equal(presentation.rarity, "SR");
});

test("selects both delivered orientations for every cinematic treatment", () => {
  for (const [key, presentation] of Object.entries(CINEMATIC_PRESENTATIONS)) {
    const slug = key === "NEAR_MISS" ? "near-miss" : key.toLowerCase();
    assert.equal(
      selectVideoSource(presentation, { innerWidth: 390, innerHeight: 844 }),
      `./assets/generated/cinematics/portrait/warp-${slug}.mp4`,
    );
    assert.equal(
      selectVideoSource(presentation, { innerWidth: 1440, innerHeight: 900 }),
      `./assets/generated/cinematics/landscape/warp-${slug}.mp4`,
    );
  }
});

test("selects orientation and shared timing for an enabled presentation", () => {
  const presentation = {
    fallbackDurationMs: 1000,
    videoDurationMs: 3200,
    video: { enabled: true, portrait: "portrait.mp4", landscape: "landscape.mp4" },
  };
  assert.equal(selectVideoSource(presentation, { innerWidth: 390, innerHeight: 844 }), "portrait.mp4");
  assert.equal(selectVideoSource(presentation, { innerWidth: 1440, innerHeight: 900 }), "landscape.mp4");
  assert.equal(presentationDuration(presentation, true, false), 3200);
  assert.equal(presentationDuration(presentation, true, true), 500);
});
