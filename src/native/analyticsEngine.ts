import type { LoadType, WorkoutSet } from '../types/models'

type SetNumbers = Pick<WorkoutSet, 'weightKg' | 'reps'>

export interface SetAggregate {
  maxWeight?: number
  maxReps?: number
  estimated1RM?: number
  volume?: number
  rawVolume: number
  totalReps: number
  recordedCount: number
}

export interface AnalyticsEngine {
  aggregateSets(sets: readonly SetNumbers[], loadType: LoadType): SetAggregate
}

interface CoreExports extends WebAssembly.Exports {
  gym_abi_version: () => number
  gym_reset: (loadType: number) => void
  gym_add_set: (weight: number, reps: number, hasWeight: number) => void
  gym_has_metric: (metric: number) => number
  gym_metric: (metric: number) => number
  gym_volume: () => number
  gym_total_reps: () => number
  gym_recorded_count: () => number
}

const LOAD_TYPE_IDS: Record<LoadType, number> = {
  weighted: 0, bodyweight: 1, bodyweightAdded: 2, assisted: 3,
}
const EXPORT_NAMES = [
  'gym_abi_version', 'gym_reset', 'gym_add_set', 'gym_has_metric',
  'gym_metric', 'gym_volume', 'gym_total_reps', 'gym_recorded_count',
] as const

/** Each engine owns a WASM instance. Calls are synchronous and never share state. */
export async function createAnalyticsEngine(bytes: BufferSource): Promise<AnalyticsEngine> {
  const module = await WebAssembly.compile(bytes)
  if (WebAssembly.Module.imports(module).length !== 0) {
    throw new Error('Analytics module must not import external functions or memory')
  }
  const instance = await WebAssembly.instantiate(module, {})
  const exports = instance.exports
  for (const name of EXPORT_NAMES) {
    if (typeof exports[name] !== 'function') throw new Error(`Invalid analytics ABI: ${name}`)
  }
  const core = exports as CoreExports
  if (core.gym_abi_version() !== 1) throw new Error('Unsupported analytics ABI version')

  return {
    aggregateSets(sets, loadType) {
      if (!Object.hasOwn(LOAD_TYPE_IDS, loadType)) throw new TypeError('Invalid load type')
      core.gym_reset(LOAD_TYPE_IDS[loadType])
      // Streaming avoids an input-sized WASM heap, shared pointers and copy limits.
      for (const set of sets) {
        // IndexedDB data can outlive TypeScript schemas. Do not let the f64 ABI
        // coerce malformed strings/null/booleans into valid recorded values.
        const hasWeight = typeof set.weightKg === 'number'
        core.gym_add_set(
          hasWeight ? set.weightKg! : 0,
          typeof set.reps === 'number' ? set.reps : Number.NaN,
          hasWeight ? 1 : 0,
        )
      }
      const metric = (id: number): number | undefined =>
        core.gym_has_metric(id) === 1 ? core.gym_metric(id) : undefined
      return {
        maxWeight: metric(0), maxReps: metric(1), estimated1RM: metric(2), volume: metric(3),
        rawVolume: core.gym_volume(), totalReps: core.gym_total_reps(),
        recordedCount: core.gym_recorded_count(),
      }
    },
  }
}

let engine: AnalyticsEngine | undefined
let pending: Promise<void> | undefined
let status: 'uninitialized' | 'ready' | 'failed' = 'uninitialized'

export function getAnalyticsEngineStatus(): typeof status { return status }

/** Loading failure is retryable; no different calculation silently replaces C++. */
export function initAnalyticsEngine(bytes?: BufferSource): Promise<void> {
  if (engine) return Promise.resolve()
  if (pending) return pending
  pending = (async () => {
    let source = bytes
    if (!source) {
      const url = `${import.meta.env.BASE_URL ?? '/'}wasm/gym-core.wasm`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Analytics module could not load (${response.status})`)
      source = await response.arrayBuffer()
    }
    engine = await createAnalyticsEngine(source)
    status = 'ready'
  })().catch((error: unknown) => {
    status = 'failed'
    throw error
  }).finally(() => { pending = undefined })
  return pending
}

export function aggregateSets(sets: readonly SetNumbers[], loadType: LoadType): SetAggregate {
  if (!engine) throw new Error('Analytics engine has not been initialized')
  return engine.aggregateSets(sets, loadType)
}
