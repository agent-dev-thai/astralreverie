import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { ITEMS } from "../strings.js";

const ROOT_DIR = fileURLToPath(new URL("../", import.meta.url));
const MAX_RUNTIME_CARD_BYTES = 160 * 1024;

test("ships every runtime card illustration as a bounded WebP", async () => {
  for (const item of ITEMS) {
    assert.match(item.art, /^\.\/assets\/generated\/.+\.webp$/, `${item.id} is not using WebP`);
    const filePath = fileURLToPath(new URL(item.art.replace(/^\.\//, ""), `file://${ROOT_DIR}/`));
    const fileStats = await stat(filePath);
    assert.ok(
      fileStats.size <= MAX_RUNTIME_CARD_BYTES,
      `${item.id} runtime art is ${fileStats.size} bytes`,
    );
  }
});
