import { type PassmintHttpClient, generateIdempotencyKey } from '../client'
import type {
  CreateTemplateParams,
  ListResponse,
  RequestOptions,
  Template,
  UpdateTemplateParams,
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

  list(): Promise<ListResponse<Template>> {
    return this.http.request<ListResponse<Template>>({
      method: 'GET',
      path: '/v1/templates',
    })
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
}
