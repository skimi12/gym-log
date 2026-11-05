import { describe, expect, it } from 'vitest'
import {
  fromDisplayWeight,
  kgToLb,
  lbToKg,
  roundDisplayWeight,
  toDisplayWeight,
} from './units'

describe('weight unit conversion', () => {
  it('converts kg to lb using the international pound', () => {
    expect(kgToLb(10)).toBeCloseTo(22.0462262185, 9)
  })

  it('converts lb to kg using the international pound', () => {
    expect(lbToKg(100)).toBeCloseTo(45.359237, 9)
  })

  it('round trips without meaningful precision loss', () => {
    for (const kilograms of [0, 2.5, 52.5, 137.25]) {
      expect(lbToKg(kgToLb(kilograms))).toBeCloseTo(kilograms, 12)
    }
  })

  it('keeps conversion precise until the display boundary', () => {
    const pounds = toDisplayWeight(20, 'lb')
    expect(fromDisplayWeight(pounds, 'lb')).toBeCloseTo(20, 12)
    expect(roundDisplayWeight(20, 'lb')).toBe(44.1)
  })
})
