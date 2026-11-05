// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const wasmBytes = new Uint8Array(
  readFileSync(new URL('../../public/wasm/gym-core.wasm', import.meta.url)),
)

function wasmResponse(): Response {
  return new Response(wasmBytes.slice(), {
    status: 200,
    headers: { 'Content-Type': 'application/wasm' },
  })
}

beforeEach(() => {
  // Global test setup initializes its own module. Each loader test needs a fresh
  // singleton so it exercises actual startup and retry behavior independently.
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('analytics engine startup and recovery', () => {
  it('reports an HTTP load failure and allows a successful retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
      .mockImplementationOnce(async () => wasmResponse())
    vi.stubGlobal('fetch', fetchMock)
    const loader = await import('./analyticsEngine')

    expect(loader.getAnalyticsEngineStatus()).toBe('uninitialized')
    await expect(loader.initAnalyticsEngine()).rejects.toThrow('503')
    expect(loader.getAnalyticsEngineStatus()).toBe('failed')
    expect(() => loader.aggregateSets([{ weightKg: 60, reps: 5 }], 'weighted'))
      .toThrow('not been initialized')

    await loader.initAnalyticsEngine()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(loader.getAnalyticsEngineStatus()).toBe('ready')
    expect(loader.aggregateSets([{ weightKg: 60, reps: 5 }], 'weighted').estimated1RM)
      .toBeCloseTo(70, 12)
  })

  it('clears a failed network request so a later attempt can fetch again', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Network unavailable'))
      .mockImplementationOnce(async () => wasmResponse())
    vi.stubGlobal('fetch', fetchMock)
    const loader = await import('./analyticsEngine')

    await expect(loader.initAnalyticsEngine()).rejects.toThrow('Network unavailable')
    expect(loader.getAnalyticsEngineStatus()).toBe('failed')
    await loader.initAnalyticsEngine()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(loader.getAnalyticsEngineStatus()).toBe('ready')
  })

  it('deduplicates overlapping initialization requests', async () => {
    let resolveFetch!: (response: Response) => void
    const response = new Promise<Response>((resolve) => { resolveFetch = resolve })
    const fetchMock = vi.fn(() => response)
    vi.stubGlobal('fetch', fetchMock)
    const loader = await import('./analyticsEngine')

    const first = loader.initAnalyticsEngine()
    const second = loader.initAnalyticsEngine()
    const third = loader.initAnalyticsEngine()
    expect(second).toBe(first)
    expect(third).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(loader.getAnalyticsEngineStatus()).toBe('uninitialized')

    resolveFetch(wasmResponse())
    await Promise.all([first, second, third])
    expect(loader.getAnalyticsEngineStatus()).toBe('ready')
    expect(loader.aggregateSets([{ weightKg: 25, reps: 8 }], 'weighted').volume).toBe(200)
  })

  it('resolves the binary beneath the configured deployment base URL', async () => {
    vi.stubEnv('BASE_URL', '/internship-demo/')
    const fetchMock = vi.fn(async () => wasmResponse())
    vi.stubGlobal('fetch', fetchMock)
    const loader = await import('./analyticsEngine')

    await loader.initAnalyticsEngine()
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/internship-demo/wasm/gym-core.wasm')
    expect(loader.getAnalyticsEngineStatus()).toBe('ready')
  })

  it('rejects an invalid binary returned with HTTP 200 and recovers on retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 }))
      .mockImplementationOnce(async () => wasmResponse())
    vi.stubGlobal('fetch', fetchMock)
    const loader = await import('./analyticsEngine')

    await expect(loader.initAnalyticsEngine()).rejects.toThrow()
    expect(loader.getAnalyticsEngineStatus()).toBe('failed')
    await loader.initAnalyticsEngine()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(loader.getAnalyticsEngineStatus()).toBe('ready')
  })

  it('accepts explicitly supplied bytes without a network request', async () => {
    const fetchMock = vi.fn(() => { throw new Error('Unexpected network request') })
    vi.stubGlobal('fetch', fetchMock)
    const loader = await import('./analyticsEngine')

    await loader.initAnalyticsEngine(wasmBytes)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(loader.getAnalyticsEngineStatus()).toBe('ready')
    expect(loader.aggregateSets([{ reps: 12 }], 'bodyweight').maxReps).toBe(12)
  })

  it('keeps a ready engine when initialization is requested again', async () => {
    const fetchMock = vi.fn(async () => wasmResponse())
    vi.stubGlobal('fetch', fetchMock)
    const loader = await import('./analyticsEngine')

    await loader.initAnalyticsEngine()
    await loader.initAnalyticsEngine()
    await loader.initAnalyticsEngine(new Uint8Array([1, 2, 3, 4]))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(loader.getAnalyticsEngineStatus()).toBe('ready')
    expect(loader.aggregateSets([{ weightKg: 50, reps: 10 }], 'weighted').volume).toBe(500)
  })
})
