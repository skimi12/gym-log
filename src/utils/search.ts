import type { Exercise } from '../types/models'

type SearchableExercise = Pick<Exercise, 'name' | 'aliases'>

function katakanaToHiragana(value: string): string {
  return value.replace(/[ァ-ヶ]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) - 0x60),
  )
}

/**
 * Normalizes full-/half-width forms, case, Japanese kana, and whitespace.
 * Removing whitespace makes inputs such as "ラット プルダウン" useful on a
 * mobile keyboard while aliases handle semantic synonyms such as 懸垂/チンニング.
 */
export function normalizeSearchText(value: string): string {
  return katakanaToHiragana(value.normalize('NFKC').toLocaleLowerCase('ja-JP')).replace(
    /\s+/gu,
    '',
  )
}

export function matchesExerciseSearch(exercise: SearchableExercise, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return true

  return [exercise.name, ...exercise.aliases].some((candidate) =>
    normalizeSearchText(candidate).includes(normalizedQuery),
  )
}

export function searchExercises<T extends SearchableExercise>(
  exercises: readonly T[],
  query: string,
): T[] {
  return exercises.filter((exercise) => matchesExerciseSearch(exercise, query))
}
