import { describe, expectTypeOf, it } from 'vitest'
import type { PassesResource } from '../src/resources/passes'
import type { TemplatesResource } from '../src/resources/templates'
import type {
  CreatePassParams,
  DownloadLink,
  EventPass,
  ListResponse,
  Pass,
  PassDelivery,
  PassEvent,
  PassImageSlot,
  PassImageSource,
  PassImages,
  PassPlatformStatus,
  PassmintEvent,
  PlatformDeliveryStatus,
  Redemption,
  RedemptionPolicy,
  Template,
  TemplateDesign,
  TemplateField,
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

describe('TemplateField', () => {
  it('accepts an optional Apple change message', () => {
    expectTypeOf<TemplateField['changeMessage']>().toEqualTypeOf<string | undefined>()
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

describe('per-pass images', () => {
  it('types the pass image slots, sources and resolved images', () => {
    expectTypeOf<PassImageSlot>().toEqualTypeOf<VariantImageSlot>()
    expectTypeOf<PassImageSource>().toEqualTypeOf<'pass' | 'variant' | 'template'>()
    expectTypeOf<Pass['images']>().toEqualTypeOf<PassImages>()
    expectTypeOf<PassImages['thumbnail']>().toEqualTypeOf<{ source: PassImageSource } | undefined>()
    expectTypeOf<keyof PassImages>().toEqualTypeOf<TemplateImageSlot>()
    expectTypeOf<EventPass['image_variant']>().toEqualTypeOf<string | null>()
  })

  it('returns the updated pass from uploadImage and deleteImage', () => {
    expectTypeOf<Awaited<ReturnType<PassesResource['uploadImage']>>>().toEqualTypeOf<Pass>()
    expectTypeOf<Awaited<ReturnType<PassesResource['deleteImage']>>>().toEqualTypeOf<Pass>()
  })

  it('only allows strip, thumbnail and background', () => {
    const passes = {} as PassesResource
    const bytes = new Uint8Array()
    // Type-level only; never executed.
    void (() => {
      passes.uploadImage('pass_1', 'thumbnail', bytes)
      passes.uploadImage('pass_1', 'strip', bytes.buffer)
      passes.deleteImage('pass_1', 'background')
      // @ts-expect-error logo can't be overridden per pass
      passes.uploadImage('pass_1', 'logo', bytes)
      // @ts-expect-error icon can't be overridden per pass
      passes.deleteImage('pass_1', 'icon')
      // @ts-expect-error no variant option on per-pass images
      passes.uploadImage('pass_1', 'strip', bytes, { variant: '1' })
    })
  })
})

describe('Phase 4 surface types', () => {
  it('passes.update and passes.void carry delivery and warnings', () => {
    expectTypeOf<Awaited<ReturnType<PassesResource['update']>>>().toEqualTypeOf<
      Pass & { delivery: PassDelivery; warnings: string[] }
    >()
    expectTypeOf<Awaited<ReturnType<PassesResource['void']>>>().toEqualTypeOf<
      Pass & { warnings: string[] }
    >()
  })

  it('TemplateDesign gains issuerName, locations and relevantDate', () => {
    expectTypeOf<TemplateDesign['issuerName']>().toEqualTypeOf<string | null | undefined>()
    expectTypeOf<TemplateDesign['relevantDate']>().toEqualTypeOf<string | null | undefined>()
  })

  it('templates expose redemption_policy, require_download_link and warnings', () => {
    expectTypeOf<Template['require_download_link']>().toEqualTypeOf<boolean>()
    expectTypeOf<Template['redemption_policy']>().toEqualTypeOf<RedemptionPolicy>()
    expectTypeOf<Template['warnings']>().toEqualTypeOf<string[] | undefined>()
  })

  it('createDownloadLink and redemptions resolve to the generated shapes', () => {
    expectTypeOf<
      Awaited<ReturnType<PassesResource['createDownloadLink']>>
    >().toEqualTypeOf<DownloadLink>()
    expectTypeOf<Awaited<ReturnType<PassesResource['redemptions']>>>().toEqualTypeOf<
      ListResponse<Redemption>
    >()
  })

  it('listAll returns an async iterator of the item type', () => {
    expectTypeOf<ReturnType<PassesResource['listAll']>>().toEqualTypeOf<
      AsyncIterableIterator<Pass>
    >()
    expectTypeOf<ReturnType<TemplatesResource['listAll']>>().toEqualTypeOf<
      AsyncIterableIterator<Template>
    >()
  })

  it('pass.update_failed carries a delivery_failure payload', () => {
    type Failed = Extract<PassmintEvent, { type: 'pass.update_failed' }>
    expectTypeOf<Failed['data']['object']>().toHaveProperty('delivery_failure')
  })
})
