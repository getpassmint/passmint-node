export type PassmintMode = 'test' | 'live'

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
  created_at: string
  updated_at: string
}

export interface Pass {
  id: string
  object: 'pass'
  short_id: string
  template_id: string
  serial_number: string
  mode: PassmintMode
  holder_email: string | null
  holder_name: string | null
  field_values: Record<string, string>
  voided: boolean
  voided_at: string | null
  metadata: Record<string, unknown> | null
  created_via_api: boolean
  url: string
  download_url: string
  created_at: string
}

export interface PassEvent {
  id: string
  object: 'pass_event'
  pass_id: string
  type: 'created' | 'url_viewed' | 'downloaded' | 'installed' | 'updated' | 'removed' | 'voided'
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface ListResponse<T> {
  object: 'list'
  data: T[]
  has_more: boolean
}

export interface CreatePassParams {
  templateId: string
  holderEmail?: string
  holderName?: string
  fieldValues?: Record<string, string>
  metadata?: Record<string, unknown>
}

export interface CreateTemplateParams {
  name: string
  type: TemplateType
  appleStyle: AppleStyle
  design: TemplateDesign
  starterTemplateId?: string
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
