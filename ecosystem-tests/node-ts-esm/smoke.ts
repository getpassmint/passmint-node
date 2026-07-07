/**
 * TypeScript consumer smoke test (module: node16). Exercises the packed
 * tarball's runtime AND its published type declarations under the strictest
 * consumer compiler settings.
 */
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import {
  PASSMINT_EVENT_TYPES,
  Passmint,
  PassmintAPIError,
  PassmintError,
  PassmintRateLimitError,
  detectMode,
} from '@passmint/node'
import type {
  Account,
  FunnelResponse,
  Pass,
  PassmintEvent,
  PassmintEventType,
  Webhook,
} from '@passmint/node'

const baseUrl = process.env.PASSMINT_BASE_URL
const webhookSecret = process.env.PASSMINT_WEBHOOK_SECRET
const apiKey = process.env.PASSMINT_API_KEY
assert.ok(baseUrl && webhookSecret && apiKey, 'missing PASSMINT_* env — run via run.mjs')

assert.equal(detectMode(apiKey), 'test')
const passmint = new Passmint({ apiKey, baseUrl })
const mode: 'test' | 'live' = passmint.mode
assert.equal(mode, 'test')

// --- create returns Pass & { warnings: string[] } ---
const pass = await passmint.passes.create({
  templateId: 'tmpl_1',
  holderEmail: 'ada@example.com',
  fieldValues: { seat: '12A' },
})
const created: Pass = pass
const warnings: string[] = pass.warnings
assert.equal(created.object, 'pass')
assert.deepEqual(warnings, [])
// Nullable platform fields typecheck as documented.
const downloadUrl: string | null = pass.download_url
const googleUrl: string | null = pass.google_wallet_url
assert.ok(downloadUrl === null || downloadUrl.startsWith('https://'))
assert.ok(googleUrl === null || googleUrl.startsWith('https://'))

// --- canonical events are fully typed ---
const events = await passmint.events.list({ type: 'pass.added_to_wallet' })
const first: PassmintEvent | undefined = events.data[0]
assert.ok(first)
const eventType: PassmintEventType = first.type
assert.ok((PASSMINT_EVENT_TYPES as readonly string[]).includes(eventType))
const emailHash: string | null = first.data.object.pass.holder.email_hash
assert.ok(emailHash === null || emailHash.length === 64)

// --- webhooks: management + verification, typed end to end ---
const webhook: Webhook = await passmint.webhooks.create({
  url: 'https://example.com/hooks/passmint',
  events: ['*'],
})
assert.ok(webhook.secret?.startsWith('whsec_'))

const envelope = JSON.stringify({
  id: 'psEvnt_smoke_ts',
  object: 'event',
  type: 'pass.issued',
  api_version: '2026-06-26',
  created_at: new Date().toISOString(),
  idempotency_key: 'psEvnt_smoke_ts',
  livemode: false,
  data: { object: { pass: { id: 'pass_1' } } },
  source: { platform: null, unit: null, confidence: 'best_effort' },
  previous_attributes: null,
})
const ts = Math.floor(Date.now() / 1000)
const v1 = createHmac('sha256', webhookSecret).update(`${ts}.${envelope}`).digest('hex')
const verified: PassmintEvent = passmint.webhooks.constructEvent(
  envelope,
  `t=${ts},v1=${v1}`,
  webhookSecret,
)
assert.equal(verified.type, 'pass.issued')

// --- metrics + account typed responses ---
const funnel: FunnelResponse = await passmint.metrics.funnel({ groupBy: 'total' })
assert.equal(funnel.group_by, 'total')
const account: Account = await passmint.me.retrieve()
assert.equal(account.mode, 'test')

// --- typed errors ---
try {
  await passmint.passes.create({ templateId: 'tmpl_over_limit' })
  assert.fail('expected a billing error')
} catch (err) {
  assert.ok(err instanceof PassmintAPIError)
  assert.ok(err instanceof PassmintError)
  assert.equal(err.status, 402)
}

try {
  await passmint.passes.retrieve('pass_ratelimited')
  assert.fail('expected a rate limit error')
} catch (err) {
  assert.ok(err instanceof PassmintRateLimitError)
  const retryAfter: number | undefined = err.retryAfterSeconds
  assert.equal(retryAfter, 7)
}

console.log('smoke ok')
