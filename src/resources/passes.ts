import { type PassmintHttpClient, generateIdempotencyKey } from '../client'
import type {
  CreatePassParams,
  ListPassesParams,
  ListResponse,
  Pass,
  PassEvent,
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
    return this.http.request<Pass>({
      method: 'PATCH',
      path: `/v1/passes/${encodeURIComponent(id)}`,
      body: {
        field_values: params.fieldValues,
        metadata: params.metadata,
      },
      idempotencyKey: options.idempotencyKey ?? generateIdempotencyKey(),
    })
  }

  void(id: string): Promise<Pass> {
    return this.http.request<Pass>({
      method: 'DELETE',
      path: `/v1/passes/${encodeURIComponent(id)}`,
    })
  }

  events(id: string): Promise<ListResponse<PassEvent>> {
    return this.http.request<ListResponse<PassEvent>>({
      method: 'GET',
      path: `/v1/passes/${encodeURIComponent(id)}/events`,
    })
  }
}
