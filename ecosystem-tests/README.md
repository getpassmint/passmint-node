# Ecosystem tests

End-to-end validation that **the packed tarball works the way the README says it does** — the same pattern the OpenAI/Anthropic (Stainless) SDKs use in their `ecosystem-tests/` directories.

Unit tests import from `src/`, so they can't catch packaging bugs: a broken `exports` map, a bundler-mangled `node:crypto` import, a named export dropped by tree-shaking, or type declarations that don't resolve under a consumer's `moduleResolution`. These tests can, because nothing here touches `src/` or `dist/` directly — every fixture installs `@passmint/node` from a tarball, exactly like a user.

## How it works

`run.mjs`:

1. builds the SDK (`pnpm build`) and packs it (`npm pack`) to `.packed/passmint-node.tgz`
2. starts an in-process mock of the Passmint `/v1` API (`mock-server.mjs`)
3. for each fixture: wipes `node_modules`, installs the tarball fresh (npm caches `file:` tarballs by version, so a stale install would silently test the previous build), compiles where applicable, and runs the smoke script with `PASSMINT_BASE_URL` pointing at the mock

The smoke flow is the README quickstart executed for real: create/retrieve a pass, list canonical events with cursor pagination, create a webhook endpoint, verify a genuinely HMAC-signed webhook payload (and reject a tampered one), fetch funnel metrics and the account, and assert the typed error classes (402 → `PassmintAPIError`, 429 → `PassmintRateLimitError`) plus automatic 5xx retry — all through the installed package.

The mock server is deliberately **stricter than the real API**: it rejects camelCase body keys, unexpected query params, missing `Idempotency-Key` headers on pass creation, and idempotency keys sent to non-idempotent routes, so SDK contract drift fails loudly.

## Fixtures

| Fixture | What it proves |
| --- | --- |
| `node-js` | Plain Node ESM consumer can import and run everything. |
| `node-ts-esm` | Compiles under `moduleResolution: node16` with `strict` + `exactOptionalPropertyTypes` + `skipLibCheck: false` (the shipped `.d.ts` is fully checked), then runs. |
| `node-ts-bundler` | Compiles under `moduleResolution: bundler` (Vite/Next-style consumers). Compile-only. |
| `bun` | The smoke flow runs on Bun. Skipped if `bun` is not installed. |
| `deno` | The smoke flow runs on Deno 2 (byonm against the npm-installed `node_modules`). Skipped if `deno` is not installed. |

`bun/smoke.mjs` and `deno/smoke.mjs` are byte-for-byte copies of `node-js/smoke.mjs` — the duplication is deliberate (each fixture is a self-contained consumer project); if you change one, copy it to the others.

## Running

```sh
pnpm test:ecosystem            # everything
node ecosystem-tests/run.mjs node-js node-ts-esm   # just the named fixtures
```
