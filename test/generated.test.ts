import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PASSMINT_EVENT_TYPES as GENERATED } from '../src/generated/event-types'

describe('generated code', () => {
  it('lists exactly the event types the committed spec publishes', () => {
    const spec = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8'))

    expect([...GENERATED].sort()).toEqual(Object.keys(spec.webhooks).sort())
  })
})
