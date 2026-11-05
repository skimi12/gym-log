import { describe, expect, it } from 'vitest'
import type { Exercise } from '../types/models'
import { matchesExerciseSearch, normalizeSearchText, searchExercises } from './search'

const exercise = {
  name: 'チンニング',
  aliases: ['懸垂', 'ワイド グリップ プルアップ'],
} satisfies Pick<Exercise, 'name' | 'aliases'>

describe('exercise search', () => {
  it('normalizes width, case, kana, and extra whitespace', () => {
    expect(normalizeSearchText(' ＡＢＣ　カール ')).toBe('abcかーる')
  })

  it('matches partial Japanese names and aliases', () => {
    expect(matchesExerciseSearch(exercise, 'チン')).toBe(true)
    expect(matchesExerciseSearch(exercise, ' 懸 垂 ')).toBe(true)
    expect(matchesExerciseSearch(exercise, 'わいどぐりっぷ')).toBe(true)
    expect(matchesExerciseSearch(exercise, 'スクワット')).toBe(false)
  })

  it('preserves source order while filtering', () => {
    const another = { name: 'ラットプルダウン', aliases: ['プルダウン'] }
    expect(searchExercises([exercise, another], 'ぷる')).toEqual([exercise, another])
  })
})
