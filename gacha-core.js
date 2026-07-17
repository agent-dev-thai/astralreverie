export const GACHA_CONFIG = Object.freeze({
  urBaseRate: 0.006,
  ssrRate: 0.051,
  srRate: 0.13,
  rRate: 0.3,
  hardPity: 80,
  softPityStart: 65,
  softPityStep: 0.06,
  srGuarantee: 10,
  pullCost: 160,
});

export const RARITY_ORDER = Object.freeze({ C: 0, R: 1, SR: 2, SSR: 3, UR: 4 });

export function normalizeSeed(value) {
  const parsed = Number(value) >>> 0;
  return parsed || 0x6d2b79f5;
}

export function nextRandom(rngState) {
  let next = normalizeSeed(rngState);
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  next >>>= 0;
  return { rngState: next, value: next / 0x100000000 };
}

export function urChance(pity, config = GACHA_CONFIG) {
  const pullNumber = pity + 1;
  if (pullNumber >= config.hardPity) return 1;
  if (pullNumber <= config.softPityStart) return config.urBaseRate;
  return Math.min(1, config.urBaseRate + (pullNumber - config.softPityStart) * config.softPityStep);
}

export function rollRarity({ pity, pitySR, rngState }, config = GACHA_CONFIG) {
  const random = nextRandom(rngState);
  const chanceUR = urChance(pity, config);
  let rarity = "C";

  if (random.value < chanceUR) rarity = "UR";
  else if (random.value < chanceUR + config.ssrRate) rarity = "SSR";
  else if (pitySR + 1 >= config.srGuarantee) rarity = "SR";
  else if (random.value < chanceUR + config.ssrRate + config.srRate) rarity = "SR";
  else if (random.value < chanceUR + config.ssrRate + config.srRate + config.rRate) rarity = "R";

  return { rarity, rngState: random.rngState };
}

export function pullBatch(snapshot, count, items, config = GACHA_CONFIG) {
  const next = {
    ...snapshot,
    owned: { ...snapshot.owned },
    history: snapshot.history.slice(),
  };
  const results = [];

  for (let index = 0; index < count; index += 1) {
    const rolled = rollRarity(next, config);
    const candidates = items.filter(item => item.rarity === rolled.rarity);
    const picked = nextRandom(rolled.rngState);
    const chosen = candidates[Math.floor(picked.value * candidates.length)];
    const isNew = !next.owned[chosen.id];

    next.rngState = picked.rngState;
    next.pity = rolled.rarity === "UR" ? 0 : next.pity + 1;
    next.pitySR = ["SR", "SSR", "UR"].includes(rolled.rarity) ? 0 : next.pitySR + 1;
    next.totalPulls += 1;
    next.urCount += rolled.rarity === "UR" ? 1 : 0;
    next.ssrCount += rolled.rarity === "SSR" ? 1 : 0;
    next.owned[chosen.id] = (next.owned[chosen.id] || 0) + 1;
    next.history.unshift({ n: next.totalPulls, id: chosen.id, rarity: rolled.rarity });
    results.push({ ...chosen, isNew });
  }

  next.history = next.history.slice(0, 200);
  const best = results.reduce((winner, item) => (
    RARITY_ORDER[item.rarity] > RARITY_ORDER[winner.rarity] ? item : winner
  )).rarity;
  const nearMissRoll = nextRandom(next.rngState);
  next.rngState = nearMissRoll.rngState;

  return {
    next,
    results,
    best,
    nearMiss: best === "SSR" && nearMissRoll.value < 0.45,
  };
}
