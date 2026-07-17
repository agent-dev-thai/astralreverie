const VIDEO_DURATION_MS = 3200;

function videoSources(slug) {
  return Object.freeze({
    enabled: true,
    portrait: `./assets/generated/cinematics/portrait/warp-${slug}.mp4`,
    landscape: `./assets/generated/cinematics/landscape/warp-${slug}.mp4`,
  });
}

export const CINEMATIC_PRESENTATIONS = Object.freeze({
  C: Object.freeze({
    key: "C",
    rarity: "C",
    poster: "./assets/generated/rarity-warps/warp-c.webp",
    fallbackDurationMs: 1450,
    videoDurationMs: VIDEO_DURATION_MS,
    video: videoSources("c"),
  }),
  R: Object.freeze({
    key: "R",
    rarity: "R",
    poster: "./assets/generated/rarity-warps/warp-r.webp",
    fallbackDurationMs: 1750,
    videoDurationMs: VIDEO_DURATION_MS,
    video: videoSources("r"),
  }),
  SR: Object.freeze({
    key: "SR",
    rarity: "SR",
    poster: "./assets/generated/rarity-warps/warp-sr.webp",
    fallbackDurationMs: 2150,
    videoDurationMs: VIDEO_DURATION_MS,
    video: videoSources("sr"),
  }),
  SSR: Object.freeze({
    key: "SSR",
    rarity: "SSR",
    poster: "./assets/generated/rarity-warps/warp-ssr.webp",
    fallbackDurationMs: 2650,
    videoDurationMs: VIDEO_DURATION_MS,
    video: videoSources("ssr"),
  }),
  UR: Object.freeze({
    key: "UR",
    rarity: "UR",
    poster: "./assets/generated/rarity-warps/warp-ur.webp",
    fallbackDurationMs: 3100,
    videoDurationMs: VIDEO_DURATION_MS,
    video: videoSources("ur"),
  }),
  NEAR_MISS: Object.freeze({
    key: "NEAR_MISS",
    rarity: "SR",
    poster: "./assets/generated/rarity-warps/warp-sr.webp",
    fallbackDurationMs: 2650,
    videoDurationMs: VIDEO_DURATION_MS,
    video: videoSources("near-miss"),
  }),
});

export function getCinematicPresentation(bestRarity, nearMiss = false) {
  if (nearMiss) return CINEMATIC_PRESENTATIONS.NEAR_MISS;
  return CINEMATIC_PRESENTATIONS[bestRarity] || CINEMATIC_PRESENTATIONS.C;
}

export function selectVideoSource(presentation, viewport = window) {
  if (!presentation.video.enabled) return undefined;
  const portrait = viewport.innerHeight > viewport.innerWidth;
  return portrait
    ? presentation.video.portrait || presentation.video.landscape
    : presentation.video.landscape || presentation.video.portrait;
}

export function presentationDuration(presentation, hasVideo, reducedMotion) {
  if (reducedMotion) return 500;
  return hasVideo ? presentation.videoDurationMs : presentation.fallbackDurationMs;
}
