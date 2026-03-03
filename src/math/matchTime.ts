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

/** Format a minute value, snapping to whole minutes or half-minutes only (for axis labels). */
function fmtMin(min: number): string {
  const totalSecs = Math.round(min * 60)
  const snapped = Math.round(totalSecs / 30) * 30
  const m = Math.floor(snapped / 60)
  const s = snapped % 60
  if (s === 0) return `${m}'`
  return `${m}'${s.toString().padStart(2, '0')}"`
}

/** Format a minute value with exact seconds, always showing seconds (for crosshair tooltip). */
function fmtMinExact(min: number): string {
  const totalSecs = Math.round(min * 60)
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return `${m}'${s.toString().padStart(2, '0')}"`
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
  exact?: boolean,
): string {
  if (periods.length === 0) return "0'"
  const fmt = exact ? fmtMinExact : fmtMin

  const period = findPeriodAtTime(periods, time)

  if (!period) {
    if (time < periods[0].kickoff) return "0'"
    return "0'"
  }

  const elapsed = time - period.kickoff
  const elapsedMin = elapsed / 60
  const nominalMin = period.duration / 60

  let cumulativeBase = 0
  for (const p of periods) {
    if (p.id === period.id) break
    cumulativeBase += p.duration / 60
  }

  const matchMin = cumulativeBase + elapsedMin
  const periodEnd = cumulativeBase + nominalMin

  if (matchMin <= periodEnd) {
    return fmt(matchMin)
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
