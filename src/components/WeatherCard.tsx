import type { ReactNode } from 'react'
import type { HourlyPoint, SceneKey, WeatherBundle } from '../lib/weather'
import type { HourRole, WindowRain } from '../lib/forecastView'
import { hourStatusLabel } from '../lib/forecastView'
import { HourlyChart } from './HourlyChart'
import { WeatherIcon } from './WeatherIcon'

function isHeatCaution(temp: number | null, feels: number | null): boolean {
  return (temp != null && temp >= 37) || (feels != null && feels >= 40)
}

export interface ShownWeather {
  temperature: number | null
  condition: string
  scene: SceneKey
  night: boolean
  humidity: number | null
  wind: number | null
  feels: number | null
  role: HourRole
  clock: string
  storm: boolean
}

function rainBadge(rain: WindowRain, storm: boolean): string | null {
  if (storm && rain.pct != null) return `พายุ · ฝน ${rain.pct}% · อยู่ในที่ร่ม`
  if (rain.caution && rain.pct != null) return rain.summary
  return null
}

export function WeatherDetails({
  data,
  shown,
  points,
  nowTime,
  selectedTime,
  today,
  onSelect,
}: {
  data: WeatherBundle
  shown: ShownWeather
  points: HourlyPoint[]
  nowTime: string | null
  selectedTime: string | null
  today: string
  onSelect: (time: string) => void
}) {
  const heat = isHeatCaution(shown.temperature, shown.feels)
  return (
    <article id="details" className="glass glass-solid p-4 md:p-6" aria-label="รายละเอียดอากาศ">
      <h2 data-measure="glass" className="font-display text-[20px] font-semibold text-[var(--ink)]">รายละเอียด</h2>
      <p className="mt-1 text-[15px] font-semibold text-[var(--ink)]">{hourStatusLabel(shown.role)} · {shown.clock}</p>
      <div className="mt-2">
        <StatRow label="สูงสุด / ต่ำสุดวันนี้" value={`${Math.round(data.daily.tempMax)}° / ${Math.round(data.daily.tempMin)}°`} />
        {shown.humidity != null && <StatRow label="ความชื้น" value={`${Math.round(shown.humidity)}%`} />}
        {shown.wind != null && <StatRow label="ลม" value={`${Math.round(shown.wind)} กม./ชม.`} />}
        {shown.feels != null && <StatRow label="รู้สึกเหมือน" value={`${Math.round(shown.feels)}°`} />}
        {heat && shown.temperature != null && (
          <div className="mt-3">
            <p className="caution is-heat">
              <HeatIcon />
              <span>อากาศร้อนจัด {Math.round(shown.temperature)}° · หลบแดดและดื่มน้ำ</span>
            </p>
          </div>
        )}
      </div>
      <div className="mt-6">
        <HourlyChart
          points={points}
          nowTime={nowTime}
          selectedTime={selectedTime}
          today={today}
          onSelect={onSelect}
        />
      </div>
    </article>
  )
}

export function AnswerHero({
  shown,
  summary,
  rain,
  compact = false,
  onNow,
}: {
  shown: ShownWeather
  summary: string
  rain: WindowRain
  compact?: boolean
  onNow: () => void
}) {
  const badge = rainBadge(rain, shown.storm)
  const temp = shown.temperature == null ? '—' : `${Math.round(shown.temperature)}°`
  const cautionClass = shown.storm ? 'caution is-heat' : rain.strong ? 'caution is-rain' : 'caution'

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <WeatherIcon scene={shown.scene} night={shown.night} className="mono-wx h-11 w-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-label text-[15px] text-[var(--ink)]">{hourStatusLabel(shown.role)} · {shown.clock}</p>
          <div className="flex items-baseline gap-2">
            <span data-measure="hero" className="font-display tabular text-[40px] font-bold leading-none text-[var(--ink)]">{temp}</span>
            <span data-measure="condition" className="truncate text-[15px] font-semibold leading-snug text-[var(--ink)]">{shown.condition}</span>
          </div>
          <p data-measure="body" className="mt-1 text-[15px] font-semibold leading-snug text-[var(--ink)]">{summary}</p>
          {badge && (
            <p className="mt-1">
              <span data-measure="badge" className={`${cautionClass} px-2.5 py-1 text-[15px]`}>
                <DropIcon />
                {badge}
              </span>
            </p>
          )}
          {shown.role !== 'now' && (
            <button type="button" className="now-btn mt-2" onClick={onNow}>
              ตอนนี้
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <p className="font-label text-[15px] text-[var(--ink)]">{hourStatusLabel(shown.role)} · {shown.clock}</p>
      <div className="mt-2 flex items-center gap-3">
        <WeatherIcon scene={shown.scene} night={shown.night} className="mono-wx h-20 w-20 shrink-0" />
        <p data-measure="hero" className="font-display tabular text-[72px] font-bold leading-none text-[var(--ink)] min-[900px]:text-[88px]">{temp}</p>
      </div>
      <p data-measure="condition" className="mt-3 text-[18px] font-semibold leading-snug text-[var(--ink)]">{shown.condition}</p>
      <p data-measure="body" className="mt-2 text-[16px] font-semibold leading-snug text-[var(--ink)]">{summary}</p>
      {badge && (
        <p className="mt-3 text-[16px] font-semibold">
          <span data-measure="badge" className={cautionClass}>
            <DropIcon />
            {badge}
          </span>
        </p>
      )}
      {shown.role !== 'now' && (
        <button type="button" className="now-btn mt-3" onClick={onNow}>
          ตอนนี้
        </button>
      )}
    </div>
  )
}

function StatRow({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="row">
      <span data-measure="body" className="inline-flex items-center gap-2 text-[var(--ink)]">
        {icon}
        {label}
      </span>
      <strong className="font-display tabular text-[18px] font-semibold text-[var(--ink)]">{value}</strong>
    </div>
  )
}

export function WeatherSkeleton() {
  return (
    <article className="glass animate-pulse p-4 md:p-6" aria-busy="true" aria-label="กำลังโหลดอากาศ">
      <div className="mb-4 h-4 w-32 rounded bg-white/50" />
      <div className="mb-4 h-16 w-40 rounded bg-white/60" />
      <div className="space-y-3">
        <div className="h-10 rounded bg-white/40" />
        <div className="h-10 rounded bg-white/40" />
        <div className="h-10 rounded bg-white/40" />
      </div>
      <div className="mt-6 h-40 rounded-2xl bg-white/35" />
    </article>
  )
}

function DropIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path fill="currentColor" d="M12 3s6 6.2 6 10.2A6 6 0 1 1 6 13.2C6 9.2 12 3 12 3z" />
    </svg>
  )
}

function HeatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4 19 19M19 5l-1.6 1.6M6.6 17.4 5 19" />
      </g>
    </svg>
  )
}
