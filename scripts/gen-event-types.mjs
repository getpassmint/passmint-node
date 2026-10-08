// Writes src/generated/event-types.ts from the webhook keys in openapi.json.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const spec = JSON.parse(readFileSync(resolve(root, 'openapi.json'), 'utf8'))
const types = Object.keys(spec.webhooks ?? {})

const body = `// Generated from openapi.json by scripts/gen-event-types.mjs. Do not edit.

export const PASSMINT_EVENT_TYPES = [
${types.map((t) => `  ${JSON.stringify(t)},`).join('\n')}
] as const

export type PassmintEventType = (typeof PASSMINT_EVENT_TYPES)[number]
`

const out = resolve(root, 'src/generated/event-types.ts')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, body)
console.log(`Wrote ${out}`)
