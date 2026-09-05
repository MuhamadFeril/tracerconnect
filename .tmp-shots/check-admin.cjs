/* CDP browser check: converted superadmin -> institution_admin must land on
 * the admin dashboard and see the school management menus + /users page. */
const { spawn } = require('child_process')
const http = require('http')
const fs = require('fs')
const path = require('path')

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9223
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
      '--user-data-dir=' + path.join(process.env.TEMP || '/tmp', 'tc-admin-check-profile'),
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

  // --- LOGIN with the converted account -------------------------------------
  await send('Page.navigate', { url: APP + '/login' })
  await sleep(3000)
  const fill = await evalJs(
    "(function(){function setVal(sel,val){var el=document.querySelector(sel);if(!el)return false;" +
      "var setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;" +
      "setter.call(el,val);el.dispatchEvent(new Event('input',{bubbles:true}));return true;}" +
      "return setVal('input[name=email]','superadmin@tracerconnect.test')&&setVal('input[name=password]','password');})()",
  )
  check('isi form login', fill === true)
  await sleep(400)
  await evalJs("(function(){var f=document.querySelector('form');if(!f)return false;f.requestSubmit();return true;})()")
  await sleep(4500)
  const url = await evalJs('location.href')
  check('login → dashboard admin (/dashboard)', url.indexOf('/dashboard') !== -1, url)

  const nav = await evalJs(
    "(function(){var a=[].slice.call(document.querySelectorAll('aside nav a'));" +
      "return a.map(function(x){return x.textContent.trim().replace(/\\s+/g,' ');});})()",
  )
  const navJson = JSON.stringify(nav || [])
  check(
    'sidebar menampilkan menu kelola sekolah',
    navJson.indexOf('Dashboard') !== -1 &&
      navJson.indexOf('Alumni') !== -1 &&
      navJson.indexOf('Jurusan') !== -1 &&
      navJson.indexOf('Kuisioner') !== -1 &&
      navJson.indexOf('Pengguna') !== -1 &&
      navJson.indexOf('Lowongan') !== -1,
    navJson,
  )
  check('menu "Roles" disembunyikan (khusus super admin)', navJson.indexOf('Roles') === -1, navJson)
  await shot('05-institution-admin-dashboard.png')

  // --- /users page ----------------------------------------------------------
  await send('Page.navigate', { url: APP + '/users' })
  await sleep(3500)
  const body = await evalJs('document.body.innerText')
  check('halaman Pengguna terbuka', (body || '').indexOf('Tambah Pengguna') !== -1)
  check(
    'akun konversi tampil sebagai Admin SMK Negeri 11 Malang',
    (body || '').indexOf('Admin SMK Negeri 11 Malang') !== -1 &&
      (body || '').indexOf('superadmin@tracerconnect.test') !== -1 &&
      (body || '').indexOf('Admin Institusi') !== -1,
  )
  await shot('06-institution-admin-users.png')

  console.log('---')
  console.log('CONSOLE ERRORS:', consoleErrors.length ? consoleErrors : 'none')
  const fails = results.filter((r) => !r.ok)
  console.log('RESULT: ' + (results.length - fails.length) + '/' + results.length + ' passed')
  ws.close()
  chrome.kill()
  process.exit(fails.length ? 1 : 0)
}

main().catch((e) => {
  console.error('SCRIPT ERROR:', e)
  process.exit(2)
})
