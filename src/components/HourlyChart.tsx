import { useRef } from 'react'
import type { HourlyPoint } from '../lib/weather'
import {
  formatHourLabel,
  hourRole,
  hourStatusLabel,
  rainTickCount,
  rainTicksAreStrong,
  segmentDash,
  type HourRole,
} from '../lib/forecastView'

interface Props {
  points: HourlyPoint[]
  nowTime: string | null
  selectedTime: string | null
  today: string
  onSelect: (time: string) => void
}

export function HourlyChart({ points, nowTime, selectedTime, today, onSelect }: Props) {
  const rowRef = useRef<HTMLDivElement>(null)
  if (!points.length) {
    return (
      <div className="panel flex h-[140px] items-center justify-center text-[16px] font-semibold text-[var(--ink)]">
        ยังไม่มีข้อมูลรายชั่วโมง
      </div>
    )
  }

  const active = selectedTime ?? nowTime
  const temps = points.map((p) => p.temperature).filter((t): t is number => t != null)
  const tMin = Math.min(...temps, 0)
  const tMax = Math.max(...temps, 1)
  const span = Math.max(tMax - tMin, 1)
  const yOf = (t: number) => 8 + ((tMax - t) / span) * 64
  const col = 68
  const n = points.length

  const move = (dir: number) => {
    const idx = Math.max(0, points.findIndex((p) => p.time === active))
    const next = points[Math.min(n - 1, Math.max(0, idx + dir))]
    if (next) onSelect(next.time)
  }

  return (
    <section id="hourly" aria-label="พยากรณ์รายชั่วโมง">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[20px] font-semibold text-[var(--ink)]">รายชั่วโมง</h3>
        <p className="font-label text-[15px] text-[var(--ink)]">เลื่อนเลือกชั่วโมง</p>
      </div>
      <div
        ref={rowRef}
        className="hour-scroll panel"
        role="listbox"
        aria-label="เลือกชั่วโมง"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            move(1)
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            move(-1)
          } else if (e.key === 'Home') {
            e.preventDefault()
            if (nowTime) onSelect(nowTime)
          }
        }}
      >
        <svg
          className="temp-line"
          width={n * col}
          height={78}
          aria-hidden="true"
        >
          {points.map((p, i) => {
            const next = points[i + 1]
            if (p.temperature == null || !next || next.temperature == null) return null
            const dash = segmentDash(i, n)
            return (
              <line
                key={p.time}
                x1={i * col + col / 2}
                y1={yOf(p.temperature)}
                x2={(i + 1) * col + col / 2}
                y2={yOf(next.temperature)}
                stroke="var(--chart)"
                strokeWidth="2"
                strokeLinecap="butt"
                strokeDasharray={dash}
              />
            )
          })}
          {points.map((p, i) => {
            if (p.time !== active) return null
            const x = i * col + col / 2
            return (
              <line
                key={`mark-${p.time}`}
                x1={x}
                x2={x}
                y1={2}
                y2={76}
                stroke="#8a847c"
                strokeWidth="1.25"
              />
            )
          })}
          {points.map((p, i) =>
            p.temperature == null ? null : (
              <circle
                key={`d-${p.time}`}
                cx={i * col + col / 2}
                cy={yOf(p.temperature)}
                r={p.time === active ? 5 : 2.5}
                fill="var(--chart)"
              />
            ),
          )}
        </svg>
        <div className="hour-row" style={{ width: n * col }}>
          {points.map((p) => {
            const role: HourRole = hourRole(p, nowTime ?? '', today)
            const selected = p.time === active
            const ticks = rainTickCount(p.precipProb)
            const strong = rainTicksAreStrong(p.precipProb)
            const status = hourStatusLabel(role)
            return (
              <button
                key={p.time}
                type="button"
                role="option"
                aria-selected={selected}
                className={selected ? 'hour-col is-selected' : 'hour-col'}
                style={{ width: col }}
                onClick={() => onSelect(p.time)}
              >
                <span className="font-display text-[16px] font-semibold tabular text-[var(--ink)]">
                  {p.temperature == null ? '—' : `${Math.round(p.temperature)}°`}
                </span>
                <span className={strong ? 'tick-stack is-strong' : 'tick-stack'} aria-hidden="true">
                  {Array.from({ length: 10 }, (_, i) => {
                    const on = ticks != null && i < ticks
                    return <i key={i} className={on ? 'tick is-on' : 'tick'} />
                  })}
                </span>
                <span className="font-label text-[15px] tabular text-[var(--ink)]">
                  {p.precipProb == null ? '—' : `${Math.round(p.precipProb)}%`}
                </span>
                <span className="font-label text-[15px] tabular text-[var(--ink)]">{formatHourLabel(p.time)}</span>
                <span className="font-label text-[15px] text-[var(--ink)]">{status === 'พยากรณ์' ? '' : status}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
