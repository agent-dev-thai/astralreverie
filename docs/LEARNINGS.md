# Astral Reverie — Engineering Learnings

Consolidated reference of key decisions, fixes, and patterns learned during development.

---

## Testing

### Keep Node test discovery explicit with the local pnpm store

In this environment pnpm creates `.pnpm-store/v10/projects/<hash>` as a symlink back to the project root. Bare `node --test` follows that backlink during discovery until it fails with `ENAMETOOLONG`.

```json
"test": "node --test test/*.test.mjs"
```

Key takeaway: keep `.pnpm-store/` ignored and pass the explicit test-file glob instead of relying on Node's recursive discovery.
