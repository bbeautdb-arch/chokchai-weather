import type { WeatherBundle } from '../lib/weather'
import { CHOKCHAI, isNightTime, upcomingHours } from '../lib/weather'
import { HourlyChart } from './HourlyChart'
import { WeatherIcon } from './WeatherIcon'

export function WeatherCard({ data }: { data: WeatherBundle }) {
  const night = isNightTime(data.timeOfDay)
  const points = upcomingHours(data.hourly, 12)
  const nowTime = points[0]?.time ?? null

  return (
    <article className="glass p-4 md:p-7" aria-label="อากาศโชคชัย">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold text-[var(--color-ink-soft)]">อากาศตอนนี้</h2>
        <span className="text-[14px] font-bold text-[var(--color-sky)]">โชคชัย</span>
      </div>

      <div className="mb-4 flex items-center gap-3 md:gap-6">
        <WeatherIcon
          scene={data.scene}
          night={night}
          className="h-[92px] w-[92px] shrink-0 md:h-[120px] md:w-[120px]"
        />
        <div className="min-w-0">
          <p className="mb-1 text-[15px] font-bold leading-snug text-[var(--color-ink-2)]">
            {CHOKCHAI.place}
          </p>
          <div className="flex items-end gap-1">
            <span
              className="tabular text-[56px] font-bold leading-[0.95] tracking-[-0.04em] md:text-[72px]"
              style={{ textShadow: '0 2px 0 rgba(255,255,255,0.35)' }}
            >
              {Math.round(data.current.temperature)}
            </span>
            <span className="pb-1.5 text-[22px] font-bold text-[var(--color-ink-2)] md:text-[28px]">°C</span>
          </div>
          <p className="mt-1.5 text-[18px] font-bold leading-snug md:text-[20px]">{data.conditionLabel}</p>
          <p className="mt-1 text-[14px] leading-snug text-[var(--color-ink)] md:text-[15px]">
            รู้สึกเหมือน {Math.round(data.current.apparentTemperature)}° · ความชื้น{' '}
            {Math.round(data.current.humidity)}% · ลม {Math.round(data.current.windSpeed)} กม./ชม.
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        {[
          { label: 'สูงสุดวันนี้', value: `${Math.round(data.daily.tempMax)}°` },
          { label: 'ต่ำสุดวันนี้', value: `${Math.round(data.daily.tempMin)}°` },
          { label: 'โอกาสฝนสูงสุด', value: `${Math.round(data.daily.precipProbMax)}%` },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <span className="block text-[12px] font-bold leading-tight text-[var(--color-ink-soft)]">
              {s.label}
            </span>
            <strong className="tabular mt-1 block text-[22px] font-bold text-[#1A120C] md:text-[26px]">
              {s.value}
            </strong>
          </div>
        ))}
      </div>

      <HourlyChart points={points} nowTime={nowTime} />
    </article>
  )
}

export function WeatherSkeleton() {
  return (
    <article className="glass animate-pulse p-5 md:p-7" aria-busy="true" aria-label="กำลังโหลดอากาศ">
      <div className="mb-4 h-4 w-36 rounded bg-white/50" />
      <div className="mb-4 flex gap-4">
        <div className="h-24 w-24 rounded-full bg-white/50" />
        <div className="flex-1 space-y-3 pt-1">
          <div className="h-4 w-40 rounded bg-white/50" />
          <div className="h-14 w-36 rounded bg-white/60" />
          <div className="h-4 w-56 rounded bg-white/40" />
        </div>
      </div>
      <div className="mb-4 h-20 rounded-2xl bg-white/40" />
      <div className="h-40 rounded-2xl bg-white/40" />
    </article>
  )
}
