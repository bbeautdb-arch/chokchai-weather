import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchWeather,
  loadWeatherCache,
  type WeatherBundle,
} from '../lib/weather'

type State =
  | { status: 'loading'; stale?: WeatherBundle }
  | { status: 'error'; message: string; retry: () => void; stale?: WeatherBundle }
  | { status: 'ready'; data: WeatherBundle; fromCache?: boolean }

export function useWeather(refreshMs = 15 * 60 * 1000): State {
  const [state, setState] = useState<State>(() => {
    const cached = typeof window !== 'undefined' ? loadWeatherCache() : null
    return cached
      ? { status: 'loading', stale: cached }
      : { status: 'loading' }
  })
  const mounted = useRef(true)

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    const soft = opts?.soft
    const cached = loadWeatherCache()
    if (!soft) {
      setState((prev) => {
        const stale =
          cached ??
          (prev.status === 'ready' ? prev.data : prev.status !== 'loading' ? prev.stale : prev.stale)
        return { status: 'loading', stale: stale ?? undefined }
      })
    }
    try {
      const data = await fetchWeather()
      if (!mounted.current) return
      setState({ status: 'ready', data })
    } catch (e) {
      if (!mounted.current) return
      const message = e instanceof Error ? e.message : 'โหลดอากาศไม่สำเร็จ'
      const stale = cached ?? loadWeatherCache()
      if (stale) {
        // Show last-good with error banner capability via fromCache
        setState({
          status: 'ready',
          data: stale,
          fromCache: true,
        })
        // Also surface retry via a parallel error? Keep ready+fromCache; App shows stale note.
        // Store message on a custom field by re-throwing into error only when no cache:
      } else {
        setState({
          status: 'error',
          message,
          retry: () => {
            void load()
          },
        })
      }
      // If we have cache but fetch failed, upgrade to ready+fromCache already done;
      // expose message by attaching via error state when user wants retry — App checks fromCache.
      if (stale) {
        // Keep a retry handle by wrapping: use a module-level isn't ideal.
        // Re-set with error that still has stale for UI that prefers error+stale.
        setState({
          status: 'error',
          message,
          stale,
          retry: () => {
            void load()
          },
        })
      }
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void load()
    const id = window.setInterval(() => void load({ soft: true }), refreshMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load({ soft: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      mounted.current = false
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load, refreshMs])

  return state
}
