# Match Timeline Design

Adds match-period-aware time windows to Liveline for soccer prediction market charts. One chart instance, user switches between period views via auto-generated window buttons.

## Types

```ts
interface MatchPeriod {
  id: string              // e.g. '1H', '2H', 'ET1', 'ET2'
  label: string           // e.g. '1st Half', '2nd Half'
  kickoff: number         // unix seconds when this period started
  duration: number        // nominal duration in seconds (45*60, 15*60)
}

interface MatchTimeline {
  periods: MatchPeriod[]  // ordered chronologically
}
```

New prop on `LivelineProps`:

```ts
matchTimeline?: MatchTimeline
```

When set, replaces `windows` prop behavior and overrides `formatTime` internally.

Consumer adds periods dynamically as the data feed reports them (start with `1H`, push `2H` at second-half kickoff, etc.).

## Engine Behavior

### Period detection

Each frame the engine determines:
- **activePeriod** — period currently being played (`Date.now()` falls within kickoff..kickoff+duration+stoppage), or `null` if between periods
- **selectedPeriod** — which period the user is viewing (from window button)

### Three view states

1. **Viewing the live period** — scrolls normally, live dot pulses, rightEdge advances with `now`
2. **Viewing a past period** — frozen. leftEdge = kickoff, rightEdge = last data point in range. No live dot, no scrolling.
3. **Viewing "Full Match"** — leftEdge = first period kickoff, rightEdge advances with `now`. Full match scrolling live.

### Match-minute formatting

Converts unix timestamp to match minutes based on which period it falls in:
- 1st half: `minute = (t - kickoff1H) / 60` -> `23'`
- Stoppage: `minute > nominal` -> `45+2'`
- 2nd half: `minute = 45 + (t - kickoff2H) / 60` -> `67'`
- Full match view: cumulative across periods (0'-90'+)
- Period view: period-relative (0'-45'+)

### Window buttons

Auto-generated from `matchTimeline.periods` + appended "Full" button. Live period button gets a small pulsing dot indicator. Uses existing sliding-indicator infrastructure.

## Integration Points

### Files touched

- `src/types.ts` — add `MatchPeriod`, `MatchTimeline`, prop on `LivelineProps`
- `src/Liveline.tsx` — generate window buttons from periods, live indicator dot
- `src/useLivelineEngine.ts` — period-aware window edges, frozen detection, formatTime override
- `src/index.ts` — export new types

### What stays untouched

All draw modules (`drawFrame`, `drawMultiFrame`, `drawCandleFrame`), grid, crosshair, time axis, `toX`/`toY`, `computeRange`. The translation is purely at the edges: window computation + label formatting. Everything downstream works on unix seconds and doesn't care about match time.

## Usage

```tsx
<Liveline
  matchTimeline={{
    periods: [
      { id: '1H', label: "1st Half", kickoff: 1706800000, duration: 45 * 60 },
      { id: '2H', label: "2nd Half", kickoff: 1706803000, duration: 45 * 60 },
    ],
  }}
  series={series}
  fixedRange={{ min: 0, max: 100 }}
  scoreEvents={scoreEvents}
  scoreLabels={{ home: 'Arsenal', away: 'Chelsea' }}
  eventLines={eventLines}
  theme="dark"
/>
```
