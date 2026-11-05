import { spawnSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { root } from './core-artifact.mjs'

const directory = path.join(root, 'build/native')
await mkdir(directory, { recursive: true })
const binary = path.join(directory, process.platform === 'win32' ? 'analytics-tests.exe' : 'analytics-tests')
const compiler = process.env.CXX || 'g++'
const args = ['-std=c++17', '-O2', '-ffp-contract=off', '-Wall', '-Wextra', '-Werror', '-pedantic',
  '-I', path.join(root, 'native/include'), path.join(root, 'native/src/analytics_core.cpp'),
  path.join(root, 'native/tests/analytics_core_test.cpp'), '-o', binary]
if (process.platform === 'win32') args.push('-static-libstdc++', '-static-libgcc')
const build = spawnSync(compiler, args, { cwd: root, stdio: 'inherit' })
if (build.error) throw build.error
if (build.status !== 0) process.exit(build.status ?? 1)
const test = spawnSync(binary, [], { cwd: root, stdio: 'inherit' })
if (test.error) throw test.error
process.exit(test.status ?? 1)
