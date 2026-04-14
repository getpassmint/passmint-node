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
| `events(id)` | List lifecycle events for a pass. |

`create` and `update` accept an optional `idempotencyKey` in `options`. If omitted, the SDK generates one for you so retries are safe by default.

### Templates — `passmint.templates`

| Method | Description |
| --- | --- |
| `create(params, options?)` | Create a template. |
| `retrieve(id)` | Fetch a template by id. |
| `list()` | List all templates. |
| `update(id, params)` | Update a template's name, design, or archive state. |
| `archive(id)` | Archive a template. |

### Webhooks — `passmint.webhooks`

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
    // handle event.type ...
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

## Releasing

Releases are driven by [changesets](https://github.com/changesets/changesets):

1. Add a changeset describing your change: `pnpm changeset`
2. Push. CI runs all gates.
3. Once merged to `main`, the release workflow opens (or updates) a "Version Packages" PR.
4. Merge that PR and the workflow publishes to npm with provenance via OIDC.

## License

[MIT](./LICENSE)
