import { type PassmintHttpClient, generateIdempotencyKey } from '../client'
import { toBase64 } from '../encoding'
import { autoPaginate, withCursor } from '../pagination'
import type {
  CreateDownloadLinkParams,
  CreatePassParams,
  DownloadLink,
  ListPassEventsParams,
  ListPassesParams,
  ListRedemptionsParams,
  ListResponse,
  Pass,
  PassDelivery,
  PassEvent,
  PassImageSlot,
  Redemption,
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
        starting_after: params.startingAfter,
      },
    })
  }

  /** Iterate every matching pass, fetching further pages as needed. */
  listAll(params: ListPassesParams = {}): AsyncIterableIterator<Pass> {
    return autoPaginate((cursor) => this.list(withCursor(params, cursor)))
  }

  update(
    id: string,
    params: UpdatePassParams,
    options: RequestOptions = {},
  ): Promise<Pass & { delivery: PassDelivery; warnings: string[] }> {
    const body: Record<string, unknown> = {}
    if (params.fieldValues !== undefined) body.field_values = params.fieldValues
    if (params.metadata !== undefined) body.metadata = params.metadata
    // null clears the variant back to the base images, so only omit the key
    // when truly unset.
    if (params.imageVariant !== undefined) body.image_variant = params.imageVariant
    return this.http.request<Pass & { delivery: PassDelivery; warnings: string[] }>({
      method: 'PATCH',
      path: `/v1/passes/${encodeURIComponent(id)}`,
      body,
      idempotencyKey: options.idempotencyKey ?? generateIdempotencyKey(),
    })
  }

  void(id: string): Promise<Pass & { warnings: string[] }> {
    return this.http.request<Pass & { warnings: string[] }>({
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

  events(id: string, params: ListPassEventsParams = {}): Promise<ListResponse<PassEvent>> {
    return this.http.request<ListResponse<PassEvent>>({
      method: 'GET',
      path: `/v1/passes/${encodeURIComponent(id)}/events`,
      query: { limit: params.limit, starting_after: params.startingAfter },
    })
  }

  /** Iterate every event for this pass, fetching further pages as needed. */
  listAllEvents(id: string, params: ListPassEventsParams = {}): AsyncIterableIterator<PassEvent> {
    return autoPaginate((cursor) => this.events(id, withCursor(params, cursor)))
  }

  /** The pass's scan log: every accepted or rejected redemption attempt, newest first. */
  redemptions(id: string, params: ListRedemptionsParams = {}): Promise<ListResponse<Redemption>> {
    return this.http.request<ListResponse<Redemption>>({
      method: 'GET',
      path: `/v1/passes/${encodeURIComponent(id)}/redemptions`,
      query: { limit: params.limit },
    })
  }

  /**
   * Create a short-lived link that downloads this pass. Not an idempotent
   * route on the server, so no Idempotency-Key is sent.
   */
  createDownloadLink(id: string, params: CreateDownloadLinkParams = {}): Promise<DownloadLink> {
    const body: Record<string, unknown> = {}
    if (params.expiresIn !== undefined) body.expires_in = params.expiresIn
    return this.http.request<DownloadLink>({
      method: 'POST',
      path: `/v1/passes/${encodeURIComponent(id)}/download-links`,
      body,
    })
  }
}
