// Chunk size for String.fromCharCode.apply — keeps us well under engine
// argument-count limits for multi-megabyte images.
const CHUNK = 0x8000

/**
 * Base64-encode raw bytes without relying on Node's `Buffer`, so it works the
 * same on Node, Cloudflare Workers, Deno and Bun (all expose `btoa`). A Node
 * `Buffer` is a `Uint8Array`, so it is accepted as-is (respecting its offset
 * into any shared pool).
 */
export function toBase64(data: Uint8Array | ArrayBuffer): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[])
  }
  return btoa(binary)
}
