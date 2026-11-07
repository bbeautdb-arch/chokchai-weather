/** Pure forecast window, labels, rain ticks, and selection. No network. */

export interface ForecastHour {
  time: string
  hour: number
  temperature: number | null
  precipProb: number | null
  weatherCode: number | null
  isDay: boolean | null
  apparentTemperature: number | null
  humidity: number | null
  windSpeed: number | null
  precipitation: number | null
  cloudCover: number | null
}

export type HourRole = 'now' | 'forecast' | 'tomorrow'
export type TimeTint = 'morning' | 'day' | 'evening' | 'night'

export const FORECAST_HOURS = 18

/** Always reach at least a few hours after the next local midnight. */
export function windowLength(nowIso: string, min = FORECAST_HOURS, pastMidnight = 6): number {
  const hour = Number(nowIso.slice(11, 13)) || 0
  const toMidnight = hour === 0 ? 24 : 24 - hour
  return Math.min(36, Math.max(min, toMidnight + pastMidnight))
}
const SELECTION_KEY = 'chokchai-hour-selection-v1'

export function finiteNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function formatHourLabel(iso: string): string {
  const time = iso.split('T')[1] ?? '00:00'
  const [hh = '00', mm = '00'] = time.split(':')
  let h = Number(hh)
  if (h === 24) h = 0
  return `${String(h).padStart(2, '0')}:${mm.slice(0, 2).padStart(2, '0')}`
}

export function dateKey(iso: string): string {
  return iso.slice(0, 10)
}

/** Tick count is the only rounding. The spoken percentage stays exact. */
export function rainTickCount(pct: number | null): number | null {
  if (pct == null || !Number.isFinite(pct)) return null
  const clamped = Math.max(0, Math.min(100, pct))
  return Math.round(clamped / 10)
}

export function rainTicksAreStrong(pct: number | null): boolean {
  return pct != null && pct >= 60
}

export interface WindowRain {
  pct: number | null
  when: string
  summary: string
  caution: boolean
  strong: boolean
  missing: boolean
}

export function windowRain(points: ForecastHour[]): WindowRain {
  if (!points.length) {
    return {
      pct: null,
      when: '',
      summary: 'ยังไม่มีข้อมูลช่วงข้างหน้า',
      caution: false,
      strong: false,
      missing: true,
    }
  }
  const known = points.filter((p) => p.precipProb != null)
  if (!known.length) {
    return {
      pct: null,
      when: '',
      summary: 'ยังไม่มีข้อมูลฝนในช่วงนี้',
      caution: false,
      strong: false,
      missing: true,
    }
  }
  let max = known[0]
  for (const p of known) {
    if ((p.precipProb ?? -1) > (max.precipProb ?? -1)) max = p
  }
  const pct = Math.round(max.precipProb ?? 0)
  if ((max.precipProb ?? 0) < 30) {
    return {
      pct,
      when: '',
      summary: `ช่วง ${points.length} ชม. ข้างหน้าไม่น่ามีฝน`,
      caution: false,
      strong: false,
      missing: false,
    }
  }
  const threshold = Math.max(30, (max.precipProb ?? 0) - 15)
  const peakIdx = points.findIndex((p) => p.time === max.time)
  let lo = peakIdx
  let hi = peakIdx
  while (lo > 0 && (points[lo - 1].precipProb ?? -1) >= threshold) lo -= 1
  while (hi < points.length - 1 && (points[hi + 1].precipProb ?? -1) >= threshold) hi += 1
  const a = formatHourLabel(points[lo].time)
  const b = formatHourLabel(points[hi].time)
  const when = lo === hi ? a : `${a}–${b}`
  const strong = pct >= 60
  const summary = strong
    ? `ฝนมีโอกาสตกมากช่วง ${when} (${pct}%)`
    : `มีโอกาสฝนช่วง ${when} (${pct}%)`
  return { pct, when, summary, caution: true, strong, missing: false }
}

/** One useful sentence for the same window the chart and rain badge use. */
export function thaiWindowSummary(points: ForecastHour[]): string {
  const rain = windowRain(points)
  if (rain.missing || rain.caution) return rain.summary
  const temps = points.map((p) => p.temperature).filter((t): t is number => t != null)
  if (temps.length >= 2) {
    const first = temps[0]
    let hottest = points[0]
    for (const p of points) {
      if ((p.temperature ?? -999) > (hottest.temperature ?? -999)) hottest = p
    }
    if (hottest.temperature != null && hottest.temperature - first >= 3) {
      return `อากาศยังเย็น อุณหภูมิสูงขึ้นช่วง ${formatHourLabel(hottest.time)}`
    }
    const last = temps[temps.length - 1]
    if (first - last >= 3) return 'อากาศค่อยๆ ลดลงในช่วงข้างหน้า'
  }
  return rain.summary
}

export function hourRole(point: ForecastHour, nowTime: string, today: string): HourRole {
  if (point.time === nowTime) return 'now'
  if (dateKey(point.time) !== today) return 'tomorrow'
  return 'forecast'
}

export function hourStatusLabel(role: HourRole): string {
  if (role === 'now') return 'ตอนนี้'
  if (role === 'tomorrow') return 'พรุ่งนี้'
  return 'พยากรณ์'
}

/** Now uses the wall clock. Forecast slots keep the hour-start label. */
export function statusClock(role: HourRole, slotIso: string, wallHHmm: string): string {
  if (role === 'now') return wallHHmm
  return formatHourLabel(slotIso)
}

export function bangkokWallClock(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  let hour = Number(get('hour'))
  if (hour === 24) hour = 0
  return `${String(hour).padStart(2, '0')}:${get('minute').slice(0, 2).padStart(2, '0')}`
}

/** WHO “high” UV, or strong shortwave. Daytime alone is not evidence. */
export const STRONG_SUN_UV = 6
export const STRONG_SUN_SHORTWAVE = 600

export interface ClearSkyInput {
  tod: 'dawn' | 'day' | 'sunset' | 'night'
  /** Local clock `HH:MM` or an ISO timestamp in Asia/Bangkok. */
  clock?: string | null
  sunrise?: string | null
  uvIndex?: number | null
  shortwaveWm2?: number | null
}

function clockMinutes(value: string): number | null {
  const time = value.includes('T') ? (value.split('T')[1] ?? '') : value
  const [hh, mm] = time.split(':')
  const hour = Number(hh)
  const minute = Number(mm)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  return (hour === 24 ? 0 : hour) * 60 + minute
}

export function hasStrongSun(uvIndex?: number | null, shortwaveWm2?: number | null): boolean {
  const uv = uvIndex != null && Number.isFinite(uvIndex) ? uvIndex : null
  const solar = shortwaveWm2 != null && Number.isFinite(shortwaveWm2) ? shortwaveWm2 : null
  if (uv == null && solar == null) return false
  return (uv != null && uv >= STRONG_SUN_UV) || (solar != null && solar >= STRONG_SUN_SHORTWAVE)
}

/** Clear-sky wording. Harsh sun requires UV or shortwave, never is_day. */
export function clearSkyPhrase(input: ClearSkyInput): string {
  if (input.tod === 'night') return 'ท้องฟ้าแจ่มใส'
  if (input.tod === 'dawn') return 'เช้านี้ฟ้าโปร่ง'
  const minutes = input.clock ? clockMinutes(input.clock) : null
  const rise = input.sunrise ? clockMinutes(input.sunrise) : null
  if (minutes != null && rise != null && minutes < rise) return 'ท้องฟ้าโปร่ง'
  if (minutes != null && minutes < 9 * 60 && rise != null && minutes >= rise) return 'เช้านี้ฟ้าโปร่ง'
  if (minutes != null && minutes < 9 * 60 && rise == null) return 'ท้องฟ้าโปร่ง'
  if (hasStrongSun(input.uvIndex, input.shortwaveWm2)) return 'ท้องฟ้าโปร่ง · แดดจัด'
  return 'ท้องฟ้าโปร่ง'
}

export function nightSafeCopy(label: string, night: boolean): string {
  if (!night || !label.includes('แดด')) return label
  return 'ท้องฟ้าแจ่มใส'
}

export function freshnessLabel(input: { failed: boolean; hasStale: boolean; fromCache: boolean }): string {
  if (input.failed && !input.hasStale) return 'โหลดไม่สำเร็จ'
  if (input.hasStale || input.fromCache) return 'ข้อมูลที่บันทึกไว้'
  return 'ข้อมูลสด'
}

export function timeTintFor(tod: 'dawn' | 'day' | 'sunset' | 'night', hour: number): TimeTint {
  if (tod === 'night') return 'night'
  if (tod === 'dawn') return 'morning'
  if (tod === 'sunset') return 'evening'
  if (hour >= 20 || hour < 5) return 'night'
  if (hour < 10) return 'morning'
  if (hour >= 16) return 'evening'
  return 'day'
}

/** Solid for the first 6 forecast hours, then a fixed dash. Not a confidence interval. */
export function segmentDash(index: number, _total?: number): string | undefined {
  if (index < 6) return undefined
  return '4 4'
}

/** On-screen rain fixture. Never used unless the page is explicitly in fixture mode. */
export function applyRainFixture<T extends { precipProb: number | null }>(points: T[]): T[] {
  const pattern = [0, 59, 60, 85, 100]
  return points.map((point, index) =>
    index < pattern.length ? { ...point, precipProb: pattern[index] } : point,
  )
}

export function loadSelection(storage: Pick<Storage, 'getItem'> | null): string | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(SELECTION_KEY)
    if (!raw) return null
    return raw
  } catch {
    return null
  }
}

export function saveSelection(storage: Pick<Storage, 'setItem' | 'removeItem'> | null, time: string | null): void {
  if (!storage) return
  try {
    if (!time) storage.removeItem(SELECTION_KEY)
    else storage.setItem(SELECTION_KEY, time)
  } catch {
    /* private mode */
  }
}

/** Drop a stored hour that is no longer in the window or is the current hour. */
export function reconcileSelection(
  stored: string | null,
  points: ForecastHour[],
  nowTime: string | null,
): string | null {
  if (!stored || stored === nowTime) return null
  return points.some((p) => p.time === stored) ? stored : null
}

export function selectHour(time: string, nowTime: string | null): string | null {
  if (!nowTime || time === nowTime) return null
  return time
}
