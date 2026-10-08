import type { ListResponse } from './types'

/**
 * Walks a cursor-paginated list: fetches a page, yields its items, and asks for the page
 * after the last item's id until `has_more` is false. Stops on an empty page even if the
 * server says there is more, so a misbehaving response can't spin forever.
 */
export async function* autoPaginate<T extends { id: string }>(
  fetchPage: (startingAfter?: string) => Promise<ListResponse<T>>,
): AsyncIterableIterator<T> {
  let startingAfter: string | undefined

  for (;;) {
    const page = await fetchPage(startingAfter)

    yield* page.data

    const last = page.data.at(-1)

    if (!page.has_more || !last) return

    startingAfter = last.id
  }
}

/** Builds the params for the next page without ever passing `startingAfter: undefined`. */
export function withCursor<P extends object>(
  params: P,
  cursor: string | undefined,
): P & { startingAfter?: string } {
  return { ...params, ...(cursor ? { startingAfter: cursor } : {}) }
}
