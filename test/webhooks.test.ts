import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { PassmintError } from '../src/errors'
import { PASSMINT_EVENT_TYPES, type PassmintEvent, type PassmintEventType } from '../src/types'
import { WebhooksResource } from '../src/webhooks'

const SECRET = 'whsec_test'
const FIXED_NOW = 1_760_000_000_000 // ms

function sign(body: string, timestamp: number, secret = SECRET): string {
  const v1 = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return `t=${timestamp},v1=${v1}`
}

describe('WebhooksResource.constructEvent', () => {
  // constructEvent is pure — it never touches the HTTP client.
  const webhooks = new WebhooksResource(undefined as never)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(FIXED_NOW))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the parsed event when signature and timestamp are valid', () => {
    const body = JSON.stringify({ id: 'evt_1', type: 'pass.created', created_at: 'now', data: {} })
    const ts = Math.floor(FIXED_NOW / 1000)
    const event = webhooks.constructEvent(body, sign(body, ts), SECRET)
    expect(event.id).toBe('evt_1')
    expect(event.type).toBe('pass.created')
  })

  it('accepts a Buffer payload', () => {
    const body = JSON.stringify({ id: 'evt_2', type: 'pass.voided', created_at: 'now', data: {} })
    const ts = Math.floor(FIXED_NOW / 1000)
    const event = webhooks.constructEvent(Buffer.from(body), sign(body, ts), SECRET)
    expect(event.id).toBe('evt_2')
  })

  it('throws when the signature header is malformed', () => {
    expect(() => webhooks.constructEvent('{}', 'not-a-header', SECRET)).toThrow(PassmintError)
  })

  it('throws when the signature does not match the body', () => {
    const ts = Math.floor(FIXED_NOW / 1000)
    const header = sign('{"tampered":true}', ts)
    expect(() => webhooks.constructEvent('{"real":true}', header, SECRET)).toThrow(
      /signature verification failed/i,
    )
  })

  it('throws when the signature was computed with a different secret', () => {
    const body = '{"x":1}'
    const ts = Math.floor(FIXED_NOW / 1000)
    const header = sign(body, ts, 'wrong_secret')
    expect(() => webhooks.constructEvent(body, header, SECRET)).toThrow(
      /signature verification failed/i,
    )
  })

  it('throws when the timestamp is outside the tolerance window', () => {
    const body = '{"x":1}'
    const stale = Math.floor(FIXED_NOW / 1000) - 600 // 10 min old
    const header = sign(body, stale)
    expect(() => webhooks.constructEvent(body, header, SECRET)).toThrow(/tolerance/i)
  })

  it('accepts a stale timestamp if tolerance is widened', () => {
    const body = '{"x":1}'
    const stale = Math.floor(FIXED_NOW / 1000) - 600
    const header = sign(body, stale)
    expect(() => webhooks.constructEvent(body, header, SECRET, 1_000)).not.toThrow()
  })

  it('throws when payload is not valid JSON', () => {
    const body = 'not-json'
    const ts = Math.floor(FIXED_NOW / 1000)
    const header = sign(body, ts)
    expect(() => webhooks.constructEvent(body, header, SECRET)).toThrow(/not valid JSON/i)
  })

  it('parses a canonical event envelope and types it as PassmintEvent', () => {
    const envelope = {
      id: 'psEvnt_abc123',
      object: 'event',
      type: 'pass.added_to_wallet',
      api_version: '2026-06-26',
      created_at: '2026-07-01T12:00:00.000Z',
      idempotency_key: 'psEvnt_abc123',
      livemode: false,
      data: {
        object: {
          pass: {
            id: 'pass_1',
            short_id: 'shrt1',
            template_id: 'tmpl_1',
            organization_id: 'org_1',
            serial_number: 'SN1',
            holder: { email_hash: null, name_present: false },
            voided: false,
            url: 'https://passmint.com/p/shrt1',
            download_url: null,
            google_wallet_url: null,
          },
        },
      },
      source: { platform: 'apple', unit: 'device', confidence: 'exact' },
      previous_attributes: null,
    }
    const body = JSON.stringify(envelope)
    const ts = Math.floor(FIXED_NOW / 1000)
    const event = webhooks.constructEvent(body, sign(body, ts), SECRET)

    expectTypeOf(event).toEqualTypeOf<PassmintEvent>()
    expect(event).toEqual(envelope)
    expect(PASSMINT_EVENT_TYPES).toContain(event.type)
    expect(event.data.object.pass.holder).toEqual({ email_hash: null, name_present: false })
  })
})

describe('PASSMINT_EVENT_TYPES', () => {
  it('matches the canonical Passmint Spec v1 lifecycle set', () => {
    expect(PASSMINT_EVENT_TYPES).toEqual([
      'pass.issued',
      'pass.add_intent',
      'pass.added_to_wallet',
      'pass.update_pushed',
      'pass.update_delivered',
      'pass.removed',
      'pass.voided',
    ])
    expectTypeOf<PassmintEventType>().toEqualTypeOf<(typeof PASSMINT_EVENT_TYPES)[number]>()
  })
})
