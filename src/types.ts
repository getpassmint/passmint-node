export type PassmintMode = 'test' | 'live'

export type WalletPlatform = 'apple' | 'google'

export type PlatformDeliveryStatus = 'delivered' | 'skipped_no_credential' | 'failed'

/** Per-platform delivery outcome, e.g. `{ apple: "delivered", google: "failed" }`. */
export type PassPlatformStatus = Partial<Record<WalletPlatform, PlatformDeliveryStatus>>

export type TemplateType = 'event' | 'membership' | 'coupon' | 'loyalty' | 'generic'

export type AppleStyle = 'eventTicket' | 'generic' | 'storeCard' | 'coupon' | 'boardingPass'

export type BarcodeFormat =
  | 'PKBarcodeFormatQR'
  | 'PKBarcodeFormatPDF417'
  | 'PKBarcodeFormatAztec'
  | 'PKBarcodeFormatCode128'

export interface TemplateField {
  key: string
  label: string
  defaultValue: string | null
  textAlignment: 'left' | 'center' | 'right' | 'natural'
  required: boolean
}

export interface TemplateDesign {
  description: string
  logoText: string | null
  foregroundColor: string
  backgroundColor: string
  labelColor: string
  logoImageKey: string | null
  iconImageKey: string | null
  stripImageKey: string | null
  thumbnailImageKey: string | null
  /**
   * Small fields shown top-right of the pass, next to the logo (Apple slot,
   * max 3). Optional — omit for templates that don't use them.
   */
  headerFields?: TemplateField[]
  primaryFields: TemplateField[]
  secondaryFields: TemplateField[]
  auxiliaryFields: TemplateField[]
  backFields: TemplateField[]
  barcodeFormat: BarcodeFormat
  barcodeMessageTemplate: string
}

export interface Template {
  id: string
  object: 'template'
  name: string
  type: TemplateType
  apple_style: AppleStyle
  starter_template_id: string | null
  design: TemplateDesign
  archived: boolean
  platforms: WalletPlatform[]
  certificate_set_id: string | null
  google_issuer_id: string | null
  created_at: string
  updated_at: string
}

export interface Pass {
  id: string
  object: 'pass'
  short_id: string
  template_id: string
  certificate_set_id: string | null
  serial_number: string
  mode: PassmintMode
  holder_email: string | null
  holder_name: string | null
  field_values: Record<string, string>
  voided: boolean
  voided_at: string | null
  metadata: Record<string, unknown> | null
  created_via_api: boolean
  platforms: WalletPlatform[]
  platform_status: PassPlatformStatus | null
  /** Passmint-hosted pass page; platform-detects and is always present. Use as your fallback. */
  url: string
  /**
   * Direct download of the Apple `.pkpass`. Populated when Apple issuance
   * succeeded; `null` when Apple wasn't delivered for this pass. Fall back to
   * `url`.
   */
  download_url: string | null
  /**
   * Google Wallet "Save" link. Populated when Google issuance succeeded; `null`
   * when Google wasn't delivered (e.g. no Google issuer configured). Fall back
   * to `url`.
   */
  google_wallet_url: string | null
  created_at: string
}

export interface PassEvent {
  id: string
  object: 'pass_event'
  pass_id: string
  /**
   * Internal event vocabulary — intentionally distinct from the canonical
   * `pass.*` types that GET /v1/events and webhooks emit.
   */
  type:
    | 'created'
    | 'url_viewed'
    | 'downloaded'
    | 'installed'
    | 'updated'
    | 'update_delivered'
    | 'removed'
    | 'voided'
    | 'google_save_clicked'
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface ListResponse<T> {
  object: 'list'
  data: T[]
  has_more: boolean
}

/**
 * The Passmint Spec v1 — canonical lifecycle event types delivered to
 * webhooks and returned by GET /v1/events. Platform detail lives in `source`.
 */
export const PASSMINT_EVENT_TYPES = [
  'pass.issued',
  'pass.add_intent',
  'pass.added_to_wallet',
  'pass.update_pushed',
  'pass.update_delivered',
  'pass.removed',
  'pass.voided',
] as const

export type PassmintEventType = (typeof PASSMINT_EVENT_TYPES)[number]

export interface EventSource {
  platform: 'apple' | 'google' | null
  unit: 'device' | 'object' | null
  confidence: 'exact' | 'best_effort' | 'unconfirmed'
}

/**
 * PII-minimized holder block carried on event payloads. The raw holder
 * email/name are only retrievable via GET /v1/passes/:id.
 */
export interface MinimizedHolder {
  email_hash: string | null
  name_present: boolean
}

/** The pass snapshot embedded in a canonical event's `data.object`. */
export interface EventPass {
  id: string
  short_id: string
  template_id: string
  organization_id: string
  serial_number: string
  holder: MinimizedHolder
  voided: boolean
  /** Passmint-hosted pass page; platform-detects and is always present. */
  url: string
  /** Direct Apple `.pkpass` download; `null` when Apple wasn't delivered. Falls back to `url`. */
  download_url: string | null
  /** Google Wallet "Save" link; `null` when Google wasn't delivered. Falls back to `url`. */
  google_wallet_url: string | null
}

/**
 * Canonical event envelope — the body of every webhook delivery and each
 * item returned by GET /v1/events.
 */
export interface PassmintEvent {
  id: string
  object: 'event'
  type: PassmintEventType
  api_version: string
  created_at: string
  idempotency_key: string
  livemode: boolean
  data: { object: { pass: EventPass } }
  source: EventSource
  previous_attributes: Record<string, unknown> | null
}

export interface CreatePassParams {
  templateId: string
  /**
   * Per-pass certificate override. Pass `null` to explicitly use the dev
   * cert; omit to inherit the template's default.
   */
  certificateSetId?: string | null
  holderEmail?: string
  holderName?: string
  fieldValues?: Record<string, string>
  metadata?: Record<string, unknown>
  /** Override the template's wallet platforms for this pass. */
  platforms?: WalletPlatform[]
}

export interface CreateTemplateParams {
  name: string
  type: TemplateType
  appleStyle: AppleStyle
  design: TemplateDesign
  starterTemplateId?: string
  /** Defaults to ["apple"] on the server. */
  platforms?: WalletPlatform[]
}

export interface UpdateTemplateParams {
  name?: string
  design?: TemplateDesign
  archived?: boolean
  platforms?: WalletPlatform[]
  /** Pass `null` to clear back to the dev cert. */
  certificateSetId?: string | null
  /** Pass `null` to detach the Google issuer. */
  googleIssuerId?: string | null
}

export interface UpdatePassParams {
  fieldValues?: Record<string, string>
  metadata?: Record<string, unknown> | null
}

export interface ListPassesParams {
  templateId?: string
  holderEmail?: string
  limit?: number
}

export interface RequestOptions {
  idempotencyKey?: string
}

/** A canonical event type, or "*" to subscribe to everything. */
export type WebhookEventSubscription = PassmintEventType | '*'

export interface Webhook {
  id: string
  object: 'webhook'
  url: string
  events: WebhookEventSubscription[]
  description: string | null
  enabled: boolean
  /** Only returned on create. Store it — it is not retrievable via the API afterwards. */
  secret?: string
  created_at: string
}

export type WebhookDeliveryStatus = 'pending' | 'in_progress' | 'delivered' | 'failed' | 'dead'

export interface WebhookDelivery {
  id: string
  object: 'webhook_delivery'
  webhook_id: string
  event_type: PassmintEventType
  status: WebhookDeliveryStatus
  attempts: number
  last_attempt_at: string | null
  next_attempt_at: string | null
  response_status: number | null
  response_body: string | null
  created_at: string
}

export interface CreateWebhookParams {
  url: string
  events: WebhookEventSubscription[]
  description?: string | null
  enabled?: boolean
}

export interface UpdateWebhookParams {
  url?: string
  events?: WebhookEventSubscription[]
  description?: string | null
  enabled?: boolean
}

export interface BackfillParams {
  since: string
  /** Defaults to now on the server. */
  until?: string
}

export interface BackfillResult {
  object: 'backfill'
  enqueued: number
  capped: boolean
  window: { since: string; until: string }
}

export interface ListEventsParams {
  type?: PassmintEventType
  passId?: string
  templateId?: string
  since?: string
  until?: string
  /** Event id to paginate after (keyset cursor). */
  startingAfter?: string
  /** Max 200, defaults to 100 on the server. */
  limit?: number
}

export type FunnelGroupBy = 'total' | 'template' | 'platform' | 'date' | 'mode'

export interface FunnelSummary {
  key: string
  issued: number
  add_intent: number
  added: number
  active: number
  removed: number
  update_pushed: number
  update_delivered: number
  install_rate: number | null
  removal_rate: number | null
  update_delivery_rate: number | null
}

export interface FunnelResponse {
  object: 'funnel'
  group_by: FunnelGroupBy
  data: FunnelSummary[]
  /** Confidence caveats per metric (e.g. removals under-report). */
  confidence: Record<string, string>
}

export interface FunnelParams {
  templateId?: string
  platform?: WalletPlatform
  since?: string
  until?: string
  /** Defaults to "total" on the server. */
  groupBy?: FunnelGroupBy
}

export interface Account {
  object: 'account'
  organization_id: string
  organization_name: string
  organization_slug: string
  mode: PassmintMode
}
