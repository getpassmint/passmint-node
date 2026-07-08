<div align="center">
	<br>
	<br>
  <h3 align="center">@passmint/node</h3>
	<p align="center">Official Node.js SDK for the Passmint API.</p>
</div>

---

Create Apple Wallet and Google Wallet passes, manage templates, and verify webhook deliveries from any Node.js backend.

```ts
import { Passmint } from '@passmint/node'

const passmint = new Passmint({ apiKey: process.env.PASSMINT_API_KEY! })

const pass = await passmint.passes.create({
  templateId: 'tmpl_123',
  holderEmail: 'ada@example.com',
  fieldValues: { seat: '12A' },
})

console.log(pass.url)
```

> **Status:** pre-1.0 alpha. API may change based on real-world feedback.

## Install

```sh
npm install @passmint/node
# or
pnpm add @passmint/node
# or
yarn add @passmint/node
```

Requires Node.js 20 or newer. ESM-only.

## Quickstart

```ts
import { Passmint } from '@passmint/node'

const passmint = new Passmint({
  apiKey: process.env.PASSMINT_API_KEY!,
})

// Create a pass
const pass = await passmint.passes.create({
  templateId: 'tmpl_123',
  holderEmail: 'ada@example.com',
  holderName: 'Ada Lovelace',
  fieldValues: { seat: '12A' },
  metadata: { orderId: 'ord_789' },
})

// Retrieve a pass
const fetched = await passmint.passes.retrieve(pass.id)

// List passes
const { data } = await passmint.passes.list({ templateId: 'tmpl_123', limit: 20 })

// Void a pass
await passmint.passes.void(pass.id)
```

## Adding passes to a wallet

Every created or retrieved pass carries three URLs. Use them to send users
straight into Apple Wallet / Google Wallet from your own UI, or hand off to the
Passmint-hosted page:

| Field | Points at | Notes |
| --- | --- | --- |
| `url` | The Passmint-hosted pass page (`passmint.com/p/…`) | Always present. Detects the visitor's platform and shows the right "Add to Wallet" button(s) — plus a QR code on desktop. Use as your universal fallback. |
| `download_url` | The Apple `.pkpass` file, downloaded directly | Present once Apple issuance succeeded; `null` if Apple wasn't delivered (e.g. a Google-only template, or Apple failed). |
| `google_wallet_url` | The Google Wallet "Save" link (`pay.google.com/…`) | Present once Google issuance succeeded; `null` if Google wasn't delivered (e.g. no Google issuer configured). |

Issuance is synchronous, so these are populated the moment `create()` resolves —
a URL is `null` only when that platform wasn't delivered for this pass.

### Build your own wallet buttons

Render your own branded "Add to Apple Wallet" / "Add to Google Wallet" buttons
and fall back to the hosted page when a direct link isn't available:

```ts
const pass = await passmint.passes.create({
  templateId: 'tmpl_123',
  fieldValues: { seat: '12A' },
})

// Prefer the direct link; fall back to the hosted page, which platform-detects.
const appleHref = pass.download_url ?? pass.url
const googleHref = pass.google_wallet_url ?? pass.url
```

- **Apple** (`download_url`) — link an anchor to it, or trigger it in a hidden
  iframe so Safari opens the Add-to-Wallet sheet without navigating away.
- **Google** (`google_wallet_url`) — link to it directly; it redirects into the
  Google Wallet save flow.
- **Fallback** (`url`) — the hosted page inspects the visitor's platform and
  shows the appropriate button(s). Always safe to link to when you just want
  "add to wallet" to work everywhere.

The direct URLs are guarded by an unguessable pass id (the same mechanism the
hosted page uses); voiding a pass disables all three.

## Configuration

```ts
new Passmint({
  apiKey: 'pmk_live_...',
  baseUrl: 'https://api.passmint.com', // optional
  timeoutMs: 30_000,                   // optional, per-request timeout
  maxRetries: 3,                       // optional, retries 429 + 5xx with backoff
  fetch: customFetch,                  // optional, defaults to globalThis.fetch
})
```

API keys starting with `pmk_test_` run against test mode, `pmk_live_` run against live mode. The SDK infers this automatically and exposes it on `passmint.mode`.

## API

### Passes — `passmint.passes`

| Method | Description |
| --- | --- |
| `create(params, options?)` | Issue a new pass against a template. |
| `retrieve(id)` | Fetch a pass by id. |
| `list(params?)` | List passes, filter by template or holder email. |
| `update(id, params, options?)` | Update field values or metadata on a pass. |
| `void(id)` | Void a pass. |
| `events(id)` | List raw lifecycle events for a pass (internal vocabulary, e.g. `installed`). Use `passmint.events` for the canonical `pass.*` stream. |

`create` and `update` accept an optional `idempotencyKey` in `options`. If omitted, the SDK generates one for you so retries are safe by default.

`create` also accepts `platforms` (`['apple', 'google']`) and `certificateSetId` overrides. The created pass includes `warnings` for platforms that could not be delivered.

### Templates — `passmint.templates`

| Method | Description |
| --- | --- |
| `create(params, options?)` | Create a template. |
| `retrieve(id)` | Fetch a template by id. |
| `list()` | List all templates. |
| `update(id, params)` | Update name, design, platforms, credentials, or archive state. |
| `archive(id)` | Archive a template. |

### Events — `passmint.events`

The canonical event stream (the same envelopes your webhooks receive):

```ts
const { data, has_more } = await passmint.events.list({
  type: 'pass.added_to_wallet',
  since: '2026-07-01T00:00:00Z',
  limit: 100,
})

// Cursor pagination
const next = await passmint.events.list({ startingAfter: data.at(-1)!.id })
```

Canonical event types: `pass.issued`, `pass.add_intent`, `pass.added_to_wallet`, `pass.update_pushed`, `pass.update_delivered`, `pass.removed`, `pass.voided` (exported as `PASSMINT_EVENT_TYPES`).

### Metrics — `passmint.metrics`

```ts
const funnel = await passmint.metrics.funnel({ groupBy: 'template', since: '2026-06-01' })
// funnel.data: issued / add_intent / added / active / removed + rates, per group
```

### Account — `passmint.me`

```ts
const account = await passmint.me.retrieve()
// { organization_id, organization_name, organization_slug, mode }
```

### Webhooks — `passmint.webhooks`

Manage webhook endpoints:

| Method | Description |
| --- | --- |
| `create(params)` | Create an endpoint. Returns the signing `secret` **once** — store it. |
| `retrieve(id)` / `list()` | Fetch endpoints. |
| `update(id, params)` | Change url, subscribed events, description, or enabled state. |
| `delete(id)` | Delete an endpoint. |
| `backfill(id, { since, until? })` | Re-emit historical events to one endpoint. |
| `deliveries(id)` | Last 100 delivery attempts, newest first. |
| `replayDelivery(id, deliveryId)` | Re-queue a delivery (including dead ones). |

```ts
const webhook = await passmint.webhooks.create({
  url: 'https://example.com/hooks/passmint',
  events: ['pass.added_to_wallet', 'pass.removed'], // or ['*']
})
// webhook.secret -> whsec_... (only returned here)
```

Verify and parse webhook deliveries in one step:

```ts
import { Passmint, PassmintError } from '@passmint/node'

const passmint = new Passmint({ apiKey: process.env.PASSMINT_API_KEY! })

app.post('/webhooks/passmint', (req, res) => {
  try {
    const event = passmint.webhooks.constructEvent(
      req.rawBody, // Buffer or string — must be the raw, unparsed body
      req.headers['passmint-signature'] as string,
      process.env.PASSMINT_WEBHOOK_SECRET!,
    )
    // event is a typed PassmintEvent
    if (event.type === 'pass.added_to_wallet') {
      const { pass } = event.data.object
      // pass.holder is PII-minimized ({ email_hash, name_present });
      // fetch the full pass with passmint.passes.retrieve(pass.id) if needed
    }
    res.sendStatus(200)
  } catch (err) {
    if (err instanceof PassmintError) return res.sendStatus(400)
    throw err
  }
})
```

Signature verification uses HMAC-SHA256 with a 5-minute default tolerance window.

## Errors

All errors extend `PassmintError`. HTTP failures raise a typed subclass so you can branch cleanly:

```ts
import {
  PassmintError,
  PassmintAPIError,
  PassmintAuthError,
  PassmintRateLimitError,
} from '@passmint/node'

try {
  await passmint.passes.create({ templateId: 'tmpl_123' })
} catch (err) {
  if (err instanceof PassmintAuthError) {
    // 401 / 403 — bad or missing API key
  } else if (err instanceof PassmintRateLimitError) {
    // 429 — err.retryAfterSeconds tells you how long to wait
  } else if (err instanceof PassmintAPIError) {
    // other 4xx / 5xx — err.status, err.type, err.code, err.param
  } else if (err instanceof PassmintError) {
    // client-side error (bad config, network, timeout)
  }
}
```

The SDK automatically retries `429` and `5xx` responses with exponential backoff, up to `maxRetries` times.

## Testing

- `pnpm test` — unit tests + type-level assertions (vitest with `--typecheck`).
- `pnpm test:ecosystem` — packs the SDK into a tarball and installs it into consumer fixture projects (plain Node ESM, TypeScript under `node16` and `bundler` resolution, Bun, Deno), then runs the README quickstart flow against a mock Passmint API. This is what proves a user can actually `npm install` and use the package as documented. See [`ecosystem-tests/README.md`](./ecosystem-tests/README.md).
- `pnpm publint` / `pnpm attw` — static packaging and type-resolution checks.

## Releasing

Releases are driven by [changesets](https://github.com/changesets/changesets):

1. Add a changeset describing your change: `pnpm changeset`
2. Push. CI runs all gates.
3. Once merged to `main`, the release workflow opens (or updates) a "Version Packages" PR.
4. Merge that PR and the workflow publishes to npm with provenance via OIDC.

## License

[MIT](./LICENSE)
