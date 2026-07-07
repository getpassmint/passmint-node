/**
 * In-memory mock of the Passmint /v1 API for ecosystem tests.
 *
 * Shapes mirror the platform's serializers (apps/api/lib/api/serializers.ts)
 * and the canonical event envelope (packages/passes/src/event-read.ts). The
 * mock is deliberately STRICTER than the real API: unexpected query params,
 * camelCase body keys, or missing headers fail the request so contract drift
 * in the SDK surfaces as a test failure.
 *
 * Magic ids that trigger behaviors:
 *   POST /v1/passes  { template_id: "tmpl_over_limit" } -> 402 billing_error
 *   GET  /v1/passes/pass_ratelimited                    -> 429 + retry-after
 *   GET  /v1/passes/pass_flaky                          -> 500 once, then 200
 */
import { createHmac } from 'node:crypto'
import { createServer } from 'node:http'

const API_VERSION = '2026-06-26'
const WEBHOOK_SECRET = 'whsec_ecosystem_test_secret'

const CANONICAL_EVENT_TYPES = [
  'pass.issued',
  'pass.add_intent',
  'pass.added_to_wallet',
  'pass.update_pushed',
  'pass.update_delivered',
  'pass.removed',
  'pass.voided',
]

function errorBody(type, message, extra = {}) {
  return JSON.stringify({ error: { type, message, ...extra } })
}

function pass(id, overrides = {}) {
  return {
    id,
    object: 'pass',
    short_id: 'shrt_abc',
    template_id: 'tmpl_1',
    certificate_set_id: null,
    serial_number: 'SN-001',
    mode: 'test',
    holder_email: 'ada@example.com',
    holder_name: 'Ada Lovelace',
    field_values: { seat: '12A' },
    voided: false,
    voided_at: null,
    metadata: null,
    created_via_api: true,
    platforms: ['apple'],
    platform_status: { apple: 'delivered' },
    url: 'https://passmint.com/p/shrt_abc',
    download_url: 'https://passmint.com/p/shrt_abc/download',
    google_wallet_url: null,
    created_at: '2026-07-01T12:00:00.000Z',
    ...overrides,
  }
}

function canonicalEvent(id) {
  return {
    id,
    object: 'event',
    type: 'pass.added_to_wallet',
    api_version: API_VERSION,
    created_at: '2026-07-01T12:00:00.000Z',
    idempotency_key: id,
    livemode: false,
    data: {
      object: {
        pass: {
          id: 'pass_1',
          short_id: 'shrt_abc',
          template_id: 'tmpl_1',
          organization_id: 'org_1',
          serial_number: 'SN-001',
          holder: { email_hash: 'a'.repeat(64), name_present: true },
          voided: false,
          url: 'https://passmint.com/p/shrt_abc',
          download_url: 'https://passmint.com/p/shrt_abc/download',
          google_wallet_url: null,
        },
      },
    },
    source: { platform: 'apple', unit: 'device', confidence: 'exact' },
    previous_attributes: null,
  }
}

const FUNNEL_SUMMARY = {
  key: 'total',
  issued: 100,
  add_intent: 80,
  added: 60,
  active: 55,
  removed: 5,
  update_pushed: 40,
  update_delivered: 38,
  install_rate: 0.6,
  removal_rate: 0.083,
  update_delivery_rate: 0.95,
}

/** Sign a payload exactly the way the platform does (webhooks.ts). */
export function signPayload(body, timestampSeconds, secret = WEBHOOK_SECRET) {
  const v1 = createHmac('sha256', secret).update(`${timestampSeconds}.${body}`).digest('hex')
  return `t=${timestampSeconds},v1=${v1}`
}

export function startMockServer() {
  let flakyHits = 0

  const server = createServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8')
      const url = new URL(req.url, 'http://localhost')
      const path = url.pathname
      const method = req.method

      const fail = (status, type, message, extra = {}, headers = {}) => {
        res.writeHead(status, { 'content-type': 'application/json', ...headers })
        res.end(errorBody(type, message, extra))
      }
      const ok = (status, body, headers = {}) => {
        res.writeHead(status, { 'content-type': 'application/json', ...headers })
        res.end(JSON.stringify(body))
      }
      const requireQueryKeys = (allowed) => {
        const unknown = [...url.searchParams.keys()].filter((k) => !allowed.includes(k))
        if (unknown.length > 0) {
          fail(400, 'invalid_request_error', `Mock: unexpected query params: ${unknown.join(', ')}`)
          return false
        }
        return true
      }

      // --- auth: every /v1 route requires a test-mode bearer key ---
      const auth = req.headers.authorization ?? ''
      if (!auth.startsWith('Bearer pmk_test_')) {
        return fail(401, 'authentication_error', 'Mock: missing or invalid API key')
      }
      const userAgent = req.headers['user-agent'] ?? ''
      if (!userAgent.startsWith('passmint-node/')) {
        return fail(400, 'invalid_request_error', `Mock: unexpected user-agent: ${userAgent}`)
      }

      let body = null
      if (rawBody.length > 0) {
        if (!(req.headers['content-type'] ?? '').includes('application/json')) {
          return fail(400, 'invalid_request_error', 'Mock: body without JSON content-type')
        }
        try {
          body = JSON.parse(rawBody)
        } catch {
          return fail(400, 'invalid_request_error', 'Mock: body is not valid JSON')
        }
      }

      // --- POST /v1/passes ---
      if (method === 'POST' && path === '/v1/passes') {
        if (!req.headers['idempotency-key']) {
          return fail(400, 'invalid_request_error', 'Mock: POST /v1/passes without Idempotency-Key')
        }
        if (!body?.template_id) {
          return fail(400, 'invalid_request_error', 'Mock: template_id missing (camelCase body?)', {
            param: 'template_id',
          })
        }
        const camel = Object.keys(body).filter((k) => /[A-Z]/.test(k))
        if (camel.length > 0) {
          return fail(400, 'invalid_request_error', `Mock: camelCase body keys: ${camel.join(', ')}`)
        }
        if (body.template_id === 'tmpl_over_limit') {
          return fail(402, 'billing_error', 'Plan limit reached', { code: 'plan_limit_exceeded' })
        }
        return ok(201, {
          ...pass('pass_created', {
            template_id: body.template_id,
            holder_email: body.holder_email,
            holder_name: body.holder_name,
            field_values: body.field_values,
            metadata: body.metadata,
          }),
          warnings: [],
        })
      }

      // --- GET /v1/passes/:id ---
      const passMatch = path.match(/^\/v1\/passes\/([^/]+)$/)
      if (method === 'GET' && passMatch) {
        const id = decodeURIComponent(passMatch[1])
        if (id === 'pass_ratelimited') {
          return fail(429, 'rate_limit_error', 'Too many requests', { code: 'rate_limited' }, {
            'retry-after': '7',
          })
        }
        if (id === 'pass_flaky') {
          flakyHits += 1
          if (flakyHits === 1) {
            return fail(500, 'api_error', 'Mock: transient failure, retry me')
          }
          return ok(200, pass('pass_flaky'))
        }
        return ok(200, pass(id))
      }

      // --- GET /v1/events ---
      if (method === 'GET' && path === '/v1/events') {
        const allowed = ['type', 'pass_id', 'template_id', 'since', 'until', 'starting_after', 'limit']
        if (!requireQueryKeys(allowed)) return
        const type = url.searchParams.get('type')
        if (type && !CANONICAL_EVENT_TYPES.includes(type)) {
          return fail(400, 'invalid_request_error', `Mock: unknown event type ${type}`, {
            param: 'type',
          })
        }
        if (url.searchParams.get('starting_after')) {
          return ok(200, { object: 'list', data: [], has_more: false })
        }
        return ok(200, { object: 'list', data: [canonicalEvent('psEvnt_1')], has_more: true })
      }

      // --- POST /v1/webhooks ---
      if (method === 'POST' && path === '/v1/webhooks') {
        if (req.headers['idempotency-key']) {
          return fail(400, 'invalid_request_error', 'Mock: /v1/webhooks is not idempotent; key sent')
        }
        if (typeof body?.url !== 'string' || !Array.isArray(body?.events)) {
          return fail(400, 'invalid_request_error', 'Mock: url and events are required')
        }
        const valid = new Set([...CANONICAL_EVENT_TYPES, '*'])
        const bad = body.events.filter((e) => !valid.has(e))
        if (bad.length > 0) {
          return fail(400, 'invalid_request_error', `Mock: unknown event type(s): ${bad.join(', ')}`)
        }
        return ok(201, {
          id: 'whk_1',
          object: 'webhook',
          url: body.url,
          events: body.events,
          description: body.description ?? null,
          enabled: body.enabled ?? true,
          secret: WEBHOOK_SECRET,
          created_at: '2026-07-01T12:00:00.000Z',
        })
      }

      // --- GET /v1/metrics/funnel ---
      if (method === 'GET' && path === '/v1/metrics/funnel') {
        const allowed = ['template_id', 'platform', 'since', 'until', 'group_by']
        if (!requireQueryKeys(allowed)) return
        const groupBy = url.searchParams.get('group_by') ?? 'total'
        return ok(200, {
          object: 'funnel',
          group_by: groupBy,
          data: [FUNNEL_SUMMARY],
          confidence: {
            removed: 'best_effort — upstream removal signals under-report',
            update_delivery_rate: 'apple_confirmed_only — Google delivery is unconfirmed',
            active: 'as_of_latest_snapshot — may revise as late signals arrive',
          },
        })
      }

      // --- GET /v1/me ---
      if (method === 'GET' && path === '/v1/me') {
        return ok(200, {
          object: 'account',
          organization_id: 'org_1',
          organization_name: 'Ecosystem Test Org',
          organization_slug: 'ecosystem-test',
          mode: 'test',
        })
      }

      return fail(404, 'not_found_error', `Mock: no route for ${method} ${path}`)
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        webhookSecret: WEBHOOK_SECRET,
        close: () => new Promise((r) => server.close(r)),
      })
    })
  })
}
