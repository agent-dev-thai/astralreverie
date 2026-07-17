import assert from "node:assert/strict";
import { test } from "node:test";

import sharp from "sharp";

import { createPullOgRenderer, PULL_OG_HEIGHT, PULL_OG_WIDTH } from "../pull-og.js";
import { decodePullShareToken } from "../pull-share.js";
import { ITEMS } from "../strings.js";

test("renders and caches branded single-card and ten-card JPEG previews", async () => {
  const renderer = createPullOgRenderer({ cacheLimit: 1 });
  const singleToken = "v1.seren";
  const singleResults = decodePullShareToken(singleToken, ITEMS);
  const single = await renderer.render(singleToken, singleResults);
  const singleMetadata = await sharp(single).metadata();
  assert.equal(singleMetadata.format, "jpeg");
  assert.equal(singleMetadata.width, PULL_OG_WIDTH);
  assert.equal(singleMetadata.height, PULL_OG_HEIGHT);
  assert.ok(single.byteLength > 50000);
  assert.strictEqual(await renderer.render(singleToken, singleResults), single);

  const multiToken = "v1.seren.aurelia.cyra.charm.rock.vance.hana.coil.receipt.cog";
  const multi = await renderer.render(multiToken, decodePullShareToken(multiToken, ITEMS));
  const multiMetadata = await sharp(multi).metadata();
  assert.equal(multiMetadata.format, "jpeg");
  assert.equal(multiMetadata.width, PULL_OG_WIDTH);
  assert.equal(multiMetadata.height, PULL_OG_HEIGHT);
  assert.ok(multi.byteLength > 50000);
  assert.equal(renderer.cacheSize(), 1);
});

test("rejects empty pull previews", async () => {
  const renderer = createPullOgRenderer();
  await assert.rejects(() => renderer.render("v1", []), /between one and ten/);
});
