import { createHmac, timingSafeEqual } from 'node:crypto'
import { PassmintError } from './errors'

export interface WebhookEvent {
  id: string
  type: string
  created_at: string
  data: unknown
}

const SCHEME_VERSION = 'v1'

function parseHeader(header: string): { timestamp: string; v1: string } {
  const parts = header.split(',')
  let timestamp = ''
  let v1 = ''
  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key === 't') timestamp = value ?? ''
    if (key === SCHEME_VERSION) v1 = value ?? ''
  }
  if (!timestamp || !v1) {
    throw new PassmintError('Invalid Passmint-Signature header format')
  }
  return { timestamp, v1 }
}

export class WebhooksResource {
  constructEvent(
    payload: string | Buffer,
    signature: string,
    secret: string,
    toleranceSeconds = 300,
  ): WebhookEvent {
    const body = typeof payload === 'string' ? payload : payload.toString('utf8')
    const { timestamp, v1 } = parseHeader(signature)

    const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')

    const expectedBuffer = Buffer.from(expected, 'hex')
    const providedBuffer = Buffer.from(v1, 'hex')
    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      throw new PassmintError('Webhook signature verification failed')
    }

    const ts = Number(timestamp)
    if (!Number.isFinite(ts)) {
      throw new PassmintError('Invalid timestamp in webhook signature')
    }
    if (Math.abs(Date.now() / 1000 - ts) > toleranceSeconds) {
      throw new PassmintError('Webhook timestamp is outside tolerance window')
    }

    try {
      return JSON.parse(body) as WebhookEvent
    } catch {
      throw new PassmintError('Webhook payload is not valid JSON')
    }
  }
}
