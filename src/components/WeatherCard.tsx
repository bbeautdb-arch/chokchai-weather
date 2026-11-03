import type { ReactNode } from 'react'
import type { WeatherBundle } from '../lib/weather'
import { CHOKCHAI, isNightTime, upcomingHours } from '../lib/weather'
import { HourlyChart } from './HourlyChart'
import { WeatherIcon } from './WeatherIcon'

export function rainProbability(data: WeatherBundle): number {
  const points = upcomingHours(data.hourly, 12)
  const upcoming = points.reduce((max, p) => Math.max(max, p.precipProb), 0)
  return Math.round(Math.max(data.daily.precipProbMax, upcoming))
}

export function isHeatCaution(data: WeatherBundle): boolean {
  return data.current.temperature >= 37 || data.current.apparentTemperature >= 40
}

export function isRainCaution(data: WeatherBundle, storm: boolean): boolean {
  if (storm) return true
  if (data.current.precipitation > 0) return true
  return rainProbability(data) >= 40
}

export function WeatherDetails({ data, storm }: { data: WeatherBundle; storm: boolean }) {
  const points = upcomingHours(data.hourly, 12)
  const nowTime = points[0]?.time ?? null
  const rain = rainProbability(data)
  const rainCaution = isRainCaution(data, storm)
  const heat = isHeatCaution(data)

  return (
    <article id="details" className="glass p-4 md:p-6" aria-label="รายละเอียดอากาศ">
      <h2 className="font-display text-[18px] font-semibold text-[var(--ink)]">รายละเอียด</h2>
      <div className="mt-2">
        <StatRow label="สูงสุด / ต่ำสุดวันนี้" value={`${Math.round(data.daily.tempMax)}° / ${Math.round(data.daily.tempMin)}°`} />
        <StatRow label="ความชื้น" value={`${Math.round(data.current.humidity)}%`} />
        <StatRow label="ลม" value={`${Math.round(data.current.windSpeed)} กม./ชม.`} />
        <StatRow label="รู้สึกเหมือน" value={`${Math.round(data.current.apparentTemperature)}°`} />
        {rainCaution ? (
          <div className="mt-3">
            <p className="caution">
              <DropIcon />
              <span>
                {storm
                  ? `พายุ · โอกาสฝน ${rain}% · พกร่มและอยู่ในที่ร่ม`
                  : `โอกาสฝน ${rain}% · พกร่ม`}
              </span>
            </p>
          </div>
        ) : (
          <StatRow label="โอกาสฝน" value={`${rain}%`} icon={<DropIcon />} />
        )}
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

export function AnswerHero({
  data,
  storm,
  sample,
  compact = false,
}: {
  data: WeatherBundle
  storm: boolean
  sample: boolean
  compact?: boolean
}) {
  const night = isNightTime(data.timeOfDay)
  const rain = rainProbability(data)
  const rainCaution = isRainCaution(data, storm)
  const temp = Math.round(data.current.temperature)

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <WeatherIcon scene={data.scene} night={night} className="h-11 w-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display tabular text-[40px] font-bold leading-none text-[var(--ink)]">{temp}°</span>
            <span className="truncate text-[15px] font-semibold leading-snug text-[var(--ink)]">{data.conditionLabel}</span>
          </div>
          <p className={`mt-1 inline-flex items-center gap-1.5 text-[15px] font-semibold ${rainCaution ? '' : 'text-[var(--ink-2)]'}`}>
            {rainCaution ? (
              <span className="caution px-2.5 py-1 text-[15px]">
                <DropIcon />
                โอกาสฝน {rain}%
              </span>
            ) : (
              <>
                <DropIcon />
                โอกาสฝน {rain}%
              </>
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-label text-[13px] text-[var(--ink-muted)]">ตอนนี้ · โชคชัย</p>
          <h2 className="font-display mt-1 text-[18px] font-semibold text-[var(--ink)]">อากาศโชคชัย</h2>
        </div>
        {sample && <span className="font-label rounded-full bg-[var(--track)] px-2.5 py-1 text-[13px] text-[var(--ink)]">ตัวอย่าง</span>}
        {storm && !sample && (
          <span className="caution px-2.5 py-1 text-[13px]">
            <BoltIcon />
            โหมดพายุ
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <WeatherIcon scene={data.scene} night={night} className="h-[88px] w-[88px] shrink-0" />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[var(--ink-2)]">{CHOKCHAI.place}</p>
          <p className="font-display tabular text-[56px] font-bold leading-none text-[var(--ink)]">{temp}°</p>
          <p className="mt-1 text-[16px] font-semibold leading-snug text-[var(--ink)]">{data.conditionLabel}</p>
        </div>
      </div>
      <p className={`mt-3 inline-flex items-center gap-1.5 text-[16px] font-semibold ${rainCaution ? '' : 'text-[var(--ink)]'}`}>
        {rainCaution ? (
          <span className="caution">
            <DropIcon />
            {storm ? `พายุ · โอกาสฝน ${rain}% · พกร่ม` : `โอกาสฝน ${rain}% · พกร่ม`}
          </span>
        ) : (
          <>
            <DropIcon />
            โอกาสฝน {rain}%
          </>
        )}
      </p>
      {storm && (
        <p className="mt-2 text-[15px] font-semibold leading-snug text-[var(--ink-2)]">อยู่ในที่ร่มถ้าฟ้าคะนอง</p>
      )}
    </div>
  )
}

function StatRow({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="row">
      <span className="inline-flex items-center gap-2 text-[var(--ink)]">
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

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path fill="currentColor" d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  )
}
