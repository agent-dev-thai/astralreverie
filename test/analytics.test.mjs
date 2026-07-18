import assert from "node:assert/strict";
import test from "node:test";

import { createAnalyticsClient, normalizeMeasurementId } from "../analytics.js";

function fakeBrowser(measurementId, navigatorOverrides = {}) {
  const scripts = [];
  const documentRef = {
    title: "Astral Reverie test",
    head: { append: script => scripts.push(script) },
    createElement: () => ({ dataset: {} }),
    querySelector: selector => {
      if (selector === 'meta[name="google-analytics-id"]') return { content: measurementId };
      if (selector === "script[data-google-analytics]") return scripts[0] || null;
      return null;
    },
  };
  const windowRef = {
    dataLayer: [],
    location: {
      origin: "https://gacha.example",
      pathname: "/",
      search: "?seed=104&dev=1&pull=v1.seren.rock",
    },
  };
  const navigatorRef = { ...navigatorOverrides };
  return { documentRef, navigatorRef, scripts, windowRef };
}

function commands(windowRef) {
  return windowRef.dataLayer.map(command => Array.from(command));
}

test("normalizes only GA4 measurement IDs", () => {
  assert.equal(normalizeMeasurementId(" g-test123456 "), "G-TEST123456");
  assert.equal(normalizeMeasurementId("UA-123-4"), "");
  assert.equal(normalizeMeasurementId("G-"), "");
});

test("loads GA4 once with denied consent and a query-free page view", () => {
  const browser = fakeBrowser("G-TEST123456");
  const client = createAnalyticsClient(browser);
  assert.equal(client.initialize(), true);
  assert.equal(client.initialize(), true);
  assert.equal(browser.scripts.length, 1);
  assert.equal(browser.scripts[0].src, "https://www.googletagmanager.com/gtag/js?id=G-TEST123456");

  const queued = commands(browser.windowRef);
  assert.deepEqual(queued[0], ["consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  }]);
  const pageView = queued.find(command => command[0] === "event" && command[1] === "page_view");
  assert.equal(pageView[2].page_location, "https://gacha.example/");
  assert.doesNotMatch(pageView[2].page_location, /seed|dev|pull/);

  assert.equal(client.track("gacha_pull", { best_rarity: "UR", pull_count: 10 }), true);
  assert.deepEqual(commands(browser.windowRef).at(-1), [
    "event",
    "gacha_pull",
    {
      best_rarity: "UR",
      pull_count: 10,
      page_location: "https://gacha.example/",
    },
  ]);
  assert.doesNotMatch(commands(browser.windowRef).at(-1)[2].page_location, /seed|dev|pull/);
});

test("stays disabled without valid config or when privacy signals opt out", () => {
  for (const browser of [
    fakeBrowser(""),
    fakeBrowser("not-a-measurement-id"),
    fakeBrowser("G-TEST123456", { doNotTrack: "1" }),
    fakeBrowser("G-TEST123456", { globalPrivacyControl: true }),
  ]) {
    const client = createAnalyticsClient(browser);
    assert.equal(client.initialize(), false);
    assert.equal(client.track("gacha_pull", { pull_count: 10 }), false);
    assert.equal(browser.scripts.length, 0);
    assert.deepEqual(browser.windowRef.dataLayer, []);
  }
});
