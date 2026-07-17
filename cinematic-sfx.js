const BUILDUP_KEYS = Object.freeze(["c", "r", "sr", "ssr", "ur", "near-miss"]);
const REVEAL_KEYS = Object.freeze(["c", "r", "sr", "ssr", "ur"]);

export const CINEMATIC_SFX_SOURCES = Object.freeze({
  buildup: Object.freeze(Object.fromEntries(
    BUILDUP_KEYS.map(key => [key, `./assets/audio/sfx/buildup-${key}.m4a`]),
  )),
  reveal: Object.freeze(Object.fromEntries(
    REVEAL_KEYS.map(key => [key, `./assets/audio/sfx/reveal-${key}.m4a`]),
  )),
});

const compressedAudio = new Map();

function sourceFor(kind, key) {
  return CINEMATIC_SFX_SOURCES[kind]?.[key];
}

function loadCompressedAudio(url, fetcher) {
  if (!compressedAudio.has(url)) {
    compressedAudio.set(url, fetcher(url).then(response => {
      if (!response.ok) throw new Error(`Cinematic SFX request failed: ${response.status}`);
      return response.arrayBuffer();
    }));
  }
  return compressedAudio.get(url);
}

export function preloadCinematicSfx(fetcher = globalThis.fetch) {
  if (typeof fetcher !== "function") return Promise.resolve([]);
  const urls = Object.values(CINEMATIC_SFX_SOURCES).flatMap(group => Object.values(group));
  return Promise.allSettled(urls.map(url => loadCompressedAudio(url, fetcher)));
}

export function cinematicSfxKey(rarity, nearMiss = false) {
  if (nearMiss) return "near-miss";
  const key = String(rarity || "c").toLowerCase();
  return BUILDUP_KEYS.includes(key) ? key : "c";
}

export function createCinematicSfxPlayer(context, destination, fetcher = globalThis.fetch) {
  const decodedAudio = new Map();
  const active = { buildup: null, reveal: null };
  const versions = { buildup: 0, reveal: 0 };

  function decode(kind, key) {
    const url = sourceFor(kind, key);
    if (!url) return Promise.reject(new Error(`Unknown cinematic SFX: ${kind}/${key}`));
    if (!decodedAudio.has(url)) {
      decodedAudio.set(url, loadCompressedAudio(url, fetcher).then(bytes => (
        context.decodeAudioData(bytes.slice(0))
      )));
    }
    return decodedAudio.get(url);
  }

  function stop(kind) {
    versions[kind] += 1;
    const playing = active[kind];
    active[kind] = null;
    if (!playing) return;
    try {
      playing.node.stop();
    } catch {
      // A source may already have ended between the state check and stop call.
    }
  }

  async function play(kind, key) {
    stop(kind);
    const version = versions[kind];
    try {
      const buffer = await decode(kind, key);
      if (version !== versions[kind]) return false;
      const node = context.createBufferSource();
      node.buffer = buffer;
      node.connect(destination);
      active[kind] = { key, node };
      node.addEventListener("ended", () => {
        if (active[kind]?.node === node) active[kind] = null;
      }, { once: true });
      node.start();
      return true;
    } catch {
      return false;
    }
  }

  return Object.freeze({
    playBuildup: key => play("buildup", key),
    playReveal: key => play("reveal", key),
    stopBuildup: () => stop("buildup"),
    stopReveal: () => stop("reveal"),
    stopAll: () => {
      stop("buildup");
      stop("reveal");
    },
    status: () => ({
      buildup: active.buildup?.key || null,
      reveal: active.reveal?.key || null,
      decoded: decodedAudio.size,
    }),
  });
}
