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
  /** Open-Meteo current.is_day. True between sunrise and sunset. */
  isDay: boolean
  sunrise: string | null
  sunset: string | null
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

export function isNightTime(tod: TimeOfDay): boolean {
  return tod === 'night'
}

/** Heavy rain and thunderstorms — the only conditions that switch on the storm skin. */
export const STORM_CODES = [65, 82, 95, 96, 99] as const

export function isStormCode(code: number): boolean {
  return (STORM_CODES as readonly number[]).includes(code)
}

/** User-facing condition. Night never says แดด and never uses a daytime sun phrase. */
export function conditionLabelFor(scene: SceneKey, code: number, tod: TimeOfDay = 'day'): string {
  if (isNightTime(tod)) return nightConditionLabel(scene, code)
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

function nightConditionLabel(scene: SceneKey, code: number): string {
  if (scene === 'storm' || [95, 96, 99].includes(code)) {
    if (code === 96) return 'พายุพร้อมลูกเห็บเบา'
    if (code === 99) return 'พายุพร้อมลูกเห็บหนัก'
    return 'พายุฝนฟ้าคะนอง'
  }
  if (scene === 'rain' || [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return WMO_TH[code] && [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)
      ? WMO_TH[code]
      : 'มีฝน'
  }
  if (scene === 'fog' || code === 45 || code === 48) {
    if (code === 48) return 'หมอกน้ำแข็ง'
    return 'หมอก'
  }
  if (scene === 'cloudy' || code === 3) return 'เมฆมาก'
  if (scene === 'partly' || code === 1 || code === 2) {
    if (code === 2) return 'มีเมฆเป็นส่วนมาก'
    if (code === 1) return 'ท้องฟ้าแจ่มใส มีเมฆบางส่วน'
    return 'มีเมฆบางส่วน'
  }
  return 'ท้องฟ้าแจ่มใส'
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

export interface BangkokParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

/** Wall-clock parts in Asia/Bangkok. Hour 24 (midnight quirk) is normalized to 0. */
export function bangkokParts(d = new Date()): BangkokParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'
  let hour = Number(get('hour'))
  if (hour === 24) hour = 0
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour,
    minute: Number(get('minute')),
  }
}

/** Compare Bangkok wall time and Open-Meteo local timestamps on the same scale. */
function wallStamp(year: number, month: number, day: number, hour: number, minute: number): number {
  let h = hour
  if (h === 24) h = 0
  return Date.UTC(year, month - 1, day, h, minute)
}

export function bangkokStamp(d = new Date()): number {
  const p = bangkokParts(d)
  return wallStamp(p.year, p.month, p.day, p.hour, p.minute)
}

export function isoStamp(iso: string): number {
  const [date, time = '00:00'] = iso.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [hh = '0', mm = '0'] = time.split(':')
  return wallStamp(y, m, d, Number(hh), Number(mm))
}

function bangkokDateString(d = new Date()): string {
  const p = bangkokParts(d)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/**
 * Day, night, dawn, and sunset from Open-Meteo sunrise/sunset (Asia/Bangkok)
 * and current is_day. Clock-hour buckets are only a fallback.
 */
export function resolveTimeOfDay(
  opts: { isDay?: boolean | null; sunrise?: string | null; sunset?: string | null; now?: Date } = {},
): TimeOfDay {
  const now = opts.now ?? new Date()
  const sunrise = opts.sunrise
  const sunset = opts.sunset
  if (sunrise && sunset) {
    const today = bangkokDateString(now)
    const relevant = sunrise.slice(0, 10) === today || sunset.slice(0, 10) === today
    if (relevant) {
      const n = bangkokStamp(now)
      const rise = isoStamp(sunrise)
      const set = isoStamp(sunset)
      const min = 60_000
      if (n >= rise - 60 * min && n < rise + 45 * min) return 'dawn'
      if (n >= set - 40 * min && n < set + 50 * min) return 'sunset'
      if (n < rise || n >= set) return 'night'
      return 'day'
    }
  }
  if (opts.isDay === false) return 'night'
  if (opts.isDay === true) {
    const h = bangkokHourNow(now)
    if (h < 8) return 'dawn'
    if (h >= 17) return 'sunset'
    return 'day'
  }
  return timeOfDayFromHour(bangkokHourNow(now))
}

/** Stable-ish random pick among matching scene+tod; falls back to scene-any, then cloudy-day. */
export function pickBackground(scene: SceneKey, tod: TimeOfDay, seed?: string): string {
  const all = bgManifest as BgEntry[]
  const exact = all.filter((b) => b.scene === scene && b.tod === tod)
  const sameTod = all.filter((b) => b.tod === tod)
  const byScene = exact.length ? exact : sameTod.length ? sameTod : all.filter((b) => b.scene === scene)
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
      'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,is_day',
    hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset',
    forecast_days: '2',
  })
  return `https://${host}/v1/forecast?${params}`
}

const CACHE_KEY = 'chokchai-weather-v2'
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

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function parsePayload(data: unknown): WeatherBundle {
  const d = data as {
    current: Record<string, number | string>
    hourly: {
      time: string[]
      temperature_2m: number[]
      precipitation_probability: Array<number | null>
      weather_code: number[]
      is_day?: number[]
    }
    daily: {
      temperature_2m_max: number[]
      temperature_2m_min: number[]
      precipitation_probability_max: number[]
      weather_code: number[]
      sunrise?: string[]
      sunset?: string[]
    }
  }

  const current: CurrentWeather = {
    time: String(d.current.time),
    temperature: num(d.current.temperature_2m),
    apparentTemperature: num(d.current.apparent_temperature),
    humidity: num(d.current.relative_humidity_2m),
    precipitation: num(d.current.precipitation),
    weatherCode: num(d.current.weather_code),
    cloudCover: num(d.current.cloud_cover),
    windSpeed: num(d.current.wind_speed_10m),
  }

  const hourly: HourlyPoint[] = d.hourly.time.map((t: string, i: number) => {
    const hour = Number(t.slice(11, 13))
    return {
      time: t,
      hour: hour === 24 ? 0 : hour,
      temperature: num(d.hourly.temperature_2m[i]),
      precipProb: num(d.hourly.precipitation_probability[i]),
      weatherCode: num(d.hourly.weather_code[i]),
    }
  })

  const daily: DailySummary = {
    tempMax: num(d.daily.temperature_2m_max[0]),
    tempMin: num(d.daily.temperature_2m_min[0]),
    precipProbMax: num(d.daily.precipitation_probability_max[0]),
    weatherCode: num(d.daily.weather_code[0]),
  }

  const isDay = num(d.current.is_day) === 1
  const sunrise = d.daily.sunrise?.[0] ?? null
  const sunset = d.daily.sunset?.[0] ?? null
  const nowStamp = bangkokStamp()
  const hourPoint =
    hourly.find((h) => {
      const start = isoStamp(h.time)
      return nowStamp >= start && nowStamp < start + 3_600_000
    }) ?? hourly.find((h) => h.hour === bangkokHourNow())
  const scene = weatherCodeToScene(current.weatherCode, {
    precipitationMm: current.precipitation,
    cloudCover: current.cloudCover,
    hourPrecipProb: hourPoint?.precipProb ?? 0,
  })
  const tod = resolveTimeOfDay({ isDay, sunrise, sunset })
  const fetchedAt = new Date().toISOString()

  return {
    current,
    hourly,
    daily,
    scene,
    conditionLabel: conditionLabelFor(scene, current.weatherCode, tod),
    sceneLabel: sceneLabel(scene),
    timeOfDay: tod,
    backgroundUrl: pickBackground(scene, tod, current.time),
    fetchedAt,
    isDay,
    sunrise,
    sunset,
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
    const tod = resolveTimeOfDay({
      isDay: parsed.isDay,
      sunrise: parsed.sunrise,
      sunset: parsed.sunset,
    })
    return {
      ...parsed,
      timeOfDay: tod,
      conditionLabel: conditionLabelFor(parsed.scene, parsed.current.weatherCode, tod),
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
        if (!res.ok) throw new Error(`โหลดอากาศไม่สำเร็จ (${res.status})`)
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

/** Next hours starting at the Bangkok hour that contains `now` (needs forecast_days ≥ 2). */
export function upcomingHours(hourly: HourlyPoint[], count = 12, now = new Date()): HourlyPoint[] {
  if (!hourly.length) return []
  const nowStamp = bangkokStamp(now)
  let start = hourly.findIndex((h) => isoStamp(h.time) + 3_600_000 > nowStamp)
  if (start < 0) start = Math.max(0, hourly.length - count)
  return hourly.slice(start, start + count)
}

export function formatHourLabel(iso: string): string {
  const time = iso.split('T')[1] ?? '00:00'
  const [hh = '00', mm = '00'] = time.split(':')
  let h = Number(hh)
  if (h === 24) h = 0
  return `${String(h).padStart(2, '0')}:${mm.slice(0, 2).padStart(2, '0')}`
}

export interface UpcomingRain {
  /** Peak chance inside the same hourly window the chart draws. */
  pct: number
  /** Hour label of that peak, e.g. 14:00 or 14:00–16:00. Empty when there is no window. */
  when: string
  summary: string
  caution: boolean
}

/** Single rain figure for the header badge and the hourly peak box. */
export function upcomingRain(points: HourlyPoint[]): UpcomingRain {
  const hours = points.length
  if (!hours) {
    return { pct: 0, when: '', summary: 'ยังไม่มีข้อมูลช่วงข้างหน้า', caution: false }
  }
  let max = points[0]
  for (const p of points) {
    if (p.precipProb > max.precipProb) max = p
  }
  const pct = Math.round(max.precipProb)
  if (max.precipProb < 30) {
    return {
      pct,
      when: '',
      summary: `ช่วง ${hours} ชม. ข้างหน้าไม่น่ามีฝน`,
      caution: false,
    }
  }
  const threshold = Math.max(30, max.precipProb - 15)
  const peakIdx = points.findIndex((p) => p.time === max.time)
  let lo = peakIdx
  let hi = peakIdx
  while (lo > 0 && points[lo - 1].precipProb >= threshold) lo -= 1
  while (hi < points.length - 1 && points[hi + 1].precipProb >= threshold) hi += 1
  const a = formatHourLabel(points[lo].time)
  const b = formatHourLabel(points[hi].time)
  const when = lo === hi ? a : `${a}–${b}`
  return {
    pct,
    when,
    summary: `ฝนมีโอกาสตกมากสุดช่วง ${when} (${pct}%)`,
    caution: true,
  }
}

/** One plain-language Thai line for the next few hours. */
export function summarizeUpcomingRain(points: HourlyPoint[]): string {
  return upcomingRain(points).summary
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
  return bangkokParts(d).hour
}
