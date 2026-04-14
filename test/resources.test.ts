import { describe, expect, it, vi } from 'vitest'
import type { PassmintHttpClient } from '../src/client'
import { PassesResource } from '../src/resources/passes'
import { TemplatesResource } from '../src/resources/templates'

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
