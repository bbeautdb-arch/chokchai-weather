import { useMemo } from 'react'
import { useWeather } from './hooks/useWeather'
import {
  formatBangkokNow,
  formatUpdatedAt,
  pickBackground,
  timeOfDayFromHour,
  bangkokHourNow,
  conditionLabelFor,
  type SceneKey,
  type TimeOfDay,
} from './lib/weather'
import { WeatherCard, WeatherSkeleton } from './components/WeatherCard'
import { BrandMark } from './components/WeatherIcon'

const DEMO_CODE: Record<SceneKey, number> = {
  sunny: 0,
  partly: 2,
  cloudy: 3,
  rain: 63,
  storm: 95,
  fog: 45,
}

export default function App() {
  const weather = useWeather()
  const demo = useMemo(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      const scene = q.get('scene') as SceneKey | null
      const tod = q.get('tod') as TimeOfDay | null
      const validScene = scene && ['sunny', 'partly', 'cloudy', 'rain', 'storm', 'fog'].includes(scene) ? scene : null
      const validTod = tod && ['dawn', 'day', 'sunset', 'night'].includes(tod) ? tod : null
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
    if (!demo.scene && !demo.tod) return liveData
    const tod = demo.tod ?? liveData.timeOfDay
    const nextScene = demo.scene ?? liveData.scene
    const code = demo.scene ? DEMO_CODE[demo.scene] : liveData.current.weatherCode
    return {
      ...liveData,
      scene: nextScene,
      timeOfDay: tod,
      backgroundUrl: pickBackground(nextScene, tod, 'demo'),
      conditionLabel: conditionLabelFor(nextScene, code, tod),
    }
  }, [liveData, demo])

  const showStaleBanner = weather.status === 'error' && Boolean(weather.stale)
  const updatedLabel = displayData?.fetchedAt
    ? `อัปเดต ${formatUpdatedAt(displayData.fetchedAt)} น.`
    : null
  const markScene = displayData?.scene ?? demo.scene ?? 'partly'
  const markNight = (displayData?.timeOfDay ?? demo.tod) === 'night'

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#1a2218] bg-cover bg-center max-md:bg-[position:55%_65%]"
      style={{ backgroundImage: `url(${displayData?.backgroundUrl ?? bg})` }}
      data-scene={displayData?.scene ?? scene}
      data-tod={displayData?.timeOfDay ?? demo.tod ?? ''}
      data-bg={displayData?.backgroundUrl ?? bg}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(90% 60% at 80% 15%, rgba(255,255,255,0.14), transparent 55%), linear-gradient(180deg, rgba(12,18,14,0.38) 0%, rgba(12,18,14,0.12) 42%, rgba(8,12,10,0.55) 100%)',
        }}
      />

      <div className="relative z-[1] mx-auto flex min-h-screen max-w-[720px] flex-col px-4 pb-8 pt-5 md:max-w-[880px] md:px-8 md:pb-10 md:pt-8">
        <header className="glass glass-strong mb-4 flex items-start justify-between gap-3 p-4 md:mb-5 md:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <BrandMark scene={markScene} night={markNight} />
            <div className="min-w-0">
              <h1
                className="text-[22px] font-bold leading-tight tracking-[-0.02em] md:text-[26px]"
                style={{ textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}
              >
                อากาศโชคชัย
              </h1>
              <p className="mt-0.5 text-[14px] font-semibold leading-snug text-[var(--color-ink)]">
                นครราชสีมา
              </p>
              {updatedLabel && (
                <p className="text-[12px] font-semibold text-[var(--color-ink-soft)]">{updatedLabel}</p>
              )}
            </div>
          </div>
          <div className="shrink-0 pt-1 text-right">
            <p className="tabular text-[13px] font-bold text-[var(--color-ink)] md:text-[15px]">
              {formatBangkokNow()}
            </p>
            <p className="mt-1 text-[12px] font-bold text-[var(--color-ink-soft)]">
              {weather.status === 'error' && !weather.stale
                ? 'โหลดไม่สำเร็จ'
                : showStaleBanner || (weather.status === 'ready' && weather.fromCache)
                  ? 'ข้อมูลที่บันทึกไว้'
                  : 'ข้อมูลสด'}
            </p>
          </div>
        </header>

        {weather.status === 'error' && (
          <div
            role="alert"
            className="glass mb-4 flex flex-wrap items-center justify-between gap-3 p-4 text-[15px] font-semibold leading-snug text-[var(--color-warn)]"
          >
            <span>
              {weather.stale
                ? `อัปเดตไม่สำเร็จ แสดงข้อมูลล่าสุดที่บันทึกไว้`
                : `โหลดอากาศไม่สำเร็จ`}
            </span>
            <button
              type="button"
              onClick={weather.retry}
              className="min-h-[44px] rounded-full border border-white/70 bg-white/70 px-4 font-bold text-[var(--color-ink)]"
            >
              ลองใหม่
            </button>
          </div>
        )}

        <main className="flex-1">
          {displayData ? <WeatherCard data={displayData} /> : <WeatherSkeleton />}
        </main>
      </div>
    </div>
  )
}
