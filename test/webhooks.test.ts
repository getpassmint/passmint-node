import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PassmintError } from '../src/errors'
import { WebhooksResource } from '../src/webhooks'

const SECRET = 'whsec_test'
const FIXED_NOW = 1_760_000_000_000 // ms

function sign(body: string, timestamp: number, secret = SECRET): string {
  const v1 = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return `t=${timestamp},v1=${v1}`
}

describe('WebhooksResource.constructEvent', () => {
  const webhooks = new WebhooksResource()

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
})
