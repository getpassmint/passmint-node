import { describe, expect, it } from 'vitest'
import * as sdk from '../src/index'

// Every runtime export of @passmint/node 0.4.0.
const RUNTIME_EXPORTS_0_4_0 = [
  'Passmint',
  'PassmintError',
  'PassmintAPIError',
  'PassmintAuthError',
  'PassmintRateLimitError',
  'PASSMINT_EVENT_TYPES',
  'detectMode',
  'VERSION',
]

describe('0.4.0 runtime exports', () => {
  it.each(RUNTIME_EXPORTS_0_4_0)('still exports %s', (name) => {
    expect(sdk).toHaveProperty(name)
  })

  it('keeps PASSMINT_EVENT_TYPES a runtime array containing every 0.4.0 type', () => {
    expect(Array.isArray(sdk.PASSMINT_EVENT_TYPES)).toBe(true)
    for (const t of [
      'pass.issued',
      'pass.add_intent',
      'pass.added_to_wallet',
      'pass.update_pushed',
      'pass.update_delivered',
      'pass.removed',
      'pass.voided',
    ]) {
      expect(sdk.PASSMINT_EVENT_TYPES).toContain(t)
    }
  })
})
