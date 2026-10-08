import type { PassmintEventType } from './generated/event-types'
import type { components } from './generated/openapi'

export { PASSMINT_EVENT_TYPES } from './generated/event-types'
export type { PassmintEventType } from './generated/event-types'

type Schemas = components['schemas']

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
  /**
   * Apple Wallet change message: a format string shown as a lock-screen
   * notification when this field's value changes on a pass update. Must
   * contain `%@`, which is replaced with the new value (e.g.
   * `"You now have %@ stamps"`). Without it, Apple updates the pass silently.
   */
  changeMessage?: string
}

/** A place a pass is relevant near, derived from the spec's template design input. */
export type TemplateLocation = NonNullable<
  NonNullable<Schemas['CreateTemplateBody']['design']>['locations']
>[number]

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
  /** Issuer name shown on the pass (Google Wallet issuer name). `null` clears it. */
  issuerName?: string | null
  /** Up to 10 places that surface the pass on the lock screen. `null` clears them. */
  locations?: TemplateLocation[] | null
  /** ISO 8601 date the pass becomes relevant (lock-screen surfacing). */
  relevantDate?: string | null
}

/**
 * `type`, `apple_style` and `design` keep the hand-written, narrower types
 * (the API documents them as plain strings / a looser design object).
 */
export type Template = Omit<Schemas['Template'], 'type' | 'apple_style' | 'design'> & {
  type: TemplateType
  apple_style: AppleStyle
  design: TemplateDesign
  /**
   * Names of the image variants uploaded to this template (see
   * `templates.uploadImage`). Passes opt into one via `image_variant`.
   */
  image_variants: string[]
}

/** Every template image slot that accepts a base (non-variant) image. */
export type TemplateImageSlot = 'icon' | 'logo' | 'strip' | 'thumbnail' | 'background' | 'footer'

/** The subset of image slots that can also hold named variants. */
export type VariantImageSlot = 'strip' | 'thumbnail' | 'background'

/** Returned by `templates.uploadImage` (and, with `deleted: true`, `templates.deleteImage`). */
export type TemplateImage = Omit<Schemas['TemplateImage'], 'slot' | 'variant'> & {
  slot: TemplateImageSlot
  /** The variant name, or `null` for the slot's base image. */
  variant: string | null
}

export interface TemplateImageOptions {
  /**
   * Named variant to target instead of the base image. Only valid on
   * `VariantImageSlot`s. Must match `^[a-z0-9][a-z0-9_-]{0,31}$`.
   */
  variant?: string
}

/** Image slots a single pass can override (see `passes.uploadImage`). Same set as `VariantImageSlot`. */
export type PassImageSlot = VariantImageSlot

/**
 * Which layer a pass's resolved image comes from: a per-pass override, the
 * pass's template image variant, or the template's base image.
 */
export type PassImageSource = 'pass' | 'variant' | 'template'

/** The resolved image for each slot the pass renders with. Slots without an image are absent. */
export type PassImages = Partial<Record<TemplateImageSlot, { source: PassImageSource }>>

export type Pass = Omit<Schemas['Pass'], 'mode' | 'field_values' | 'platform_status' | 'images'> & {
  mode: PassmintMode
  /**
   * Field values by field key. Normally strings, but any JSON value you sent is
   * stored and returned as-is. Typed `Record<string, string>` for 0.4.0
   * compatibility.
   */
  field_values: Record<string, string>
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
  /**
   * The template image variant this pass renders with, or `null` for the
   * template's base images.
   */
  image_variant: string | null
  /** Per-platform delivery outcome. */
  platform_status: PassPlatformStatus | null
  /** Where each of the pass's images resolves from (pass → variant → template). */
  images: PassImages
}

/** The internal pass-event vocabulary. Intentionally distinct from the canonical `pass.*` event types. */
export type PassEventType =
  | 'created'
  | 'url_viewed'
  | 'downloaded'
  | 'installed'
  | 'updated'
  | 'update_not_delivered'
  | 'update_delivered'
  | 'update_failed'
  | 'removed'
  | 'voided'
  | 'google_save_clicked'
  | 'redeemed'
  | 'download_link_created'

export type PassEvent = Omit<Schemas['PassEvent'], 'type'> & {
  /**
   * Internal event vocabulary — intentionally distinct from the canonical
   * `pass.*` types that GET /v1/events and webhooks emit.
   */
  type: PassEventType
}

export interface ListResponse<T> {
  object: 'list'
  data: T[]
  has_more: boolean
}

export type EventSource = Schemas['Event']['source']

/**
 * PII-minimized holder block carried on event payloads. The raw holder
 * email/name are only retrievable via GET /v1/passes/:id.
 */
export type MinimizedHolder = Schemas['EventPassSnapshot']['holder']

/** The pass snapshot embedded in a canonical event's `data.object`. */
export type EventPass = Schemas['EventPassSnapshot'] & {
  /** Passmint-hosted pass page; platform-detects and is always present. */
  url: string
  /** Direct Apple `.pkpass` download; `null` when Apple wasn't delivered. Falls back to `url`. */
  download_url: string | null
  /** Google Wallet "Save" link; `null` when Google wasn't delivered. Falls back to `url`. */
  google_wallet_url: string | null
  /** The template image variant the pass renders with, or `null` for the base images. */
  image_variant: string | null
}

/**
 * Canonical event envelope — the body of every webhook delivery and each
 * item returned by GET /v1/events.
 */
export type PassmintEvent = Omit<Schemas['Event'], 'previous_attributes'> & {
  /** Always `null` today; typed as in 0.4.0 so existing fixtures keep compiling. */
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
  /**
   * Render the pass with one of the template's image variants (see
   * `Template.image_variants`). Omit to use the base images.
   */
  imageVariant?: string
}

export interface CreateTemplateParams {
  name: string
  type: TemplateType
  appleStyle: AppleStyle
  design: TemplateDesign
  starterTemplateId?: string
  /** Defaults to ["apple"] on the server. */
  platforms?: WalletPlatform[]
  /** How many times a pass may be redeemed. Defaults to reusable on the server. */
  redemptionPolicy?: RedemptionPolicy
  /** Only issue passes whose holders arrive through a download link. */
  requireDownloadLink?: boolean
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
  redemptionPolicy?: RedemptionPolicy
  requireDownloadLink?: boolean
}

export interface UpdatePassParams {
  fieldValues?: Record<string, string>
  metadata?: Record<string, unknown> | null
  /**
   * Switch the pass to a template image variant. Pass `null` to clear back to
   * the base images; omit to leave it unchanged.
   */
  imageVariant?: string | null
}

export interface ListPassesParams {
  templateId?: string
  holderEmail?: string
  limit?: number
  /** Pass id to paginate after (keyset cursor). */
  startingAfter?: string
}

export interface ListTemplatesParams {
  /** Include archived templates. Defaults to active only. */
  includeArchived?: boolean
  limit?: number
  /** Template id to paginate after (keyset cursor). */
  startingAfter?: string
}

export interface ListPassEventsParams {
  limit?: number
  /** Pass event id to paginate after (keyset cursor). */
  startingAfter?: string
}

export interface ListRedemptionsParams {
  limit?: number
}

export interface ListWebhooksParams {
  limit?: number
  /** Webhook id to paginate after (keyset cursor). */
  startingAfter?: string
}

export interface ListDeliveriesParams {
  limit?: number
  /** Delivery id to paginate after (keyset cursor). */
  startingAfter?: string
}

export interface CreateDownloadLinkParams {
  /** Link lifetime in seconds. The server picks a default when omitted. */
  expiresIn?: number
}

export interface RequestOptions {
  idempotencyKey?: string
}

/** A canonical event type, or "*" to subscribe to everything. */
export type WebhookEventSubscription = PassmintEventType | '*'

export type Webhook = Omit<Schemas['Webhook'], 'events'> & {
  events: WebhookEventSubscription[]
  /** Only returned on create. Store it — it is not retrievable via the API afterwards. */
  secret?: string
}

export type WebhookDeliveryStatus = 'pending' | 'in_progress' | 'delivered' | 'failed' | 'dead'

export type WebhookDelivery = Omit<Schemas['WebhookDelivery'], 'event_type' | 'status'> & {
  event_type: PassmintEventType
  status: WebhookDeliveryStatus
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

export type BackfillResult = Schemas['WebhookBackfill']

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

export type FunnelSummary = Schemas['FunnelSummary']

export type FunnelResponse = Omit<Schemas['Funnel'], 'confidence'> & {
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

export type Account = Omit<Schemas['Account'], 'organization_slug'> & {
  /**
   * Can be `null` at runtime; typed `string` for 0.4.0 compatibility. Check
   * before relying on it.
   */
  organization_slug: string
}

/** Delivery counts for a pass update, per wallet. */
export type PassDelivery = Schemas['PassDelivery']

/** Returned by `passes.createDownloadLink`. */
export type DownloadLink = Schemas['PassDownloadLink']

/** One redemption (scan) attempt against a pass. */
export type Redemption = Schemas['Redemption']

/** A template's redemption rule. */
export type RedemptionPolicy = Schemas['RedemptionPolicy']
