export const PULL_SHARE_VERSION = "v1";

const MAX_SHARED_RESULTS = 10;

export function encodePullShareToken(results) {
  if (!Array.isArray(results) || results.length < 1 || results.length > MAX_SHARED_RESULTS) return undefined;
  const ids = results.map(result => result?.id);
  if (ids.some(id => typeof id !== "string" || !id)) return undefined;
  return [PULL_SHARE_VERSION, ...ids].join(".");
}

export function decodePullShareToken(token, items) {
  if (typeof token !== "string" || !Array.isArray(items)) return undefined;
  const [version, ...ids] = token.split(".");
  if (version !== PULL_SHARE_VERSION || ids.length < 1 || ids.length > MAX_SHARED_RESULTS) return undefined;

  const itemsById = new Map(items.map(item => [item.id, item]));
  const results = ids.map(id => itemsById.get(id));
  if (results.some(result => !result)) return undefined;
  return results.map(result => ({ ...result, isNew: false }));
}
