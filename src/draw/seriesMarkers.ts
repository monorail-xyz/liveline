import type { ChartLayout } from '../types'

/** A marker resolved to a concrete color, ready to draw. */
export interface DrawMarker {
  time: number
  value: number
  color: string
  side: 'buy' | 'sell'
  label?: string
  labelColor?: string
}

const SIZE = 5 // triangle half-width / height in px
const GAP = 2 // gap between the price point and the triangle's near vertex

/**
 * Draw trade markers as triangles sitting on their series line.
 * Buy → up-pointing triangle just below the point; sell → down-pointing
 * triangle just above. The triangle is filled in the series color with a
 * subtle dark outline for contrast; an optional label (e.g. realized PnL) is
 * drawn outside the triangle in its own color.
 *
 * Drawn above the series lines, below the crosshair.
 */
export function drawSeriesMarkers(
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  markers: DrawMarker[],
) {
  const { toX, toY, pad, w, chartH } = layout
  const top = pad.top
  const bottom = top + chartH

  for (const m of markers) {
    const x = toX(m.time)
    const y = toY(m.value)
    // Skip markers outside the visible chart area (small buffer for overhang).
    if (x < pad.left - SIZE - 2 || x > w - pad.right + SIZE + 2) continue
    if (y < top - SIZE - 2 || y > bottom + SIZE + 2) continue

    ctx.save()

    // Triangle path — apex near the point, base offset away from the line.
    ctx.beginPath()
    if (m.side === 'buy') {
      // up-pointing, body below the point
      ctx.moveTo(x, y + GAP)
      ctx.lineTo(x - SIZE, y + GAP + SIZE * 1.6)
      ctx.lineTo(x + SIZE, y + GAP + SIZE * 1.6)
    } else {
      // down-pointing, body above the point
      ctx.moveTo(x, y - GAP)
      ctx.lineTo(x - SIZE, y - GAP - SIZE * 1.6)
      ctx.lineTo(x + SIZE, y - GAP - SIZE * 1.6)
    }
    ctx.closePath()

    ctx.fillStyle = m.color
    ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.stroke()

    // Optional label (e.g. PnL) — outside the triangle, away from the line.
    if (m.label) {
      const fontSize = 9
      ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = m.side === 'buy' ? 'top' : 'bottom'
      const labelY = m.side === 'buy'
        ? y + GAP + SIZE * 1.6 + 3
        : y - GAP - SIZE * 1.6 - 3

      // Dark outline for readability against the line/grid.
      ctx.lineWidth = 2.5
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.lineJoin = 'round'
      ctx.strokeText(m.label, x, labelY)
      ctx.fillStyle = m.labelColor ?? m.color
      ctx.fillText(m.label, x, labelY)
    }

    ctx.restore()
  }
}
