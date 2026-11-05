// @vitest-environment node
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import type { LoadType, WorkoutSet } from '../types/models'
import {
  aggregateSets,
  createAnalyticsEngine,
  getAnalyticsEngineStatus,
  initAnalyticsEngine,
} from './analyticsEngine'

type SetNumbers = Pick<WorkoutSet, 'weightKg' | 'reps'>
type Engine = Awaited<ReturnType<typeof createAnalyticsEngine>>
type Aggregate = ReturnType<Engine['aggregateSets']>

const LOAD_TYPES: LoadType[] = ['weighted', 'bodyweight', 'bodyweightAdded', 'assisted']
const FIELDS = [
  'maxWeight', 'maxReps', 'estimated1RM', 'volume',
  'rawVolume', 'totalReps', 'recordedCount',
] as const

let wasmBytes: Uint8Array<ArrayBuffer>
let engine: Engine

beforeAll(async () => {
  wasmBytes = new Uint8Array(readFileSync(new URL('../../public/wasm/gym-core.wasm', import.meta.url)))
  engine = await createAnalyticsEngine(wasmBytes)
})

/** Independent executable specification of the original analytics rules. */
function reference(sets: readonly SetNumbers[], loadType: LoadType): Aggregate {
  const recorded = sets.filter(({ reps }) => Number.isFinite(reps) && reps > 0)
  const weighted = recorded.filter(({ weightKg }) =>
    weightKg !== undefined && Number.isFinite(weightKg) && weightKg > 0,
  )
  const rawVolume = weighted.reduce((total, set) => total + set.weightKg! * set.reps, 0)
  const result: Aggregate = {
    rawVolume,
    totalReps: recorded.reduce((total, set) => total + set.reps, 0),
    recordedCount: recorded.length,
  }
  if (recorded.length === 0) return result
  result.maxReps = recorded.reduce((best, set) => Math.max(best, set.reps), 0)

  if (loadType === 'weighted') {
    if (weighted.length > 0) {
      result.maxWeight = weighted.reduce((best, set) => Math.max(best, set.weightKg!), 0)
      result.volume = rawVolume
    }
    const estimates = weighted
      .filter(({ reps }) => Number.isInteger(reps) && reps <= 12)
      .map(({ weightKg, reps }) => weightKg! * (1 + reps / 30))
    if (estimates.length > 0) {
      result.estimated1RM = estimates.reduce((best, estimate) => Math.max(best, estimate), 0)
    }
  } else if (loadType === 'bodyweightAdded') {
    result.maxWeight = recorded.reduce((best, { weightKg }) =>
      Math.max(best, weightKg !== undefined && Number.isFinite(weightKg) ? weightKg : 0), 0)
  } else if (loadType === 'assisted') {
    const assistance = recorded
      .map(({ weightKg }) => weightKg)
      .filter((weight): weight is number =>
        weight !== undefined && Number.isFinite(weight) && weight >= 0,
      )
    if (assistance.length > 0) {
      result.maxWeight = assistance.reduce((best, weight) => Math.min(best, weight), Infinity)
    }
  }
  return result
}

function expectEquivalent(actual: Aggregate, expected: Aggregate, context = ''): void {
  for (const field of FIELDS) {
    const value = expected[field]
    const label = `${context}: ${field}`
    if (value === undefined) expect(actual[field], label).toBeUndefined()
    else if (!Number.isFinite(value)) expect(actual[field], label).toBe(value)
    else {
      expect(typeof actual[field], label).toBe('number')
      expect(Math.abs(actual[field]! - value), label)
        .toBeLessThanOrEqual(Math.max(1, Math.abs(value)) * 1e-12)
    }
  }
}

function randomSets(seed: number, count: number): SetNumbers[] {
  let state = seed >>> 0
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state
  }
  const weights = [undefined, Number.NaN, Infinity, -Infinity, -12.5, 0, 0.125, 2.5, 65, 137.5]
  const reps = [Number.NaN, Infinity, -Infinity, -1, 0, 0.5, 1, 5, 12, 13, 25]
  return Array.from({ length: count }, () => ({
    weightKg: weights[next() % weights.length],
    reps: reps[next() % reps.length]!,
  }))
}

describe('compiled C++ analytics through the WebAssembly adapter', () => {
  it.each(LOAD_TYPES)('returns no fabricated metrics for empty %s data', (loadType) => {
    expectEquivalent(engine.aggregateSets([], loadType), reference([], loadType))
  })

  it.each(LOAD_TYPES)('matches an independent oracle for randomized %s data', (loadType) => {
    for (let seed = 1; seed <= 32; seed++) {
      const sets = randomSets(seed, seed * 3 + 1)
      expectEquivalent(engine.aggregateSets(sets, loadType), reference(sets, loadType), `${loadType}/${seed}`)
    }
  })

  it.each(LOAD_TYPES)('ignores missing and invalid values according to %s semantics', (loadType) => {
    const sets: SetNumbers[] = [
      { reps: 8 }, { weightKg: Number.NaN, reps: 12 },
      { weightKg: Infinity, reps: 10 }, { weightKg: -Infinity, reps: 7 },
      { weightKg: -5, reps: 6 }, { weightKg: 0, reps: 9 },
      { weightKg: 50, reps: Number.NaN }, { weightKg: 60, reps: Infinity },
      { weightKg: 70, reps: -Infinity }, { weightKg: 80, reps: 0 },
      { weightKg: 90, reps: -1 }, { weightKg: 40, reps: 5.5 },
    ]
    expectEquivalent(engine.aggregateSets(sets, loadType), reference(sets, loadType))
  })

  it.each(LOAD_TYPES)('does not coerce malformed stored fields into %s records or loads', (loadType) => {
    // IndexedDB can contain rows created by older versions or external tooling.
    // Their runtime shape is not guaranteed by the TypeScript model.
    const sets = [
      { weightKg: 50, reps: '8' },
      { weightKg: 50, reps: null },
      { weightKg: 50, reps: true },
      { weightKg: 50, reps: undefined },
      { weightKg: '50', reps: 8 },
      { weightKg: null, reps: 6 },
      { weightKg: true, reps: 4 },
      { weightKg: 30, reps: 5 },
    ] as unknown as SetNumbers[]

    const expected = reference(sets, loadType)
    expect(expected.recordedCount).toBe(4)
    expect(expected.totalReps).toBe(23)
    expect(expected.rawVolume).toBe(150)
    expectEquivalent(engine.aggregateSets(sets, loadType), expected, loadType)
  })

  it('excludes 13 and fractional reps from 1RM while retaining them in volume and reps', () => {
    const sets = [
      { weightKg: 50, reps: 12 },
      { weightKg: 500, reps: 13 },
      { weightKg: 600, reps: 1.5 },
    ]
    const result = engine.aggregateSets(sets, 'weighted')
    expect(result.estimated1RM).toBeCloseTo(70, 12)
    expect(result.volume).toBe(8_000)
    expect(result.totalReps).toBe(26.5)
    expect(result.maxReps).toBe(13)
    expect(result.maxWeight).toBe(600)
  })

  it('distinguishes zero assistance, zero added load, and absent ordinary weight', () => {
    const sets: SetNumbers[] = [{ weightKg: -10, reps: 5 }, { reps: 6 }, { weightKg: 0, reps: 7 }]
    expect(engine.aggregateSets(sets, 'assisted').maxWeight).toBe(0)
    expect(engine.aggregateSets(sets, 'bodyweightAdded').maxWeight).toBe(0)
    expect(engine.aggregateSets(sets, 'weighted').maxWeight).toBeUndefined()
    expect(engine.aggregateSets(sets, 'weighted').volume).toBeUndefined()
    expect(engine.aggregateSets([{ weightKg: -10, reps: 5 }], 'assisted').maxWeight).toBeUndefined()
  })

  it('preserves arithmetic overflow from valid finite input instead of treating it as missing', () => {
    const sets = [{ weightKg: Number.MAX_VALUE, reps: 12 }]
    const result = engine.aggregateSets(sets, 'weighted')
    expect(result.maxWeight).toBe(Number.MAX_VALUE)
    expect(result.estimated1RM).toBe(Infinity)
    expect(result.volume).toBe(Infinity)
    expect(result.rawVolume).toBe(Infinity)
    expect(result.recordedCount).toBe(1)
  })

  it.each(LOAD_TYPES)('streams more than 65,536 %s sets without losing tail records', (loadType) => {
    const sets: SetNumbers[] = Array.from({ length: 131_077 }, (_, index) => ({
      weightKg: 20 + (index % 17) * 2.5,
      reps: 1 + index % 13,
    }))
    sets[65_536] = { weightKg: 225, reps: 7 }
    sets[131_075] = { weightKg: 0, reps: 11 }
    sets[131_076] = { weightKg: 30, reps: 45 }
    expectEquivalent(engine.aggregateSets(sets, loadType), reference(sets, loadType), loadType)
  })

  it('resets all accumulation state between load types and calls', () => {
    engine.aggregateSets([{ weightKg: 500, reps: 12 }], 'weighted')
    const sets = [{ weightKg: 20, reps: 4 }, { weightKg: 10, reps: 8 }]
    expectEquivalent(engine.aggregateSets(sets, 'assisted'), reference(sets, 'assisted'))
    expectEquivalent(engine.aggregateSets([], 'bodyweight'), reference([], 'bodyweight'))
    expectEquivalent(engine.aggregateSets([{ reps: 3 }], 'weighted'), reference([{ reps: 3 }], 'weighted'))
  })

  it('does not mutate the input records or their order', () => {
    const sets = Object.freeze([
      Object.freeze({ weightKg: 40, reps: 10 }),
      Object.freeze({ weightKg: 55, reps: 6 }),
    ])
    const original = JSON.stringify(sets)
    expectEquivalent(engine.aggregateSets(sets, 'weighted'), reference(sets, 'weighted'))
    expect(JSON.stringify(sets)).toBe(original)
  })

  it('keeps separate WebAssembly instances independent', async () => {
    const second = await createAnalyticsEngine(wasmBytes)
    const sets = [{ weightKg: 65, reps: 5 }]
    engine.aggregateSets([{ weightKg: 200, reps: 12 }], 'weighted')
    expectEquivalent(second.aggregateSets(sets, 'weighted'), reference(sets, 'weighted'))
    expectEquivalent(engine.aggregateSets([], 'weighted'), reference([], 'weighted'))
  })

  it('exposes the initialized singleton to application analytics', async () => {
    await initAnalyticsEngine(wasmBytes)
    expect(getAnalyticsEngineStatus()).toBe('ready')
    const sets = [{ weightKg: 60, reps: 5 }, { weightKg: 50, reps: 10 }]
    expectEquivalent(aggregateSets(sets, 'weighted'), reference(sets, 'weighted'))
  })
})

describe('WebAssembly load validation', () => {
  it('rejects malformed binary input', async () => {
    await expect(createAnalyticsEngine(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow()
  })

  it('rejects a truncated compiled module', async () => {
    await expect(createAnalyticsEngine(wasmBytes.slice(0, wasmBytes.length - 1))).rejects.toThrow()
  })

  it('rejects a valid WebAssembly module with no compatible analytics ABI', async () => {
    const emptyModule = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
    expect(WebAssembly.validate(emptyModule)).toBe(true)
    await expect(createAnalyticsEngine(emptyModule)).rejects.toThrow()
  })
})
