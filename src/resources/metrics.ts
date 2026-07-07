import type { PassmintHttpClient } from '../client'
import type { FunnelParams, FunnelResponse } from '../types'

export class MetricsResource {
  constructor(private readonly http: PassmintHttpClient) {}

  funnel(params: FunnelParams = {}): Promise<FunnelResponse> {
    return this.http.request<FunnelResponse>({
      method: 'GET',
      path: '/v1/metrics/funnel',
      query: {
        template_id: params.templateId,
        platform: params.platform,
        since: params.since,
        until: params.until,
        group_by: params.groupBy,
      },
    })
  }
}
