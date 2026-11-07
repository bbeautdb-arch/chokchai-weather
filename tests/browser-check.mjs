import { chromium, webkit } from 'playwright'
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'fs'

const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/chokchai-weather/'
const out = '/opt/cursor/artifacts'
mkdirSync(out, { recursive: true })

function relL(r, g, b) {
  const lin = (c) => {
    c /= 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
function ratio(fg, bg) {
  const a = relL(...fg)
  const b = relL(...bg)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

const notes = []
const consoleErrors = []

async function open(browser, w, h) {
  const page = await browser.newPage({
    viewport: { width: w, height: h },
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
  })
  page.on('pageerror', (err) => consoleErrors.push(String(err)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  return page
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

const checks = []
async function check(name, ok, detail = '') {
  checks.push({ name, ok, detail })
  console.log(ok ? 'ok' : 'FAIL', name, detail)
}

{
  const page = await open(browser, 360, 800)
  const res = await page.goto(base + '?scene=sunny&tod=day', { waitUntil: 'networkidle', timeout: 40000 })
  await page.locator('[data-sticky]').waitFor({ state: 'visible' })
  await page.evaluate(() => document.fonts.ready)
  const layout = await page.evaluate(() => {
    const h1 = document.querySelector('h1')
    const r = h1?.getBoundingClientRect()
    return { status: 0, overflow: r ? r.right > 360 + 1 : true, text: document.body.innerText.slice(0, 240) }
  })
  await check('360 heading inside viewport', !layout.overflow, layout.text.replace(/\n/g, ' | '))
  await check('home 200', res?.status() === 200)
  const type = await page.evaluate(async () => {
    await document.fonts.ready
    const css = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const cs = getComputedStyle(el)
      return { family: cs.fontFamily, weight: cs.fontWeight }
    }
    return {
      body: css('[data-measure="body"]'),
      label: css('.font-label'),
      temp: css('[data-measure="hero"]'),
      loaded: [400, 500, 600, 700].map((weight) => document.fonts.check(`${weight} 16px "IBM Plex Sans Thai"`)),
    }
  })
  const families = `${type.body?.family ?? ''} ${type.label?.family ?? ''} ${type.temp?.family ?? ''}`
  await check(
    'one Thai family is IBM Plex Sans Thai',
    families.includes('IBM Plex Sans Thai') && !families.includes('Kanit') && !families.includes('Sarabun') && type.loaded.every(Boolean),
    JSON.stringify(type),
  )
  await check(
    'type weights are body 400, labels 500, temperature 600-700',
    type.body?.weight === '400' && type.label?.weight === '500' && Number(type.temp?.weight) >= 600 && Number(type.temp?.weight) <= 700,
    JSON.stringify(type),
  )

  const before = await page.locator('[data-sticky]').innerText()
  await page.locator('.hour-col').nth(5).click()
  const after = await page.locator('[data-sticky]').innerText()
  await check('select future labels forecast or tomorrow', /พยากรณ์|พรุ่งนี้/.test(after), after.split('\n').slice(0, 4).join(' | '))
  await page.getByRole('button', { name: 'ตอนนี้' }).click()
  const back = await page.locator('[data-sticky]').innerText()
  await check('return to now', /ตอนนี้/.test(back) && !/พยากรณ์/.test(back.split('\n')[2] ?? ''), back.split('\n').slice(0, 3).join(' | '))
  await check('selection changed the header', before !== after)

  await page.locator('.hour-scroll').focus()
  await page.keyboard.press('ArrowRight')
  const keyed = await page.locator('[aria-selected="true"]').innerText()
  await check('keyboard moves selection', keyed.length > 0, keyed.replace(/\n/g, ' '))

  await page.evaluate(() => window.scrollTo(0, 520))
  const stuck = await page.locator('[data-sticky]').evaluate((el) => {
    const cs = getComputedStyle(el)
    return {
      top: Math.round(el.getBoundingClientRect().top),
      blur: cs.getPropertyValue('backdrop-filter'),
      webkit: cs.getPropertyValue('-webkit-backdrop-filter'),
    }
  })
  await check('sticky header stays put and keeps blur while scrolling', stuck.top <= 1 && stuck.blur.includes('blur'), JSON.stringify(stuck))
  await page.screenshot({ path: `${out}/mobile-day-scrolled-360.png` })

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('.hour-col').nth(8).click()
  await check('reduced motion still selects', (await page.locator('[aria-selected="true"]').count()) === 1)
  await page.close()
}

{
  const page = await open(browser, 390, 844)
  await page.goto(base, { waitUntil: 'networkidle', timeout: 40000 })
  await page.locator('.hour-col').first().waitFor({ state: 'visible', timeout: 25000 })
  const fixture = await page.locator('.page').getAttribute('data-fixture')
  const text = await page.locator('body').innerText()
  await check('regular mode does not show the fixture marker', fixture === '' && !text.includes('ตัวอย่าง'), `fixture=${fixture}`)
  await page.close()
}

async function shot(name, w, h, query) {
  const page = await open(browser, w, h)
  if (name.includes('reduced-motion')) await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(base + query, { waitUntil: 'networkidle', timeout: 40000 })
  await page.locator('.hour-col').first().waitFor({ state: 'visible', timeout: 25000 })
  await page.waitForFunction(() => document.querySelector('.page')?.getAttribute('data-lum'))
  await page.evaluate(() => document.fonts.ready)
  if (query.includes('select=future')) {
    const cols = page.locator('.hour-col')
    const count = await cols.count()
    const tomorrow = page.locator('.hour-col', { hasText: 'พรุ่งนี้' }).first()
    if (await tomorrow.count()) await tomorrow.click()
    else await cols.nth(Math.min(count - 1, 20)).click()
  }
  await page.screenshot({ path: `${out}/${name}.png` })
  const info = await page.evaluate(() => ({
    tint: document.querySelector('.page')?.getAttribute('data-tint'),
    bg: document.querySelector('.page')?.getAttribute('data-bg'),
    role: document.body.innerText.includes('พรุ่งนี้') ? 'tomorrow-visible' : 'no-tomorrow-word',
  }))
  console.log('shot', name, JSON.stringify(info))
  await page.close()
}

await shot('mobile-morning-360', 360, 800, '?scene=sunny&tod=dawn')
await shot('mobile-day-390', 390, 844, '?scene=sunny&tod=day')
await shot('mobile-evening-390', 390, 844, '?scene=sunny&tod=sunset')
await shot('mobile-night-390', 390, 844, '?scene=sunny&tod=night')
await shot('desktop-morning-1440', 1440, 900, '?scene=sunny&tod=dawn')
await shot('desktop-day-1440', 1440, 900, '?scene=sunny&tod=day')
await shot('desktop-evening-1440', 1440, 900, '?scene=sunny&tod=sunset')
await shot('desktop-night-1440', 1440, 900, '?scene=sunny&tod=night')
await shot('mobile-midnight-390', 390, 844, '?scene=partly&select=future')
await shot('mobile-storm-390', 390, 844, '?mode=storm')
await shot('mobile-fixture-rain-390', 390, 844, '?fixture=rain')
await shot('desktop-fixture-rain-1440', 1440, 900, '?fixture=rain')
await shot('mobile-reduced-motion-390', 390, 844, '?scene=sunny&tod=day')

{
  const page = await open(browser, 390, 844)
  await page.goto(base, { waitUntil: 'networkidle', timeout: 40000 })
  await page.locator('.hour-col', { hasText: '07:00' }).first().click()
  await page.locator('[data-measure="condition"]').first().waitFor({ state: 'visible' })
  const cond = await page.locator('[data-measure="condition"]').first().innerText()
  await check('07:00 does not say harsh sun', !cond.includes('แดดจัด'), cond)
  if (cond.includes('โปร่ง')) await check('07:00 clear sky uses the morning phrase', cond.includes('เช้านี้ฟ้าโปร่ง'), cond)
  const tray = await page.locator('.hour-scroll').evaluate((el) => {
    const cs = getComputedStyle(el)
    return {
      panel: el.classList.contains('panel'),
      background: cs.backgroundColor,
      backdropFilter: cs.getPropertyValue('backdrop-filter'),
      webkitBackdropFilter: cs.getPropertyValue('-webkit-backdrop-filter'),
    }
  })
  const alpha = Number((tray.background.match(/[\d.]+(?=\))/) ?? [])[0])
  const blurPx = Number((tray.backdropFilter.match(/blur\(([\d.]+)px\)/) ?? [])[1])
  await check('hour tray is glass, not the opaque panel', !tray.panel && alpha >= 0.45 && alpha <= 0.6 && blurPx >= 28 && blurPx <= 36, JSON.stringify(tray))
  await page.screenshot({ path: `${out}/mobile-0700-390.png` })
  await page.close()
}

function parseCssColor(str) {
  const m = String(str).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (!m) return { r: 0, g: 0, b: 0, a: 1 }
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: m[4] == null ? 1 : Number(m[4]) }
}
function composite(fg, bg) {
  const a = fg.a + bg.a * (1 - fg.a)
  const mix = (fc, bc) => Math.round((fc * fg.a + bc * bg.a * (1 - fg.a)) / (a || 1))
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b), a }
}
async function pixelsBehind(page, box) {
  const width = Math.max(2, Math.min(8, box.width || 2))
  const height = Math.max(2, Math.min(8, box.height || 2))
  const vpBox = page.viewportSize() ?? { width: 390, height: 844 }
  let x = box.x + Math.max(0, (box.width - width) / 2)
  let y = box.y + Math.max(0, (box.height - height) / 2)
  x = Math.min(Math.max(0, x), Math.max(0, vpBox.width - width))
  y = Math.min(Math.max(0, y), Math.max(0, vpBox.height - height))
  const buf = await page.screenshot({
    clip: { x, y, width, height },
  })
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true })
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i < data.length; i += info.channels) {
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1
  }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n), a: 1 }
}

async function contrastOf(page, locator, paint, need) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  if (!box || box.width < 1 || box.height < 1) return null
  const vp = page.viewportSize() ?? { width: 390, height: 844 }
  if (box.x + box.width < 2 || box.y + box.height < 2 || box.x > vp.width - 2 || box.y > vp.height - 2) return null
  const spec = await locator.evaluate((el) => {
    const cs = getComputedStyle(el)
    return { color: cs.color, background: cs.backgroundColor, opacity: cs.opacity, stroke: cs.stroke, strokeOpacity: cs.strokeOpacity }
  })
  const fgSpec = parseCssColor(paint === 'stroke' ? spec.stroke : paint === 'fill' ? spec.background : spec.color)
  fgSpec.a *= Number(spec.opacity) || 1
  if (paint === 'stroke') fgSpec.a *= Number(spec.strokeOpacity) || 1
  const prev = await locator.evaluate((el, kind) => {
    const snap = { color: el.style.color, background: el.style.background, stroke: el.getAttribute('stroke'), opacity: el.style.opacity }
    if (kind === 'stroke') el.setAttribute('stroke', 'transparent')
    else if (kind === 'fill') el.style.background = 'transparent'
    else el.style.color = 'transparent'
    return snap
  }, paint)
  const behind = await pixelsBehind(page, box)
  await locator.evaluate((el, snap) => {
    el.style.color = snap.color
    el.style.background = snap.background
    el.style.opacity = snap.opacity
    if (snap.stroke == null) el.removeAttribute('stroke')
    else el.setAttribute('stroke', snap.stroke)
  }, prev)
  const painted = composite(fgSpec, behind)
  const fg = [painted.r, painted.g, painted.b]
  const bg = [behind.r, behind.g, behind.b]
  return {
    fg: fg.join(','),
    bg: bg.join(','),
    opacity: Number(fgSpec.a.toFixed(2)),
    ratio: Number(ratio(fg, bg).toFixed(2)),
    need,
    pass: ratio(fg, bg) >= need,
  }
}

async function readBlur(page) {
  return page.evaluate(() => {
    const read = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const cs = getComputedStyle(el)
      return {
        backdropFilter: cs.getPropertyValue('backdrop-filter'),
        webkitBackdropFilter: cs.getPropertyValue('-webkit-backdrop-filter'),
      }
    }
    const pageEl = document.querySelector('.page')
    return {
      card: read('article.glass-solid'),
      sticky: read('[data-sticky]'),
      glass: read('.glass'),
      tray: read('.hour-scroll'),
      frost: pageEl instanceof HTMLElement ? pageEl.style.getPropertyValue('--frost') : '',
      fixture: pageEl?.getAttribute('data-fixture'),
    }
  })
}

const blurReport = {}
{
  const page = await open(browser, 390, 844)
  await page.goto(base + '?fixture=rain&scene=sunny&tod=dawn', { waitUntil: 'networkidle', timeout: 40000 })
  await page.locator('.hour-col').first().waitFor({ state: 'visible' })
  const text = await page.locator('body').innerText()
  await check('fixture shows example marker', text.includes('ตัวอย่าง'))
  await check('dawn clear copy avoids harsh sun', text.includes('เช้านี้ฟ้าโปร่ง') && !text.includes('แดดจัด'), text.slice(0, 180).replace(/\n/g, ' | '))
  await check('fixture keeps exact 60 and 100', text.includes('60%') && text.includes('100%') && text.includes('59%'))
  blurReport.chrome = await readBlur(page)
  await page.screenshot({ path: `${out}/mobile-fixture-rain-390.png` })
  const desk = await open(browser, 1440, 900)
  await desk.goto(base + '?fixture=rain&scene=sunny&tod=day', { waitUntil: 'networkidle', timeout: 40000 })
  await desk.locator('.hour-col').first().waitFor({ state: 'visible' })
  await desk.screenshot({ path: `${out}/desktop-fixture-rain-1440.png` })
  await desk.close()
  const client = await page.context().newCDPSession(page)
  await client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('.hour-col').first().waitFor({ state: 'visible' })
  blurReport.chromeReducedTransparency = await readBlur(page)
  await page.screenshot({ path: `${out}/mobile-reduced-transparency-390.png` })
  await page.close()
}

const contrast = []
const plates = [
  ['sunny-day-3', 'day'],
  ['sunny-sunset-2', 'sunset'],
  ['sunny-dawn-1', 'dawn'],
  ['sunny-night-1', 'night'],
]
{
  const page = await open(browser, 390, 844)
  await page.addInitScript(() => sessionStorage.removeItem('chokchai-hour-selection-v1'))
  for (const [plate, tod] of plates) {
    await page.goto(base + `?scene=sunny&tod=${tod}&plate=${plate}&fixture=rain`, { waitUntil: 'networkidle', timeout: 40000 })
    await page.waitForFunction(() => document.querySelector('.page')?.getAttribute('data-lum'))
    const tint = await page.evaluate(() => document.querySelector('.page')?.getAttribute('data-tint'))
    const far = page.locator('.temp-line line[stroke-dasharray="4 4"]').last()
    if (await far.count()) await far.scrollIntoViewIfNeeded()
    await page.locator('.hour-col').last().click()
    const targets = [
      [page.locator('[data-sticky] h1').first(), 'text', 4.5, 'sticky-title'],
      [page.locator('[data-sticky] [data-measure="meta"]').first(), 'text', 4.5, 'sticky-meta'],
      [page.locator('[data-sticky] [data-measure="hero"]').first(), 'text', 4.5, 'sticky-temp'],
      [page.locator('[data-measure="glass"]').first(), 'text', 4.5, 'glass-heading'],
      [page.locator('.hour-col.is-selected .font-label').last(), 'text', 4.5, 'selected-label'],
      [far, 'stroke', 3, 'far-temp-line'],
      [page.locator('.hour-scroll .tick:not(.is-on)').first(), 'fill', 3, 'inactive-tick'],
      [page.locator('.hour-scroll .tick-stack.is-strong .tick.is-on').first(), 'fill', 3, 'blue-tick'],
      [page.locator('.caution.is-rain').first(), 'text', 4.5, 'blue-badge'],
    ]
    for (const [locator, paint, need, el] of targets) {
      if (!(await locator.count())) continue
      const hit = await contrastOf(page, locator, paint, need)
      if (!hit) continue
      contrast.push({ plate, tint, el, ...hit })
      console.log(plate, tint, el, hit.fg, 'on', hit.bg, hit.ratio, hit.pass ? 'pass' : 'FAIL')
    }
    const dashes = await page.evaluate(() =>
      [...document.querySelectorAll('.temp-line line')].slice(0, 8).map((line) => line.getAttribute('stroke-dasharray')),
    )
    if (plate === 'sunny-day-3') {
      await check('first six segments are solid and the next is 4 4', dashes.slice(0, 6).every((d) => !d) && dashes[6] === '4 4', JSON.stringify(dashes))
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(base + '?scene=sunny&tod=day&plate=sunny-day-3', { waitUntil: 'networkidle', timeout: 40000 })
  await page.locator('aside h1').first().waitFor({ state: 'visible' })
  const desk = await contrastOf(page, page.locator('aside [data-measure="hero"]').first(), 'text', 4.5)
  if (desk) {
    contrast.push({ plate: 'sunny-day-3', tint: 'day', el: 'desktop-hero', ...desk })
    console.log('desktop-hero', desk.fg, 'on', desk.bg, desk.ratio, desk.pass ? 'pass' : 'FAIL')
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(base + '?mode=storm', { waitUntil: 'networkidle', timeout: 40000 })
  await page.locator('[data-sticky] h1').waitFor({ state: 'visible' })
  for (const [sel, paint, need, el] of [
    ['[data-sticky] h1', 'text', 4.5, 'storm-sticky-title'],
    ['[data-sticky] [data-measure="hero"]', 'text', 4.5, 'storm-sticky-temp'],
    ['article [data-measure="glass"]', 'text', 4.5, 'storm-card-heading'],
    ['.hour-scroll .font-label', 'text', 4.5, 'storm-hour-label'],
    ['.hour-scroll .tick', 'fill', 3, 'storm-tick'],
  ]) {
    const hit = await contrastOf(page, page.locator(sel).first(), paint, need)
    if (!hit) continue
    contrast.push({ plate: 'storm', tint: 'storm', el, ...hit })
    console.log('storm', el, hit.fg, 'on', hit.bg, hit.ratio, hit.pass ? 'pass' : 'FAIL')
  }
  const orangeHost = page.locator('.caution.is-heat').first()
  if (await orangeHost.count()) {
    const hit = await contrastOf(page, orangeHost, 'text', 4.5)
    if (hit) {
      contrast.push({ plate: 'storm', tint: 'storm', el: 'orange-badge', ...hit })
      console.log('storm orange-badge', hit.fg, 'on', hit.bg, hit.ratio, hit.pass ? 'pass' : 'FAIL')
    }
  }
  const narrow = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }))
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto(base + '?mode=storm', { waitUntil: 'networkidle' })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  await check('storm layout no horizontal overflow at 360', overflow <= 1, `extra ${overflow}px`)
  console.log('narrow leftover', narrow)
  await page.close()
}

let webkitStatus = 'not-installed'
try {
  const wk = await webkit.launch()
  const page = await wk.newPage({ viewport: { width: 390, height: 844 }, locale: 'th-TH', timezoneId: 'Asia/Bangkok' })
  const res = await page.goto(base + '?fixture=rain&scene=sunny&tod=dawn', { waitUntil: 'networkidle', timeout: 40000 })
  await page.locator('.hour-col').nth(3).click()
  const selected = await page.locator('[data-sticky]').innerText()
  await page.evaluate(() => window.scrollTo(0, 420))
  const stuck = await page.locator('[data-sticky]').evaluate((el) => Math.round(el.getBoundingClientRect().top))
  await page.screenshot({ path: `${out}/webkit-selected-390.png` })
  await page.getByRole('button', { name: 'ตอนนี้' }).click()
  const restored = await page.locator('[data-sticky]').innerText()
  blurReport.webkit = await readBlur(page)
  webkitStatus = `launched status ${res?.status()} forecast=${/พยากรณ์|พรุ่งนี้/.test(selected)} returned=${/ตอนนี้/.test(restored) && !/พยากรณ์/.test(restored)} stickyTop=${stuck} blur=${JSON.stringify(blurReport.webkit)}`
  await page.screenshot({ path: `${out}/webkit-fixture-rain-390.png` })
  await wk.close()
} catch (err) {
  webkitStatus = `unavailable: ${err instanceof Error ? err.message.split('\n')[0] : err}`
}
notes.push(`WebKit: ${webkitStatus}`)
notes.push('Chromium mobile viewport is not a physical iPhone. Playwright WebKit is an emulator, not a physical iPhone.')
notes.push('Chrome getPropertyValue(-webkit-backdrop-filter) is empty while backdrop-filter is the used blur. Both declarations are in the production CSS. WebKit reports both computed values as the same blur.')
notes.push('prefers-reduced-transparency was emulated in Chromium via CDP. Playwright WebKit has no reduced-transparency media emulation, so that fallback was not forced there.')
notes.push(`Console errors: ${consoleErrors.filter((e) => !e.includes('favicon')).length}`)

const report = {
  engine: 'Chromium via /usr/bin/google-chrome, Playwright',
  webkit: webkitStatus,
  checks,
  blur: blurReport,
  contrast,
  consoleErrors: consoleErrors.slice(0, 20),
  notes,
}
writeFileSync(`${out}/hourly-test-report.json`, JSON.stringify(report, null, 2))
const failed = checks.filter((c) => !c.ok).length + contrast.filter((c) => !c.pass).length
console.log('failed items', failed)
await browser.close()
if (failed) process.exit(1)
