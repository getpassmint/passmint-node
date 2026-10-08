import { describe, expectTypeOf, it } from 'vitest'
import { PASSMINT_EVENT_TYPES } from '../src/index'
import type * as Now from '../src/index'
import type * as V04 from './fixtures/types-0.4.0'

// Every type exported from the package entry at 0.4.0 must still exist.
// Response types: the new type is readable as the 0.4.0 type (new -> old).
// Params and unions: anything valid in 0.4.0 is still valid (old -> new).

describe('0.4.0 -> now: responses stay readable as the 0.4.0 shape', () => {
  it('Account', () => expectTypeOf<Now.Account>().toMatchTypeOf<V04.Account>())
  it('EventPass', () => expectTypeOf<Now.EventPass>().toMatchTypeOf<V04.EventPass>())
  it('EventSource', () => expectTypeOf<Now.EventSource>().toMatchTypeOf<V04.EventSource>())
  it('FunnelResponse', () => expectTypeOf<Now.FunnelResponse>().toMatchTypeOf<V04.FunnelResponse>())
  it('FunnelSummary', () => expectTypeOf<Now.FunnelSummary>().toMatchTypeOf<V04.FunnelSummary>())
  it('MinimizedHolder', () =>
    expectTypeOf<Now.MinimizedHolder>().toMatchTypeOf<V04.MinimizedHolder>())
  it('Pass', () => expectTypeOf<Now.Pass>().toMatchTypeOf<V04.Pass>())
  it('Template', () => expectTypeOf<Now.Template>().toMatchTypeOf<V04.Template>())
  it('TemplateImage', () => expectTypeOf<Now.TemplateImage>().toMatchTypeOf<V04.TemplateImage>())
  it('BackfillResult', () => expectTypeOf<Now.BackfillResult>().toMatchTypeOf<V04.BackfillResult>())

  it('Webhook (events now include the new event types)', () => {
    expectTypeOf<Now.Webhook>().toMatchTypeOf<Omit<V04.Webhook, 'events'>>()
    expectTypeOf<V04.Webhook>().toMatchTypeOf<Now.Webhook>()
  })

  it('WebhookDelivery (event_type now includes the new event types)', () => {
    expectTypeOf<Now.WebhookDelivery>().toMatchTypeOf<Omit<V04.WebhookDelivery, 'event_type'>>()
    expectTypeOf<V04.WebhookDelivery>().toMatchTypeOf<Now.WebhookDelivery>()
  })

  it('PassEvent (type widened with the real event vocabulary)', () => {
    expectTypeOf<Now.PassEvent>().toMatchTypeOf<Omit<V04.PassEvent, 'type'>>()
    expectTypeOf<V04.PassEvent['type']>().toMatchTypeOf<Now.PassEvent['type']>()
  })

  it('PassmintEvent (type is now the union of all event types)', () => {
    expectTypeOf<Now.PassmintEvent>().toMatchTypeOf<Omit<V04.PassmintEvent, 'type'>>()
    expectTypeOf<V04.PassmintEvent>().toMatchTypeOf<Now.PassmintEvent>()
    expectTypeOf<V04.PassmintEvent['type']>().toMatchTypeOf<Now.PassmintEvent['type']>()
  })

  it('ListResponse', () => {
    expectTypeOf<Now.ListResponse<number>>().toEqualTypeOf<V04.ListResponse<number>>()
  })
})

describe('0.4.0 -> now: params people already build still type-check', () => {
  it('BackfillParams', () => expectTypeOf<V04.BackfillParams>().toMatchTypeOf<Now.BackfillParams>())
  it('CreatePassParams', () =>
    expectTypeOf<V04.CreatePassParams>().toMatchTypeOf<Now.CreatePassParams>())
  it('CreateTemplateParams', () =>
    expectTypeOf<V04.CreateTemplateParams>().toMatchTypeOf<Now.CreateTemplateParams>())
  it('CreateWebhookParams', () =>
    expectTypeOf<V04.CreateWebhookParams>().toMatchTypeOf<Now.CreateWebhookParams>())
  it('FunnelParams', () => expectTypeOf<V04.FunnelParams>().toMatchTypeOf<Now.FunnelParams>())
  it('ListEventsParams', () =>
    expectTypeOf<V04.ListEventsParams>().toMatchTypeOf<Now.ListEventsParams>())
  it('ListPassesParams', () =>
    expectTypeOf<V04.ListPassesParams>().toMatchTypeOf<Now.ListPassesParams>())
  it('UpdatePassParams', () =>
    expectTypeOf<V04.UpdatePassParams>().toMatchTypeOf<Now.UpdatePassParams>())
  it('UpdateTemplateParams', () =>
    expectTypeOf<V04.UpdateTemplateParams>().toMatchTypeOf<Now.UpdateTemplateParams>())
  it('UpdateWebhookParams', () =>
    expectTypeOf<V04.UpdateWebhookParams>().toMatchTypeOf<Now.UpdateWebhookParams>())
  it('RequestOptions', () => expectTypeOf<V04.RequestOptions>().toMatchTypeOf<Now.RequestOptions>())
  it('TemplateImageOptions', () =>
    expectTypeOf<V04.TemplateImageOptions>().toMatchTypeOf<Now.TemplateImageOptions>())
})

describe('0.4.0 -> now: shared unions are unchanged', () => {
  it('AppleStyle', () => expectTypeOf<Now.AppleStyle>().toEqualTypeOf<V04.AppleStyle>())
  it('BarcodeFormat', () => expectTypeOf<Now.BarcodeFormat>().toEqualTypeOf<V04.BarcodeFormat>())
  it('FunnelGroupBy', () => expectTypeOf<Now.FunnelGroupBy>().toEqualTypeOf<V04.FunnelGroupBy>())
  it('PassImageSlot', () => expectTypeOf<Now.PassImageSlot>().toEqualTypeOf<V04.PassImageSlot>())
  it('PassImageSource', () =>
    expectTypeOf<Now.PassImageSource>().toEqualTypeOf<V04.PassImageSource>())
  it('PassImages', () => expectTypeOf<Now.PassImages>().toEqualTypeOf<V04.PassImages>())
  it('PassPlatformStatus', () =>
    expectTypeOf<Now.PassPlatformStatus>().toEqualTypeOf<V04.PassPlatformStatus>())
  it('PassmintMode', () => expectTypeOf<Now.PassmintMode>().toEqualTypeOf<V04.PassmintMode>())
  it('PlatformDeliveryStatus', () =>
    expectTypeOf<Now.PlatformDeliveryStatus>().toEqualTypeOf<V04.PlatformDeliveryStatus>())
  it('TemplateDesign', () => expectTypeOf<Now.TemplateDesign>().toEqualTypeOf<V04.TemplateDesign>())
  it('TemplateField', () => expectTypeOf<Now.TemplateField>().toEqualTypeOf<V04.TemplateField>())
  it('TemplateImageSlot', () =>
    expectTypeOf<Now.TemplateImageSlot>().toEqualTypeOf<V04.TemplateImageSlot>())
  it('TemplateType', () => expectTypeOf<Now.TemplateType>().toEqualTypeOf<V04.TemplateType>())
  it('VariantImageSlot', () =>
    expectTypeOf<Now.VariantImageSlot>().toEqualTypeOf<V04.VariantImageSlot>())
  it('WalletPlatform', () => expectTypeOf<Now.WalletPlatform>().toEqualTypeOf<V04.WalletPlatform>())
  it('WebhookDeliveryStatus', () =>
    expectTypeOf<Now.WebhookDeliveryStatus>().toEqualTypeOf<V04.WebhookDeliveryStatus>())
})

describe('event types', () => {
  it('still contain every 0.4.0 type, plus the new ones', () => {
    expectTypeOf<V04.PassmintEventType>().toMatchTypeOf<Now.PassmintEventType>()
    expectTypeOf<'pass.redeemed'>().toMatchTypeOf<Now.PassmintEventType>()
    expectTypeOf<'pass.update_failed'>().toMatchTypeOf<Now.PassmintEventType>()
    expectTypeOf<WebhookEventSub>().toMatchTypeOf<Now.WebhookEventSubscription>()
    expectTypeOf(PASSMINT_EVENT_TYPES).toMatchTypeOf<readonly string[]>()
    expectTypeOf(PASSMINT_EVENT_TYPES[0]).toMatchTypeOf<Now.PassmintEventType>()
  })
})

type WebhookEventSub = V04.WebhookEventSubscription
