import * as react_jsx_runtime from 'react/jsx-runtime';
import { CSSProperties, ReactElement } from 'react';

interface LivelinePoint {
    time: number;
    value: number;
}
type Momentum = 'up' | 'down' | 'flat';
type ThemeMode = 'light' | 'dark';
type WindowStyle = 'default' | 'rounded' | 'text';
type BadgeVariant = 'default' | 'minimal';
interface ReferenceLine {
    value: number;
    label?: string;
}
interface ScoreEvent {
    /** Unix timestamp in seconds when the goal was scored */
    time: number;
    /** Which side scored */
    side: 'home' | 'away';
}
interface MatchPeriod {
    /** Unique period identifier, e.g. '1H', '2H', 'ET1', 'ET2' */
    id: string;
    /** Display label, e.g. '1st Half', '2nd Half' */
    label: string;
    /** Unix seconds when this period kicked off */
    kickoff: number;
    /** Nominal duration in seconds (e.g. 45*60 for a half) */
    duration: number;
    /** Unix seconds when the referee blew the whistle to end this period. When set and now > endTime, the period is frozen. */
    endTime?: number;
}
interface MatchTimeline {
    /** Periods ordered chronologically. Consumer adds dynamically as feed reports. */
    periods: MatchPeriod[];
}
interface EventLine {
    /** Unix timestamp in seconds — same time axis as LivelinePoint.time */
    time: number;
    /** Short label shown above the line (e.g. "⚽ Goal", "🟨 Yellow") */
    label?: string;
    /** Line color (default: palette-derived muted white) */
    color?: string;
    /** Dash pattern [dash, gap] in px (default: [4, 4]) */
    dash?: [number, number];
    /** Line width in px (default: 1) */
    width?: number;
}
interface HoverPoint {
    time: number;
    value: number;
    x: number;
    y: number;
}
interface Padding {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
}
interface WindowOption {
    label: string;
    secs: number;
}
interface OrderbookData {
    bids: [number, number][];
    asks: [number, number][];
}
interface DegenOptions {
    /** Multiplier for particle count and size (default 1) */
    scale?: number;
    /** Show particles on down-momentum swings (default false) */
    downMomentum?: boolean;
}
interface LivelineSeries {
    id: string;
    data: LivelinePoint[];
    value: number;
    color: string;
    label?: string;
}
interface LivelineProps {
    data: LivelinePoint[];
    value: number;
    series?: LivelineSeries[];
    theme?: ThemeMode;
    color?: string;
    window?: number;
    grid?: boolean;
    badge?: boolean;
    momentum?: boolean | Momentum;
    fill?: boolean;
    loading?: boolean;
    paused?: boolean;
    emptyText?: string;
    scrub?: boolean;
    exaggerate?: boolean;
    showValue?: boolean;
    valueMomentumColor?: boolean;
    degen?: boolean | DegenOptions;
    badgeTail?: boolean;
    windows?: WindowOption[];
    onWindowChange?: (secs: number) => void;
    windowStyle?: WindowStyle;
    badgeVariant?: BadgeVariant;
    tooltipY?: number;
    tooltipOutline?: boolean;
    tooltipFade?: boolean;
    orderbook?: OrderbookData;
    fixedRange?: {
        min: number;
        max: number;
    };
    eventLines?: EventLine[];
    scoreEvents?: ScoreEvent[];
    /** Labels for score display (default: series labels or "Home"/"Away") */
    scoreLabels?: {
        home: string;
        away: string;
    };
    /** Match timeline — enables period-aware windows, match-minute labels */
    matchTimeline?: MatchTimeline;
    /** Which period to display (e.g. '1H', '2H', 'full'). Controlled by the caller. */
    selectedPeriodId?: string;
    referenceLine?: ReferenceLine;
    formatValue?: (v: number) => string;
    formatTime?: (t: number) => string;
    lerpSpeed?: number;
    padding?: Padding;
    onHover?: (point: HoverPoint | null) => void;
    cursor?: string;
    pulse?: boolean;
    mode?: 'line' | 'candle';
    candles?: CandlePoint[];
    candleWidth?: number;
    liveCandle?: CandlePoint;
    lineMode?: boolean;
    lineData?: LivelinePoint[];
    lineValue?: number;
    onModeChange?: (mode: 'line' | 'candle') => void;
    onSeriesToggle?: (id: string, visible: boolean) => void;
    seriesToggleCompact?: boolean;
    /** Image URL rendered centered behind the chart (below the transparent canvas). */
    backgroundImage?: string;
    className?: string;
    style?: CSSProperties;
}
interface CandlePoint {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

declare function Liveline({ data, value, series: seriesProp, theme, color, window: windowSecs, grid, badge, momentum, fill, scrub, loading, paused, emptyText, exaggerate, degen: degenProp, badgeTail, badgeVariant, showValue, valueMomentumColor, windows, onWindowChange, windowStyle, tooltipY, tooltipOutline, tooltipFade, orderbook, referenceLine, formatValue, formatTime, lerpSpeed, padding: paddingOverride, onHover, cursor, pulse, mode, candles, candleWidth, liveCandle, lineMode, lineData, lineValue, onModeChange, onSeriesToggle, seriesToggleCompact, fixedRange, eventLines, scoreEvents, scoreLabels, matchTimeline, selectedPeriodId, backgroundImage, className, style, }: LivelineProps): react_jsx_runtime.JSX.Element;

interface LivelineTransitionProps {
    /** Key of the active child to display. Must match a child's `key` prop. */
    active: string;
    /** Chart elements with unique `key` props */
    children: ReactElement | ReactElement[];
    /** Cross-fade duration in ms (default 300) */
    duration?: number;
    className?: string;
    style?: CSSProperties;
}
/**
 * Cross-fade between chart components (e.g. line ↔ candlestick).
 * Children must have unique `key` props matching possible `active` values.
 *
 * @example
 * ```tsx
 * <LivelineTransition active={chartType}>
 *   <Liveline key="line" data={data} value={value} />
 *   <Liveline key="candle" mode="candle" candles={candles} candleWidth={5} data={data} value={value} />
 * </LivelineTransition>
 * ```
 */
declare function LivelineTransition({ active, children, duration, className, style, }: LivelineTransitionProps): react_jsx_runtime.JSX.Element;

export { type BadgeVariant, type CandlePoint, type DegenOptions, type EventLine, type HoverPoint, Liveline, type LivelinePoint, type LivelineProps, type LivelineSeries, LivelineTransition, type LivelineTransitionProps, type MatchPeriod, type MatchTimeline, type Momentum, type OrderbookData, type Padding, type ReferenceLine, type ScoreEvent, type ThemeMode, type WindowOption, type WindowStyle };
