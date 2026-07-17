import { ITEMS, PACKAGES, PULL_FEEDBACK, RARITY, SNARK, STR } from "./strings.js";
import { GACHA_CONFIG, normalizeSeed, pullBatch } from "./gacha-core.js";

const params = new URLSearchParams(location.search);
const requestedSeed = params.get("seed");
const devMode = params.has("dev");
const HARD_PITY = GACHA_CONFIG.hardPity;
const TONE = {
  C: "oklch(70% 0.03 260)",
  R: "oklch(70% 0.12 255)",
  SR: "oklch(67% 0.16 305)",
  SSR: "oklch(80% 0.16 75)",
  UR: "oklch(75% 0.14 350)",
};
const TONE_DARK = {
  C: "oklch(22% 0.025 260)",
  R: "oklch(22% 0.055 255)",
  SR: "oklch(22% 0.065 305)",
  SSR: "oklch(24% 0.06 75)",
  UR: "oklch(23% 0.07 350)",
};
const PULL_PRESENTATION = Object.freeze({
  C: { asset: "./assets/generated/rarity-warps/warp-c.webp", duration: 1450 },
  R: { asset: "./assets/generated/rarity-warps/warp-r.webp", duration: 1750 },
  SR: { asset: "./assets/generated/rarity-warps/warp-sr.webp", duration: 2150 },
  SSR: { asset: "./assets/generated/rarity-warps/warp-ssr.webp", duration: 2650 },
  UR: { asset: "./assets/generated/rarity-warps/warp-ur.webp", duration: 3100 },
});

function freshSeed() {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return normalizeSeed(buffer[0]);
}

const seedFromUrl = requestedSeed === null ? null : normalizeSeed(requestedSeed);
const storageKey = seedFromUrl === null ? "astral-reverie-v2" : `astral-reverie-v2-seed-${seedFromUrl}`;

function readSavedState() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || "null");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

const saved = readSavedState();
const seed = seedFromUrl ?? normalizeSeed(saved.seed || freshSeed());

function defaultState() {
  return {
    seed,
    rngState: seed,
    gems: 3200,
    pity: 0,
    pitySR: 0,
    totalPulls: 0,
    urCount: 0,
    ssrCount: 0,
    fakeSpendC: 0,
    owned: {},
    history: [],
    sessionPulls: 0,
    screen: "banner",
    muted: false,
    phase: null,
    results: [],
    revealIndex: 0,
    nearMiss: false,
    buildBest: "C",
  };
}

const state = Object.assign(defaultState(), saved, {
  seed,
  rngState: normalizeSeed(saved.rngState || seed),
  owned: saved.owned && typeof saved.owned === "object" ? saved.owned : {},
  history: Array.isArray(saved.history) ? saved.history.slice(0, 200) : [],
  sessionPulls: 0,
  screen: "banner",
  muted: false,
  phase: null,
  results: [],
  revealIndex: 0,
  nearMiss: false,
  buildBest: "C",
});

function presentedBuildRarity() {
  return state.nearMiss ? "SR" : state.buildBest;
}

function preloadRarityWarps() {
  const load = () => Object.values(PULL_PRESENTATION).forEach(({ asset }) => {
    const image = new Image();
    image.src = asset;
  });
  if ("requestIdleCallback" in window) window.requestIdleCallback(load, { timeout: 1500 });
  else window.setTimeout(load, 500);
}

const dom = {
  headerGems: document.querySelector("#header-gems"),
  pityValue: document.querySelector("#pity-value"),
  pityLimit: document.querySelector("#pity-limit"),
  pityProgress: document.querySelector("#pity-progress"),
  pityFill: document.querySelector("#pity-fill"),
  pityHint: document.querySelector("#pity-hint"),
  snarkLine: document.querySelector("#snark-line"),
  fakeSpend: document.querySelector("#fake-spend"),
  sheetSpend: document.querySelector("#sheet-spend"),
  albumProgress: document.querySelector("#album-progress"),
  albumGrid: document.querySelector("#album-grid"),
  statLedger: document.querySelector("#stat-ledger"),
  luckVerdict: document.querySelector("#luck-verdict"),
  logTable: document.querySelector("#log-table"),
  seedLabel: document.querySelector("#seed-label"),
  sheetScrim: document.querySelector("#sheet-scrim"),
  topupSheet: document.querySelector("#topup-sheet"),
  packageList: document.querySelector("#package-list"),
  cinematic: document.querySelector("#cinematic"),
  buildup: document.querySelector("#cinematic-buildup"),
  reveal: document.querySelector("#cinematic-reveal"),
  summary: document.querySelector("#cinematic-summary"),
  warpBackdrop: document.querySelector("#warp-backdrop"),
  buildGrade: document.querySelector("#build-grade"),
  buildCaption: document.querySelector("#build-caption"),
  revealCounter: document.querySelector("#reveal-counter"),
  revealCard: document.querySelector("#reveal-card"),
  revealAll: document.querySelector(".reveal-all"),
  summaryGrid: document.querySelector("#summary-grid"),
  summaryGrade: document.querySelector("#summary-grade"),
  summarySnark: document.querySelector("#summary-snark"),
  toast: document.querySelector("#toast"),
  muteButton: document.querySelector('[data-action="mute"]'),
  soundGlyph: document.querySelector(".sound-glyph"),
  featureCharacter: document.querySelector("#feature-character"),
  resetButton: document.querySelector('[data-action="reset"]'),
  devOverlay: document.querySelector("#dev-overlay"),
  canvas: document.querySelector("#constellation-canvas"),
};

let toastTimer = 0;
let buildupTimer = 0;
let resetArmedUntil = 0;
let previousFocus = null;
let audioContext = null;

function hydrateStrings() {
  document.title = STR.metaTitle;
  document.querySelectorAll("[data-i18n]").forEach(element => {
    const value = STR[element.dataset.i18n];
    if (typeof value === "string") element.textContent = value;
  });
  document.querySelectorAll("[data-i18n-aria]").forEach(element => {
    const value = STR[element.dataset.i18nAria];
    if (typeof value === "string") element.setAttribute("aria-label", value);
  });
  dom.featureCharacter.alt = STR.genericCharacterAlt(ITEMS[0].name);
}

function persist() {
  const persistent = {
    seed: state.seed,
    rngState: state.rngState,
    gems: state.gems,
    pity: state.pity,
    pitySR: state.pitySR,
    totalPulls: state.totalPulls,
    urCount: state.urCount,
    ssrCount: state.ssrCount,
    fakeSpendC: state.fakeSpendC,
    owned: state.owned,
    history: state.history.slice(0, 200),
  };
  try {
    localStorage.setItem(storageKey, JSON.stringify(persistent));
  } catch {
    // Persistence is an enhancement; the pull still works in private or restricted contexts.
  }
}

function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function itemById(id) {
  return ITEMS.find(item => item.id === id) || ITEMS[0];
}

function cardBackground(rarity) {
  return `linear-gradient(150deg, ${TONE_DARK[rarity]}, oklch(12% 0.025 315) 72%)`;
}

function itemArt(item, variant = "", loading = "eager") {
  if (item.art) {
    const classes = [variant, item.artMode === "cover" ? "is-cover" : ""].filter(Boolean).join(" ");
    return `<img${classes ? ` class="${classes}"` : ""} src="${escapeHtml(item.art)}" alt="${escapeHtml(STR.genericCharacterAlt(item.name))}" loading="${loading}" decoding="async">`;
  }
  return `<span class="reveal-sigil" aria-hidden="true">${escapeHtml(item.sigil)}</span>`;
}

function renderHeaderAndConsole() {
  dom.headerGems.textContent = state.gems.toLocaleString();
  dom.pityValue.textContent = state.pity;
  dom.pityLimit.textContent = `/ ${HARD_PITY}`;
  const pityPercent = Math.min(100, state.pity / HARD_PITY * 100);
  dom.pityFill.style.width = `${pityPercent}%`;
  dom.pityProgress.setAttribute("aria-valuenow", String(state.pity));
  dom.pityHint.textContent = STR.pityHint(state.pity, HARD_PITY);
  dom.snarkLine.textContent = SNARK[state.totalPulls % SNARK.length];
  dom.fakeSpend.textContent = formatMoney(state.fakeSpendC);
  dom.sheetSpend.textContent = formatMoney(state.fakeSpendC);
  dom.seedLabel.textContent = STR.seededLabel(state.seed);
  dom.muteButton.setAttribute("aria-label", state.muted ? STR.muteOff : STR.muteOn);
  dom.soundGlyph.textContent = state.muted ? "×" : "◖";
}

function renderAlbum() {
  const ownedCount = Object.keys(state.owned).filter(id => state.owned[id] > 0).length;
  dom.albumProgress.textContent = STR.albumProgress(ownedCount, ITEMS.length);
  dom.albumGrid.innerHTML = ITEMS.map(item => {
    const count = state.owned[item.id] || 0;
    const owned = count > 0;
    const rarity = RARITY[item.rarity];
    const art = owned && item.art
      ? `<img class="${item.artMode === "cover" ? "is-cover" : ""}" src="${escapeHtml(item.art)}" alt="${escapeHtml(STR.genericCharacterAlt(item.name))}" loading="lazy" decoding="async">`
      : `<span class="album-sigil" aria-hidden="true">${owned ? escapeHtml(item.sigil) : "?"}</span>`;
    return `<article class="album-card${owned ? "" : " is-locked"}" style="--card-tone:${TONE[item.rarity]};--card-border:${owned ? TONE[item.rarity] : "var(--line-soft)"};--card-bg:${cardBackground(item.rarity)}">
      ${art}
      ${owned ? `<span class="album-count">${escapeHtml(STR.ownedBadge(count))}</span>` : ""}
      <span class="album-rarity">${owned ? escapeHtml(rarity.label) : escapeHtml(STR.collectionEmpty)}</span>
      <strong class="album-name">${owned ? escapeHtml(item.name) : "???"}</strong>
      <span class="album-title">${owned ? escapeHtml(item.title) : escapeHtml(STR.collectionEmpty)}</span>
    </article>`;
  }).join("");
}

function luckVerdict() {
  if (state.totalPulls === 0) return STR.verdictEmpty;
  const actualRate = state.urCount / state.totalPulls;
  const ratio = actualRate / GACHA_CONFIG.urBaseRate;
  if (ratio >= 1.5) return STR.verdictHot;
  if (ratio >= 0.8) return STR.verdictAverage;
  if (state.urCount === 0) return STR.verdictZero;
  return STR.verdictCold;
}

function renderStats() {
  const actualRate = state.totalPulls ? state.urCount / state.totalPulls * 100 : 0;
  const rows = [
    { label: STR.totalTraces, value: state.totalPulls.toLocaleString(), sub: STR.sessionTraces(state.sessionPulls), tone: "" },
    { label: STR.urRecovered, value: state.urCount.toLocaleString(), sub: STR.ssrRecovered(state.ssrCount), tone: "is-gold" },
    { label: STR.urRate, value: `${actualRate.toFixed(2)}%`, sub: STR.expectedRate, tone: "" },
    { label: STR.wouldSpend, value: formatMoney(state.fakeSpendC), sub: STR.burritosSaved(Math.floor(state.fakeSpendC / 1150)), tone: "is-green" },
  ];
  dom.statLedger.innerHTML = rows.map(row => `<dl class="stat-row ${row.tone}">
    <dt>${escapeHtml(row.label)}</dt>
    <dd>${escapeHtml(row.value)}</dd>
    <p>${escapeHtml(row.sub)}</p>
  </dl>`).join("");
  dom.luckVerdict.textContent = luckVerdict();
}

function renderLog() {
  if (!state.history.length) {
    dom.logTable.innerHTML = `<div class="empty-state">${escapeHtml(STR.logEmpty)}</div>`;
    return;
  }
  dom.logTable.innerHTML = state.history.slice(0, 60).map(entry => {
    const item = itemById(entry.id);
    const rarity = RARITY[entry.rarity];
    return `<div class="log-row" style="--card-tone:${TONE[entry.rarity]}">
      <span class="log-number">${escapeHtml(STR.pullNumber(entry.n))}</span>
      <span class="log-dot" aria-hidden="true"></span>
      <span class="log-name">${escapeHtml(item.name)}</span>
      <span class="log-title">${escapeHtml(item.title)}</span>
      <span class="log-rarity">${escapeHtml(rarity.label)}</span>
    </div>`;
  }).join("");
}

function renderPackages() {
  dom.packageList.innerHTML = PACKAGES.map((pack, index) => `<button class="package-button" type="button" data-action="buy-package" data-package="${index}" aria-label="${escapeHtml(STR.packageButton(pack.gems, pack.price))}">
    <span class="package-icon" aria-hidden="true">✦</span>
    <span class="package-copy"><strong>${pack.gems.toLocaleString()}</strong><small>${escapeHtml(pack.note)}</small></span>
    <span class="package-price">$${escapeHtml(pack.price)}</span>
  </button>`).join("");
}

function syncView() {
  document.querySelectorAll("[data-view-panel]").forEach(panel => {
    const active = panel.dataset.viewPanel === state.screen;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
  document.querySelectorAll("[data-view]").forEach(tab => {
    const active = tab.dataset.view === state.screen;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-current", active ? "page" : "false");
  });
}

function renderAll() {
  renderHeaderAndConsole();
  renderAlbum();
  renderStats();
  renderLog();
  syncView();
  renderCinematic();
}

function showView(view) {
  if (!document.querySelector(`[data-view-panel="${view}"]`)) return;
  state.screen = view;
  syncView();
  scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function openTopup() {
  previousFocus = document.activeElement;
  dom.sheetScrim.hidden = false;
  dom.topupSheet.hidden = false;
  document.body.classList.add("sheet-open");
  requestAnimationFrame(() => dom.topupSheet.querySelector("button")?.focus());
}

function closeTopup() {
  dom.sheetScrim.hidden = true;
  dom.topupSheet.hidden = true;
  document.body.classList.remove("sheet-open");
  previousFocus?.focus?.();
}

function showToast(message) {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    dom.toast.hidden = true;
  }, 2600);
}

function ensureAudio() {
  if (audioContext) return audioContext;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  audioContext = new AudioContext();
  return audioContext;
}

function tone(frequency, duration, type = "sine", volume = 0.08, delay = 0) {
  if (state.muted) return;
  const context = ensureAudio();
  if (!context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

function sfxTick() {
  tone(840, 0.09, "triangle", 0.08);
}

function sfxWhoosh(rarity) {
  if (rarity === "C") {
    tone(82, 0.32, "square", 0.025);
    tone(48, 0.42, "sawtooth", 0.02, 0.12);
    return;
  }
  if (rarity === "R") {
    tone(130, 0.68, "sawtooth", 0.026);
    tone(420, 0.16, "sine", 0.035, 0.36);
    return;
  }
  tone(110, 1.1, "sawtooth", 0.035);
  tone(174, 1.05, "sawtooth", 0.028, 0.08);
  tone(rarity === "SR" ? 560 : 640, 0.45, "sine", 0.04, 0.48);
  if (rarity === "SSR") [1, 1.25, 1.5].forEach((step, index) => tone(420 * step, 0.28, "sine", 0.045, 0.7 + index * 0.12));
  if (rarity === "UR") [1, 1.2, 1.5, 2].forEach((step, index) => tone(440 * step, 0.36, "sine", 0.05, 0.62 + index * 0.14));
}

function sfxReveal(rarity) {
  const base = { C: 320, R: 420, SR: 560, SSR: 720, UR: 860 }[rarity];
  tone(base, 0.18, "triangle", 0.09);
  tone(base * 1.5, 0.24, "sine", 0.06, 0.05);
  if (rarity === "SSR") tone(base * 2, 0.32, "sine", 0.07, 0.12);
  if (rarity === "UR") [1, 1.25, 1.5, 2].forEach((step, index) => tone(base * step, 0.4, "sine", 0.07, 0.08 + index * 0.11));
}

function startPull(count) {
  if (state.phase) return;
  const cost = count * GACHA_CONFIG.pullCost;
  if (state.gems < cost) {
    showToast(STR.insufficient);
    openTopup();
    return;
  }

  closeTopup();
  const pulled = pullBatch(state, count, ITEMS);
  Object.assign(state, pulled.next, {
    gems: state.gems - cost,
    sessionPulls: state.sessionPulls + count,
    phase: "buildup",
    results: pulled.results,
    revealIndex: 0,
    nearMiss: pulled.nearMiss,
    buildBest: pulled.best,
  });
  persist();
  renderAll();
  sfxWhoosh(presentedBuildRarity());
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  clearTimeout(buildupTimer);
  buildupTimer = window.setTimeout(startReveal, reduced ? 500 : PULL_PRESENTATION[state.buildBest].duration);
}

function startReveal() {
  if (state.phase !== "buildup") return;
  clearTimeout(buildupTimer);
  state.phase = "reveal";
  state.revealIndex = 0;
  renderCinematic();
  sfxReveal(state.results[0].rarity);
}

function advanceReveal() {
  if (state.phase !== "reveal") return;
  if (state.revealIndex + 1 >= state.results.length) {
    if (state.results.length > 1) showSummary();
    else endPull();
    return;
  }
  state.revealIndex += 1;
  renderCinematic();
  sfxReveal(state.results[state.revealIndex].rarity);
}

function showSummary() {
  if (!state.results.length) return;
  state.phase = "summary";
  renderCinematic();
  sfxTick();
}

function endPull() {
  clearTimeout(buildupTimer);
  state.phase = null;
  state.results = [];
  state.revealIndex = 0;
  renderAll();
}

function renderRevealCard(item) {
  const rarity = RARITY[item.rarity];
  dom.reveal.style.setProperty("--reveal-tone", TONE[item.rarity]);
  dom.reveal.dataset.rarity = item.rarity.toLowerCase();
  dom.revealCard.style.setProperty("--reveal-tone", TONE[item.rarity]);
  dom.revealCard.style.setProperty("--card-bg", cardBackground(item.rarity));
  dom.revealCard.dataset.rarity = item.rarity.toLowerCase();
  dom.revealCard.innerHTML = `
    ${item.isNew ? `<span class="new-chip">${escapeHtml(STR.newBadge)}</span>` : ""}
    ${itemArt(item)}
    <strong class="reveal-name">${escapeHtml(item.name)}</strong>
    <span class="reveal-title">${escapeHtml(item.title)}</span>
    <span class="reveal-rarity">${escapeHtml(rarity.stars)} · ${escapeHtml(rarity.label)}</span>`;
  dom.revealCard.style.animation = "none";
  dom.reveal.classList.remove("is-casting");
  void dom.revealCard.offsetWidth;
  dom.revealCard.style.animation = "";
  dom.reveal.classList.add("is-casting");
}

function renderSummary() {
  const feedback = PULL_FEEDBACK[state.buildBest];
  dom.summary.dataset.rarity = state.buildBest.toLowerCase();
  dom.summary.style.setProperty("--summary-tone", TONE[state.buildBest]);
  dom.summaryGrade.textContent = feedback.verdict;
  dom.summaryGrid.innerHTML = state.results.map((item, index) => {
    const rarity = RARITY[item.rarity];
    return `<article class="summary-card" data-rarity="${item.rarity.toLowerCase()}" style="--delay:${index * 55}ms;--card-tone:${TONE[item.rarity]};--card-bg:${cardBackground(item.rarity)}">
      ${item.isNew ? `<span class="new-chip">${escapeHtml(STR.newBadge)}</span>` : ""}
      ${itemArt(item)}
      <strong class="summary-name">${escapeHtml(item.name)}</strong>
      <span class="summary-rarity">${escapeHtml(rarity.label)}</span>
    </article>`;
  }).join("");
  dom.summarySnark.textContent = feedback.summary;
}

function renderCinematic() {
  const active = Boolean(state.phase);
  dom.cinematic.hidden = !active;
  dom.buildup.hidden = state.phase !== "buildup";
  dom.reveal.hidden = state.phase !== "reveal";
  dom.summary.hidden = state.phase !== "summary";
  document.body.classList.toggle("cinematic-open", active);
  if (!active) return;

  if (state.phase === "buildup") {
    const presentedRarity = presentedBuildRarity();
    const presentation = PULL_PRESENTATION[presentedRarity];
    dom.buildCaption.textContent = state.nearMiss ? STR.buildNearMiss : PULL_FEEDBACK[presentedRarity].build;
    dom.buildGrade.textContent = PULL_FEEDBACK[presentedRarity].verdict;
    dom.warpBackdrop.src = presentation.asset;
    dom.buildup.dataset.rarity = presentedRarity.toLowerCase();
    dom.buildup.classList.toggle("is-near-miss", state.nearMiss);
    const tone = TONE[presentedRarity];
    dom.buildup.style.setProperty("--reveal-tone", tone);
  }

  if (state.phase === "reveal") {
    const current = state.results[state.revealIndex];
    dom.revealCounter.textContent = `${state.revealIndex + 1} / ${state.results.length}`;
    dom.revealAll.hidden = state.results.length <= 1;
    renderRevealCard(current);
  }

  if (state.phase === "summary") renderSummary();
}

function buyPackage(index) {
  const pack = PACKAGES[index];
  if (!pack) return;
  state.gems += pack.gems;
  state.fakeSpendC += Math.round(Number(pack.price) * 100);
  persist();
  renderHeaderAndConsole();
  renderStats();
  sfxTick();
  showToast(STR.topupToast(pack.gems, pack.price));
}

function resetAll() {
  const now = Date.now();
  if (now > resetArmedUntil) {
    resetArmedUntil = now + 3500;
    dom.resetButton.textContent = STR.resetConfirm;
    window.setTimeout(() => {
      if (Date.now() > resetArmedUntil) dom.resetButton.textContent = STR.resetLabel;
    }, 3600);
    return;
  }

  localStorage.removeItem(storageKey);
  Object.assign(state, defaultState());
  resetArmedUntil = 0;
  dom.resetButton.textContent = STR.resetLabel;
  renderAll();
  showToast(STR.resetToast);
}

function toggleMute() {
  state.muted = !state.muted;
  renderHeaderAndConsole();
  if (!state.muted) sfxTick();
}

function handleEscape() {
  if (!dom.topupSheet.hidden) {
    closeTopup();
    return;
  }
  if (state.phase === "buildup") startReveal();
  else if (state.phase === "reveal") state.results.length > 1 ? showSummary() : endPull();
  else if (state.phase === "summary") endPull();
}

function handleAction(action, target) {
  if (action === "home") showView("banner");
  else if (action === "mute") toggleMute();
  else if (action === "open-topup") openTopup();
  else if (action === "close-topup") closeTopup();
  else if (action === "pull-one") startPull(1);
  else if (action === "pull-ten") {
    if (state.phase === "summary") endPull();
    requestAnimationFrame(() => startPull(10));
  }
  else if (action === "skip-build") startReveal();
  else if (action === "advance-reveal") advanceReveal();
  else if (action === "reveal-all") showSummary();
  else if (action === "collect") endPull();
  else if (action === "buy-package") buyPackage(Number(target.dataset.package));
  else if (action === "reset") resetAll();
}

document.addEventListener("click", event => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    showView(viewButton.dataset.view);
    return;
  }
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;
  event.stopPropagation();
  handleAction(actionTarget.dataset.action, actionTarget);
});

dom.sheetScrim.addEventListener("click", closeTopup);

addEventListener("keydown", event => {
  if (event.repeat) return;
  if (event.code === "Escape") {
    event.preventDefault();
    handleEscape();
    return;
  }
  if (event.target.closest?.("button") && ["Space", "Enter"].includes(event.code)) return;
  if (event.code === "Digit1" && !state.phase) {
    event.preventDefault();
    startPull(1);
  } else if (["Space", "Enter"].includes(event.code)) {
    event.preventDefault();
    if (state.phase === "buildup") startReveal();
    else if (state.phase === "reveal") advanceReveal();
    else if (state.phase === "summary") endPull();
    else startPull(10);
  }
});

const gamepadPrevious = { a: false, b: false, x: false };

function pollGamepad() {
  const pads = navigator.getGamepads?.() || [];
  const pad = Array.from(pads).find(Boolean);
  if (!pad) return;
  const current = {
    a: Boolean(pad.buttons[0]?.pressed),
    b: Boolean(pad.buttons[1]?.pressed),
    x: Boolean(pad.buttons[2]?.pressed),
  };
  if (current.a && !gamepadPrevious.a) {
    if (state.phase === "buildup") startReveal();
    else if (state.phase === "reveal") advanceReveal();
    else if (state.phase === "summary") endPull();
    else startPull(10);
  }
  if (current.x && !gamepadPrevious.x && !state.phase) startPull(1);
  if (current.b && !gamepadPrevious.b) handleEscape();
  Object.assign(gamepadPrevious, current);
}

const canvasContext = dom.canvas.getContext("2d", { alpha: true });
const stars = [];
let canvasWidth = 0;
let canvasHeight = 0;
let starTime = 0;
let visualRandomState = normalizeSeed(state.seed ^ 0xa5a5a5a5);

function visualRandom() {
  visualRandomState ^= visualRandomState << 13;
  visualRandomState ^= visualRandomState >>> 17;
  visualRandomState ^= visualRandomState << 5;
  visualRandomState >>>= 0;
  return visualRandomState / 0x100000000;
}

for (let index = 0; index < 86; index += 1) {
  stars.push({ x: visualRandom(), y: visualRandom(), size: 0.35 + visualRandom() * 1.15, alpha: 0.16 + visualRandom() * 0.58, speed: 0.0008 + visualRandom() * 0.0018 });
}

function resizeCanvas() {
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvasWidth = innerWidth;
  canvasHeight = innerHeight;
  dom.canvas.width = Math.round(canvasWidth * dpr);
  dom.canvas.height = Math.round(canvasHeight * dpr);
  dom.canvas.style.width = `${canvasWidth}px`;
  dom.canvas.style.height = `${canvasHeight}px`;
  canvasContext.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawConstellations() {
  canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
  for (let index = 0; index < stars.length; index += 1) {
    const star = stars[index];
    const y = ((star.y + starTime * star.speed) % 1) * canvasHeight;
    canvasContext.globalAlpha = star.alpha;
    canvasContext.fillStyle = index % 9 === 0 ? "oklch(80% 0.16 75)" : "oklch(85% 0.025 305)";
    canvasContext.beginPath();
    canvasContext.arc(star.x * canvasWidth, y, star.size, 0, Math.PI * 2);
    canvasContext.fill();
  }
  canvasContext.globalAlpha = 1;
}

addEventListener("resize", resizeCanvas);
addEventListener("orientationchange", resizeCanvas);
resizeCanvas();

const STEP = 1000 / 60;
let accumulator = 0;
let previousFrame = performance.now();
let paused = false;
let frames = 0;
let fpsStart = previousFrame;

function frame(now) {
  requestAnimationFrame(frame);
  if (paused) {
    previousFrame = now;
    return;
  }
  accumulator = Math.min(accumulator + now - previousFrame, STEP * 4);
  previousFrame = now;
  while (accumulator >= STEP) {
    starTime += STEP;
    pollGamepad();
    accumulator -= STEP;
  }
  drawConstellations();
  if (devMode) {
    frames += 1;
    if (now - fpsStart >= 500) {
      const fps = Math.round(frames * 1000 / (now - fpsStart));
      dom.devOverlay.textContent = `${fps} fps · ${stars.length} stars · seed ${state.seed}`;
      frames = 0;
      fpsStart = now;
    }
  }
}

addEventListener("blur", () => { paused = true; });
addEventListener("focus", () => { paused = false; previousFrame = performance.now(); });
document.addEventListener("visibilitychange", () => { paused = document.hidden; previousFrame = performance.now(); });

hydrateStrings();
renderPackages();
renderAll();
preloadRarityWarps();
dom.devOverlay.hidden = !devMode;
requestAnimationFrame(frame);

if (devMode) {
  window.__ASTRAL_DEBUG__ = {
    getState: () => structuredClone(state),
    pull: count => startPull(count),
    skip: () => startReveal(),
  };
}
