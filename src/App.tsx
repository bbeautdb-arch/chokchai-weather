import { useMemo } from 'react'
import { useWeather } from './hooks/useWeather'
import {
  formatBangkokNow,
  formatUpdatedAt,
  findRainPeak,
  chartWindow,
  bangkokHourNow,
  pickBackground,
  timeOfDayFromHour,
  type SceneKey,
} from './lib/weather'
import { WeatherCard, WeatherSkeleton } from './components/WeatherCard'

export default function App() {
  const weather = useWeather()
  const demo = useMemo(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      const scene = q.get('scene') as SceneKey | null
      const tod = q.get('tod') as import('./lib/weather').TimeOfDay | null
      const validScene = scene && ['sunny','partly','cloudy','rain','storm','fog'].includes(scene) ? scene : null
      const validTod = tod && ['dawn','day','sunset','night'].includes(tod) ? tod : null
      return { scene: validScene, tod: validTod }
    } catch {
      return { scene: null, tod: null }
    }
  }, [])

  const scene: SceneKey =
    demo.scene ??
    (weather.status === 'ready'
      ? weather.data.scene
      : weather.status === 'error' && weather.stale
        ? weather.stale.scene
        : weather.status === 'loading' && weather.stale
          ? weather.stale.scene
          : 'cloudy')

  const bg = useMemo(() => {
    if (demo.scene) {
      return pickBackground(demo.scene, demo.tod ?? timeOfDayFromHour(bangkokHourNow()), 'demo')
    }
    if (weather.status === 'ready') return weather.data.backgroundUrl
    if (weather.status === 'error' && weather.stale) return weather.stale.backgroundUrl
    if (weather.status === 'loading' && weather.stale) return weather.stale.backgroundUrl
    return pickBackground(scene, timeOfDayFromHour(bangkokHourNow()))
  }, [weather, scene, demo])

  const liveData =
    weather.status === 'ready'
      ? weather.data
      : weather.status === 'error' && weather.stale
        ? weather.stale
        : weather.status === 'loading' && weather.stale
          ? weather.stale
          : null

  const displayData = useMemo(() => {
    if (!liveData) return null
    if (!demo.scene) return liveData
    const tod = demo.tod ?? liveData.timeOfDay
    return {
      ...liveData,
      scene: demo.scene,
      sceneLabel: ({ sunny: 'แดดจัด', partly: 'มีเมฆบางส่วน', cloudy: 'มีเมฆ', rain: 'ฝน', storm: 'พายุ', fog: 'หมอก / ฝุ่นควัน' } as const)[demo.scene],
      timeOfDay: tod,
      backgroundUrl: pickBackground(demo.scene, tod, 'demo'),
      conditionLabel:
        demo.scene === 'sunny'
          ? 'ท้องฟ้าโปร่ง · แดดจัด'
          : demo.scene === 'partly'
            ? 'มีเมฆบางส่วน'
            : demo.scene === 'cloudy'
              ? 'มีเมฆปกคลุม'
              : demo.scene === 'rain'
                ? 'มีฝน'
                : demo.scene === 'storm'
                  ? 'พายุฝนฟ้าคะนอง'
                  : 'หมอก / ฝุ่นควัน',
    }
  }, [liveData, demo])

  let peakChip = 'พีคฝน —'
  if (displayData) {
    const from = Math.min(Math.max(bangkokHourNow(), 0), 15)
    const win = chartWindow(displayData.hourly, from, 9)
    const peak = findRainPeak(win)
    if (peak) {
      peakChip = `พีคฝน ${String(peak.hour).padStart(2, '0')}:00 · ${Math.round(peak.precipProb)}%`
    }
  }

  const sceneChip = displayData ? displayData.sceneLabel : 'กำลังโหลด…'
  const showStaleBanner =
    weather.status === 'error' && weather.stale
      ? true
      : weather.status === 'ready' && weather.fromCache

  const updatedLabel = displayData?.fetchedAt
    ? `อัปเดตล่าสุด ${formatUpdatedAt(displayData.fetchedAt)} น.`
    : null

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#1a2218] bg-cover bg-center max-md:bg-[position:55%_65%]"
      style={{ backgroundImage: `url(${bg})` }}
      data-scene={scene}
      data-bg={bg}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(90% 60% at 80% 15%, rgba(255,255,255,0.14), transparent 55%), linear-gradient(180deg, rgba(12,18,14,0.38) 0%, rgba(12,18,14,0.12) 42%, rgba(8,12,10,0.55) 100%)',
        }}
      />

      <div className="relative z-[1] mx-auto flex min-h-screen max-w-[720px] flex-col px-4 pb-8 pt-5 md:max-w-[880px] md:px-8 md:pb-10 md:pt-8">
        <header className="glass glass-strong mb-4 flex flex-col gap-3.5 p-4 md:mb-5 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className="mt-0.5 h-10 w-10 shrink-0 rounded-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_8px_16px_rgba(80,60,30,0.32)]"
                style={{
                  background: 'linear-gradient(145deg, #F0DCC0, #B89562 55%, #8A7048)',
                }}
                aria-hidden="true"
              />
              <div>
                <h1
                  className="text-[20px] font-bold leading-tight tracking-[-0.02em] md:text-[24px]"
                  style={{ textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}
                >
                  อากาศโชคชัย
                </h1>
                <p className="mt-1 text-[14px] font-medium leading-[1.65] text-[var(--color-ink-soft)] md:text-[15px]">
                  นครราชสีมา · ดูสดจาก Open-Meteo
                </p>
              </div>
            </div>
            <div className="shrink-0 pt-1 text-right">
              <p className="tabular text-[13px] font-semibold text-[var(--color-ink-2)] md:text-[14px]">
                {formatBangkokNow()}
              </p>
              {updatedLabel && (
                <p className="mt-0.5 text-[11px] font-semibold text-[var(--color-ink-soft)]">
                  {updatedLabel}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip>
              ฉาก: <em className="not-italic text-[var(--color-champagne-deep)]">{sceneChip}</em>
            </Chip>
            <Chip>
              {weather.status === 'error' && !weather.stale
                ? 'Open-Meteo ล้มเหลว'
                : showStaleBanner
                  ? 'แคชล่าสุด'
                  : 'Open-Meteo สด'}
            </Chip>
            <Chip>{peakChip}</Chip>
          </div>
        </header>

        {weather.status === 'error' && (
          <div
            role="alert"
            className="glass mb-4 flex flex-wrap items-center justify-between gap-3 p-4 text-[15px] font-semibold leading-[1.6] text-[var(--color-warn)]"
          >
            <span>
              {weather.stale
                ? `อัปเดตไม่สำเร็จ — แสดงข้อมูลล่าสุดที่บันทึกไว้: ${weather.message}`
                : `โหลดอากาศไม่สำเร็จ: ${weather.message}`}
            </span>
            <button
              type="button"
              onClick={weather.retry}
              className="min-h-[44px] rounded-full border border-white/60 bg-white/50 px-4 font-bold text-[var(--color-ink)]"
            >
              ลองใหม่
            </button>
          </div>
        )}

        <main className="flex-1">
          {displayData ? (
            <WeatherCard data={displayData} />
          ) : (
            <WeatherSkeleton />
          )}
        </main>

        <footer className="mt-5 flex flex-col gap-1 text-[12px] font-semibold leading-relaxed text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.5)] md:mt-6 md:flex-row md:items-center md:justify-between md:text-[13px]">
          <span>
            <span className="tracking-[0.08em] text-[#F5E6C8]">CHOKCHAI WEATHER</span> · liquid glass ·
            PWA
          </span>
          <span>
            พื้นหลังตามสภาพตอนนี้ ({sceneChip}
            {displayData ? ` · ${displayData.timeOfDay}` : ''}) · กราฟรายชั่วโมงแสดงแนวโน้มฝน
          </span>
        </footer>
      </div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/55 bg-white/40 px-2.5 py-1.5 text-[13px] font-bold text-[var(--color-ink-2)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      {children}
    </span>
  )
}
