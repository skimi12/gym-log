import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const wasmPath = path.join(root, 'public/wasm/gym-core.wasm')
export const manifestPath = path.join(root, 'native/wasm-manifest.json')
export const coreInputs = [
  'native/include/gym/analytics_core.hpp', 'native/src/analytics_core.cpp', 'scripts/build-wasm.mjs',
]
export const abiExports = ['gym_abi_version', 'gym_reset', 'gym_add_set', 'gym_has_metric',
  'gym_metric', 'gym_volume', 'gym_total_reps', 'gym_recorded_count']
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
export async function sourceHashes() {
  return Object.fromEntries(await Promise.all(coreInputs.map(async (name) =>
    [name, sha256(await readFile(path.join(root, name)))])))
}
export async function validateWasm(bytes) {
  const module = await WebAssembly.compile(bytes)
  if (WebAssembly.Module.imports(module).length) throw new Error('WASM must have no imports')
  const instance = await WebAssembly.instantiate(module, {})
  for (const name of abiExports) {
    if (typeof instance.exports[name] !== 'function') throw new Error(`WASM export missing: ${name}`)
  }
  if (instance.exports.gym_abi_version() !== 1) throw new Error('WASM ABI must be version 1')
}
