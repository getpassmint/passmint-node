import { describe, expect, it, vi } from 'vitest'
import type { PassmintHttpClient } from '../src/client'
import { EventsResource } from '../src/resources/events'
import { MeResource } from '../src/resources/me'
import { MetricsResource } from '../src/resources/metrics'
import { PassesResource } from '../src/resources/passes'
import { TemplatesResource } from '../src/resources/templates'
import { WebhooksResource } from '../src/webhooks'

type Captured = {
  method: string
  path: string
  body?: unknown
  query?: Record<string, string | number | undefined>
  idempotencyKey?: string
}

function fakeHttp(response: unknown = {}): { http: PassmintHttpClient; calls: Captured[] } {
  const calls: Captured[] = []
  const http = {
    request: vi.fn(async (req: Captured) => {
      calls.push(req)
      return response
    }),
  } as unknown as PassmintHttpClient
  return { http, calls }
}

describe('PassesResource', () => {
  it('create: POSTs /v1/passes with snake_case body and auto idempotency key', async () => {
    const { http, calls } = fakeHttp({ id: 'pass_1' })
    const passes = new PassesResource(http)
    await passes.create({
      templateId: 'tmpl_1',
      holderEmail: 'ada@example.com',
      holderName: 'Ada',
      fieldValues: { seat: '12A' },
      metadata: { order: 1 },
    })
    const call = calls[0]!
    expect(call.method).toBe('POST')
    expect(call.path).toBe('/v1/passes')
    expect(call.body).toEqual({
      template_id: 'tmpl_1',
      holder_email: 'ada@example.com',
      holder_name: 'Ada',
      field_values: { seat: '12A' },
      metadata: { order: 1 },
    })
    expect(call.idempotencyKey).toBeDefined()
    expect(call.idempotencyKey?.length).toBeGreaterThan(0)
  })

  it('create: respects an explicit idempotency key', async () => {
    const { http, calls } = fakeHttp()
    const passes = new PassesResource(http)
    await passes.create({ templateId: 'tmpl_1' }, { idempotencyKey: 'custom_key' })
    expect(calls[0]?.idempotencyKey).toBe('custom_key')
  })

  it('create: fills defaults for optional params', async () => {
    const { http, calls } = fakeHttp()
    const passes = new PassesResource(http)
    await passes.create({ templateId: 'tmpl_1' })
    expect(calls[0]?.body).toEqual({
      template_id: 'tmpl_1',
      holder_email: null,
      holder_name: null,
      field_values: {},
      metadata: null,
    })
  })

  it('create: sends platforms and certificate_set_id when provided', async () => {
    const { http, calls } = fakeHttp()
    const passes = new PassesResource(http)
    await passes.create({
      templateId: 'tmpl_1',
      platforms: ['apple', 'google'],
      certificateSetId: 'certSet_1',
    })
    expect(calls[0]?.body).toMatchObject({
      template_id: 'tmpl_1',
      platforms: ['apple', 'google'],
      certificate_set_id: 'certSet_1',
    })
  })

  it('create: passes an explicit null certificate_set_id through (forces dev cert)', async () => {
    const { http, calls } = fakeHttp()
    const passes = new PassesResource(http)
    await passes.create({ templateId: 'tmpl_1', certificateSetId: null })
    expect(calls[0]?.body).toMatchObject({ certificate_set_id: null })
  })

  it('create: maps imageVariant to image_variant, omitting it when unset', async () => {
    const { http, calls } = fakeHttp()
    const passes = new PassesResource(http)
    await passes.create({ templateId: 'tmpl_1', imageVariant: '3' })
    await passes.create({ templateId: 'tmpl_1' })
    expect(calls[0]?.body).toMatchObject({ image_variant: '3' })
    expect(calls[1]?.body).not.toHaveProperty('image_variant')
  })

  it('retrieve: GETs and URL-encodes the id', async () => {
    const { http, calls } = fakeHttp()
    const passes = new PassesResource(http)
    await passes.retrieve('pass/with slash')
    expect(calls[0]?.method).toBe('GET')
    expect(calls[0]?.path).toBe('/v1/passes/pass%2Fwith%20slash')
  })

  it('list: GETs /v1/passes with query params', async () => {
    const { http, calls } = fakeHttp({ object: 'list', data: [] })
    const passes = new PassesResource(http)
    await passes.list({ templateId: 'tmpl_1', holderEmail: 'x@y.z', limit: 5 })
    expect(calls[0]?.method).toBe('GET')
    expect(calls[0]?.path).toBe('/v1/passes')
    expect(calls[0]?.query).toEqual({
      template_id: 'tmpl_1',
      holder_email: 'x@y.z',
      limit: 5,
    })
  })

  it('update: PATCHes with field_values and metadata', async () => {
    const { http, calls } = fakeHttp()
    const passes = new PassesResource(http)
    await passes.update('pass_1', { fieldValues: { seat: '1B' }, metadata: null })
    expect(calls[0]?.method).toBe('PATCH')
    expect(calls[0]?.path).toBe('/v1/passes/pass_1')
    expect(calls[0]?.body).toEqual({ field_values: { seat: '1B' }, metadata: null })
    expect(calls[0]?.idempotencyKey).toBeDefined()
  })

  it('update: sends image_variant alone (a variant-only PATCH is valid)', async () => {
    const { http, calls } = fakeHttp()
    const passes = new PassesResource(http)
    await passes.update('pass_1', { imageVariant: '7' })
    expect(calls[0]?.body).toStrictEqual({ image_variant: '7' })
  })

  it('update: sends an explicit null image_variant to clear it', async () => {
    const { http, calls } = fakeHttp()
    const passes = new PassesResource(http)
    await passes.update('pass_1', { fieldValues: { stamps: '0' }, imageVariant: null })
    expect(calls[0]?.body).toStrictEqual({ field_values: { stamps: '0' }, image_variant: null })
    expect(JSON.stringify(calls[0]?.body)).toContain('"image_variant":null')
  })

  it('update: omits image_variant (and other unset keys) when undefined', async () => {
    const { http, calls } = fakeHttp()
    const passes = new PassesResource(http)
    await passes.update('pass_1', { fieldValues: { stamps: '2' } })
    expect(calls[0]?.body).toStrictEqual({ field_values: { stamps: '2' } })
  })

  it('void: DELETEs /v1/passes/:id', async () => {
    const { http, calls } = fakeHttp()
    const passes = new PassesResource(http)
    await passes.void('pass_1')
    expect(calls[0]?.method).toBe('DELETE')
    expect(calls[0]?.path).toBe('/v1/passes/pass_1')
  })

  it('events: GETs /v1/passes/:id/events', async () => {
    const { http, calls } = fakeHttp({ object: 'list', data: [] })
    const passes = new PassesResource(http)
    await passes.events('pass_1')
    expect(calls[0]?.method).toBe('GET')
    expect(calls[0]?.path).toBe('/v1/passes/pass_1/events')
  })
})

describe('TemplatesResource', () => {
  it('create: POSTs /v1/templates with snake_case body', async () => {
    const { http, calls } = fakeHttp()
    const templates = new TemplatesResource(http)
    await templates.create({
      name: 'Event',
      type: 'event',
      appleStyle: 'eventTicket',
      // biome-ignore lint/suspicious/noExplicitAny: test fixture only
      design: {} as any,
      starterTemplateId: 'starter_1',
    })
    const call = calls[0]!
    expect(call.method).toBe('POST')
    expect(call.path).toBe('/v1/templates')
    expect(call.body).toMatchObject({
      name: 'Event',
      type: 'event',
      apple_style: 'eventTicket',
      starter_template_id: 'starter_1',
    })
    expect(call.idempotencyKey).toBeDefined()
  })

  it('create: sends platforms when provided', async () => {
    const { http, calls } = fakeHttp()
    const templates = new TemplatesResource(http)
    await templates.create({
      name: 'Event',
      type: 'event',
      appleStyle: 'eventTicket',
      // biome-ignore lint/suspicious/noExplicitAny: test fixture only
      design: {} as any,
      platforms: ['apple', 'google'],
    })
    expect(calls[0]?.body).toMatchObject({ platforms: ['apple', 'google'] })
  })

  it('update: maps platforms and credential overrides to snake_case', async () => {
    const { http, calls } = fakeHttp()
    const templates = new TemplatesResource(http)
    await templates.update('tmpl_1', {
      platforms: ['google'],
      certificateSetId: null,
      googleIssuerId: 'googleIssuer_1',
    })
    expect(calls[0]?.body).toEqual({
      platforms: ['google'],
      certificate_set_id: null,
      google_issuer_id: 'googleIssuer_1',
    })
  })

  it('retrieve, list, update, archive hit the right paths and methods', async () => {
    const { http, calls } = fakeHttp()
    const templates = new TemplatesResource(http)

    await templates.retrieve('tmpl_1')
    await templates.list()
    await templates.update('tmpl_1', { name: 'Renamed', archived: true })
    await templates.archive('tmpl_1')

    expect(calls[0]).toMatchObject({ method: 'GET', path: '/v1/templates/tmpl_1' })
    expect(calls[1]).toMatchObject({ method: 'GET', path: '/v1/templates' })
    expect(calls[2]).toMatchObject({
      method: 'PATCH',
      path: '/v1/templates/tmpl_1',
      body: { name: 'Renamed', archived: true },
    })
    expect(calls[3]).toMatchObject({ method: 'DELETE', path: '/v1/templates/tmpl_1' })
  })
})

describe('TemplatesResource images', () => {
  // 0x89 'P' 'N' 'G' \r \n 0x1a \n — the PNG signature, base64 "iVBORw0KGgo="
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const pngBase64 = 'iVBORw0KGgo='

  it('uploadImage: PUTs base64 data to /v1/templates/:id/images/:slot', async () => {
    const { http, calls } = fakeHttp({
      object: 'template_image',
      template_id: 'tmpl_1',
      slot: 'logo',
      variant: null,
    })
    const templates = new TemplatesResource(http)
    const image = await templates.uploadImage('tmpl_1', 'logo', png)
    expect(calls[0]).toMatchObject({ method: 'PUT', path: '/v1/templates/tmpl_1/images/logo' })
    expect(calls[0]?.body).toStrictEqual({ data: pngBase64 })
    expect(calls[0]?.query).toBeUndefined()
    expect(image.variant).toBeNull()
  })

  it('uploadImage: includes the variant when provided', async () => {
    const { http, calls } = fakeHttp()
    const templates = new TemplatesResource(http)
    await templates.uploadImage('tmpl/1', 'strip', png, { variant: '10' })
    expect(calls[0]?.path).toBe('/v1/templates/tmpl%2F1/images/strip')
    expect(calls[0]?.body).toStrictEqual({ data: pngBase64, variant: '10' })
  })

  it('uploadImage: accepts an ArrayBuffer', async () => {
    const { http, calls } = fakeHttp()
    const templates = new TemplatesResource(http)
    await templates.uploadImage('tmpl_1', 'icon', png.slice().buffer)
    expect(calls[0]?.body).toStrictEqual({ data: pngBase64 })
  })

  it('uploadImage: encodes only the viewed bytes of a Buffer / offset Uint8Array', async () => {
    const { http, calls } = fakeHttp()
    const templates = new TemplatesResource(http)
    const backing = new Uint8Array([0xff, 0xff, ...png, 0xff])
    await templates.uploadImage('tmpl_1', 'thumbnail', backing.subarray(2, 2 + png.length))
    await templates.uploadImage('tmpl_1', 'thumbnail', Buffer.from(png))
    expect(calls[0]?.body).toStrictEqual({ data: pngBase64 })
    expect(calls[1]?.body).toStrictEqual({ data: pngBase64 })
  })

  it('uploadImage: encodes large images without Buffer (matches Node base64)', async () => {
    const { http, calls } = fakeHttp()
    const templates = new TemplatesResource(http)
    const big = new Uint8Array(200_000).map((_, i) => (i * 31) % 256)
    const RealBuffer = globalThis.Buffer
    vi.stubGlobal('Buffer', undefined)
    try {
      await templates.uploadImage('tmpl_1', 'background', big)
    } finally {
      vi.stubGlobal('Buffer', RealBuffer)
    }
    expect((calls[0]?.body as { data: string }).data).toBe(RealBuffer.from(big).toString('base64'))
  })

  it('deleteImage: DELETEs with the variant as a query param', async () => {
    const { http, calls } = fakeHttp({
      object: 'template_image',
      template_id: 'tmpl_1',
      slot: 'strip',
      variant: '3',
      deleted: true,
    })
    const templates = new TemplatesResource(http)
    const res = await templates.deleteImage('tmpl_1', 'strip', { variant: '3' })
    expect(calls[0]).toMatchObject({
      method: 'DELETE',
      path: '/v1/templates/tmpl_1/images/strip',
      query: { variant: '3' },
    })
    expect(calls[0]?.body).toBeUndefined()
    expect(res.deleted).toBe(true)
  })

  it('deleteImage: leaves variant unset for the base image', async () => {
    const { http, calls } = fakeHttp()
    const templates = new TemplatesResource(http)
    await templates.deleteImage('tmpl_1', 'footer')
    expect(calls[0]).toMatchObject({ method: 'DELETE', path: '/v1/templates/tmpl_1/images/footer' })
    expect(calls[0]?.query?.variant).toBeUndefined()
  })
})

describe('WebhooksResource API methods', () => {
  it('create: POSTs /v1/webhooks with url and events, no idempotency key', async () => {
    const { http, calls } = fakeHttp({ id: 'whk_1', secret: 'whsec_x' })
    const webhooks = new WebhooksResource(http)
    await webhooks.create({
      url: 'https://example.com/hooks',
      events: ['pass.added_to_wallet', '*'],
      description: 'main endpoint',
      enabled: true,
    })
    const call = calls[0]!
    expect(call.method).toBe('POST')
    expect(call.path).toBe('/v1/webhooks')
    expect(call.body).toEqual({
      url: 'https://example.com/hooks',
      events: ['pass.added_to_wallet', '*'],
      description: 'main endpoint',
      enabled: true,
    })
    expect(call.idempotencyKey).toBeUndefined()
  })

  it('create: omits optional fields that were not provided', async () => {
    const { http, calls } = fakeHttp()
    const webhooks = new WebhooksResource(http)
    await webhooks.create({ url: 'https://example.com/hooks', events: ['*'] })
    expect(calls[0]?.body).toEqual({ url: 'https://example.com/hooks', events: ['*'] })
  })

  it('retrieve, list, update, delete hit the right paths and methods', async () => {
    const { http, calls } = fakeHttp()
    const webhooks = new WebhooksResource(http)

    await webhooks.retrieve('whk_1')
    await webhooks.list()
    await webhooks.update('whk_1', { enabled: false, description: null })
    await webhooks.delete('whk_1')

    expect(calls[0]).toMatchObject({ method: 'GET', path: '/v1/webhooks/whk_1' })
    expect(calls[1]).toMatchObject({ method: 'GET', path: '/v1/webhooks' })
    expect(calls[2]).toMatchObject({
      method: 'PATCH',
      path: '/v1/webhooks/whk_1',
      body: { enabled: false, description: null },
    })
    expect(calls[3]).toMatchObject({ method: 'DELETE', path: '/v1/webhooks/whk_1' })
  })

  it('backfill: POSTs the window to /v1/webhooks/:id/backfill', async () => {
    const { http, calls } = fakeHttp({ object: 'backfill', enqueued: 3, capped: false })
    const webhooks = new WebhooksResource(http)
    await webhooks.backfill('whk_1', {
      since: '2026-06-01T00:00:00Z',
      until: '2026-06-02T00:00:00Z',
    })
    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/v1/webhooks/whk_1/backfill',
      body: { since: '2026-06-01T00:00:00Z', until: '2026-06-02T00:00:00Z' },
    })
  })

  it('backfill: omits until when not provided', async () => {
    const { http, calls } = fakeHttp()
    const webhooks = new WebhooksResource(http)
    await webhooks.backfill('whk_1', { since: '2026-06-01T00:00:00Z' })
    expect(calls[0]?.body).toEqual({ since: '2026-06-01T00:00:00Z' })
  })

  it('deliveries: GETs /v1/webhooks/:id/deliveries', async () => {
    const { http, calls } = fakeHttp({ object: 'list', data: [] })
    const webhooks = new WebhooksResource(http)
    await webhooks.deliveries('whk_1')
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/v1/webhooks/whk_1/deliveries' })
  })

  it('replayDelivery: POSTs /v1/webhooks/:id/deliveries/:deliveryId/replay', async () => {
    const { http, calls } = fakeHttp({ id: 'whd_1', status: 'delivered' })
    const webhooks = new WebhooksResource(http)
    await webhooks.replayDelivery('whk_1', 'whd_1')
    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/v1/webhooks/whk_1/deliveries/whd_1/replay',
    })
  })

  it('URL-encodes webhook and delivery ids', async () => {
    const { http, calls } = fakeHttp()
    const webhooks = new WebhooksResource(http)
    await webhooks.replayDelivery('whk/1', 'whd 2')
    expect(calls[0]?.path).toBe('/v1/webhooks/whk%2F1/deliveries/whd%202/replay')
  })
})

describe('EventsResource', () => {
  it('list: GETs /v1/events with all filters mapped to snake_case', async () => {
    const { http, calls } = fakeHttp({ object: 'list', data: [], has_more: false })
    const events = new EventsResource(http)
    await events.list({
      type: 'pass.added_to_wallet',
      passId: 'pass_1',
      templateId: 'tmpl_1',
      since: '2026-06-01T00:00:00Z',
      until: '2026-06-30T00:00:00Z',
      startingAfter: 'psEvnt_cursor',
      limit: 50,
    })
    expect(calls[0]?.method).toBe('GET')
    expect(calls[0]?.path).toBe('/v1/events')
    expect(calls[0]?.query).toEqual({
      type: 'pass.added_to_wallet',
      pass_id: 'pass_1',
      template_id: 'tmpl_1',
      since: '2026-06-01T00:00:00Z',
      until: '2026-06-30T00:00:00Z',
      starting_after: 'psEvnt_cursor',
      limit: 50,
    })
  })

  it('list: works with no params', async () => {
    const { http, calls } = fakeHttp({ object: 'list', data: [], has_more: false })
    const events = new EventsResource(http)
    await events.list()
    expect(calls[0]?.path).toBe('/v1/events')
  })
})

describe('MetricsResource', () => {
  it('funnel: GETs /v1/metrics/funnel with filters and group_by', async () => {
    const { http, calls } = fakeHttp({ object: 'funnel', group_by: 'template', data: [] })
    const metrics = new MetricsResource(http)
    await metrics.funnel({
      templateId: 'tmpl_1',
      platform: 'apple',
      since: '2026-06-01',
      until: '2026-06-30',
      groupBy: 'template',
    })
    expect(calls[0]?.method).toBe('GET')
    expect(calls[0]?.path).toBe('/v1/metrics/funnel')
    expect(calls[0]?.query).toEqual({
      template_id: 'tmpl_1',
      platform: 'apple',
      since: '2026-06-01',
      until: '2026-06-30',
      group_by: 'template',
    })
  })

  it('funnel: works with no params', async () => {
    const { http, calls } = fakeHttp({ object: 'funnel', group_by: 'total', data: [] })
    const metrics = new MetricsResource(http)
    await metrics.funnel()
    expect(calls[0]?.path).toBe('/v1/metrics/funnel')
  })
})

describe('MeResource', () => {
  it('retrieve: GETs /v1/me', async () => {
    const { http, calls } = fakeHttp({ object: 'account', organization_id: 'org_1' })
    const me = new MeResource(http)
    const account = await me.retrieve()
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/v1/me' })
    expect(account.organization_id).toBe('org_1')
  })
})
