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
  const response = await fetch(`${baseUrl}/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/html/);
  const html = await response.text();
  assert.match(html, /id="app-shell"/);
  assert.match(html, /<script type="module" src="\.\/app\.js"><\/script>/);
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

test("does not expose repository-only files", async () => {
  for (const pathname of ["/README.md", "/tools/qa_playwright.py", "/assets/OFL-Unbounded.txt"]) {
    const response = await fetch(`${baseUrl}${pathname}`);
    assert.equal(response.status, 404, pathname);
  }
});

test("rejects unsupported methods", async () => {
  const response = await fetch(`${baseUrl}/`, { method: "POST" });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD");
});
