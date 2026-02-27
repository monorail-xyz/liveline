import { describe, it, expect } from 'vitest'
import { formatMatchMinute, findPeriodAtTime, getActivePeriodId } from '../matchTime'
import type { MatchPeriod } from '../../types'

const HALF = 45 * 60

const periods: MatchPeriod[] = [
  { id: '1H', label: '1st Half', kickoff: 1000, duration: HALF },
  { id: '2H', label: '2nd Half', kickoff: 5000, duration: HALF },
]

// -- findPeriodAtTime --

describe('findPeriodAtTime', () => {
  it('returns the period containing the timestamp', () => {
    const p = findPeriodAtTime(periods, 1000 + 60)
    expect(p?.id).toBe('1H')
  })

  it('returns the second period for timestamps in 2H', () => {
    const p = findPeriodAtTime(periods, 5000 + 60)
    expect(p?.id).toBe('2H')
  })

  it('returns null for timestamps between periods (half-time)', () => {
    const p = findPeriodAtTime(periods, 4000)
    expect(p).toBeNull()
  })

  it('returns null for timestamps before all periods', () => {
    const p = findPeriodAtTime(periods, 500)
    expect(p).toBeNull()
  })

  it('includes stoppage time — returns period if past nominal duration but before next kickoff', () => {
    const p = findPeriodAtTime(periods, 3800)
    expect(p?.id).toBe('1H')
  })
})

// -- formatMatchMinute (period-relative) --

describe('formatMatchMinute (period-relative)', () => {
  it('formats minute within first half', () => {
    expect(formatMatchMinute(1000 + 600, periods, null)).toBe("10'")
  })

  it('formats stoppage time in first half', () => {
    expect(formatMatchMinute(1000 + 47 * 60, periods, null)).toBe("45+2'")
  })

  it('formats minute within second half (cumulative)', () => {
    expect(formatMatchMinute(5000 + 600, periods, null)).toBe("55'")
  })

  it('formats stoppage time in second half', () => {
    expect(formatMatchMinute(5000 + 48 * 60, periods, null)).toBe("90+3'")
  })

  it('formats time before match as 0\'', () => {
    expect(formatMatchMinute(500, periods, null)).toBe("0'")
  })
})

// -- formatMatchMinute (period-scoped) --

describe('formatMatchMinute (scoped to period)', () => {
  it('shows period-relative minutes when scoped to 1H', () => {
    expect(formatMatchMinute(1000 + 600, periods, '1H')).toBe("10'")
  })

  it('shows period-relative minutes when scoped to 2H (starts at 0)', () => {
    expect(formatMatchMinute(5000 + 600, periods, '2H')).toBe("10'")
  })

  it('shows stoppage relative to period nominal', () => {
    expect(formatMatchMinute(5000 + 47 * 60, periods, '2H')).toBe("45+2'")
  })
})

// -- getActivePeriodId --

describe('getActivePeriodId', () => {
  it('returns 1H during first half', () => {
    expect(getActivePeriodId(periods, 1000 + 600)).toBe('1H')
  })

  it('returns null during half-time', () => {
    expect(getActivePeriodId(periods, 4500)).toBeNull()
  })

  it('returns 2H during second half', () => {
    expect(getActivePeriodId(periods, 5000 + 600)).toBe('2H')
  })

  it('returns last period during stoppage (no next period)', () => {
    expect(getActivePeriodId(periods, 5000 + 50 * 60)).toBe('2H')
  })

  it('returns null before match', () => {
    expect(getActivePeriodId(periods, 500)).toBeNull()
  })
})
