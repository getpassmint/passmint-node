import { describe, expect, it } from 'vitest'
import {
  PassmintAPIError,
  PassmintAuthError,
  PassmintError,
  PassmintRateLimitError,
} from '../src/errors'

describe('PassmintError', () => {
  it('sets name and message', () => {
    const err = new PassmintError('boom')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('PassmintError')
    expect(err.message).toBe('boom')
  })
})

describe('PassmintAPIError', () => {
  it('carries status, type, code, param from payload', () => {
    const err = new PassmintAPIError(
      { type: 'invalid_request', message: 'bad', code: 'missing_field', param: 'name' },
      422,
    )
    expect(err).toBeInstanceOf(PassmintError)
    expect(err.name).toBe('PassmintAPIError')
    expect(err.status).toBe(422)
    expect(err.type).toBe('invalid_request')
    expect(err.code).toBe('missing_field')
    expect(err.param).toBe('name')
    expect(err.message).toBe('bad')
  })

  it('omits undefined code/param under exactOptionalPropertyTypes', () => {
    const err = new PassmintAPIError({ type: 'api_error', message: 'x' }, 500)
    expect('code' in err && err.code !== undefined).toBe(false)
    expect('param' in err && err.param !== undefined).toBe(false)
  })
})

describe('PassmintAuthError', () => {
  it('is an APIError subclass', () => {
    const err = new PassmintAuthError({ type: 'auth_error', message: 'nope' }, 401)
    expect(err).toBeInstanceOf(PassmintAPIError)
    expect(err.name).toBe('PassmintAuthError')
    expect(err.status).toBe(401)
  })
})

describe('PassmintRateLimitError', () => {
  it('carries retryAfterSeconds when provided', () => {
    const err = new PassmintRateLimitError({ type: 'rate_limited', message: 'slow down' }, 429, 7)
    expect(err).toBeInstanceOf(PassmintAPIError)
    expect(err.retryAfterSeconds).toBe(7)
  })

  it('omits retryAfterSeconds when not provided', () => {
    const err = new PassmintRateLimitError({ type: 'rate_limited', message: 'slow down' }, 429)
    expect(err.retryAfterSeconds).toBeUndefined()
  })
})
