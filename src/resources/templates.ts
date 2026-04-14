import { type PassmintHttpClient, generateIdempotencyKey } from '../client'
import type { CreateTemplateParams, ListResponse, RequestOptions, Template } from '../types'

export class TemplatesResource {
  constructor(private readonly http: PassmintHttpClient) {}

  create(params: CreateTemplateParams, options: RequestOptions = {}): Promise<Template> {
    return this.http.request<Template>({
      method: 'POST',
      path: '/v1/templates',
      body: {
        name: params.name,
        type: params.type,
        apple_style: params.appleStyle,
        design: params.design,
        starter_template_id: params.starterTemplateId,
      },
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

  update(
    id: string,
    params: { name?: string; design?: unknown; archived?: boolean },
  ): Promise<Template> {
    return this.http.request<Template>({
      method: 'PATCH',
      path: `/v1/templates/${encodeURIComponent(id)}`,
      body: params,
    })
  }

  archive(id: string): Promise<{ id: string; deleted: true }> {
    return this.http.request({
      method: 'DELETE',
      path: `/v1/templates/${encodeURIComponent(id)}`,
    })
  }
}
