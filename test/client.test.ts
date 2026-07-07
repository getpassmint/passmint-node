import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PassmintHttpClient, detectMode } from '../src/client'
import {
  PassmintAPIError,
  PassmintAuthError,
  PassmintError,
  PassmintRateLimitError,
} from '../src/errors'

type FetchCall = { url: string; init: RequestInit }

function makeFetch(
  responses: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>,
) {
  const calls: FetchCall[] = []
  const impl = vi.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init })
    const next = responses.shift()
    if (!next) throw new Error('unexpected extra fetch call')
    const body = next.body === undefined ? '' : JSON.stringify(next.body)
    return new Response(body, { status: next.status, headers: next.headers ?? {} })
  }) as unknown as typeof fetch
  return { impl, calls }
}

describe('detectMode', () => {
  it('returns test for pmk_test_ keys', () => {
    expect(detectMode('pmk_test_abc')).toBe('test')
  })
  it('returns live for pmk_live_ keys', () => {
    expect(detectMode('pmk_live_abc')).toBe('live')
  })
  it('returns null for unknown prefixes', () => {
    expect(detectMode('sk_live_abc')).toBeNull()
  })
})

describe('PassmintHttpClient constructor', () => {
  it('throws when apiKey is missing', () => {
    expect(() => new PassmintHttpClient({ apiKey: '' })).toThrow(PassmintError)
  })

  it('throws when apiKey has an unknown prefix', () => {
    expect(() => new PassmintHttpClient({ apiKey: 'sk_live_abc' })).toThrow(/pmk_test_/)
  })

  it('exposes mode derived from apiKey', () => {
    const live = new PassmintHttpClient({ apiKey: 'pmk_live_1', fetch: makeFetch([]).impl })
    const test = new PassmintHttpClient({ apiKey: 'pmk_test_1', fetch: makeFetch([]).impl })
    expect(live.mode).toBe('live')
    expect(test.mode).toBe('test')
  })
})

describe('PassmintHttpClient.request', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  async function flush() {
    // Run all pending timers so retry backoff sleeps resolve immediately.
    await vi.runAllTimersAsync()
  }

  it('returns the parsed JSON body on 200', async () => {
    const { impl, calls } = makeFetch([{ status: 200, body: { id: 'pass_1', object: 'pass' } }])
    const client = new PassmintHttpClient({
      apiKey: 'pmk_test_1',
      fetch: impl,
      baseUrl: 'https://api.example.test',
    })
    const p = client.request<{ id: string }>({ method: 'GET', path: '/v1/passes/pass_1' })
    await flush()
    const result = await p
    expect(result.id).toBe('pass_1')
    expect(calls[0]?.url).toBe('https://api.example.test/v1/passes/pass_1')
    const headers = calls[0]?.init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer pmk_test_1')
  })

  it('appends query params, skipping undefined/empty values', async () => {
    const { impl, calls } = makeFetch([{ status: 200, body: { object: 'list', data: [] } }])
    const client = new PassmintHttpClient({
      apiKey: 'pmk_test_1',
      fetch: impl,
      baseUrl: 'https://api.example.test',
    })
    const p = client.request({
      method: 'GET',
      path: '/v1/passes',
      query: { template_id: 'tmpl_1', limit: 10, holder_email: undefined },
    })
    await flush()
    await p
    const url = new URL(calls[0]!.url)
    expect(url.searchParams.get('template_id')).toBe('tmpl_1')
    expect(url.searchParams.get('limit')).toBe('10')
    expect(url.searchParams.has('holder_email')).toBe(false)
  })

  it('sends body and Content-Type when body is provided', async () => {
    const { impl, calls } = makeFetch([{ status: 200, body: {} }])
    const client = new PassmintHttpClient({
      apiKey: 'pmk_test_1',
      fetch: impl,
    })
    const p = client.request({
      method: 'POST',
      path: '/v1/passes',
      body: { template_id: 'tmpl_1' },
      idempotencyKey: 'idemp_123',
    })
    await flush()
    await p
    const init = calls[0]!.init
    expect(init.body).toBe(JSON.stringify({ template_id: 'tmpl_1' }))
    const headers = init.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['Idempotency-Key']).toBe('idemp_123')
  })

  it('maps 401 to PassmintAuthError without retrying', async () => {
    const { impl } = makeFetch([
      { status: 401, body: { error: { type: 'auth_error', message: 'bad key' } } },
    ])
    const client = new PassmintHttpClient({ apiKey: 'pmk_test_1', fetch: impl, maxRetries: 3 })
    const p = client.request({ method: 'GET', path: '/v1/passes' }).catch((e) => e)
    await flush()
    const err = await p
    expect(err).toBeInstanceOf(PassmintAuthError)
    expect((err as PassmintAuthError).status).toBe(401)
    expect(impl).toHaveBeenCalledTimes(1)
  })

  it('maps 429 to PassmintRateLimitError with retry-after header', async () => {
    const { impl } = makeFetch([
      {
        status: 429,
        body: { error: { type: 'rate_limited', message: 'slow' } },
        headers: { 'retry-after': '4' },
      },
    ])
    const client = new PassmintHttpClient({ apiKey: 'pmk_test_1', fetch: impl, maxRetries: 0 })
    const p = client.request({ method: 'GET', path: '/v1/passes' }).catch((e) => e)
    await flush()
    const err = await p
    expect(err).toBeInstanceOf(PassmintRateLimitError)
    expect((err as PassmintRateLimitError).status).toBe(429)
    expect((err as PassmintRateLimitError).retryAfterSeconds).toBe(4)
  })

  it('retries 5xx up to maxRetries, then throws PassmintAPIError', async () => {
    const { impl } = makeFetch([
      { status: 500, body: { error: { type: 'api_error', message: 'boom' } } },
      { status: 500, body: { error: { type: 'api_error', message: 'boom' } } },
      { status: 500, body: { error: { type: 'api_error', message: 'boom' } } },
    ])
    const client = new PassmintHttpClient({ apiKey: 'pmk_test_1', fetch: impl, maxRetries: 2 })
    const p = client.request({ method: 'GET', path: '/v1/passes' }).catch((e) => e)
    await flush()
    const err = await p
    expect(err).toBeInstanceOf(PassmintAPIError)
    expect(impl).toHaveBeenCalledTimes(3)
  })

  it('retries a 500 and then succeeds', async () => {
    const { impl } = makeFetch([
      { status: 500, body: { error: { type: 'api_error', message: 'boom' } } },
      { status: 200, body: { id: 'pass_1' } },
    ])
    const client = new PassmintHttpClient({ apiKey: 'pmk_test_1', fetch: impl, maxRetries: 2 })
    const p = client.request<{ id: string }>({ method: 'GET', path: '/v1/passes/pass_1' })
    await flush()
    const result = await p
    expect(result.id).toBe('pass_1')
    expect(impl).toHaveBeenCalledTimes(2)
  })

  it('joins baseUrl and path correctly when baseUrl has no trailing slash', async () => {
    const { impl, calls } = makeFetch([{ status: 200, body: {} }])
    const client = new PassmintHttpClient({
      apiKey: 'pmk_test_1',
      fetch: impl,
      baseUrl: 'https://api.example.test',
    })
    const p = client.request({ method: 'GET', path: '/v1/passes' })
    await flush()
    await p
    expect(calls[0]?.url).toBe('https://api.example.test/v1/passes')
  })
})
