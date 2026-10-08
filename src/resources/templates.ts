import { type PassmintHttpClient, generateIdempotencyKey } from '../client'
import { toBase64 } from '../encoding'
import { autoPaginate, withCursor } from '../pagination'
import type {
  CreateTemplateParams,
  ListResponse,
  ListTemplatesParams,
  RequestOptions,
  Template,
  TemplateImage,
  TemplateImageOptions,
  TemplateImageSlot,
  UpdateTemplateParams,
  VariantImageSlot,
} from '../types'

export class TemplatesResource {
  constructor(private readonly http: PassmintHttpClient) {}

  create(params: CreateTemplateParams, options: RequestOptions = {}): Promise<Template> {
    const body: Record<string, unknown> = {
      name: params.name,
      type: params.type,
      apple_style: params.appleStyle,
      design: params.design,
      starter_template_id: params.starterTemplateId,
    }
    if (params.platforms !== undefined) body.platforms = params.platforms
    if (params.redemptionPolicy !== undefined) body.redemption_policy = params.redemptionPolicy
    if (params.requireDownloadLink !== undefined)
      body.require_download_link = params.requireDownloadLink
    return this.http.request<Template>({
      method: 'POST',
      path: '/v1/templates',
      body,
      idempotencyKey: options.idempotencyKey ?? generateIdempotencyKey(),
    })
  }

  retrieve(id: string): Promise<Template> {
    return this.http.request<Template>({
      method: 'GET',
      path: `/v1/templates/${encodeURIComponent(id)}`,
    })
  }

  list(params: ListTemplatesParams = {}): Promise<ListResponse<Template>> {
    return this.http.request<ListResponse<Template>>({
      method: 'GET',
      path: '/v1/templates',
      query: {
        include_archived:
          params.includeArchived === undefined ? undefined : String(params.includeArchived),
        limit: params.limit,
        starting_after: params.startingAfter,
      },
    })
  }

  /** Iterate every matching template, fetching further pages as needed. */
  listAll(params: ListTemplatesParams = {}): AsyncIterableIterator<Template> {
    return autoPaginate((cursor) => this.list(withCursor(params, cursor)))
  }

  update(id: string, params: UpdateTemplateParams): Promise<Template> {
    const body: Record<string, unknown> = {}
    if (params.name !== undefined) body.name = params.name
    if (params.design !== undefined) body.design = params.design
    if (params.archived !== undefined) body.archived = params.archived
    if (params.platforms !== undefined) body.platforms = params.platforms
    // null is meaningful for both overrides (clear back to the default), so
    // only omit the keys when truly unset.
    if (params.certificateSetId !== undefined) body.certificate_set_id = params.certificateSetId
    if (params.googleIssuerId !== undefined) body.google_issuer_id = params.googleIssuerId
    if (params.redemptionPolicy !== undefined) body.redemption_policy = params.redemptionPolicy
    if (params.requireDownloadLink !== undefined)
      body.require_download_link = params.requireDownloadLink
    return this.http.request<Template>({
      method: 'PATCH',
      path: `/v1/templates/${encodeURIComponent(id)}`,
      body,
    })
  }

  archive(id: string): Promise<{ id: string; deleted: true }> {
    return this.http.request({
      method: 'DELETE',
      path: `/v1/templates/${encodeURIComponent(id)}`,
    })
  }

  /**
   * Upload a PNG or JPEG to a template image slot. With `options.variant`,
   * stores a named variant (strip / thumbnail / background only) that passes
   * can opt into via `imageVariant`. Re-uploading replaces the existing image.
   */
  uploadImage(
    templateId: string,
    slot: VariantImageSlot,
    data: Uint8Array | ArrayBuffer,
    options?: TemplateImageOptions,
  ): Promise<TemplateImage>
  uploadImage(
    templateId: string,
    slot: TemplateImageSlot,
    data: Uint8Array | ArrayBuffer,
  ): Promise<TemplateImage>
  uploadImage(
    templateId: string,
    slot: TemplateImageSlot,
    data: Uint8Array | ArrayBuffer,
    options: TemplateImageOptions = {},
  ): Promise<TemplateImage> {
    const body: Record<string, unknown> = { data: toBase64(data) }
    if (options.variant !== undefined) body.variant = options.variant
    return this.http.request<TemplateImage>({
      method: 'PUT',
      path: `/v1/templates/${encodeURIComponent(templateId)}/images/${encodeURIComponent(slot)}`,
      body,
    })
  }

  /** Remove a template image, or one named variant of it with `options.variant`. */
  deleteImage(
    templateId: string,
    slot: VariantImageSlot,
    options?: TemplateImageOptions,
  ): Promise<TemplateImage & { deleted: true }>
  deleteImage(
    templateId: string,
    slot: TemplateImageSlot,
  ): Promise<TemplateImage & { deleted: true }>
  deleteImage(
    templateId: string,
    slot: TemplateImageSlot,
    options: TemplateImageOptions = {},
  ): Promise<TemplateImage & { deleted: true }> {
    return this.http.request<TemplateImage & { deleted: true }>({
      method: 'DELETE',
      path: `/v1/templates/${encodeURIComponent(templateId)}/images/${encodeURIComponent(slot)}`,
      query: { variant: options.variant },
    })
  }
}
