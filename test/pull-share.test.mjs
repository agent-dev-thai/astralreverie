import assert from "node:assert/strict";
import { test } from "node:test";

import { decodePullShareToken, encodePullShareToken } from "../pull-share.js";

const items = [
  { id: "seren", name: "Seren", rarity: "UR" },
  { id: "aurelia", name: "Aurelia", rarity: "SSR" },
  { id: "rock", name: "Suspicious Rock", rarity: "C" },
];

test("round-trips a shared pull using only versioned item IDs", () => {
  assert.equal(encodePullShareToken([items[0]]), "v1.seren");
  const token = encodePullShareToken([items[0], items[1], items[2], items[2]]);
  assert.equal(token, "v1.seren.aurelia.rock.rock");
  assert.deepEqual(decodePullShareToken(token, items), [
    { ...items[0], isNew: false },
    { ...items[1], isNew: false },
    { ...items[2], isNew: false },
    { ...items[2], isNew: false },
  ]);
});

test("rejects malformed, unknown, oversized, and future shared pulls", () => {
  assert.equal(encodePullShareToken([]), undefined);
  assert.equal(encodePullShareToken(Array.from({ length: 11 }, () => items[2])), undefined);
  assert.equal(decodePullShareToken("v1", items), undefined);
  assert.equal(decodePullShareToken("v1.unknown", items), undefined);
  assert.equal(decodePullShareToken(`v1.${Array.from({ length: 11 }, () => "rock").join(".")}`, items), undefined);
  assert.equal(decodePullShareToken("v2.seren", items), undefined);
});
