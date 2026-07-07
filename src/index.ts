import { PassmintHttpClient, type PassmintOptions, detectMode } from './client'
import { EventsResource } from './resources/events'
import { MeResource } from './resources/me'
import { MetricsResource } from './resources/metrics'
import { PassesResource } from './resources/passes'
import { TemplatesResource } from './resources/templates'
import { WebhooksResource } from './webhooks'

export {
  PassmintError,
  PassmintAPIError,
  PassmintAuthError,
  PassmintRateLimitError,
} from './errors'
export type { ApiErrorPayload } from './errors'
export { PASSMINT_EVENT_TYPES } from './types'
export type {
  Account,
  AppleStyle,
  BackfillParams,
  BackfillResult,
  BarcodeFormat,
  CreatePassParams,
  CreateTemplateParams,
  CreateWebhookParams,
  EventPass,
  EventSource,
  FunnelGroupBy,
  FunnelParams,
  FunnelResponse,
  FunnelSummary,
  ListEventsParams,
  ListPassesParams,
  ListResponse,
  MinimizedHolder,
  Pass,
  PassEvent,
  PassmintEvent,
  PassmintEventType,
  PassmintMode,
  PassPlatformStatus,
  PlatformDeliveryStatus,
  RequestOptions,
  Template,
  TemplateDesign,
  TemplateField,
  TemplateType,
  UpdatePassParams,
  UpdateTemplateParams,
  UpdateWebhookParams,
  WalletPlatform,
  Webhook,
  WebhookDelivery,
  WebhookDeliveryStatus,
  WebhookEventSubscription,
} from './types'
export type { WebhookEvent } from './webhooks'
export type { PassmintOptions } from './client'

export class Passmint {
  readonly passes: PassesResource
  readonly templates: TemplatesResource
  readonly webhooks: WebhooksResource
  readonly events: EventsResource
  readonly metrics: MetricsResource
  readonly me: MeResource
  readonly mode: 'test' | 'live'

  constructor(options: PassmintOptions) {
    const http = new PassmintHttpClient(options)
    this.passes = new PassesResource(http)
    this.templates = new TemplatesResource(http)
    this.webhooks = new WebhooksResource(http)
    this.events = new EventsResource(http)
    this.metrics = new MetricsResource(http)
    this.me = new MeResource(http)
    this.mode = http.mode
  }
}

export { detectMode }
export { VERSION } from './version'
