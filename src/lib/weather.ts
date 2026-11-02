/** Open-Meteo helpers for Chok Chai, Nakhon Ratchasima */

import bgManifest from '../data/bgManifest.json'

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '/')
function assetUrl(path: string): string {
  const p = path.replace(/^\/+/, '')
  return `${BASE}${p}`
}

export const CHOKCHAI = {
  lat: 14.735,
  lon: 102.165,
  timezone: 'Asia/Bangkok',
  place: 'โชคชัย · นครราชสีมา',
} as const

export type SceneKey = 'sunny' | 'partly' | 'cloudy' | 'rain' | 'storm' | 'fog'
export type TimeOfDay = 'dawn' | 'day' | 'sunset' | 'night'

export interface CurrentWeather {
  time: string
  temperature: number
  apparentTemperature: number
  humidity: number
  precipitation: number
  weatherCode: number
  cloudCover: number
  windSpeed: number
}

export interface HourlyPoint {
  time: string
  hour: number
  temperature: number
  precipProb: number
  weatherCode: number
}

export interface DailySummary {
  tempMax: number
  tempMin: number
  precipProbMax: number
  weatherCode: number
}

export interface WeatherBundle {
  current: CurrentWeather
  hourly: HourlyPoint[]
  daily: DailySummary
  scene: SceneKey
  conditionLabel: string
  sceneLabel: string
  timeOfDay: TimeOfDay
  backgroundUrl: string
  fetchedAt: string
}

type BgEntry = { id: string; scene: string; tod: string; file: string; bytes: number }

const WMO_TH: Record<number, string> = {
  0: 'ท้องฟ้าโปร่ง · แดดจัด',
  1: 'มีเมฆบางส่วน · แดดอ่อน',
  2: 'มีเมฆเป็นส่วนมาก',
  3: 'เมฆมาก',
  45: 'หมอก',
  48: 'หมอกน้ำแข็ง',
  51: 'ฝนปรอยเบา',
  53: 'ฝนปรอยปานกลาง',
  55: 'ฝนปรอยหนัก',
  61: 'ฝนเบา',
  63: 'ฝนปานกลาง',
  65: 'ฝนหนัก',
  66: 'ฝนเย็นเบา',
  67: 'ฝนเย็นหนัก',
  71: 'หิมะเบา',
  73: 'หิมะปานกลาง',
  75: 'หิมะหนัก',
  80: 'ฝนซู่เบา',
  81: 'ฝนซู่ปานกลาง',
  82: 'ฝนซู่แรง',
  95: 'พายุฝนฟ้าคะนอง',
  96: 'พายุพร้อมลูกเห็บเบา',
  99: 'พายุพร้อมลูกเห็บหนัก',
}

const SCENE_TH: Record<SceneKey, string> = {
  sunny: 'แดดจัด',
  partly: 'มีเมฆบางส่วน',
  cloudy: 'มีเมฆ',
  rain: 'ฝน',
  storm: 'พายุ',
  fog: 'หมอก / ฝุ่นควัน',
}

/** Scene from what is happening *now* — keeps background + copy in sync. */
export function weatherCodeToScene(
  code: number,
  opts: { precipitationMm?: number; cloudCover?: number; hourPrecipProb?: number } = {},
): SceneKey {
  const precipMm = opts.precipitationMm ?? 0
  const cloud = opts.cloudCover ?? 0
  const hourProb = opts.hourPrecipProb ?? 0

  if ([95, 96, 99].includes(code)) return 'storm'
  if ([61, 63, 65, 66, 67, 80, 81, 82, 51, 53, 55].includes(code) || precipMm > 0) {
    return 'rain'
  }
  if (hourProb >= 80) return 'rain'
  if ([45, 48].includes(code)) return 'fog'
  if (code === 3 || cloud >= 75) return 'cloudy'
  if ([1, 2].includes(code) || (cloud >= 30 && cloud < 75)) return 'partly'
  if (code === 0) return 'sunny'
  return cloud >= 20 ? 'partly' : 'sunny'
}

export function conditionLabelFor(scene: SceneKey, code: number): string {
  const wmo = WMO_TH[code]
  if (scene === 'storm') {
    if (wmo && [95, 96, 99].includes(code)) return wmo
    return 'พายุฝนฟ้าคะนอง'
  }
  if (scene === 'rain') {
    if (wmo && [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return wmo
    return 'มีฝน / โอกาสฝนสูงตอนนี้'
  }
  if (scene === 'fog') {
    if (wmo && [45, 48].includes(code)) return wmo
    return 'หมอก / ฝุ่นควัน'
  }
  if (scene === 'cloudy') {
    if (wmo && code === 3) return wmo
    return 'มีเมฆปกคลุม'
  }
  if (scene === 'partly') {
    if (wmo && [1, 2].includes(code)) return wmo
    return 'มีเมฆบางส่วน'
  }
  if (wmo && code === 0) return wmo
  return 'ท้องฟ้าโปร่ง · แดดจัด'
}

export function sceneLabel(scene: SceneKey): string {
  return SCENE_TH[scene]
}

export function timeOfDayFromHour(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'sunset'
  return 'night'
}

/** Stable-ish random pick among matching scene+tod; falls back to scene-any, then cloudy-day. */
export function pickBackground(scene: SceneKey, tod: TimeOfDay, seed?: string): string {
  const all = bgManifest as BgEntry[]
  const exact = all.filter((b) => b.scene === scene && b.tod === tod)
  const byScene = exact.length ? exact : all.filter((b) => b.scene === scene)
  const pool = byScene.length
    ? byScene
    : all.filter((b) => b.scene === 'cloudy' && b.tod === 'day')
  if (!pool.length) return assetUrl('assets/bg/cloudy-day-1.webp')
  const key = `${seed ?? ''}|${scene}|${tod}|${Math.floor(Date.now() / 3_600_000)}`
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return assetUrl(pool[h % pool.length].file)
}

/** @deprecated use pickBackground — kept for callers that only know scene */
export function sceneBackgroundUrl(scene: SceneKey): string {
  return pickBackground(scene, timeOfDayFromHour(bangkokHourNow()))
}

export function buildOpenMeteoUrl(host = 'api.open-meteo.com'): string {
  const params = new URLSearchParams({
    latitude: String(CHOKCHAI.lat),
    longitude: String(CHOKCHAI.lon),
    timezone: CHOKCHAI.timezone,
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
    forecast_days: '1',
  })
  return `https://${host}/v1/forecast?${params}`
}

const CACHE_KEY = 'chokchai-weather-v1'
const FETCH_TIMEOUT_MS = 15_000

async function fetchWithTimeout(url: string, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { signal: ctrl.signal, cache: 'no-cache' })
  } finally {
    clearTimeout(t)
  }
}

function parsePayload(data: unknown): WeatherBundle {
  const d = data as {
    current: Record<string, number | string>
    hourly: {
      time: string[]
      temperature_2m: number[]
      precipitation_probability: number[]
      weather_code: number[]
    }
    daily: {
      temperature_2m_max: number[]
      temperature_2m_min: number[]
      precipitation_probability_max: number[]
      weather_code: number[]
    }
  }

  const current: CurrentWeather = {
    time: String(d.current.time),
    temperature: Number(d.current.temperature_2m),
    apparentTemperature: Number(d.current.apparent_temperature),
    humidity: Number(d.current.relative_humidity_2m),
    precipitation: Number(d.current.precipitation),
    weatherCode: Number(d.current.weather_code),
    cloudCover: Number(d.current.cloud_cover),
    windSpeed: Number(d.current.wind_speed_10m),
  }

  const hourly: HourlyPoint[] = d.hourly.time.map((t: string, i: number) => {
    const hour = Number(t.slice(11, 13))
    return {
      time: t,
      hour,
      temperature: d.hourly.temperature_2m[i],
      precipProb: d.hourly.precipitation_probability[i],
      weatherCode: d.hourly.weather_code[i],
    }
  })

  const daily: DailySummary = {
    tempMax: d.daily.temperature_2m_max[0],
    tempMin: d.daily.temperature_2m_min[0],
    precipProbMax: d.daily.precipitation_probability_max[0],
    weatherCode: d.daily.weather_code[0],
  }

  const nowHour = bangkokHourNow()
  const hourPoint = hourly.find((h) => h.hour === nowHour)
  const scene = weatherCodeToScene(current.weatherCode, {
    precipitationMm: current.precipitation,
    cloudCover: current.cloudCover,
    hourPrecipProb: hourPoint?.precipProb ?? 0,
  })
  const tod = timeOfDayFromHour(nowHour)
  const fetchedAt = new Date().toISOString()

  return {
    current,
    hourly,
    daily,
    scene,
    conditionLabel: conditionLabelFor(scene, current.weatherCode),
    sceneLabel: sceneLabel(scene),
    timeOfDay: tod,
    backgroundUrl: pickBackground(scene, tod, current.time),
    fetchedAt,
  }
}

export function saveWeatherCache(bundle: WeatherBundle): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(bundle))
  } catch {
    /* ignore quota */
  }
}

export function loadWeatherCache(): WeatherBundle | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WeatherBundle
    if (!parsed?.current || !parsed?.hourly) return null
    // refresh bg for current tod when restoring
    const tod = timeOfDayFromHour(bangkokHourNow())
    return {
      ...parsed,
      timeOfDay: tod,
      backgroundUrl: pickBackground(parsed.scene, tod, parsed.current.time),
    }
  } catch {
    return null
  }
}

/** Fetch with 15s timeout, 2 retries + backoff, primary then fallback host. */
export async function fetchWeather(): Promise<WeatherBundle> {
  const hosts = ['api.open-meteo.com']
  let lastErr: unknown
  for (const host of hosts) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 800 * 2 ** (attempt - 1)))
        }
        const res = await fetchWithTimeout(buildOpenMeteoUrl(host))
        if (res.status === 503 || res.status === 429) {
          throw new Error('OPEN_METEO_BUSY')
        }
        if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
        const data = await res.json()
        const bundle = parsePayload(data)
        saveWeatherCache(bundle)
        return bundle
      } catch (e) {
        lastErr = e
      }
    }
  }
  const msg =
    lastErr instanceof Error
      ? lastErr.name === 'AbortError'
        ? 'หมดเวลาเชื่อมต่อ (15 วินาที) — ลองใหม่'
        : lastErr.message === 'OPEN_METEO_BUSY'
          ? 'เซิร์ฟเวอร์อากาศหนาแน่นชั่วคราว — ลองใหม่'
          : lastErr.message
      : 'โหลดอากาศไม่สำเร็จ'
  throw new Error(msg)
}

export function chartWindow(hourly: HourlyPoint[], fromHour: number, count = 9): HourlyPoint[] {
  const start = hourly.findIndex((h) => h.hour === fromHour)
  if (start < 0) {
    const alt = hourly.findIndex((h) => h.hour === 13)
    return hourly.slice(alt >= 0 ? alt : 0, (alt >= 0 ? alt : 0) + count)
  }
  return hourly.slice(start, start + count)
}

export function findRainPeak(points: HourlyPoint[]): HourlyPoint | null {
  if (!points.length) return null
  return points.reduce((best, p) => (p.precipProb > best.precipProb ? p : best), points[0])
}

export function formatBangkokNow(d = new Date()): string {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

export function formatUpdatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

export function bangkokHourNow(d = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(d)
  return Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
}
