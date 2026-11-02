import type { WeatherBundle } from '../lib/weather'
import {
  bangkokHourNow,
  chartWindow,
  CHOKCHAI,
  findRainPeak,
} from '../lib/weather'
import { HourlyChart } from './HourlyChart'
import { WeatherIcon } from './WeatherIcon'

export function WeatherCard({ data }: { data: WeatherBundle }) {
  const nowH = bangkokHourNow()
  const from = Math.min(Math.max(nowH, 0), 15)
  const window = chartWindow(data.hourly, from, 9)
  const peak = findRainPeak(window)
  const showAlert = peak && peak.precipProb >= 40

  return (
    <article className="glass p-5 md:p-7" aria-label="อากาศโชคชัย">
      <div className="mb-4 flex items-baseline justify-between gap-2.5">
        <h2 className="text-[13px] font-bold tracking-[0.08em] uppercase text-[var(--color-ink-soft)] md:text-[14px]">
          อากาศตอนนี้ · Open-Meteo
        </h2>
        <span className="text-[13px] font-bold text-[var(--color-sky)] md:text-[14px]">สด · โชคชัย</span>
      </div>

      <div className="mb-4 flex items-center gap-4 md:gap-6">
        <WeatherIcon
          scene={data.scene}
          className="h-[96px] w-[96px] shrink-0 drop-shadow-lg md:h-[120px] md:w-[120px]"
        />
        <div className="min-w-0">
          <p className="mb-1 text-[15px] font-bold leading-snug text-[var(--color-ink-2)] md:text-[16px]">
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
          <p className="mt-1.5 text-[17px] font-bold leading-snug md:text-[19px]">{data.conditionLabel}</p>
          <p className="mt-1 text-[14px] leading-[1.65] text-[var(--color-ink-soft)] md:text-[15px]">
            รู้สึกเหมือน {Math.round(data.current.apparentTemperature)}° · ความชื้น{' '}
            {Math.round(data.current.humidity)}% · ลม {Math.round(data.current.windSpeed)} กม./ชม. · เมฆ{' '}
            {Math.round(data.current.cloudCover)}%
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2.5 rounded-2xl border border-white/55 bg-white/35 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_6px_14px_rgba(30,35,25,0.08)] md:gap-3 md:p-4">
        {[
          { label: 'สูงสุด', value: `${Math.round(data.daily.tempMax)}°` },
          { label: 'ต่ำสุด', value: `${Math.round(data.daily.tempMin)}°` },
          { label: 'โอกาสฝนวันนี้', value: `${Math.round(data.daily.precipProbMax)}%` },
        ].map((s) => (
          <div key={s.label} className="text-center sm:text-left">
            <span className="block text-[12px] font-bold tracking-[0.04em] text-[var(--color-ink-soft)] md:text-[13px]">
              {s.label}
            </span>
            <strong className="tabular mt-1 block text-[22px] font-bold tracking-[-0.02em] md:text-[26px]">
              {s.value}
            </strong>
          </div>
        ))}
      </div>

      {showAlert && peak && (
        <div
          role="status"
          className="mb-4 flex gap-2.5 items-start rounded-[16px] border border-white/50 bg-[rgba(255,190,130,0.42)] px-3.5 py-3 text-[14px] font-bold leading-[1.6] text-[var(--color-warn)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] md:text-[15px]"
        >
          <span className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-full w-full">
              <defs>
                <linearGradient id="rd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7EC8FF" />
                  <stop offset="100%" stopColor="#2F6FA8" />
                </linearGradient>
              </defs>
              <path d="M8 3c0 4-4 5-4 9a4 4 0 008 0c0-4-4-5-4-9z" fill="url(#rd)" />
              <path
                d="M16 5c0 3-3 4-3 7a3 3 0 006 0c0-3-3-4-3-7z"
                fill="url(#rd)"
                opacity="0.85"
              />
            </svg>
          </span>
          <span>
            พีคฝนช่วงนี้{' '}
            <strong>
              {String(peak.hour).padStart(2, '0')}:00 · {Math.round(peak.precipProb)}%
            </strong>{' '}
            — พกร่มไว้ถ้าออกนอกบ้านช่วงนั้น
          </span>
        </div>
      )}

      <div className="mb-2">
        <h3 className="mb-2 text-[13px] font-bold tracking-[0.06em] uppercase text-[var(--color-ink-soft)] md:text-[14px]">
          ฝนและอุณหภูมิรายชั่วโมง
        </h3>
        <HourlyChart points={window} peakHour={peak?.hour ?? null} />
      </div>
    </article>
  )
}

export function WeatherSkeleton() {
  return (
    <article
      className="glass animate-pulse p-5 md:p-7"
      aria-busy="true"
      aria-label="กำลังโหลดอากาศ"
    >
      <div className="mb-4 h-3.5 w-48 rounded bg-white/40" />
      <div className="mb-4 flex gap-4">
        <div className="h-24 w-24 rounded-full bg-white/40" />
        <div className="flex-1 space-y-3 pt-1">
          <div className="h-3.5 w-40 rounded bg-white/40" />
          <div className="h-14 w-36 rounded bg-white/50" />
          <div className="h-3.5 w-56 rounded bg-white/35" />
        </div>
      </div>
      <div className="mb-4 h-20 rounded-2xl bg-white/30" />
      <div className="h-[160px] rounded-[14px] bg-white/25 md:h-[180px]" />
    </article>
  )
}
