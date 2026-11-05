import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { root, wasmPath, manifestPath, abiExports, sourceHashes, sha256, validateWasm } from './core-artifact.mjs'

const zig = process.env.ZIG || 'zig'
const version = spawnSync(zig, ['version'], { encoding: 'utf8' })
if (version.error || version.status !== 0) throw new Error('Zig 0.15.2 is required. Set ZIG to the zig executable path.')
if (version.stdout.trim() !== '0.15.2') throw new Error('Use pinned Zig 0.15.2 for the committed WASM artifact.')
await mkdir(path.dirname(wasmPath), { recursive: true })
const args = ['c++', '-target', 'wasm32-freestanding', '-std=c++17', '-O3',
  '-nostdlib', '-fno-exceptions', '-fno-rtti', '-fno-threadsafe-statics',
  '-ffp-contract=off', '-Wall', '-Wextra', '-Werror', '-pedantic',
  '-I', path.join(root, 'native/include'), path.join(root, 'native/src/analytics_core.cpp'),
  '-Wl,--no-entry', '-Wl,--strip-all', '-Wl,-z,stack-size=16384',
  '-Wl,--initial-memory=131072', '-Wl,--max-memory=131072',
  ...abiExports.map((name) => `-Wl,--export=${name}`), '-o', wasmPath]
const build = spawnSync(zig, args, { cwd: root, stdio: 'inherit' })
if (build.error) throw build.error
if (build.status !== 0) process.exit(build.status ?? 1)
const bytes = await readFile(wasmPath)
await validateWasm(bytes)
await writeFile(manifestPath, JSON.stringify({
  abiVersion: 1, compiler: 'zig 0.15.2 (C++17)',
  sources: await sourceHashes(), wasmSha256: sha256(bytes), wasmBytes: bytes.length,
}, null, 2) + '\n')
console.log(`Built C++ analytics WASM: ${bytes.length} bytes; zero imports; ABI v1`)
