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

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('.hour-col').nth(8).click()
  await check('reduced motion still selects', (await page.locator('[aria-selected="true"]').count()) === 1)
  await page.close()
}

async function shot(name, w, h, query) {
  const page = await open(browser, w, h)
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
    await page.goto(base + `?scene=sunny&tod=${tod}&plate=${plate}`, { waitUntil: 'networkidle', timeout: 40000 })
    await page.waitForFunction(() => document.querySelector('.page')?.getAttribute('data-lum'))
    const tint = await page.evaluate(() => document.querySelector('.page')?.getAttribute('data-tint'))
    const far = page.locator('.temp-line line').last()
    if (await far.count()) await far.scrollIntoViewIfNeeded()
    await page.locator('.hour-col').last().click()
    const targets = [
      [page.locator('[data-measure="glass"]').first(), 'text', 4.5, 'glass-heading'],
      [page.locator('.hour-col.is-selected .font-label').last(), 'text', 4.5, 'selected-label'],
      [far, 'stroke', 3, 'far-temp-line'],
      [page.locator('.tick:not(.is-on)').first(), 'fill', 3, 'inactive-tick'],
    ]
    for (const [locator, paint, need, el] of targets) {
      if (!(await locator.count())) continue
      const hit = await contrastOf(page, locator, paint, need)
      if (!hit) continue
      contrast.push({ plate, tint, el, ...hit })
      console.log(plate, tint, el, hit.fg, 'on', hit.bg, hit.ratio, hit.pass ? 'pass' : 'FAIL')
    }
    const probe = await page.evaluate(() => {
      const host = document.querySelector('#details') || document.body
      const blue = document.createElement('span')
      blue.className = 'caution is-rain'
      blue.dataset.probe = 'blue'
      blue.textContent = 'ฝน 60%'
      const orange = document.createElement('span')
      orange.className = 'caution is-heat'
      orange.dataset.probe = 'orange'
      orange.textContent = 'พายุ'
      const strong = document.createElement('i')
      strong.className = 'tick is-on'
      strong.dataset.probe = 'strong'
      const stack = document.createElement('span')
      stack.className = 'tick-stack is-strong'
      stack.appendChild(strong)
      host.append(blue, orange, stack)
      return true
    })
    if (probe) {
      for (const [sel, paint, need, el] of [
        ['[data-probe="blue"]', 'text', 4.5, 'blue-badge'],
        ['[data-probe="orange"]', 'text', 4.5, 'orange-badge'],
        ['[data-probe="strong"]', 'fill', 3, 'blue-tick'],
      ]) {
        const hit = await contrastOf(page, page.locator(sel), paint, need)
        if (!hit) continue
        contrast.push({ plate, tint, el, ...hit })
        console.log(plate, tint, el, hit.fg, 'on', hit.bg, hit.ratio, hit.pass ? 'pass' : 'FAIL')
      }
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
  const res = await page.goto(base + '?scene=sunny&tod=day', { waitUntil: 'networkidle', timeout: 40000 })
  await page.locator('.hour-col').nth(3).click()
  const text = await page.locator('[data-sticky]').innerText()
  webkitStatus = `launched status ${res?.status()} selection ${/พยากรณ์|พรุ่งนี้|ตอนนี้/.test(text)}`
  await page.screenshot({ path: `${out}/webkit-mobile-390.png` })
  await wk.close()
} catch (err) {
  webkitStatus = `unavailable: ${err instanceof Error ? err.message.split('\n')[0] : err}`
}
notes.push(`WebKit: ${webkitStatus}`)
notes.push('Chromium mobile viewport is not a physical iPhone. No real iOS device was used.')
notes.push(`Console errors: ${consoleErrors.filter((e) => !e.includes('favicon')).length}`)

const report = {
  engine: 'Chromium via /usr/bin/google-chrome, Playwright',
  webkit: webkitStatus,
  checks,
  contrast,
  consoleErrors: consoleErrors.slice(0, 20),
  notes,
}
writeFileSync(`${out}/hourly-test-report.json`, JSON.stringify(report, null, 2))
const failed = checks.filter((c) => !c.ok).length + contrast.filter((c) => !c.pass).length
console.log('failed items', failed)
await browser.close()
if (failed) process.exit(1)
