import { type PassmintHttpClient, generateIdempotencyKey } from '../client'
import { toBase64 } from '../encoding'
import type {
  CreatePassParams,
  ListPassesParams,
  ListResponse,
  Pass,
  PassEvent,
  PassImageSlot,
  RequestOptions,
  UpdatePassParams,
} from '../types'

export class PassesResource {
  constructor(private readonly http: PassmintHttpClient) {}

  create(
    params: CreatePassParams,
    options: RequestOptions = {},
  ): Promise<Pass & { warnings: string[] }> {
    const body: Record<string, unknown> = {
      template_id: params.templateId,
      holder_email: params.holderEmail ?? null,
      holder_name: params.holderName ?? null,
      field_values: params.fieldValues ?? {},
      metadata: params.metadata ?? null,
    }
    // undefined means "inherit the template default"; null is a meaningful
    // override (dev cert), so only omit the key when truly unset.
    if (params.certificateSetId !== undefined) body.certificate_set_id = params.certificateSetId
    if (params.platforms !== undefined) body.platforms = params.platforms
    if (params.imageVariant !== undefined) body.image_variant = params.imageVariant
    return this.http.request<Pass & { warnings: string[] }>({
      method: 'POST',
      path: '/v1/passes',
      body,
      idempotencyKey: options.idempotencyKey ?? generateIdempotencyKey(),
    })
  }

  retrieve(id: string): Promise<Pass> {
    return this.http.request<Pass>({
      method: 'GET',
      path: `/v1/passes/${encodeURIComponent(id)}`,
    })
  }

  list(params: ListPassesParams = {}): Promise<ListResponse<Pass>> {
    return this.http.request<ListResponse<Pass>>({
      method: 'GET',
      path: '/v1/passes',
      query: {
        template_id: params.templateId,
        holder_email: params.holderEmail,
        limit: params.limit,
      },
    })
  }

  update(id: string, params: UpdatePassParams, options: RequestOptions = {}): Promise<Pass> {
    const body: Record<string, unknown> = {}
    if (params.fieldValues !== undefined) body.field_values = params.fieldValues
    if (params.metadata !== undefined) body.metadata = params.metadata
    // null clears the variant back to the base images, so only omit the key
    // when truly unset.
    if (params.imageVariant !== undefined) body.image_variant = params.imageVariant
    return this.http.request<Pass>({
      method: 'PATCH',
      path: `/v1/passes/${encodeURIComponent(id)}`,
      body,
      idempotencyKey: options.idempotencyKey ?? generateIdempotencyKey(),
    })
  }

  void(id: string): Promise<Pass> {
    return this.http.request<Pass>({
      method: 'DELETE',
      path: `/v1/passes/${encodeURIComponent(id)}`,
    })
  }

  /**
   * Upload a PNG, JPEG or WebP (max 8 MB) as this pass's own image for a slot,
   * overriding its template variant and base image. The pass is re-rendered
   * and pushed to wallets; resolves with the updated pass. Re-uploading
   * replaces the override.
   */
  uploadImage(passId: string, slot: PassImageSlot, data: Uint8Array | ArrayBuffer): Promise<Pass> {
    // PUT is idempotent, so no Idempotency-Key.
    return this.http.request<Pass>({
      method: 'PUT',
      path: `/v1/passes/${encodeURIComponent(passId)}/images/${encodeURIComponent(slot)}`,
      body: { data: toBase64(data) },
    })
  }

  /**
   * Remove this pass's image override for a slot, falling back to its
   * template variant or base image. Also use it to erase a holder's photo.
   * Resolves with the updated pass.
   */
  deleteImage(passId: string, slot: PassImageSlot): Promise<Pass> {
    return this.http.request<Pass>({
      method: 'DELETE',
      path: `/v1/passes/${encodeURIComponent(passId)}/images/${encodeURIComponent(slot)}`,
    })
  }

  events(id: string): Promise<ListResponse<PassEvent>> {
    return this.http.request<ListResponse<PassEvent>>({
      method: 'GET',
      path: `/v1/passes/${encodeURIComponent(id)}/events`,
    })
  }
}
