# Match Timeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add match-period-aware time windows so soccer prediction market charts can show 1st half, 2nd half, extra time, and full match views with match-minute labels.

**Architecture:** A `matchTimeline` prop provides period definitions (kickoff timestamps + nominal durations). The component auto-generates window buttons from periods, overrides `formatTime` to show match minutes, and clamps `leftEdge`/`rightEdge` to the selected period. All draw modules stay untouched — the translation is purely at the window-computation and label-formatting edges.

**Tech Stack:** TypeScript, React, Canvas 2D (existing liveline stack). Tests via vitest.

---

### Task 1: Types — `MatchPeriod`, `MatchTimeline`

**Files:**
- Modify: `src/types.ts`
- Modify: `src/index.ts`
- Test: `src/math/__tests__/math.test.ts` (no new tests — pure type additions)

**Step 1: Add types to `src/types.ts`**

Add after the `ScoreEvent` interface (~line 25):

```ts
export interface MatchPeriod {
  /** Unique period identifier, e.g. '1H', '2H', 'ET1', 'ET2' */
  id: string
  /** Display label, e.g. '1st Half', '2nd Half' */
  label: string
  /** Unix seconds when this period kicked off */
  kickoff: number
  /** Nominal duration in seconds (e.g. 45*60 for a half) */
  duration: number
}

export interface MatchTimeline {
  /** Periods ordered chronologically. Consumer adds dynamically as feed reports. */
  periods: MatchPeriod[]
}
```

Add prop to `LivelineProps` (after `scoreLabels`):

```ts
  /** Match timeline — enables period-aware windows, match-minute labels */
  matchTimeline?: MatchTimeline
```

**Step 2: Export from `src/index.ts`**

Add `MatchPeriod` and `MatchTimeline` to the type export block.

**Step 3: Build**

Run: `npx tsup`
Expected: Clean build, no errors.

**Step 4: Commit**

```bash
git add src/types.ts src/index.ts
git commit -m "feat: add MatchPeriod and MatchTimeline types"
```

---

### Task 2: Match-minute formatter utility

**Files:**
- Create: `src/math/matchTime.ts`
- Test: `src/math/__tests__/matchTime.test.ts`

**Step 1: Write the failing tests**

Create `src/math/__tests__/matchTime.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatMatchMinute, findPeriodAtTime } from '../matchTime'
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
    // Between end of 1H nominal and start of 2H
    const p = findPeriodAtTime(periods, 4000)
    expect(p).toBeNull()
  })

  it('returns null for timestamps before all periods', () => {
    const p = findPeriodAtTime(periods, 500)
    expect(p).toBeNull()
  })

  it('includes stoppage time — returns period if past nominal duration but before next kickoff', () => {
    // After 1H nominal end (1000 + 2700 = 3700) but before 2H kickoff (5000)
    const p = findPeriodAtTime(periods, 3800)
    expect(p?.id).toBe('1H')
  })
})

// -- formatMatchMinute (period-relative) --

describe('formatMatchMinute (period-relative)', () => {
  it('formats minute within first half', () => {
    // 10 minutes into 1H
    expect(formatMatchMinute(1000 + 600, periods, null)).toBe("10'")
  })

  it('formats stoppage time in first half', () => {
    // 47 minutes into 1H (2 min stoppage)
    expect(formatMatchMinute(1000 + 47 * 60, periods, null)).toBe("45+2'")
  })

  it('formats minute within second half (cumulative)', () => {
    // 10 minutes into 2H = 55th minute
    expect(formatMatchMinute(5000 + 600, periods, null)).toBe("55'")
  })

  it('formats stoppage time in second half', () => {
    // 48 minutes into 2H (3 min stoppage)
    expect(formatMatchMinute(5000 + 48 * 60, periods, null)).toBe("90+3'")
  })

  it('formats time before match as 0\'', () => {
    expect(formatMatchMinute(500, periods, null)).toBe("0'")
  })
})

// -- formatMatchMinute (period-scoped, for individual period views) --

describe('formatMatchMinute (scoped to period)', () => {
  it('shows period-relative minutes when scoped to 1H', () => {
    expect(formatMatchMinute(1000 + 600, periods, '1H')).toBe("10'")
  })

  it('shows period-relative minutes when scoped to 2H (starts at 0)', () => {
    // 10 minutes into 2H — when viewing just 2H, show 10' not 55'
    expect(formatMatchMinute(5000 + 600, periods, '2H')).toBe("10'")
  })

  it('shows stoppage relative to period nominal', () => {
    // 47 minutes into 2H, scoped to 2H
    expect(formatMatchMinute(5000 + 47 * 60, periods, '2H')).toBe("45+2'")
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/math/__tests__/matchTime.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/math/matchTime.ts`:

```ts
import type { MatchPeriod } from '../types'

/**
 * Find which period a unix-seconds timestamp falls in.
 * A timestamp is "in" a period if it's >= kickoff and either:
 *   - Before kickoff + duration (within nominal time), OR
 *   - Before the next period's kickoff (stoppage time)
 * Returns null if between periods or before the match.
 */
export function findPeriodAtTime(
  periods: MatchPeriod[],
  time: number,
): MatchPeriod | null {
  for (let i = periods.length - 1; i >= 0; i--) {
    const p = periods[i]
    if (time < p.kickoff) continue
    // After this period's kickoff — check if before next period
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

  // Find which period this time falls in
  const period = findPeriodAtTime(periods, time)

  if (!period) {
    // Before match or in half-time gap
    if (time < periods[0].kickoff) return "0'"
    // In a gap — show the end of the previous period
    for (let i = periods.length - 1; i >= 0; i--) {
      if (time >= periods[i].kickoff) {
        // We're past this period but findPeriodAtTime returned null
        // This shouldn't happen given our logic, but fallback safely
        break
      }
    }
    return "0'"
  }

  const elapsed = time - period.kickoff
  const elapsedMin = elapsed / 60
  const nominalMin = period.duration / 60

  if (scopeId) {
    // Period-relative: show 0' to nominalMin + stoppage
    if (elapsedMin <= nominalMin) {
      return `${Math.floor(elapsedMin)}'`
    }
    const stoppage = Math.ceil(elapsedMin - nominalMin)
    return `${Math.floor(nominalMin)}+${stoppage}'`
  }

  // Cumulative: add up nominal minutes of all previous periods
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
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/math/__tests__/matchTime.test.ts`
Expected: All 10 tests PASS

**Step 5: Build**

Run: `npx tsup`
Expected: Clean build

**Step 6: Commit**

```bash
git add src/math/matchTime.ts src/math/__tests__/matchTime.test.ts
git commit -m "feat: add match-minute formatting utilities with tests"
```

---

### Task 3: Active period detection utility

**Files:**
- Modify: `src/math/matchTime.ts`
- Modify: `src/math/__tests__/matchTime.test.ts`

**Step 1: Write the failing tests**

Append to `src/math/__tests__/matchTime.test.ts`:

```ts
import { getActivePeriodId } from '../matchTime'

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
```

**Step 2: Run tests to verify failure**

Run: `pnpm test -- src/math/__tests__/matchTime.test.ts`
Expected: FAIL — getActivePeriodId not exported

**Step 3: Add implementation**

Append to `src/math/matchTime.ts`:

```ts
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
```

**Step 4: Run tests**

Run: `pnpm test -- src/math/__tests__/matchTime.test.ts`
Expected: All 15 tests PASS

**Step 5: Commit**

```bash
git add src/math/matchTime.ts src/math/__tests__/matchTime.test.ts
git commit -m "feat: add active period detection"
```

---

### Task 4: Wire `matchTimeline` through Liveline.tsx

**Files:**
- Modify: `src/Liveline.tsx`

This task generates window buttons from match periods and adds a pulsing dot on the live period's button. No engine changes yet — just the UI layer.

**Step 1: Destructure the new prop**

In `src/Liveline.tsx`, add `matchTimeline` to the destructuring (~line 62, near `scoreLabels`):

```ts
  scoreLabels,
  matchTimeline,
  className,
```

**Step 2: Compute match-derived windows and active period**

Add after the `degenOptions` block (~line 118), before the window buttons state:

```ts
  // Match timeline — derive windows from periods
  const matchWindows = useMemo(() => {
    if (!matchTimeline?.periods.length) return null
    const periodWindows: WindowOption[] = matchTimeline.periods.map(p => ({
      label: p.label,
      secs: p.duration,  // nominal duration — used for initial display width
      _periodId: p.id,   // internal: tracks which period this button maps to
    } as WindowOption & { _periodId: string }))
    // Append "Full" — secs = sum of all nominal durations
    const totalSecs = matchTimeline.periods.reduce((sum, p) => sum + p.duration, 0)
    periodWindows.push({
      label: 'Full',
      secs: totalSecs,
      _periodId: 'full',
    } as WindowOption & { _periodId: string })
    return periodWindows
  }, [matchTimeline])

  // Effective windows: matchTimeline overrides the windows prop
  const effectiveWindows = matchWindows ?? windows
```

**Step 3: Track selected period ID**

Add state for the selected period (near the `activeWindowSecs` state):

```ts
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(
    matchTimeline?.periods[0]?.id ?? null
  )
```

**Step 4: Compute active period for live indicator**

```ts
  // Active (currently playing) period — updated by the render cycle
  const activePeriodId = useMemo(() => {
    if (!matchTimeline?.periods.length) return null
    const now = Date.now() / 1000
    for (let i = matchTimeline.periods.length - 1; i >= 0; i--) {
      const p = matchTimeline.periods[i]
      if (now >= p.kickoff) {
        const nextKickoff = i < matchTimeline.periods.length - 1
          ? matchTimeline.periods[i + 1].kickoff : Infinity
        if (now < nextKickoff) return p.id
      }
    }
    return null
  }, [matchTimeline, Math.floor(Date.now() / 5000)])  // re-check every ~5s
```

**Step 5: Add live-dot CSS to the period button**

In the window buttons rendering section (~line 277), when `matchTimeline` is active, add a pulsing dot indicator on the active period's button. After the button label text, conditionally render:

```tsx
{w.label}
{matchTimeline && (w as any)._periodId === activePeriodId && (
  <span style={{
    display: 'inline-block',
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#22c55e',
    marginLeft: 4,
    animation: 'liveline-pulse 2s ease-in-out infinite',
  }} />
)}
```

Add a `<style>` tag inside the component return (before the chart container) for the keyframes:

```tsx
{matchTimeline && (
  <style>{`@keyframes liveline-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
)}
```

**Step 6: Wire window click handler for match mode**

When a match-derived window button is clicked, update `selectedPeriodId`:

```ts
onClick={() => {
  setActiveWindowSecs(w.secs)
  onWindowChange?.(w.secs)
  if (matchTimeline && (w as any)._periodId) {
    setSelectedPeriodId((w as any)._periodId)
  }
}}
```

**Step 7: Pass match context to engine**

Add to the `useLivelineEngine` config object:

```ts
    matchTimeline,
    selectedPeriodId: matchTimeline ? selectedPeriodId : undefined,
```

**Step 8: Build**

Run: `npx tsup`
Expected: Build will fail because EngineConfig doesn't have these fields yet — that's expected. Verify it's only the type error.

**Step 9: Commit (WIP)**

```bash
git add src/Liveline.tsx
git commit -m "feat: wire matchTimeline UI in Liveline component"
```

---

### Task 5: Engine — period-aware window edges and formatTime override

**Files:**
- Modify: `src/useLivelineEngine.ts`

This is the core engine change. When `matchTimeline` is set:
1. Override `leftEdge`/`rightEdge` based on selected period
2. Freeze scrolling for past periods
3. Override `formatTime` to show match minutes

**Step 1: Add match fields to `EngineConfig`**

In the `EngineConfig` interface (~line 69), add:

```ts
  // Match timeline
  matchTimeline?: MatchTimeline
  selectedPeriodId?: string
```

Add the import at the top:

```ts
import type { ..., MatchTimeline } from './types'
import { formatMatchMinute, getActivePeriodId } from './math/matchTime'
```

**Step 2: Override window edges in the multi-series pipeline**

In the multi-series pipeline (~line 1563), after `leftEdge`/`rightEdge` are computed, add the match-timeline override:

```ts
    // ── Match timeline override ──
    // When a match period is selected, clamp edges to that period's time range.
    let effectiveLeftEdge = leftEdge
    let effectiveRightEdge = rightEdge
    let matchFrozen = false

    if (cfg.matchTimeline?.periods.length && cfg.selectedPeriodId) {
      const mt = cfg.matchTimeline
      const activePId = getActivePeriodId(mt.periods, now)

      if (cfg.selectedPeriodId === 'full') {
        // Full match: left = first kickoff, right = now (live)
        effectiveLeftEdge = mt.periods[0].kickoff
        effectiveRightEdge = now + windowSecs * buffer
      } else {
        const period = mt.periods.find(p => p.id === cfg.selectedPeriodId)
        if (period) {
          effectiveLeftEdge = period.kickoff
          const isLive = activePId === period.id
          if (isLive) {
            // Live period: right edge follows now
            effectiveRightEdge = now + period.duration * buffer
          } else {
            // Past period: frozen — right edge = kickoff + duration + small buffer
            const nextPeriod = mt.periods[mt.periods.indexOf(period) + 1]
            const periodEnd = nextPeriod
              ? nextPeriod.kickoff  // extend to next kickoff (captures stoppage)
              : period.kickoff + period.duration * 1.1  // last period: 10% buffer
            effectiveRightEdge = periodEnd
            matchFrozen = true
          }
        }
      }
    }
```

Then replace all downstream uses of `leftEdge` and `rightEdge` in the layout construction with `effectiveLeftEdge` and `effectiveRightEdge`. The layout object (~line 1631) becomes:

```ts
    const layout: ChartLayout = {
      w, h, pad,
      chartW, chartH,
      leftEdge: effectiveLeftEdge, rightEdge: effectiveRightEdge,
      ...
      toX: (t: number) => pad.left + ((t - effectiveLeftEdge) / (effectiveRightEdge - effectiveLeftEdge)) * chartW,
      ...
    }
```

**Step 3: Override formatTime**

Before the layout construction, compute the effective formatTime:

```ts
    const effectiveFormatTime = cfg.matchTimeline?.periods.length
      ? (t: number) => formatMatchMinute(
          t,
          cfg.matchTimeline!.periods,
          cfg.selectedPeriodId === 'full' ? null : cfg.selectedPeriodId ?? null,
        )
      : cfg.formatTime
```

Pass `effectiveFormatTime` instead of `cfg.formatTime` in the `drawMultiFrame` call and anywhere `formatTime` is used in this pipeline.

**Step 4: Suppress live dot for frozen periods**

When `matchFrozen` is true, set `showPulse: false` in the draw options and force `pauseProgress: 1` to hide the live dot animation.

**Step 5: Apply same changes to single-series pipeline**

Repeat the same pattern in the single-series line mode pipeline (~line 1796), after `leftEdge`/`rightEdge` are computed. Same logic: override edges, detect frozen, override formatTime.

**Step 6: Build**

Run: `npx tsup`
Expected: Clean build

**Step 7: Run all tests**

Run: `pnpm test`
Expected: All tests pass (existing + new matchTime tests)

**Step 8: Commit**

```bash
git add src/useLivelineEngine.ts
git commit -m "feat: period-aware window edges and match-minute formatting in engine"
```

---

### Task 6: Integration test and cleanup

**Files:**
- Modify: `src/math/__tests__/matchTime.test.ts` (add edge cases)
- All files (final review)

**Step 1: Add edge-case tests**

Append to `src/math/__tests__/matchTime.test.ts`:

```ts
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
    // Scoped to ET1: just 5'
    expect(formatMatchMinute(10000 + 300, withET, 'ET1')).toBe("5'")
  })

  it('handles zero elapsed (exactly at kickoff)', () => {
    expect(formatMatchMinute(1000, periods, null)).toBe("0'")
  })
})
```

**Step 2: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

**Step 3: Final build**

Run: `npx tsup`
Expected: Clean build, ESM + CJS + .d.ts

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: match timeline — edge case tests and cleanup"
```
