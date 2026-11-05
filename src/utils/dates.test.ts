import { describe, expect, it } from 'vitest'
import { formatDuration, formatElapsed, toLocalDateKey } from './dates'

describe('date and duration formatting', () => {
  it('formats session duration and active elapsed time', () => {
    const start = new Date(2026, 7, 7, 10, 0, 0)
    const end = new Date(2026, 7, 7, 11, 23, 45)

    expect(formatDuration(start, end)).toBe('1時間23分')
    expect(formatElapsed(start, end)).toBe('01:23:45')
  })

  it('uses the local calendar date instead of a sliced UTC date', () => {
    const local = new Date(2026, 7, 7, 0, 30)
    expect(toLocalDateKey(local)).toBe('2026-08-07')
  })
})
