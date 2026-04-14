export interface ApiErrorPayload {
  type: string
  code?: string
  message: string
  param?: string
}

export class PassmintError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PassmintError'
  }
}

export class PassmintAPIError extends PassmintError {
  status: number
  type: string
  code?: string
  param?: string

  constructor(payload: ApiErrorPayload, status: number) {
    super(payload.message)
    this.name = 'PassmintAPIError'
    this.status = status
    this.type = payload.type
    if (payload.code !== undefined) this.code = payload.code
    if (payload.param !== undefined) this.param = payload.param
  }
}

export class PassmintAuthError extends PassmintAPIError {
  constructor(payload: ApiErrorPayload, status: number) {
    super(payload, status)
    this.name = 'PassmintAuthError'
  }
}

export class PassmintRateLimitError extends PassmintAPIError {
  retryAfterSeconds?: number
  constructor(payload: ApiErrorPayload, status: number, retryAfterSeconds?: number) {
    super(payload, status)
    this.name = 'PassmintRateLimitError'
    if (retryAfterSeconds !== undefined) this.retryAfterSeconds = retryAfterSeconds
  }
}
