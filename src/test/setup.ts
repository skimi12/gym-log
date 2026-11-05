import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { initAnalyticsEngine } from '../native/analyticsEngine'

// All existing domain tests exercise the shipped C++ module, not a JS mock.
await initAnalyticsEngine(new Uint8Array(readFileSync('public/wasm/gym-core.wasm')))
