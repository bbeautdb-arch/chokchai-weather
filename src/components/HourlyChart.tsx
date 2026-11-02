import type { HourlyPoint } from '../lib/weather'
import { formatHourLabel, summarizeUpcomingRain } from '../lib/weather'

interface Props {
  points: HourlyPoint[]
  nowTime?: string | null
}

function rainColor(prob: number): string {
  if (prob >= 60) return '#143A56'
  if (prob >= 30) return '#2A679E'
  return '#5E8FB8'
}

function barHeight(prob: number): number {
  const pct = Math.min(100, Math.max(0, prob))
  return Math.round(8 + (pct / 100) * 56)
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export function HourlyChart({ points, nowTime }: Props) {
  if (!points.length) {
    return (
      <div className="flex h-[120px] items-center justify-center rounded-2xl border border-white/70 bg-white/75 text-[16px] font-bold text-[var(--color-ink)]">
        ยังไม่มีข้อมูลรายชั่วโมง
      </div>
    )
  }

  const summary = summarizeUpcomingRain(points)
  const rainy = !summary.includes('ไม่น่ามีฝน')
  const temps = points.map((p) => p.temperature)
  const tMin = Math.min(...temps)
  const tMax = Math.max(...temps)
  const groups = chunk(points, 6)

  return (
    <section aria-label="พยากรณ์รายชั่วโมง">
      <h3 className="text-[18px] font-bold leading-tight text-[var(--color-ink)] md:text-[20px]">
        {points.length} ชั่วโมงข้างหน้า
      </h3>
      <p
        className="mt-2 rounded-2xl px-3.5 py-3 text-[17px] font-bold leading-snug md:text-[18px]"
        style={{
          background: rainy ? 'rgba(255, 214, 170, 0.92)' : 'rgba(255,255,255,0.88)',
          color: rainy ? '#7A3208' : '#1A120C',
        }}
      >
        {summary}
      </p>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[14px] font-bold text-[var(--color-ink)]">
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-[3px] w-5 rounded-full bg-[#8C4A12]" />
          อุณหภูมิ (°C)
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-[3px] bg-[#2F6FA8]" />
          โอกาสฝน (%)
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-[3px] bg-[#5E8FB8]" />
          น้อย
          <span className="inline-block h-3 w-3 rounded-[3px] bg-[#143A56]" />
          มาก
        </li>
      </ul>

      <div className="mt-3 rounded-2xl border border-white/80 bg-white/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <p className="mb-2 text-[15px] font-bold text-[var(--color-ink)]">อุณหภูมิ</p>
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <TempGroup key={group[0].time} points={group} tMin={tMin} tMax={tMax} nowTime={nowTime} />
          ))}
        </div>

        <p className="mb-2 mt-4 text-[15px] font-bold text-[var(--color-ink)]">โอกาสฝน</p>
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <RainGroup key={`rain-${group[0].time}`} points={group} nowTime={nowTime} />
          ))}
        </div>
      </div>
    </section>
  )
}

function TempGroup({
  points,
  tMin,
  tMax,
  nowTime,
}: {
  points: HourlyPoint[]
  tMin: number
  tMax: number
  nowTime?: string | null
}) {
  const span = Math.max(tMax - tMin, 1)
  const n = points.length
  const yOf = (t: number) => 8 + ((tMax - t) / span) * 72
  const line = points
    .map((p, i) => `${((i + 0.5) / n) * 100},${yOf(p.temperature).toFixed(1)}`)
    .join(' ')

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {points.map((p) => {
          const now = p.time === nowTime
          return (
            <div key={`t-${p.time}`} className="text-center text-[18px] font-bold leading-none tabular text-[#1A120C]">
              <span className={now ? 'rounded-lg bg-[#F4E2CC] px-1 py-0.5' : undefined}>
                {Math.round(p.temperature)}°
              </span>
            </div>
          )
        })}
      </div>
      <div className="relative mt-1 h-12">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            fill="none"
            stroke="#8C4A12"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            points={line}
          />
        </svg>
        {points.map((p, i) => (
          <span
            key={`d-${p.time}`}
            className="absolute h-2.5 w-2.5 rounded-full border-2 border-white bg-[#8C4A12]"
            style={{
              left: `${((i + 0.5) / n) * 100}%`,
              top: `${yOf(p.temperature)}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>
      <HourLabels points={points} nowTime={nowTime} />
    </div>
  )
}

function RainGroup({ points, nowTime }: { points: HourlyPoint[]; nowTime?: string | null }) {
  const n = points.length
  return (
    <div>
      <div className="grid items-end" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {points.map((p) => {
          const now = p.time === nowTime
          const pct = Math.round(p.precipProb)
          return (
            <div key={`r-${p.time}`} className="flex flex-col items-center">
              <span
                className={`text-[16px] font-bold leading-none tabular ${now ? 'text-[#7A3208]' : 'text-[#143A56]'}`}
              >
                {pct}%
              </span>
              <div className="mt-1 flex h-16 w-full items-end justify-center">
                <div className="flex h-full w-[18px] items-end overflow-hidden rounded-[6px] bg-[#E6EEF5]">
                  <div
                    className="w-full rounded-[6px]"
                    style={{
                      height: `${barHeight(pct)}px`,
                      background: rainColor(pct),
                      boxShadow: now ? 'inset 0 0 0 2px #7A3208' : undefined,
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <HourLabels points={points} nowTime={nowTime} />
    </div>
  )
}

function HourLabels({ points, nowTime }: { points: HourlyPoint[]; nowTime?: string | null }) {
  return (
    <div
      className="mt-1 grid"
      style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
    >
      {points.map((p) => {
        const now = p.time === nowTime
        return (
          <div key={`h-${p.time}`} className="text-center leading-tight">
            <div className={`text-[13px] font-bold tabular ${now ? 'text-[#7A3208]' : 'text-[#2A2622]'}`}>
              {formatHourLabel(p.time)}
            </div>
            {now && <div className="text-[12px] font-bold text-[#7A3208]">ตอนนี้</div>}
          </div>
        )
      })}
    </div>
  )
}
