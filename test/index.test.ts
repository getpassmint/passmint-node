import { describe, expect, it } from 'vitest'
import { PASSMINT_EVENT_TYPES, Passmint } from '../src/index'

describe('Passmint client', () => {
  it('exposes every API resource', () => {
    const passmint = new Passmint({ apiKey: 'pmk_test_abc' })
    expect(passmint.passes).toBeDefined()
    expect(passmint.templates).toBeDefined()
    expect(passmint.webhooks).toBeDefined()
    expect(passmint.events).toBeDefined()
    expect(passmint.metrics).toBeDefined()
    expect(passmint.me).toBeDefined()
    expect(passmint.mode).toBe('test')
  })

  it('re-exports the canonical event type list', () => {
    expect(PASSMINT_EVENT_TYPES).toHaveLength(7)
  })
})
