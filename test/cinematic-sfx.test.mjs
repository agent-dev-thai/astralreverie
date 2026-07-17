import assert from "node:assert/strict";
import test from "node:test";

import {
  CINEMATIC_SFX_SOURCES,
  cinematicSfxKey,
  createCinematicSfxPlayer,
} from "../cinematic-sfx.js";

test("maps rarity and near-miss treatments to stable sample paths", () => {
  assert.equal(cinematicSfxKey("SSR"), "ssr");
  assert.equal(cinematicSfxKey("SSR", true), "near-miss");
  assert.equal(cinematicSfxKey("unknown"), "c");
  assert.equal(CINEMATIC_SFX_SOURCES.buildup.ur, "./assets/audio/sfx/buildup-ur.m4a");
  assert.equal(CINEMATIC_SFX_SOURCES.reveal.ssr, "./assets/audio/sfx/reveal-ssr.m4a");
});

test("plays decoded samples through the supplied SFX destination and stops cleanly", async () => {
  const nodes = [];
  const destination = {};
  const context = {
    decodeAudioData: async bytes => ({ bytes }),
    createBufferSource: () => {
      const listeners = new Map();
      const node = {
        connected: null,
        started: false,
        stopped: false,
        connect(target) { this.connected = target; },
        start() { this.started = true; },
        stop() { this.stopped = true; listeners.get("ended")?.(); },
        addEventListener(type, listener) { listeners.set(type, listener); },
      };
      nodes.push(node);
      return node;
    },
  };
  const fetcher = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
  const player = createCinematicSfxPlayer(context, destination, fetcher);

  assert.equal(await player.playBuildup("ssr"), true);
  assert.equal(nodes[0].connected, destination);
  assert.equal(nodes[0].started, true);
  assert.equal(player.status().buildup, "ssr");

  player.stopBuildup();
  assert.equal(nodes[0].stopped, true);
  assert.equal(player.status().buildup, null);
});
