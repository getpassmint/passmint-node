import { PassmintHttpClient, type PassmintOptions, detectMode } from './client'
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
export type {
  AppleStyle,
  BarcodeFormat,
  CreatePassParams,
  CreateTemplateParams,
  ListPassesParams,
  ListResponse,
  Pass,
  PassEvent,
  PassmintMode,
  RequestOptions,
  Template,
  TemplateDesign,
  TemplateField,
  TemplateType,
  UpdatePassParams,
} from './types'
export type { WebhookEvent } from './webhooks'
export type { PassmintOptions } from './client'

export class Passmint {
  readonly passes: PassesResource
  readonly templates: TemplatesResource
  readonly webhooks: WebhooksResource
  readonly mode: 'test' | 'live'

  constructor(options: PassmintOptions) {
    const http = new PassmintHttpClient(options)
    this.passes = new PassesResource(http)
    this.templates = new TemplatesResource(http)
    this.webhooks = new WebhooksResource()
    this.mode = http.mode
  }
}

export { detectMode }
