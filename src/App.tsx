import { useEffect, useMemo } from 'react'
import { useWeather } from './hooks/useWeather'
import {
  formatBangkokNow,
  formatUpdatedAt,
  pickBackground,
  timeOfDayFromHour,
  bangkokHourNow,
  conditionLabelFor,
  isStormCode,
  backgroundById,
  type SceneKey,
  type TimeOfDay,
} from './lib/weather'
import { AnswerHero, WeatherDetails, WeatherSkeleton } from './components/WeatherCard'
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
      const mode = q.get('mode')
      const validScene = scene && ['sunny', 'partly', 'cloudy', 'rain', 'storm', 'fog'].includes(scene) ? scene : null
      const validTod = tod && ['dawn', 'day', 'sunset', 'night'].includes(tod) ? tod : null
      const validMode = mode === 'storm' || mode === 'calm' ? mode : null
      const plate = backgroundById(q.get('plate') ?? '')
      return { scene: validScene, tod: validTod, mode: validMode, plate }
    } catch {
      return { scene: null, tod: null, mode: null as 'storm' | 'calm' | null, plate: null as string | null }
    }
  }, [])

  const overrideScene = demo.scene ?? (demo.mode === 'storm' ? 'storm' : null)

  const scene: SceneKey =
    overrideScene ??
    (weather.status === 'ready'
      ? weather.data.scene
      : weather.status === 'error' && weather.stale
        ? weather.stale.scene
        : weather.status === 'loading' && weather.stale
          ? weather.stale.scene
          : 'cloudy')

  const bg = useMemo(() => {
    if (overrideScene) {
      return pickBackground(overrideScene, demo.tod ?? timeOfDayFromHour(bangkokHourNow()), 'demo')
    }
    if (weather.status === 'ready') return weather.data.backgroundUrl
    if (weather.status === 'error' && weather.stale) return weather.stale.backgroundUrl
    if (weather.status === 'loading' && weather.stale) return weather.stale.backgroundUrl
    return pickBackground(scene, timeOfDayFromHour(bangkokHourNow()))
  }, [weather, scene, demo.tod, overrideScene])

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
    if (!overrideScene && !demo.tod) return liveData
    const tod = demo.tod ?? liveData.timeOfDay
    const nextScene = overrideScene ?? liveData.scene
    const code = overrideScene ? DEMO_CODE[nextScene] : liveData.current.weatherCode
    return {
      ...liveData,
      scene: nextScene,
      current: { ...liveData.current, weatherCode: code },
      timeOfDay: tod,
      backgroundUrl: pickBackground(nextScene, tod, 'demo'),
      conditionLabel: conditionLabelFor(nextScene, code, tod),
    }
  }, [liveData, demo.tod, overrideScene])

  const storm = demo.mode === 'calm' ? false : demo.mode === 'storm' || (displayData ? isStormCode(displayData.current.weatherCode) : false)
  const sample = Boolean(demo.scene || demo.tod || demo.mode)
  const showStaleBanner = weather.status === 'error' && Boolean(weather.stale)
  const updatedLabel = displayData?.fetchedAt ? `อัปเดต ${formatUpdatedAt(displayData.fetchedAt)} น.` : null
  const markScene = displayData?.scene ?? overrideScene ?? 'partly'
  const markNight = (displayData?.timeOfDay ?? demo.tod) === 'night'
  const pageBg = demo.plate ?? displayData?.backgroundUrl ?? bg
  const statusText =
    weather.status === 'error' && !weather.stale
      ? 'โหลดไม่สำเร็จ'
      : showStaleBanner || (weather.status === 'ready' && weather.fromCache)
        ? 'ข้อมูลที่บันทึกไว้'
        : 'ข้อมูลสด'

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.decoding = 'async'
    img.src = pageBg
    img.onload = () => {
      if (cancelled) return
      const w = 32
      const h = 32
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctx.drawImage(img, 0, 0, w, h)
      const px = ctx.getImageData(0, 0, w, h).data
      const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      let sum = 0
      const n = w * h
      for (let i = 0; i < px.length; i += 4) {
        sum += 0.2126 * lin(px[i] / 255) + 0.7152 * lin(px[i + 1] / 255) + 0.0722 * lin(px[i + 2] / 255)
      }
      const L = sum / n
      const t = Math.min(1, Math.max(0, (L - 0.08) / 0.64))
      const scrim = 0.2 + t * 0.18
      const frost = 0.82 - t * 0.24
      const page = document.querySelector('.page')
      if (!(page instanceof HTMLElement)) return
      page.style.setProperty('--scrim', scrim.toFixed(3))
      page.style.setProperty('--frost', frost.toFixed(3))
      page.setAttribute('data-lum', L.toFixed(3))
    }
    return () => {
      cancelled = true
    }
  }, [pageBg])

  useEffect(() => {
    const header = document.querySelector('[data-sticky]')
    if (!header) return
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        header.classList.toggle('is-scrolled', window.scrollY > 8)
        ticking = false
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [displayData])

  return (
    <div
      className="page relative min-h-screen"
      data-mode={storm ? 'storm' : 'calm'}
      data-scene={displayData?.scene ?? scene}
      data-tod={displayData?.timeOfDay ?? demo.tod ?? ''}
      data-bg={pageBg}
    >
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center max-md:bg-[position:55%_65%]"
        style={{ backgroundImage: `url(${pageBg})` }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: storm
            ? 'linear-gradient(180deg, rgba(8,8,10,0.42) 0%, rgba(8,8,10,0.28) 40%, rgba(8,8,10,0.55) 100%)'
            : 'linear-gradient(180deg, rgba(237,233,225,0.18) 0%, rgba(20,18,14,0.08) 42%, rgba(12,14,12,0.32) 100%)',
        }}
      />

      <div className="relative z-[1] mx-auto max-w-[1100px] px-4 pb-10 pt-3 md:px-8 md:pt-6">
        <header
          data-sticky="answer"
          className="glass sticky sticky-answer z-30 mb-4 p-3 md:hidden"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <BrandMark scene={markScene} night={markNight} />
              <div className="min-w-0">
                <h1 className="font-display truncate text-[18px] font-semibold text-[var(--ink)]">อากาศโชคชัย</h1>
                <p data-measure="meta" className="font-label text-[15px] text-[var(--ink-muted)]">นครราชสีมา</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-label tabular text-[15px] text-[var(--ink)]">{formatBangkokNow()}</p>
              <p className="font-label flex items-center justify-end gap-1.5 text-[15px] text-[var(--ink)]">
                <span>{statusText}</span>
                {sample && <span className="sample-badge">ตัวอย่าง</span>}
              </p>
              {updatedLabel && <p className="font-label text-[15px] text-[var(--ink-muted)]">{updatedLabel}</p>}
            </div>
          </div>
          {displayData ? (
            <AnswerHero data={displayData} storm={storm} compact />
          ) : (
            <div className="h-16 animate-pulse rounded-xl bg-white/40" />
          )}
          <div className="scroll-edge" aria-hidden="true" />
        </header>

        {weather.status === 'error' && (
          <div role="alert" className="glass mb-4 flex flex-wrap items-center justify-between gap-3 p-4 text-[16px] font-semibold text-[var(--ink)]">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true">!</span>
              {weather.stale ? 'อัปเดตไม่สำเร็จ แสดงข้อมูลล่าสุดที่บันทึกไว้' : 'โหลดอากาศไม่สำเร็จ'}
            </span>
            <button
              type="button"
              onClick={weather.retry}
              className="min-h-[44px] rounded-full border border-white/70 bg-white/70 px-4 font-bold text-[#1c1917]"
            >
              ลองใหม่
            </button>
          </div>
        )}

        <div className="md:grid md:grid-cols-[420px_minmax(0,1fr)] md:items-start md:gap-6">
          <aside className="glass glass-solid sticky top-6 mb-4 hidden p-5 md:block">
            <div className="flex items-center gap-3">
              <BrandMark scene={markScene} night={markNight} />
              <div>
                <h1 className="font-display text-[22px] font-semibold text-[var(--ink)]">อากาศโชคชัย</h1>
                <p className="font-label text-[15px] text-[var(--ink)]">{formatBangkokNow()}</p>
                <p className="font-label flex flex-wrap items-center gap-1.5 text-[15px] text-[var(--ink)]">
                  <span>{statusText}</span>
                  {sample && <span className="sample-badge">ตัวอย่าง</span>}
                </p>
                {updatedLabel && <p className="font-label text-[15px] text-[var(--ink)]">{updatedLabel}</p>}
              </div>
            </div>
            {displayData ? (
              <AnswerHero data={displayData} storm={storm} />
            ) : (
              <div className="mt-4 h-40 animate-pulse rounded-xl bg-white/40" />
            )}
          </aside>

          <main>
            {displayData ? <WeatherDetails data={displayData} /> : <WeatherSkeleton />}
          </main>
        </div>
      </div>
    </div>
  )
}
