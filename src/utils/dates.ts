const INVALID_DATE_PLACEHOLDER = '—'

function toDate(value: string | Date): Date | undefined {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function formatJapaneseDate(value: string | Date): string {
  const date = toDate(value)
  if (!date) return INVALID_DATE_PLACEHOLDER

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function formatShortDate(value: string | Date): string {
  const date = toDate(value)
  if (!date) return INVALID_DATE_PLACEHOLDER

  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
  }).format(date)
}

export function formatDateWithWeekday(value: string | Date): string {
  const date = toDate(value)
  if (!date) return INVALID_DATE_PLACEHOLDER

  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

export function formatTime(value: string | Date): string {
  const date = toDate(value)
  if (!date) return INVALID_DATE_PLACEHOLDER

  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function formatDateTime(value: string | Date): string {
  const date = toDate(value)
  if (!date) return INVALID_DATE_PLACEHOLDER
  return `${formatJapaneseDate(date)} ${formatTime(date)}`
}

export function durationMilliseconds(
  startedAt: string | Date,
  endedAt: string | Date = new Date(),
): number {
  const start = toDate(startedAt)
  const end = toDate(endedAt)
  if (!start || !end) return 0
  return Math.max(0, end.getTime() - start.getTime())
}

/** Human-readable session duration, intentionally rounded down to minutes. */
export function formatDuration(
  startedAt: string | Date,
  endedAt: string | Date = new Date(),
): string {
  const totalMinutes = Math.floor(durationMilliseconds(startedAt, endedAt) / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${totalMinutes}分`
  if (minutes === 0) return `${hours}時間`
  return `${hours}時間${minutes}分`
}

/** Fixed-width elapsed time for the active workout header. */
export function formatElapsed(
  startedAt: string | Date,
  now: string | Date = new Date(),
): string {
  const totalSeconds = Math.floor(durationMilliseconds(startedAt, now) / 1_000)
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

/** Local-calendar key; avoids UTC date shifts when grouping/charting on iPhone. */
export function toLocalDateKey(value: string | Date): string {
  const date = toDate(value)
  if (!date) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function compareIsoAscending(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime()
}

export function compareIsoDescending(a: string, b: string): number {
  return compareIsoAscending(b, a)
}
