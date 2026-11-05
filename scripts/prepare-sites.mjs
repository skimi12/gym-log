import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const distDirectory = resolve(projectRoot, 'dist')
const clientDirectory = resolve(distDirectory, 'client')
const serverDirectory = resolve(distDirectory, 'server')

await rm(clientDirectory, { recursive: true, force: true })
await rm(serverDirectory, { recursive: true, force: true })
await mkdir(clientDirectory, { recursive: true })

const generatedEntries = new Set(['client', 'server', '.openai'])
for (const entry of await readdir(distDirectory, { withFileTypes: true })) {
  if (generatedEntries.has(entry.name)) continue
  await cp(
    resolve(distDirectory, entry.name),
    resolve(clientDirectory, entry.name),
    { recursive: entry.isDirectory() }
  )
}

await mkdir(serverDirectory, { recursive: true })
await writeFile(
  resolve(serverDirectory, 'index.js'),
  `export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request)
  }
}\n`,
  'utf8'
)

console.log('Sites用の静的アセットとWorkerを準備しました。')
