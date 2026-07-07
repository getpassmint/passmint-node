import { createHmac, timingSafeEqual } from 'node:crypto'
import type { PassmintHttpClient } from './client'
import { PassmintError } from './errors'
import type {
  BackfillParams,
  BackfillResult,
  CreateWebhookParams,
  ListResponse,
  PassmintEvent,
  UpdateWebhookParams,
  Webhook,
  WebhookDelivery,
} from './types'

/** @deprecated Use {@link PassmintEvent} — webhooks deliver the canonical event envelope. */
export type WebhookEvent = PassmintEvent

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
  constructor(private readonly http: PassmintHttpClient) {}

  create(params: CreateWebhookParams): Promise<Webhook> {
    const body: Record<string, unknown> = {
      url: params.url,
      events: params.events,
    }
    if (params.description !== undefined) body.description = params.description
    if (params.enabled !== undefined) body.enabled = params.enabled
    return this.http.request<Webhook>({ method: 'POST', path: '/v1/webhooks', body })
  }

  retrieve(id: string): Promise<Webhook> {
    return this.http.request<Webhook>({
      method: 'GET',
      path: `/v1/webhooks/${encodeURIComponent(id)}`,
    })
  }

  list(): Promise<ListResponse<Webhook>> {
    return this.http.request<ListResponse<Webhook>>({ method: 'GET', path: '/v1/webhooks' })
  }

  update(id: string, params: UpdateWebhookParams): Promise<Webhook> {
    return this.http.request<Webhook>({
      method: 'PATCH',
      path: `/v1/webhooks/${encodeURIComponent(id)}`,
      body: params,
    })
  }

  delete(id: string): Promise<{ id: string; deleted: true }> {
    return this.http.request({
      method: 'DELETE',
      path: `/v1/webhooks/${encodeURIComponent(id)}`,
    })
  }

  /** Re-emit historical events (bounded window) to this endpoint. */
  backfill(id: string, params: BackfillParams): Promise<BackfillResult> {
    const body: Record<string, unknown> = { since: params.since }
    if (params.until !== undefined) body.until = params.until
    return this.http.request<BackfillResult>({
      method: 'POST',
      path: `/v1/webhooks/${encodeURIComponent(id)}/backfill`,
      body,
    })
  }

  /** Last 100 delivery attempts for this endpoint, newest first. */
  deliveries(id: string): Promise<ListResponse<WebhookDelivery>> {
    return this.http.request<ListResponse<WebhookDelivery>>({
      method: 'GET',
      path: `/v1/webhooks/${encodeURIComponent(id)}/deliveries`,
    })
  }

  /** Re-queue a delivery (including dead ones) for a fresh attempt. */
  replayDelivery(id: string, deliveryId: string): Promise<WebhookDelivery> {
    return this.http.request<WebhookDelivery>({
      method: 'POST',
      path: `/v1/webhooks/${encodeURIComponent(id)}/deliveries/${encodeURIComponent(deliveryId)}/replay`,
    })
  }

  constructEvent(
    payload: string | Buffer,
    signature: string,
    secret: string,
    toleranceSeconds = 300,
  ): PassmintEvent {
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
      return JSON.parse(body) as PassmintEvent
    } catch {
      throw new PassmintError('Webhook payload is not valid JSON')
    }
  }
}
