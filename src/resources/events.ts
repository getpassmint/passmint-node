import type { PassmintHttpClient } from '../client'
import type { ListEventsParams, ListResponse, PassmintEvent } from '../types'

export class EventsResource {
  constructor(private readonly http: PassmintHttpClient) {}

  list(params: ListEventsParams = {}): Promise<ListResponse<PassmintEvent>> {
    return this.http.request<ListResponse<PassmintEvent>>({
      method: 'GET',
      path: '/v1/events',
      query: {
        type: params.type,
        pass_id: params.passId,
        template_id: params.templateId,
        since: params.since,
        until: params.until,
        starting_after: params.startingAfter,
        limit: params.limit,
      },
    })
  }
}
