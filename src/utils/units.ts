import type { AppSettings } from '../types/models'

export type WeightUnit = AppSettings['unit']

/** International avoirdupois pound, expressed in kilograms. */
export const KG_PER_LB = 0.45359237
export const LB_PER_KG = 1 / KG_PER_LB

export function kgToLb(weightKg: number): number {
  return weightKg * LB_PER_KG
}

export function lbToKg(weightLb: number): number {
  return weightLb * KG_PER_LB
}

/**
 * Converts the canonical database value (kg) to the currently selected unit.
 * The result is deliberately not rounded so repeated unit switches do not
 * accumulate rounding error.
 */
export function toDisplayWeight(weightKg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kgToLb(weightKg) : weightKg
}

/** Converts a value entered in the selected unit back to canonical kilograms. */
export function fromDisplayWeight(weight: number, unit: WeightUnit): number {
  return unit === 'lb' ? lbToKg(weight) : weight
}

export function roundDecimal(value: number, fractionDigits = 1): number {
  if (!Number.isFinite(value)) return value

  const factor = 10 ** Math.max(0, Math.trunc(fractionDigits))
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/** A concise value for inputs, axes, and set summaries (normally 0.1 units). */
export function roundDisplayWeight(
  weightKg: number,
  unit: WeightUnit,
  fractionDigits = 1,
): number {
  return roundDecimal(toDisplayWeight(weightKg, unit), fractionDigits)
}

export function formatWeightNumber(
  weightKg: number,
  unit: WeightUnit,
  fractionDigits = 1,
): string {
  const value = roundDisplayWeight(weightKg, unit, fractionDigits)
  return new Intl.NumberFormat('ja-JP', {
    maximumFractionDigits: fractionDigits,
    useGrouping: false,
  }).format(value)
}

export function formatWeight(
  weightKg: number,
  unit: WeightUnit,
  fractionDigits = 1,
): string {
  return `${formatWeightNumber(weightKg, unit, fractionDigits)}${unit}`
}
