import type { HourlyPoint } from '../lib/weather'

interface Props {
  points: HourlyPoint[]
  peakHour: number | null
}

export function HourlyChart({ points, peakHour }: Props) {
  if (!points.length) {
    return (
      <div className="h-[160px] rounded-[14px] bg-white/25 border border-white/45 flex items-center justify-center text-[13px] text-[var(--color-ink-soft)]">
        ยังไม่มีข้อมูลรายชั่วโมง
      </div>
    )
  }

  const W = 360
  const H = 148
  const baseY = 108
  const barW = 18
  const startX = 40
  const step = points.length > 1 ? (328 - 40) / (points.length - 1) : 0
  const temps = points.map((p) => p.temperature)
  const tMin = Math.min(...temps, 20)
  const tMax = Math.max(...temps, 32)
  const tSpan = Math.max(tMax - tMin, 1)

  const tempY = (t: number) => 28 + ((tMax - t) / tSpan) * 80
  const barH = (p: number) => (p / 100) * 90

  const linePoints = points
    .map((p, i) => `${startX + i * step},${tempY(p.temperature).toFixed(1)}`)
    .join(' ')

  return (
    <div className="mt-1">
      <div className="mb-2 flex flex-wrap gap-x-3.5 gap-y-2 text-[12px] font-semibold text-[var(--color-ink-soft)]">
        <span className="inline-flex items-center gap-1.5">
          <b className="inline-block h-2.5 w-2.5 rounded-[3px] bg-gradient-to-b from-[#7EB6E8] to-[#3B6E99]" />
          โอกาสฝน %
        </span>
        <span className="inline-flex items-center gap-1.5">
          <b className="inline-block h-[3px] w-3.5 rounded bg-[#C4A574]" />
          อุณหภูมิ °C
        </span>
        {peakHour != null && (
          <span className="font-bold text-[var(--color-warn)]">▲ พีค {String(peakHour).padStart(2, '0')}:00</span>
        )}
      </div>
      <svg
        className="block h-[160px] w-full rounded-[14px] bg-white/30 border border-white/45 md:h-[180px]"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="กราฟฝนและอุณหภูมิรายชั่วโมง"
      >
        <defs>
          <linearGradient id="rainFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8EC5F2" />
            <stop offset="100%" stopColor="#3B6E99" />
          </linearGradient>
          <linearGradient id="peakBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFC078" />
            <stop offset="100%" stopColor="#C46A20" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g stroke="rgba(80,70,55,0.12)" strokeWidth="1">
          <line x1="28" y1="18" x2="350" y2="18" />
          <line x1="28" y1="48" x2="350" y2="48" />
          <line x1="28" y1="78" x2="350" y2="78" />
          <line x1="28" y1="108" x2="350" y2="108" />
        </g>
        <g fill="#6B635A" fontSize="8" fontWeight="600">
          <text x="4" y="21">
            100
          </text>
          <text x="8" y="51">
            70
          </text>
          <text x="8" y="81">
            40
          </text>
          <text x="12" y="111">
            10
          </text>
        </g>
        <g>
          {points.map((p, i) => {
            const cx = startX + i * step
            const h = barH(p.precipProb)
            const isPeak = peakHour != null && p.hour === peakHour
            return (
              <rect
                key={p.time}
                x={cx - barW / 2}
                y={baseY - h}
                width={barW}
                height={Math.max(h, 2)}
                rx={5}
                fill={isPeak ? 'url(#peakBar)' : 'url(#rainFill)'}
                opacity={isPeak ? 1 : 0.88}
                filter={isPeak ? 'url(#glow)' : undefined}
              />
            )
          })}
        </g>
        <polyline
          fill="none"
          stroke="#C4A574"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={linePoints}
        />
        <g fill="#C4A574">
          {points.map((p, i) => {
            const cx = startX + i * step
            const cy = tempY(p.temperature)
            const isPeak = peakHour != null && p.hour === peakHour
            return (
              <circle
                key={`t-${p.time}`}
                cx={cx}
                cy={cy}
                r={isPeak ? 3.6 : 3.2}
                fill={isPeak ? '#C46A20' : '#C4A574'}
              />
            )
          })}
        </g>
        {peakHour != null &&
          (() => {
            const idx = points.findIndex((p) => p.hour === peakHour)
            if (idx < 0) return null
            const cx = startX + idx * step
            return (
              <g>
                <line
                  x1={cx}
                  y1={14}
                  x2={cx}
                  y2={108}
                  stroke="rgba(196,106,32,0.35)"
                  strokeDasharray="3 3"
                />
                <rect
                  x={cx - 22}
                  y={3}
                  width={44}
                  height={16}
                  rx={8}
                  fill="rgba(196,106,32,0.95)"
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth={0.8}
                />
                <text
                  x={cx}
                  y={14}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="8"
                  fontWeight="700"
                >
                  พีค
                </text>
              </g>
            )
          })()}
      </svg>
      <div
        className="mt-1.5 grid text-center text-[11px] font-bold tabular text-[var(--color-ink-soft)]"
        style={{ gridTemplateColumns: `repeat(${points.length}, 1fr)` }}
      >
        {points.map((p) => (
          <span
            key={`lbl-${p.time}`}
            className={peakHour === p.hour ? 'text-[var(--color-warn)]' : undefined}
          >
            {String(p.hour).padStart(2, '0')}
          </span>
        ))}
      </div>
    </div>
  )
}
