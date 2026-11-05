import { readFile } from 'node:fs/promises'
import { wasmPath, manifestPath, sourceHashes, sha256, validateWasm } from './core-artifact.mjs'

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const hashes = await sourceHashes()
for (const [name, hash] of Object.entries(hashes)) {
  if (manifest.sources?.[name] !== hash) throw new Error(`C++ source changed: rebuild WASM with npm run build:wasm (${name})`)
}
const bytes = await readFile(wasmPath)
if (manifest.wasmSha256 !== sha256(bytes) || manifest.wasmBytes !== bytes.length) {
  throw new Error('WASM artifact does not match its manifest. Run npm run build:wasm.')
}
await validateWasm(bytes)
console.log(`Verified C++ source/WASM integrity (${bytes.length} bytes)`)
