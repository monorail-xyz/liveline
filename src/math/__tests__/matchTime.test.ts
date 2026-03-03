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

  it('returns period during stoppage (all time before next kickoff is stoppage)', () => {
    // Time 4000 is past 1H nominal (3700) but before 2H kickoff (5000) — still 1H
    const p = findPeriodAtTime(periods, 4000)
    expect(p?.id).toBe('1H')
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

  it('shows cumulative minutes when scoped to 2H (starts at 45)', () => {
    expect(formatMatchMinute(5000 + 600, periods, '2H')).toBe("55'")
  })

  it('shows stoppage relative to cumulative period end', () => {
    expect(formatMatchMinute(5000 + 47 * 60, periods, '2H')).toBe("90+2'")
  })
})

// -- getActivePeriodId --

describe('getActivePeriodId', () => {
  it('returns 1H during first half', () => {
    expect(getActivePeriodId(periods, 1000 + 600)).toBe('1H')
  })

  it('returns 1H during stoppage (before next kickoff)', () => {
    // 4500 is past 1H nominal but before 2H kickoff — still 1H stoppage
    expect(getActivePeriodId(periods, 4500)).toBe('1H')
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

describe('formatMatchMinute edge cases', () => {
  it('handles single period (no second half yet)', () => {
    const single: MatchPeriod[] = [
      { id: '1H', label: '1st Half', kickoff: 1000, duration: HALF },
    ]
    expect(formatMatchMinute(1000 + 600, single, null)).toBe("10'")
  })

  it('handles extra time periods', () => {
    const withET: MatchPeriod[] = [
      { id: '1H', label: '1st Half', kickoff: 1000, duration: HALF },
      { id: '2H', label: '2nd Half', kickoff: 5000, duration: HALF },
      { id: 'ET1', label: 'Extra Time 1', kickoff: 10000, duration: 15 * 60 },
      { id: 'ET2', label: 'Extra Time 2', kickoff: 11500, duration: 15 * 60 },
    ]
    // 5 minutes into ET1 = 90 + 5 = 95'
    expect(formatMatchMinute(10000 + 300, withET, null)).toBe("95'")
    // Scoped to ET1: cumulative 90 + 5 = 95'
    expect(formatMatchMinute(10000 + 300, withET, 'ET1')).toBe("95'")
  })

  it('handles zero elapsed (exactly at kickoff)', () => {
    expect(formatMatchMinute(1000, periods, null)).toBe("0'")
  })

  it('shows seconds for sub-minute timestamps', () => {
    // 30 seconds into 1H
    expect(formatMatchMinute(1000 + 30, periods, null)).toBe("0'30\"")
    // 1 minute 30 seconds
    expect(formatMatchMinute(1000 + 90, periods, null)).toBe("1'30\"")
    // Exactly 2 minutes — no seconds
    expect(formatMatchMinute(1000 + 120, periods, null)).toBe("2'")
  })

  it('exact mode always shows seconds', () => {
    // Exactly 1 minute — exact mode shows 1'00"
    expect(formatMatchMinute(1000 + 60, periods, null, true)).toBe("1'00\"")
    // Exactly 0 — shows 0'00"
    expect(formatMatchMinute(1000, periods, null, true)).toBe("0'00\"")
    // 1 min 17 sec — shows 1'17"
    expect(formatMatchMinute(1000 + 77, periods, null, true)).toBe("1'17\"")
  })
})
