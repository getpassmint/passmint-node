import { describe, expect, it, vi } from 'vitest'
import { autoPaginate } from '../src/pagination'
import type { ListResponse } from '../src/types'

type Item = { id: string }

function page(ids: string[], hasMore: boolean): ListResponse<Item> {
  return { object: 'list', data: ids.map((id) => ({ id })), has_more: hasMore }
}

async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = []
  for await (const item of it) out.push(item)
  return out
}

describe('autoPaginate', () => {
  it('walks every page, passing the last id as the cursor', async () => {
    const pages = [page(['a', 'b'], true), page(['c', 'd'], true), page(['e'], false)]
    const fetchPage = vi.fn(async (_cursor?: string) => pages.shift() as ListResponse<Item>)
    const items = await collect(autoPaginate(fetchPage))
    expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([undefined, 'b', 'd'])
  })

  it('yields nothing for an empty first page', async () => {
    const fetchPage = vi.fn(async () => page([], false))
    expect(await collect(autoPaginate(fetchPage))).toEqual([])
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('stops on has_more with no rows instead of looping forever', async () => {
    const fetchPage = vi.fn(async () => page([], true))
    expect(await collect(autoPaginate(fetchPage))).toEqual([])
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('rejects when the fetcher throws', async () => {
    const fetchPage = vi.fn(async () => {
      throw new Error('boom')
    })
    await expect(collect(autoPaginate(fetchPage))).rejects.toThrow('boom')
  })
})
