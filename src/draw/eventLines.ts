import type { LivelinePalette, ChartLayout, EventLine } from '../types'

/**
 * Draw vertical event marker lines at specific timestamps.
 * Lines scroll with the chart and clip to the chart area.
 *
 * Drawing order: between grid and series lines (behind data, above grid).
 */
export function drawEventLines(
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  events: EventLine[],
) {
  const { pad, toX, chartH } = layout
  const top = pad.top
  const bottom = top + chartH

  for (const ev of events) {
    const x = toX(ev.time)

    // Skip if outside visible chart area (with small buffer for label overhang)
    if (x < pad.left - 20 || x > layout.w - pad.right + 20) continue

    const color = ev.color ?? palette.gridLine
    const dash = ev.dash ?? [4, 4]
    const lineWidth = ev.width ?? 1

    // Vertical dashed line
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.setLineDash(dash)
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x, bottom)
    ctx.stroke()
    ctx.setLineDash([])

    // Label above the line
    if (ev.label) {
      const fontSize = 10
      ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`
      const textW = ctx.measureText(ev.label).width
      const pillPadX = 5
      const pillPadY = 3
      const pillW = textW + pillPadX * 2
      const pillH = fontSize + pillPadY * 2
      const pillX = x - pillW / 2
      const pillY = top - pillH - 4

      // Pill background
      ctx.fillStyle = color + '1a'  // ~10% opacity of the line color
      ctx.beginPath()
      roundRect(ctx, pillX, pillY, pillW, pillH, 4)
      ctx.fill()

      // Pill border
      ctx.strokeStyle = color + '33'  // ~20% opacity
      ctx.lineWidth = 0.5
      ctx.beginPath()
      roundRect(ctx, pillX, pillY, pillW, pillH, 4)
      ctx.stroke()

      // Label text
      ctx.fillStyle = color
      ctx.globalAlpha = 0.85
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(ev.label, x, pillY + pillH / 2)
    }

    ctx.restore()
  }
}

/** Tiny roundRect helper (avoids needing ctx.roundRect which isn't in all targets) */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
