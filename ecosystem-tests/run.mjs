/**
 * Ecosystem test runner.
 *
 * Builds the SDK, packs it into a tarball, installs that tarball into each
 * consumer fixture exactly like a user would, then compiles/runs each
 * fixture's smoke script against an in-process mock of the Passmint API.
 *
 * Usage:
 *   node ecosystem-tests/run.mjs            # all fixtures
 *   node ecosystem-tests/run.mjs node-js    # only the named fixture(s)
 */
import { spawn, spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { startMockServer } from './mock-server.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const packedDir = join(here, '.packed')
const TARBALL = join(packedDir, 'passmint-node.tgz')

// Async on purpose: the mock API server lives on THIS process's event loop,
// so fixture child processes must not be spawned synchronously (spawnSync
// would block the loop and every SDK request would hang until timeout).
function run(cmd, args, opts = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, {
      stdio: opts.quiet ? 'pipe' : 'inherit',
      cwd: opts.cwd ?? repoRoot,
      env: { ...process.env, ...opts.env },
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d) => {
      stdout += d
    })
    child.stderr?.on('data', (d) => {
      stderr += d
    })
    child.on('error', rejectPromise)
    child.on('close', (status) => resolvePromise({ status, stdout, stderr }))
  })
}

async function must(resultPromise, label) {
  const result = await resultPromise
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)
    throw new Error(`${label} failed with exit code ${result.status}`)
  }
  return result
}

function hasBinary(name) {
  return spawnSync(name, ['--version'], { stdio: 'ignore' }).status === 0
}

const FIXTURES = [
  {
    name: 'node-js',
    steps: async (dir, env) => {
      await must(run('node', ['smoke.mjs'], { cwd: dir, env }), 'node-js smoke')
    },
  },
  {
    name: 'node-ts-esm',
    steps: async (dir, env) => {
      await must(run('npx', ['tsc', '-p', '.'], { cwd: dir }), 'node-ts-esm tsc')
      await must(run('node', ['build/smoke.js'], { cwd: dir, env }), 'node-ts-esm smoke')
    },
  },
  {
    name: 'node-ts-bundler',
    steps: async (dir) => {
      // Compile-only: bundler resolution output is not runnable by plain node.
      await must(run('npx', ['tsc', '-p', '.'], { cwd: dir }), 'node-ts-bundler tsc')
    },
  },
  {
    name: 'bun',
    available: () => hasBinary('bun'),
    steps: async (dir, env) => {
      await must(run('bun', ['smoke.mjs'], { cwd: dir, env }), 'bun smoke')
    },
  },
  {
    name: 'deno',
    available: () => hasBinary('deno'),
    steps: async (dir, env) => {
      await must(
        run('deno', ['run', '--allow-net', '--allow-env', '--allow-read', 'smoke.mjs'], {
          cwd: dir,
          env,
        }),
        'deno smoke',
      )
    },
  },
]

async function buildAndPack() {
  console.log('▸ building sdk')
  await must(run('pnpm', ['build'], { quiet: true }), 'pnpm build')

  console.log('▸ packing tarball')
  rmSync(packedDir, { recursive: true, force: true })
  mkdirSync(packedDir, { recursive: true })
  const pack = await must(
    run('npm', ['pack', '--pack-destination', packedDir], { quiet: true }),
    'npm pack',
  )
  const produced = pack.stdout.trim().split('\n').at(-1)
  // Fixed name so fixture package.jsons can reference file:../.packed/passmint-node.tgz
  cpSync(join(packedDir, produced), TARBALL)
}

async function installFixture(dir) {
  // Clean install every run: npm caches file: tarballs by version, so a stale
  // node_modules would silently test the previous build.
  rmSync(join(dir, 'node_modules'), { recursive: true, force: true })
  rmSync(join(dir, 'package-lock.json'), { force: true })
  rmSync(join(dir, 'build'), { recursive: true, force: true })
  await must(
    run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], {
      cwd: dir,
      quiet: true,
    }),
    'npm install',
  )
}

async function main() {
  const filter = process.argv.slice(2)
  const selected = FIXTURES.filter((f) => filter.length === 0 || filter.includes(f.name))
  if (selected.length === 0) {
    console.error(`no fixtures match: ${filter.join(', ')}`)
    process.exit(1)
  }

  await buildAndPack()

  const mock = await startMockServer()
  const env = {
    PASSMINT_BASE_URL: mock.baseUrl,
    PASSMINT_WEBHOOK_SECRET: mock.webhookSecret,
    PASSMINT_API_KEY: 'pmk_test_ecosystem',
  }

  const results = []
  try {
    for (const fixture of selected) {
      const dir = join(here, fixture.name)
      if (fixture.available && !fixture.available()) {
        console.log(`\n◌ ${fixture.name}: runtime not installed, skipping`)
        results.push({ name: fixture.name, status: 'skipped' })
        continue
      }
      console.log(`\n▸ ${fixture.name}`)
      try {
        await installFixture(dir)
        await fixture.steps(dir, env)
        results.push({ name: fixture.name, status: 'passed' })
      } catch (err) {
        console.error(`✗ ${fixture.name}: ${err.message}`)
        results.push({ name: fixture.name, status: 'failed' })
      }
    }
  } finally {
    await mock.close()
  }

  console.log('\n── ecosystem results ──')
  for (const r of results) {
    const icon = r.status === 'passed' ? '✓' : r.status === 'skipped' ? '◌' : '✗'
    console.log(`${icon} ${r.name} ${r.status}`)
  }
  if (results.some((r) => r.status === 'failed')) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
