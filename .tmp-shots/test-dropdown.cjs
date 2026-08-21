/* CDP-driven browser test for the UserDropdown (sidebar + mobile topbar). */
const { spawn } = require('child_process')
const http = require('http')
const fs = require('fs')
const path = require('path')

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9222
const SHOT_DIR = path.join(__dirname, 'shots')
const APP = 'http://localhost:5173'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const getJson = (url) =>
  new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => {
          try { resolve(JSON.parse(d)) } catch (e) { reject(e) }
        })
      })
      .on('error', reject)
  })

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--remote-debugging-port=' + PORT,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--window-size=1440,900',
      '--user-data-dir=' + path.join(process.env.TEMP || '/tmp', 'tc-chrome-profile'),
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  let target
  for (let i = 0; i < 40; i++) {
    await sleep(400)
    try {
      const list = await getJson('http://127.0.0.1:' + PORT + '/json/list')
      target = list.find((t) => t.type === 'page')
      if (target) break
    } catch {}
  }
  if (!target) {
    console.error('FAIL: no chrome target')
    chrome.kill()
    process.exit(1)
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = rej
  })

  let id = 0
  const pending = new Map()
  const consoleErrors = []
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push('EXCEPTION: ' + (msg.params.exceptionDetails?.text || ''))
    }
  }
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const mid = ++id
      pending.set(mid, resolve)
      ws.send(JSON.stringify({ id: mid, method, params }))
    })
  const evalJs = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (res.result?.exceptionDetails) throw new Error('EVAL: ' + JSON.stringify(res.result.exceptionDetails))
    return res.result?.result?.value
  }
  const shot = async (name) => {
    const res = await send('Page.captureScreenshot', { format: 'png' })
    if (res.result?.data) fs.writeFileSync(path.join(SHOT_DIR, name), Buffer.from(res.result.data, 'base64'))
  }

  await send('Runtime.enable')
  await send('Page.enable')

  const results = []
  const check = (name, ok, detail = '') => {
    results.push({ name, ok })
    console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' | ' + detail : ''))
  }

  // --- LOGIN ---------------------------------------------------------------
  await send('Page.navigate', { url: APP + '/login' })
  await sleep(3500)
  const fill = await evalJs(
    "(function(){function setVal(sel,val){var el=document.querySelector(sel);if(!el)return false;" +
      "var setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;" +
      "setter.call(el,val);el.dispatchEvent(new Event('input',{bubbles:true}));return true;}" +
      "return setVal('input[name=email]','andi.pratama@example.com')&&setVal('input[name=password]','password');})()",
  )
  check('isi form login', fill === true)
  await sleep(400)
  const submitted = await evalJs("(function(){var f=document.querySelector('form');if(!f)return false;f.requestSubmit();return true;})()")
  check('submit form login', submitted === true)
  await sleep(4500)
  const url = await evalJs('location.href')
  check('redirect setelah login ke /home', url.indexOf('/home') !== -1, url)
  await shot('01-after-login-home.png')

  // --- SIDEBAR DROPDOWN (desktop) -------------------------------------------
  const opened = await evalJs(
    "(function(){var btn=document.querySelector('aside button[aria-label=\"Menu pengguna\"]');" +
      "if(!btn)return {found:false};btn.click();return {found:true};})()",
  )
  check('buka dropdown sidebar', opened.found === true)
  await sleep(700)

  const menuInfo = await evalJs(
    "(function(){var menu=document.querySelector('[role=menu]');if(!menu)return {found:false};" +
      "var items=[].map.call(menu.querySelectorAll('[role=menuitem]'),function(i){return i.textContent.trim().replace(/\\s+/g,' ');});" +
      "var header=menu.querySelector('div').textContent.trim().replace(/\\s+/g,' ');" +
      "var btn=document.querySelector('aside button[aria-label=\"Menu pengguna\"]');" +
      "var mr=menu.getBoundingClientRect();var br=btn.getBoundingClientRect();" +
      "return {found:true,items:items,header:header,opensAbove:mr.bottom<=br.top+2," +
      "menuTop:Math.round(mr.top),menuBottom:Math.round(mr.bottom),btnTop:Math.round(br.top)};})()",
  )
  check('menu dropdown muncul', menuInfo.found === true)
  const itemsJson = JSON.stringify(menuInfo.items || [])
  check(
    'item menu: Profil + Notifikasi + Keluar',
    itemsJson.indexOf('Profil') !== -1 && itemsJson.indexOf('Notifikasi') !== -1 && itemsJson.indexOf('Keluar') !== -1,
    itemsJson,
  )
  check('header berisi nama dan email', !!menuInfo.header && menuInfo.header.indexOf('@') !== -1, menuInfo.header)
  check(
    'dropdown sidebar membuka ke ATAS',
    menuInfo.opensAbove === true,
    'menu bottom=' + menuInfo.menuBottom + ' vs btn top=' + menuInfo.btnTop,
  )
  await shot('02-sidebar-dropdown-open.png')

  const badge = await evalJs(
    "(function(){var menu=document.querySelector('[role=menu]');var b=menu&&menu.querySelector('span.rounded-full');return b?b.textContent:null;})()",
  )
  console.log('INFO | unread notification badge in dropdown:', badge === null ? 'none' : badge)

  // click Profil menu item
  await evalJs(
    "(function(){var m=document.querySelector('[role=menu]');var link=[].find.call(m.querySelectorAll('[role=menuitem]'),function(i){return i.textContent.indexOf('Profil')!==-1;});if(link)link.click();return !!link;})()",
  )
  await sleep(2500)
  const url2 = await evalJs('location.href')
  check('klik "Profil" → navigasi ke /profile', url2.indexOf('/profile') !== -1, url2)
  await shot('03-profile-page.png')

  // back home, reopen, click outside -> closes
  await send('Page.navigate', { url: APP + '/home' })
  await sleep(2500)
  await evalJs("(function(){var b=document.querySelector('aside button[aria-label=\"Menu pengguna\"]');if(b)b.click();return !!b;})()")
  await sleep(600)
  const open1 = await evalJs("!!document.querySelector('[role=menu]')")
  check('dropdown terbuka kembali', open1 === true)
  await evalJs("document.querySelector('main').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))")
  await sleep(600)
  const closed1 = await evalJs("!document.querySelector('[role=menu]')")
  check('klik di luar → dropdown menutup', closed1 === true)

  // reopen + Escape -> closes
  await evalJs("(function(){var b=document.querySelector('aside button[aria-label=\"Menu pengguna\"]');if(b)b.click();return !!b;})()")
  await sleep(600)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await sleep(600)
  const closed2 = await evalJs("!document.querySelector('[role=menu]')")
  check('tekan Escape → dropdown menutup', closed2 === true)

  // --- MOBILE TOPBAR DROPDOWN ------------------------------------------------
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await sleep(1500)
  const mobOpened = await evalJs(
    "(function(){var btns=[].slice.call(document.querySelectorAll('button[aria-label=\"Menu pengguna\"]'));" +
      "var topbar=btns.filter(function(b){return !b.closest('aside');})[0];if(!topbar)return {found:false};topbar.click();return {found:true};})()",
  )
  check('buka dropdown topbar (mobile)', mobOpened.found === true)
  await sleep(700)
  const mInfo = await evalJs(
    "(function(){var menu=document.querySelector('[role=menu]');if(!menu)return {found:false};" +
      "var items=[].map.call(menu.querySelectorAll('[role=menuitem]'),function(i){return i.textContent.trim().replace(/\\s+/g,' ');});" +
      "var btn=[].filter.call(document.querySelectorAll('button[aria-label=\"Menu pengguna\"]'),function(b){return !b.closest('aside');})[0];" +
      "var mr=menu.getBoundingClientRect();var br=btn.getBoundingClientRect();var vw=window.innerWidth;" +
      "return {found:true,items:items,opensBelow:mr.top>=br.bottom-2,withinViewport:mr.right<=vw+1&&mr.left>=-1," +
      "rect:{left:Math.round(mr.left),right:Math.round(mr.right),top:Math.round(mr.top),bottom:Math.round(mr.bottom)},vw:vw};})()",
  )
  check('menu dropdown mobile muncul', mInfo.found === true)
  const mItems = JSON.stringify(mInfo.items || [])
  check(
    'item menu mobile lengkap',
    mItems.indexOf('Profil') !== -1 && mItems.indexOf('Notifikasi') !== -1 && mItems.indexOf('Keluar') !== -1,
    mItems,
  )
  check(
    'dropdown topbar membuka ke BAWAH & rata kanan dalam viewport',
    mInfo.opensBelow === true && mInfo.withinViewport === true,
    'rect=' + JSON.stringify(mInfo.rect) + ' vw=' + mInfo.vw,
  )
  await shot('04-mobile-topbar-dropdown.png')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await sleep(500)

  // --- REPORT ---------------------------------------------------------------
  console.log('---')
  console.log('CONSOLE ERRORS:', consoleErrors.length ? consoleErrors : 'none')
  const fails = results.filter((r) => !r.ok)
  console.log('RESULT: ' + (results.length - fails.length) + '/' + results.length + ' passed')
  console.log('SCREENSHOTS: ' + SHOT_DIR)
  ws.close()
  chrome.kill()
  process.exit(fails.length ? 1 : 0)
}

main().catch((e) => {
  console.error('SCRIPT ERROR:', e)
  process.exit(2)
})
