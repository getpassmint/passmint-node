import { describe, expectTypeOf, it } from 'vitest'
import type { PassesResource } from '../src/resources/passes'
import type { TemplatesResource } from '../src/resources/templates'
import type {
  CreatePassParams,
  Pass,
  PassEvent,
  PassPlatformStatus,
  PlatformDeliveryStatus,
  Template,
  TemplateImage,
  TemplateImageSlot,
  UpdatePassParams,
  VariantImageSlot,
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

describe('image variants', () => {
  it('surfaces variants on passes, templates and params', () => {
    expectTypeOf<Pass['image_variant']>().toEqualTypeOf<string | null>()
    expectTypeOf<Template['image_variants']>().toEqualTypeOf<string[]>()
    expectTypeOf<CreatePassParams['imageVariant']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UpdatePassParams['imageVariant']>().toEqualTypeOf<string | null | undefined>()
  })

  it('types the image slots and responses', () => {
    expectTypeOf<VariantImageSlot>().toExtend<TemplateImageSlot>()
    expectTypeOf<TemplateImage['variant']>().toEqualTypeOf<string | null>()
    expectTypeOf<Awaited<ReturnType<TemplatesResource['deleteImage']>>>().toEqualTypeOf<
      TemplateImage & { deleted: true }
    >()
  })

  it('only allows a variant on variant-able slots', () => {
    const templates = {} as TemplatesResource
    const bytes = new Uint8Array()
    // Type-level only; never executed.
    void (() => {
      templates.uploadImage('tmpl_1', 'strip', bytes, { variant: '1' })
      templates.uploadImage('tmpl_1', 'logo', bytes.buffer)
      // @ts-expect-error logo has no variants
      templates.uploadImage('tmpl_1', 'logo', bytes, { variant: '1' })
      templates.deleteImage('tmpl_1', 'background', { variant: 'gold' })
      // @ts-expect-error icon has no variants
      templates.deleteImage('tmpl_1', 'icon', { variant: 'gold' })
    })
  })
})
