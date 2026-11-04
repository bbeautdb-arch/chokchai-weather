import type { ReactNode } from 'react'
import type { WeatherBundle } from '../lib/weather'
import { isNightTime, upcomingHours, upcomingRain } from '../lib/weather'
import { HourlyChart } from './HourlyChart'
import { WeatherIcon } from './WeatherIcon'

export function isHeatCaution(data: WeatherBundle): boolean {
  return data.current.temperature >= 37 || data.current.apparentTemperature >= 40
}

function windowRain(data: WeatherBundle) {
  return upcomingRain(upcomingHours(data.hourly, 12))
}

export function WeatherDetails({ data }: { data: WeatherBundle }) {
  const points = upcomingHours(data.hourly, 12)
  const nowTime = points[0]?.time ?? null
  const heat = isHeatCaution(data)

  return (
    <article id="details" className="glass glass-solid p-4 md:p-6" aria-label="รายละเอียดอากาศ">
      <h2 className="font-display text-[18px] font-semibold text-[var(--ink)]">รายละเอียด</h2>
      <div className="mt-2">
        <StatRow label="สูงสุด / ต่ำสุดวันนี้" value={`${Math.round(data.daily.tempMax)}° / ${Math.round(data.daily.tempMin)}°`} />
        <StatRow label="ความชื้น" value={`${Math.round(data.current.humidity)}%`} />
        <StatRow label="ลม" value={`${Math.round(data.current.windSpeed)} กม./ชม.`} />
        <StatRow label="รู้สึกเหมือน" value={`${Math.round(data.current.apparentTemperature)}°`} />
        {heat && (
          <div className="mt-3">
            <p className="caution">
              <HeatIcon />
              <span>
                อากาศร้อนจัด {Math.round(data.current.temperature)}° · หลบแดดและดื่มน้ำ
              </span>
            </p>
          </div>
        )}
      </div>
      <div className="mt-6">
        <HourlyChart points={points} nowTime={nowTime} />
      </div>
    </article>
  )
}

function rainBadge(pct: number, storm: boolean, caution: boolean): string {
  if (storm) return `พายุ · ฝน ${pct}% · อยู่ในที่ร่ม`
  if (caution) return `โอกาสฝน ${pct}%`
  return '12 ชม. ไม่น่ามีฝน'
}

export function AnswerHero({
  data,
  storm,
  compact = false,
}: {
  data: WeatherBundle
  storm: boolean
  compact?: boolean
}) {
  const night = isNightTime(data.timeOfDay)
  const rain = windowRain(data)
  const showCaution = storm || rain.caution
  const badge = rainBadge(rain.pct, storm, rain.caution)
  const temp = Math.round(data.current.temperature)

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <WeatherIcon scene={data.scene} night={night} className="h-11 w-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span data-measure="hero" className="font-display tabular text-[40px] font-bold leading-none text-[var(--ink)]">{temp}°</span>
            <span data-measure="condition" className="truncate text-[15px] font-semibold leading-snug text-[var(--ink)]">{data.conditionLabel}</span>
          </div>
          <p className="mt-1 text-[15px] font-semibold">
            {showCaution ? (
              <span data-measure="badge" className="caution px-2.5 py-1 text-[15px]">
                <DropIcon />
                {badge}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[var(--ink)]">
                <DropIcon />
                {badge}
              </span>
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        <WeatherIcon scene={data.scene} night={night} className="h-24 w-24 shrink-0" />
        <p data-measure="hero" className="font-display tabular text-[96px] font-bold leading-none text-[var(--ink)]">{temp}°</p>
      </div>
      <p data-measure="condition" className="mt-3 text-[18px] font-semibold leading-snug text-[var(--ink)]">{data.conditionLabel}</p>
      <p data-measure="body" className="mt-2 text-[16px] font-semibold text-[var(--ink)]">
        สูงสุด {Math.round(data.daily.tempMax)}° · ต่ำสุด {Math.round(data.daily.tempMin)}°
      </p>
      <p className="text-[16px] font-semibold text-[var(--ink)]">
        รู้สึกเหมือน {Math.round(data.current.apparentTemperature)}°
      </p>
      <p className="mt-3 text-[16px] font-semibold">
        {showCaution ? (
          <span data-measure="badge" className="caution">
            <DropIcon />
            {badge}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[var(--ink)]">
            <DropIcon />
            {badge}
          </span>
        )}
      </p>
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
