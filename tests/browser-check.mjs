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

async function sample(page, selector) {
  const handle = page.locator(selector).locator('visible=true').first()
  if (!(await handle.count())) return null
  const color = await handle.evaluate((el) => getComputedStyle(el).color)
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  const fg = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0]
  const box = await handle.boundingBox()
  if (!box) return null
  await handle.evaluate((el) => {
    el.dataset.prev = el.style.color
    el.style.color = 'transparent'
  })
  const buf = await page.screenshot({
    clip: {
      x: Math.max(0, box.x + 2),
      y: Math.max(0, box.y + 2),
      width: Math.max(8, Math.min(24, box.width - 4)),
      height: Math.max(6, Math.min(14, box.height - 2)),
    },
  })
  await handle.evaluate((el) => {
    el.style.color = el.dataset.prev || ''
  })
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true })
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let i = 0; i < data.length; i += info.channels) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    n += 1
  }
  const bg = [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
  return { fg, bg, ratio: Number(ratio(fg, bg).toFixed(2)) }
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
  await (w >= 1000 ? page.locator('aside') : page.locator('[data-sticky]')).waitFor({ state: 'visible' })
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
await shot('desktop-day-1440', 1440, 900, '?scene=sunny&tod=day')
await shot('desktop-evening-1440', 1440, 900, '?scene=sunny&tod=sunset')
await shot('mobile-midnight-390', 390, 844, '?scene=partly&select=future')
await shot('mobile-storm-390', 390, 844, '?mode=storm')

const contrast = []
const plates = [
  ['sunny-day-3', 'day'],
  ['sunny-sunset-2', 'sunset'],
  ['sunny-dawn-1', 'dawn'],
]
{
  const page = await open(browser, 390, 844)
  for (const [plate, tod] of plates) {
    await page.goto(base + `?scene=sunny&tod=${tod}&plate=${plate}`, { waitUntil: 'networkidle', timeout: 40000 })
    await page.waitForFunction(() => document.querySelector('.page')?.getAttribute('data-lum'))
    const tint = await page.evaluate(() => document.querySelector('.page')?.getAttribute('data-tint'))
    for (const name of ['glass', 'hero', 'body']) {
      const hit = await sample(page, `[data-measure="${name}"]`)
      if (!hit) continue
      const need = name === 'hero' ? 3 : 4.5
      // glass heading is body-sized text on the photo card
      contrast.push({ plate, tint, el: name, ...hit, bg: hit.bg.join(','), need, pass: hit.ratio >= need })
      console.log(plate, tint, name, hit.ratio, hit.ratio >= need ? 'pass' : 'FAIL')
    }
    const tick = await sample(page, '.tick.is-on')
    if (tick) {
      contrast.push({ plate, tint, el: 'tick', ...tick, bg: tick.bg.join(','), need: 3, pass: tick.ratio >= 3 })
      console.log(plate, 'tick', tick.ratio)
    }
  }
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
