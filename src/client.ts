import {
  type ApiErrorPayload,
  PassmintAPIError,
  PassmintAuthError,
  PassmintError,
  PassmintRateLimitError,
} from './errors'
import { VERSION } from './version'

export interface PassmintOptions {
  apiKey: string
  baseUrl?: string
  timeoutMs?: number
  maxRetries?: number
  fetch?: typeof fetch
}

export interface InternalRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  query?: Record<string, string | number | undefined>
  body?: unknown
  idempotencyKey?: string
}

const DEFAULT_BASE_URL = 'https://api.passmint.com'
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RETRIES = 3

export function detectMode(apiKey: string): 'test' | 'live' | null {
  if (apiKey.startsWith('pmk_test_')) return 'test'
  if (apiKey.startsWith('pmk_live_')) return 'live'
  return null
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | undefined>,
): string {
  const url = new URL(path.replace(/^\//, ''), baseUrl.replace(/\/?$/, '/'))
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `idemp_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export class PassmintHttpClient {
  private apiKey: string
  private baseUrl: string
  private timeoutMs: number
  private maxRetries: number
  private fetchImpl: typeof fetch

  constructor(options: PassmintOptions) {
    if (!options.apiKey) {
      throw new PassmintError('apiKey is required')
    }
    if (!detectMode(options.apiKey)) {
      throw new PassmintError('apiKey must start with pmk_test_ or pmk_live_')
    }
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
    this.fetchImpl = options.fetch ?? globalThis.fetch
    if (!this.fetchImpl) {
      throw new PassmintError(
        'global fetch is not available; pass a fetch implementation in options.fetch',
      )
    }
  }

  get mode(): 'test' | 'live' {
    const mode = detectMode(this.apiKey)
    if (!mode) throw new PassmintError('apiKey mode could not be detected')
    return mode
  }

  async request<T>(req: InternalRequest): Promise<T> {
    const url = buildUrl(this.baseUrl, req.path, req.query)
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'User-Agent': `passmint-node/${VERSION}`,
    }
    if (req.body !== undefined) headers['Content-Type'] = 'application/json'
    if (req.idempotencyKey) headers['Idempotency-Key'] = req.idempotencyKey

    let attempt = 0
    let lastError: unknown
    while (attempt <= this.maxRetries) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
      try {
        const init: RequestInit = {
          method: req.method,
          headers,
          signal: controller.signal,
        }
        if (req.body !== undefined) init.body = JSON.stringify(req.body)
        const response = await this.fetchImpl(url, init)
        clearTimeout(timeout)

        const text = await response.text()
        const json = text ? (JSON.parse(text) as unknown) : null

        if (response.ok) {
          return json as T
        }

        const errorPayload = (json as { error?: ApiErrorPayload } | null)?.error ?? {
          type: 'api_error',
          message: response.statusText || 'Request failed',
        }

        if (response.status === 401 || response.status === 403) {
          throw new PassmintAuthError(errorPayload, response.status)
        }
        if (response.status === 429) {
          const retryAfter = Number(response.headers.get('retry-after') ?? 0)
          throw new PassmintRateLimitError(
            errorPayload,
            response.status,
            Number.isFinite(retryAfter) ? retryAfter : undefined,
          )
        }
        if (shouldRetry(response.status) && attempt < this.maxRetries) {
          attempt++
          await sleep(2 ** attempt * 250)
          continue
        }
        throw new PassmintAPIError(errorPayload, response.status)
      } catch (err) {
        clearTimeout(timeout)
        lastError = err
        if (err instanceof PassmintAPIError) throw err
        if (attempt < this.maxRetries) {
          attempt++
          await sleep(2 ** attempt * 250)
          continue
        }
        throw err instanceof Error
          ? new PassmintError(err.message)
          : new PassmintError('Network error')
      }
    }
    throw lastError ?? new PassmintError('Request failed')
  }
}

export { generateIdempotencyKey }
