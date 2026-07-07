import type { PassmintHttpClient } from '../client'
import type { Account } from '../types'

export class MeResource {
  constructor(private readonly http: PassmintHttpClient) {}

  retrieve(): Promise<Account> {
    return this.http.request<Account>({ method: 'GET', path: '/v1/me' })
  }
}
