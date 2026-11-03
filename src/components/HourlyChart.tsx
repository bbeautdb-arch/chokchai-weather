import type { HourlyPoint } from '../lib/weather'
import { formatHourLabel, summarizeUpcomingRain } from '../lib/weather'

interface Props {
  points: HourlyPoint[]
  nowTime?: string | null
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
      <div className="panel flex h-[140px] items-center justify-center text-[16px] font-semibold text-[var(--ink)]">
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
    <section id="hourly" aria-label="พยากรณ์รายชั่วโมง">
      <h3 className="font-display text-[20px] font-semibold text-[var(--ink)]">
        {points.length} ชั่วโมงข้างหน้า
      </h3>
      {rainy ? (
        <p className="caution mt-3">
          <UmbrellaIcon />
          <span>{summary}</span>
        </p>
      ) : (
        <p className="panel mt-3 px-3.5 py-3 text-[16px] font-semibold leading-snug text-[var(--ink)]">
          {summary}
        </p>
      )}

      <ul className="font-label mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[15px] text-[var(--ink-2)]">
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-[3px] w-5 rounded-full" style={{ background: 'var(--chart)' }} />
          อุณหภูมิ (°C)
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-[3px]" style={{ background: 'var(--chart)' }} />
          โอกาสฝน (%)
        </li>
      </ul>

      <div className="panel mt-3 p-3">
        <p className="font-display mb-2 text-[16px] font-semibold text-[var(--ink)]">อุณหภูมิ</p>
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <TempGroup key={group[0].time} points={group} tMin={tMin} tMax={tMax} nowTime={nowTime} />
          ))}
        </div>

        <p className="font-display mb-2 mt-4 text-[16px] font-semibold text-[var(--ink)]">โอกาสฝน</p>
        <div className="flex flex-col gap-4">
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
            <div
              key={`t-${p.time}`}
              className="font-display text-center text-[16px] font-semibold leading-none tabular text-[var(--ink)]"
            >
              <span className={now ? 'rounded-lg px-1 py-0.5' : undefined} style={now ? { background: 'var(--track)' } : undefined}>
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
            stroke="var(--chart)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            points={line}
          />
        </svg>
        {points.map((p, i) => (
          <span
            key={`d-${p.time}`}
            className="absolute h-2.5 w-2.5 rounded-full border-2"
            style={{
              left: `${((i + 0.5) / n) * 100}%`,
              top: `${yOf(p.temperature)}%`,
              transform: 'translate(-50%, -50%)',
              background: 'var(--chart)',
              borderColor: 'var(--panel)',
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
              <span className="font-display text-[15px] font-semibold leading-none tabular text-[var(--ink)]">
                {pct}%
              </span>
              <div className="mt-1 flex h-16 w-full items-end justify-center">
                <div
                  className="flex h-full w-[18px] items-end overflow-hidden rounded-[6px]"
                  style={{ background: 'var(--track)' }}
                >
                  <div
                    className="w-full rounded-[6px]"
                    style={{
                      height: `${barHeight(pct)}px`,
                      background: 'var(--chart)',
                      boxShadow: now ? 'inset 0 0 0 2px var(--ink)' : undefined,
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
    <div className="mt-1 grid" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
      {points.map((p) => {
        const now = p.time === nowTime
        return (
          <div key={`h-${p.time}`} className="text-center leading-tight">
            <div className="font-label text-[15px] tabular text-[var(--ink-2)]">{formatHourLabel(p.time)}</div>
            {now && <div className="font-label text-[15px] text-[var(--ink)]">ตอนนี้</div>}
          </div>
        )
      })}
    </div>
  )
}

function UmbrellaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3a8 8 0 0 0-8 8h16a8 8 0 0 0-8-8zm0 10.5V19a1.5 1.5 0 0 0 3 0v-.5h-1.5V13.5H12z"
      />
    </svg>
  )
}
