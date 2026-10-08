// Copies the committed OpenAPI spec into this repo.
// Default: the sibling platform checkout (../platform). Override with PASSMINT_PLATFORM_DIR.
// Pass --from-url to fetch the live spec instead.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const target = resolve(root, 'openapi.json')

let raw
if (process.argv.includes('--from-url')) {
  const res = await fetch('https://api.passmint.com/openapi.json')
  if (!res.ok) throw new Error(`Failed to fetch spec: ${res.status}`)
  raw = await res.text()
} else {
  const platformDir = process.env.PASSMINT_PLATFORM_DIR ?? resolve(root, '../platform')
  raw = readFileSync(resolve(platformDir, 'apps/api-worker/openapi.json'), 'utf8')
}

writeFileSync(target, `${JSON.stringify(JSON.parse(raw), null, 2)}\n`)
console.log(`Wrote ${target}`)
