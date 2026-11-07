import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  finiteNumber,
  hourRole,
  hourStatusLabel,
  bangkokWallClock,
  freshnessLabel,
  nightSafeCopy,
  rainTickCount,
  rainTicksAreStrong,
  reconcileSelection,
  segmentDash,
  selectHour,
  statusClock,
  thaiWindowSummary,
  timeTintFor,
  windowLength,
  windowRain,
  type ForecastHour,
} from '../src/lib/forecastView.ts'

function hour(partial: Partial<ForecastHour> & { time: string }): ForecastHour {
  const hourNum = Number(partial.time.slice(11, 13))
  return {
    hour: hourNum,
    temperature: 30,
    precipProb: 0,
    weatherCode: 0,
    isDay: true,
    apparentTemperature: 31,
    humidity: 60,
    windSpeed: 5,
    precipitation: 0,
    cloudCover: 10,
    ...partial,
  }
}

describe('rain ticks', () => {
  it('keeps null unknown and rounds only the stack', () => {
    assert.equal(rainTickCount(null), null)
    assert.equal(rainTickCount(0), 0)
    assert.equal(rainTickCount(54), 5)
    assert.equal(rainTickCount(60), 6)
    assert.equal(rainTickCount(0), 0)
    assert.equal(rainTickCount(59), 6)
    assert.equal(rainTickCount(60), 6)
    assert.equal(rainTickCount(100), 10)
    assert.equal(rainTicksAreStrong(0), false)
    assert.equal(rainTicksAreStrong(59), false)
    assert.equal(rainTicksAreStrong(60), true)
    assert.equal(rainTicksAreStrong(100), true)
    assert.equal(finiteNumber(undefined), null)
  })
})

describe('windows', () => {
  it('uses one peak for the whole window and ignores a different daily max', () => {
    const points = [
      hour({ time: '2026-11-07T22:00', precipProb: 10 }),
      hour({ time: '2026-11-07T23:00', precipProb: 40 }),
      hour({ time: '2026-11-08T00:00', precipProb: 70, isDay: false }),
      hour({ time: '2026-11-08T01:00', precipProb: null, isDay: false }),
    ]
    const rain = windowRain(points)
    assert.equal(rain.pct, 70)
    assert.equal(rain.strong, true)
    assert.match(rain.summary, /00:00/)
    assert.match(rain.summary, /70%/)
    assert.doesNotMatch(rain.summary, /86%/)
  })

  it('says there is no rain data when every hour is null', () => {
    const rain = windowRain([hour({ time: '2026-11-07T12:00', precipProb: null })])
    assert.equal(rain.missing, true)
    assert.match(rain.summary, /ไม่มีข้อมูลฝน/)
  })
})

describe('current versus forecast', () => {
  const today = '2026-11-07'
  const now = '2026-11-07T22:00'
  const points = [
    hour({ time: now }),
    hour({ time: '2026-11-07T23:00' }),
    hour({ time: '2026-11-08T00:00', isDay: false }),
  ]

  it('labels tomorrow after midnight and forecast before it', () => {
    assert.equal(hourRole(points[0], now, today), 'now')
    assert.equal(hourStatusLabel('now'), 'ตอนนี้')
    assert.equal(hourRole(points[1], now, today), 'forecast')
    assert.equal(hourStatusLabel('forecast'), 'พยากรณ์')
    assert.equal(hourRole(points[2], now, today), 'tomorrow')
    assert.equal(hourStatusLabel('tomorrow'), 'พรุ่งนี้')
  })

  it('keeps the wall clock on now and the hour slot on a forecast', () => {
    assert.equal(statusClock('now', '2026-11-08T00:00', '00:51'), '00:51')
    assert.equal(statusClock('forecast', '2026-11-08T14:00', '00:51'), '14:00')
    assert.equal(statusClock('tomorrow', '2026-11-09T00:00', '00:51'), '00:00')
    assert.equal(bangkokWallClock(new Date('2026-11-07T17:51:00Z')), '00:51')
  })

  it('does not call a night sky sunny in normal mode', () => {
    assert.equal(nightSafeCopy('ท้องฟ้าโปร่ง · แดดจัด', true), 'ท้องฟ้าแจ่มใส')
    assert.equal(nightSafeCopy('ท้องฟ้าโปร่ง · แดดจัด', false), 'ท้องฟ้าโปร่ง · แดดจัด')
    assert.equal(nightSafeCopy('เมฆมาก', true), 'เมฆมาก')
  })

  it('names offline and saved data without inventing a live state', () => {
    assert.equal(freshnessLabel({ failed: true, hasStale: false, fromCache: false }), 'โหลดไม่สำเร็จ')
    assert.equal(freshnessLabel({ failed: true, hasStale: true, fromCache: false }), 'ข้อมูลที่บันทึกไว้')
    assert.equal(freshnessLabel({ failed: false, hasStale: false, fromCache: true }), 'ข้อมูลที่บันทึกไว้')
    assert.equal(freshnessLabel({ failed: false, hasStale: false, fromCache: false }), 'ข้อมูลสด')
  })

  it('returns to now and drops a stale selection', () => {
    assert.equal(selectHour(now, now), null)
    assert.equal(selectHour('2026-11-08T00:00', now), '2026-11-08T00:00')
    assert.equal(reconcileSelection('2026-11-08T00:00', points, now), '2026-11-08T00:00')
    assert.equal(reconcileSelection(now, points, now), null)
    assert.equal(reconcileSelection('2026-11-09T00:00', points, now), null)
  })
})

describe('summary and tint', () => {
  it('writes one sentence from the same window', () => {
    const text = thaiWindowSummary([
      hour({ time: '2026-11-07T15:00', precipProb: 20, temperature: 31 }),
      hour({ time: '2026-11-07T16:00', precipProb: 80, temperature: 30 }),
    ])
    assert.match(text, /80%/)
    assert.equal(text.split('。').length, 1)
  })

  it('tints morning cool and evening warm without calling night morning', () => {
    assert.equal(timeTintFor('dawn', 7), 'morning')
    assert.equal(timeTintFor('dawn', 2), 'morning')
    assert.equal(timeTintFor('sunset', 17), 'evening')
    assert.equal(timeTintFor('night', 2), 'night')
    assert.equal(timeTintFor('day', 21), 'night')
  })

  it('covers the next midnight from the evening and from midnight', () => {
    assert.ok(windowLength('2026-11-07T22:00') >= 8)
    assert.ok(windowLength('2026-11-07T22:00') >= 18)
    assert.ok(windowLength('2026-11-08T00:00') >= 30)
  })

  it('dashes only later segments', () => {
    assert.equal(segmentDash(0, 16), undefined)
    assert.ok(segmentDash(14, 16)?.includes(' '))
  })
})
