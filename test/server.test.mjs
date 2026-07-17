import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createAppServer } from "../server.mjs";

const server = createAppServer();
let baseUrl;

before(async () => {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
});

test("serves the app shell", async () => {
  const response = await fetch(`${baseUrl}/`, { headers: { "Accept-Encoding": "br" } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/html/);
  assert.equal(response.headers.get("content-encoding"), "br");
  const html = await response.text();
  assert.match(html, /id="app-shell"/);
  assert.match(html, /<script type="module" src="\.\/app\.js"><\/script>/);
});

test("renders absolute social metadata from the deployment origin", async () => {
  const response = await fetch(`${baseUrl}/`, {
    headers: {
      "X-Forwarded-Host": "gacha.example",
      "X-Forwarded-Proto": "https",
    },
  });
  const html = await response.text();
  assert.match(html, /property="og:url" content="https:\/\/gacha\.example\/"/);
  assert.match(html, /property="og:image" content="https:\/\/gacha\.example\/assets\/generated\/share\/astral-reverie-og\.jpg"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /rel="manifest" href="\.\/assets\/generated\/share\/site\.webmanifest"/);
  assert.doesNotMatch(html, /__PUBLIC_(?:ORIGIN|PAGE_URL)__|[?&]auto=/);

  const sharedResponse = await fetch(`${baseUrl}/?pull=v1.seren.rock&auto=1`, {
    headers: {
      "X-Forwarded-Host": "gacha.example",
      "X-Forwarded-Proto": "https",
    },
  });
  const sharedHtml = await sharedResponse.text();
  assert.match(sharedHtml, /property="og:url" content="https:\/\/gacha\.example\/\?pull=v1\.seren\.rock"/);
  assert.match(sharedHtml, /property="og:image" content="https:\/\/gacha\.example\/og\/pull-v1\.jpg\?pull=v1\.seren\.rock"/);
  assert.match(sharedHtml, /property="og:image:alt" content="Astral Reverie shared pull showing Seren, Suspicious Rock\."/);
  assert.match(sharedHtml, /rel="canonical" href="https:\/\/gacha\.example\/"/);
  assert.doesNotMatch(sharedHtml, /[?&]auto=/);

  const invalidResponse = await fetch(`${baseUrl}/?pull=v1.unknown`, {
    headers: {
      "X-Forwarded-Host": "gacha.example",
      "X-Forwarded-Proto": "https",
    },
  });
  assert.match(await invalidResponse.text(), /property="og:url" content="https:\/\/gacha\.example\/"/);

  const dynamicPreview = await fetch(`${baseUrl}/og/pull-v1.jpg?pull=v1.seren.rock`);
  assert.equal(dynamicPreview.status, 200);
  assert.equal(dynamicPreview.headers.get("content-type"), "image/jpeg");
  assert.match(dynamicPreview.headers.get("cache-control"), /immutable/);
  assert.ok(Number(dynamicPreview.headers.get("content-length")) > 50000);
  const dynamicEtag = dynamicPreview.headers.get("etag");
  assert.ok(dynamicEtag);
  const unchangedDynamicPreview = await fetch(`${baseUrl}/og/pull-v1.jpg?pull=v1.seren.rock`, {
    headers: { "If-None-Match": dynamicEtag },
  });
  assert.equal(unchangedDynamicPreview.status, 304);

  const missingPreview = await fetch(`${baseUrl}/og/pull-v1.jpg?pull=v1.unknown`);
  assert.equal(missingPreview.status, 404);

  const preview = await fetch(`${baseUrl}/assets/generated/share/astral-reverie-og.jpg`, { method: "HEAD" });
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get("content-type"), "image/jpeg");
  assert.ok(Number(preview.headers.get("content-length")) > 0);

  const favicon = await fetch(`${baseUrl}/assets/generated/share/favicon-32.png`, { method: "HEAD" });
  assert.equal(favicon.status, 200);
  assert.equal(favicon.headers.get("content-type"), "image/png");

  const manifest = await fetch(`${baseUrl}/assets/generated/share/site.webmanifest`);
  assert.equal(manifest.status, 200);
  assert.match(manifest.headers.get("content-type"), /^application\/manifest\+json/);
  assert.equal((await manifest.json()).name, "Astral Reverie");
});

test("reports deployment health", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("serves allowlisted generated assets", async () => {
  const response = await fetch(`${baseUrl}/assets/generated/warp-void.png`, { method: "HEAD" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.ok(Number(response.headers.get("content-length")) > 0);
});

test("serves the vendored motion runtime, production music, and cinematics", async () => {
  const motion = await fetch(`${baseUrl}/assets/vendor/motion-12.42.2.js`, { method: "HEAD" });
  assert.equal(motion.status, 200);
  assert.match(motion.headers.get("content-type"), /^text\/javascript/);

  const music = await fetch(`${baseUrl}/assets/audio/house-beyond-stars-loop.m4a`, { method: "HEAD" });
  assert.equal(music.status, 200);
  assert.equal(music.headers.get("content-type"), "audio/mp4");
  assert.ok(Number(music.headers.get("content-length")) > 0);

  const cinematic = await fetch(`${baseUrl}/assets/generated/cinematics/landscape/warp-ur.mp4`, { method: "HEAD" });
  assert.equal(cinematic.status, 200);
  assert.equal(cinematic.headers.get("content-type"), "video/mp4");
  assert.ok(Number(cinematic.headers.get("content-length")) > 0);

  const chip = await fetch(`${baseUrl}/assets/generated/ui/rarity-chip-ssr.webp`, { method: "HEAD" });
  assert.equal(chip.status, 200);
  assert.equal(chip.headers.get("content-type"), "image/webp");
  assert.ok(Number(chip.headers.get("content-length")) > 0);

  const sfx = await fetch(`${baseUrl}/assets/audio/sfx/buildup-near-miss.m4a`, { method: "HEAD" });
  assert.equal(sfx.status, 200);
  assert.equal(sfx.headers.get("content-type"), "audio/mp4");
  assert.ok(Number(sfx.headers.get("content-length")) > 0);

  const pullShare = await fetch(`${baseUrl}/pull-share.js`);
  assert.equal(pullShare.status, 200);
  assert.match(await pullShare.text(), /PULL_SHARE_VERSION/);
});

test("supports compressed text responses, cache validation, and media ranges", async () => {
  const compressed = await fetch(`${baseUrl}/styles.css`, {
    headers: { "Accept-Encoding": "br" },
  });
  assert.equal(compressed.status, 200);
  assert.equal(compressed.headers.get("content-encoding"), "br");
  assert.match(await compressed.text(), /\.feature-poster/);

  const optimizedImage = await fetch(`${baseUrl}/assets/generated/optimized/astral-banner-768.webp`, {
    method: "HEAD",
  });
  const etag = optimizedImage.headers.get("etag");
  assert.ok(etag);
  assert.match(optimizedImage.headers.get("cache-control"), /max-age=86400/);
  const unchanged = await fetch(`${baseUrl}/assets/generated/optimized/astral-banner-768.webp`, {
    headers: { "If-None-Match": etag },
  });
  assert.equal(unchanged.status, 304);

  const range = await fetch(`${baseUrl}/assets/audio/house-beyond-stars-loop.m4a`, {
    headers: { Range: "bytes=0-1023" },
  });
  assert.equal(range.status, 206);
  assert.equal(range.headers.get("accept-ranges"), "bytes");
  assert.match(range.headers.get("content-range"), /^bytes 0-1023\//);
  assert.equal((await range.arrayBuffer()).byteLength, 1024);
});

test("does not expose repository-only files", async () => {
  for (const pathname of ["/README.md", "/tools/qa_playwright.py", "/assets/OFL-Unbounded.txt", "/assets/vendor/MOTION-LICENSE.md"]) {
    const response = await fetch(`${baseUrl}${pathname}`);
    assert.equal(response.status, 404, pathname);
  }
});

test("rejects unsupported methods", async () => {
  const response = await fetch(`${baseUrl}/`, { method: "POST" });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD");
});
