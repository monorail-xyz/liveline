import type { MatchPeriod } from '../types'

/** Maximum stoppage time beyond nominal duration (seconds) before we consider the period over. */
const MAX_STOPPAGE = 180

/**
 * Find which period a unix-seconds timestamp falls in.
 * A timestamp is "in" a period if it's >= kickoff and either:
 *   - Before kickoff + duration (within nominal time), OR
 *   - In the stoppage window: past nominal end but within MAX_STOPPAGE seconds
 *     and before the next period's kickoff.
 * For the last period (no successor), stoppage extends indefinitely.
 * Returns null if between periods or before the match.
 */
export function findPeriodAtTime(
  periods: MatchPeriod[],
  time: number,
): MatchPeriod | null {
  for (let i = periods.length - 1; i >= 0; i--) {
    const p = periods[i]
    if (time < p.kickoff) continue
    const nominalEnd = p.kickoff + p.duration
    // Within nominal time — definitely in this period
    if (time < nominalEnd) return p
    // Past nominal end — check stoppage window
    const nextKickoff = i < periods.length - 1 ? periods[i + 1].kickoff : Infinity
    const stoppageLimit = nextKickoff === Infinity
      ? Infinity
      : nominalEnd + MAX_STOPPAGE
    if (time < Math.min(stoppageLimit, nextKickoff)) return p
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
