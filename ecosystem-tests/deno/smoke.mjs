/**
 * Consumer smoke test: exercises the packed @passmint/node tarball the way
 * the README documents it, against the mock Passmint API (PASSMINT_BASE_URL).
 */
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import {
  PASSMINT_EVENT_TYPES,
  Passmint,
  PassmintAPIError,
  PassmintAuthError,
  PassmintError,
  PassmintRateLimitError,
  detectMode,
} from '@passmint/node'

const baseUrl = process.env.PASSMINT_BASE_URL
const webhookSecret = process.env.PASSMINT_WEBHOOK_SECRET
const apiKey = process.env.PASSMINT_API_KEY
assert.ok(baseUrl && webhookSecret && apiKey, 'missing PASSMINT_* env — run via run.mjs')

// --- exports & mode detection ---
assert.equal(typeof Passmint, 'function')
assert.equal(typeof PassmintError, 'function')
assert.equal(typeof PassmintAuthError, 'function')
assert.equal(typeof PassmintRateLimitError, 'function')
assert.equal(PASSMINT_EVENT_TYPES.length, 7)
assert.equal(detectMode(apiKey), 'test')

const passmint = new Passmint({ apiKey, baseUrl })
assert.equal(passmint.mode, 'test')

// --- README quickstart: create a pass ---
const pass = await passmint.passes.create({
  templateId: 'tmpl_1',
  holderEmail: 'ada@example.com',
  holderName: 'Ada Lovelace',
  fieldValues: { seat: '12A' },
})
assert.equal(pass.object, 'pass')
assert.equal(pass.template_id, 'tmpl_1')
assert.equal(pass.holder_email, 'ada@example.com')
assert.ok(pass.url.startsWith('https://'))
assert.deepEqual(pass.warnings, [])

// --- retrieve ---
const fetched = await passmint.passes.retrieve(pass.id)
assert.equal(fetched.object, 'pass')

// --- canonical event stream + cursor pagination ---
const events = await passmint.events.list({ type: 'pass.added_to_wallet', limit: 100 })
assert.equal(events.object, 'list')
assert.equal(events.has_more, true)
const event = events.data[0]
assert.equal(event.object, 'event')
assert.ok(PASSMINT_EVENT_TYPES.includes(event.type))
assert.equal(event.api_version, '2026-06-26')
assert.equal(event.data.object.pass.holder.name_present, true)
const nextPage = await passmint.events.list({ startingAfter: event.id })
assert.equal(nextPage.has_more, false)

// --- webhook endpoint management + signature verification ---
const webhook = await passmint.webhooks.create({
  url: 'https://example.com/hooks/passmint',
  events: ['pass.added_to_wallet', 'pass.removed'],
})
assert.equal(webhook.object, 'webhook')
assert.ok(webhook.secret.startsWith('whsec_'))

const envelope = JSON.stringify({
  id: 'psEvnt_smoke',
  object: 'event',
  type: 'pass.voided',
  api_version: '2026-06-26',
  created_at: new Date().toISOString(),
  idempotency_key: 'psEvnt_smoke',
  livemode: false,
  data: { object: { pass: { id: 'pass_1' } } },
  source: { platform: null, unit: null, confidence: 'best_effort' },
  previous_attributes: null,
})
const ts = Math.floor(Date.now() / 1000)
const v1 = createHmac('sha256', webhookSecret).update(`${ts}.${envelope}`).digest('hex')
const verified = passmint.webhooks.constructEvent(envelope, `t=${ts},v1=${v1}`, webhookSecret)
assert.equal(verified.type, 'pass.voided')

assert.throws(
  () => passmint.webhooks.constructEvent(`${envelope} `, `t=${ts},v1=${v1}`, webhookSecret),
  (err) => err instanceof PassmintError && /signature verification failed/i.test(err.message),
  'tampered payload must fail verification',
)

// --- metrics + account ---
const funnel = await passmint.metrics.funnel({ groupBy: 'total' })
assert.equal(funnel.object, 'funnel')
assert.equal(funnel.data[0].issued, 100)

const account = await passmint.me.retrieve()
assert.equal(account.object, 'account')
assert.equal(account.mode, 'test')

// --- typed errors through the tarball boundary ---
await assert.rejects(
  passmint.passes.create({ templateId: 'tmpl_over_limit' }),
  (err) =>
    err instanceof PassmintAPIError &&
    err instanceof PassmintError &&
    err.status === 402 &&
    err.type === 'billing_error' &&
    err.code === 'plan_limit_exceeded',
  'plan limit must surface as a typed PassmintAPIError',
)

await assert.rejects(
  passmint.passes.retrieve('pass_ratelimited'),
  (err) => err instanceof PassmintRateLimitError && err.retryAfterSeconds === 7,
  '429 must surface as PassmintRateLimitError with retryAfterSeconds',
)

// --- automatic retry on 5xx (mock fails once, then succeeds) ---
const flaky = await passmint.passes.retrieve('pass_flaky')
assert.equal(flaky.id, 'pass_flaky')

console.log('smoke ok')
