import { describe, expectTypeOf, it } from 'vitest'
import type { PassesResource } from '../src/resources/passes'
import type {
  Pass,
  PassEvent,
  PassPlatformStatus,
  PlatformDeliveryStatus,
  Template,
  WalletPlatform,
} from '../src/types'

describe('Pass', () => {
  it('carries the platform delivery fields the API returns today', () => {
    expectTypeOf<Pass['certificate_set_id']>().toEqualTypeOf<string | null>()
    expectTypeOf<Pass['platforms']>().toEqualTypeOf<WalletPlatform[]>()
    expectTypeOf<Pass['platform_status']>().toEqualTypeOf<PassPlatformStatus | null>()
    expectTypeOf<Pass['download_url']>().toEqualTypeOf<string | null>()
    expectTypeOf<Pass['google_wallet_url']>().toEqualTypeOf<string | null>()
  })

  it('create returns the pass plus issuance warnings', () => {
    expectTypeOf<Awaited<ReturnType<PassesResource['create']>>>().toEqualTypeOf<
      Pass & { warnings: string[] }
    >()
  })
})

describe('Template', () => {
  it('carries platforms and credential references', () => {
    expectTypeOf<Template['platforms']>().toEqualTypeOf<WalletPlatform[]>()
    expectTypeOf<Template['certificate_set_id']>().toEqualTypeOf<string | null>()
    expectTypeOf<Template['google_issuer_id']>().toEqualTypeOf<string | null>()
  })
})

describe('PassEvent', () => {
  it('includes the full internal event vocabulary', () => {
    expectTypeOf<'update_delivered'>().toExtend<PassEvent['type']>()
    expectTypeOf<'google_save_clicked'>().toExtend<PassEvent['type']>()
  })
})

describe('platform primitives', () => {
  it('match the platform enums', () => {
    expectTypeOf<WalletPlatform>().toEqualTypeOf<'apple' | 'google'>()
    expectTypeOf<PlatformDeliveryStatus>().toEqualTypeOf<
      'delivered' | 'skipped_no_credential' | 'failed'
    >()
  })
})
