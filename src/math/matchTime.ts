import type { MatchPeriod } from '../types'

/**
 * Find which period a unix-seconds timestamp falls in.
 * A timestamp is "in" a period if it's >= kickoff and before the next
 * period's kickoff (this captures stoppage time naturally — in soccer
 * the clock doesn't stop, so everything between kickoff and next kickoff
 * belongs to the current period). For the last period, extends indefinitely.
 * Returns null only if before the first period's kickoff.
 */
export function findPeriodAtTime(
  periods: MatchPeriod[],
  time: number,
): MatchPeriod | null {
  for (let i = periods.length - 1; i >= 0; i--) {
    const p = periods[i]
    if (time < p.kickoff) continue
    const nextKickoff = i < periods.length - 1 ? periods[i + 1].kickoff : Infinity
    if (time < nextKickoff) return p
  }
  return null
}

/**
 * Format a unix timestamp as a match-minute string.
 *
 * @param time      Unix seconds
 * @param periods   Ordered match periods
 * @param scopeId   If set, show minutes relative to this period (for period views).
 *                  If null, show cumulative match minutes (for full-match view).
 */
export function formatMatchMinute(
  time: number,
  periods: MatchPeriod[],
  scopeId: string | null,
): string {
  if (periods.length === 0) return "0'"

  const period = findPeriodAtTime(periods, time)

  if (!period) {
    if (time < periods[0].kickoff) return "0'"
    return "0'"
  }

  const elapsed = time - period.kickoff
  const elapsedMin = elapsed / 60
  const nominalMin = period.duration / 60

  if (scopeId) {
    if (elapsedMin <= nominalMin) {
      return `${Math.floor(elapsedMin)}'`
    }
    const stoppage = Math.ceil(elapsedMin - nominalMin)
    return `${Math.floor(nominalMin)}+${stoppage}'`
  }

  let cumulativeBase = 0
  for (const p of periods) {
    if (p.id === period.id) break
    cumulativeBase += p.duration / 60
  }

  const matchMin = cumulativeBase + elapsedMin
  const periodEnd = cumulativeBase + nominalMin

  if (matchMin <= periodEnd) {
    return `${Math.floor(matchMin)}'`
  }
  const stoppage = Math.ceil(matchMin - periodEnd)
  return `${Math.floor(periodEnd)}+${stoppage}'`
}

/**
 * Get the ID of the currently active (being played) period, or null.
 */
export function getActivePeriodId(
  periods: MatchPeriod[],
  now: number,
): string | null {
  const p = findPeriodAtTime(periods, now)
  return p?.id ?? null
}
