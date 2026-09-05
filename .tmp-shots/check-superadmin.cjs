/* CDP: verify super_admin restored — Roles menu visible, modal shows all 4 roles, institution picker toggles. */
const { spawn } = require('child_process')
const http = require('http')
const fs = require('fs')
const path = require('path')

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9231
const SHOT_DIR = path.join(__dirname, 'shots')
const APP = 'http://localhost:5173'
const EMAIL = 'superadmin@tracerconnect.test'
const PASSWORD = 'password'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const getJson = (url) =>
  new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => {
        try { resolve(JSON.parse(d)) } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  const profile = path.join(process.env.TEMP || '/tmp', 'tc-superadmin-' + Date.now())
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--window-size=1440,900',
    '--user-data-dir=' + profile,
    'about:blank',
  ], { stdio: 'ignore' })

  let target
  for (let i = 0; i < 40; i++) {
    await sleep(400)
    try {
      const list = await getJson('http://127.0.0.1:' + PORT + '/json/list')
      target = list.find((t) => t.type === 'page')
      if (target) break
    } catch {}
  }
  if (!target) { console.error('FAIL: no chrome target'); chrome.kill(); process.exit(1) }

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

  let id = 0
  const pending = new Map()
  const consoleErrors = []
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
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

  const results = []
  const check = (name, ok, detail = '') => {
    results.push({ name, ok })
    console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' | ' + detail : ''))
  }

  await send('Runtime.enable')
  await send('Page.enable')

  // LOGIN
  await send('Page.navigate', { url: APP + '/login' })
  await sleep(3000)
  await evalJs(
    "(function(){function setVal(sel,val){var el=document.querySelector(sel);if(!el)return false;" +
      "var setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;" +
      "setter.call(el,val);el.dispatchEvent(new Event('input',{bubbles:true}));return true;}" +
      "return setVal('input[name=email]','" + EMAIL + "')&&setVal('input[name=password]','" + PASSWORD + "');})()",
  )
  await sleep(400)
  await evalJs("(function(){var f=document.querySelector('form');if(!f)return false;f.requestSubmit();return true;})()")
  await sleep(4500)
  const url = await evalJs('location.href')
  check('login → /dashboard', url.indexOf('/dashboard') !== -1, url)

  const nav = await evalJs(
    "(function(){var a=[].slice.call(document.querySelectorAll('aside nav a'));" +
      "return a.map(function(x){return x.textContent.trim().replace(/\\s+/g,' ');});})()",
  )
  const navJson = JSON.stringify(nav || [])
  check('menu Roles tampil untuk super admin', navJson.indexOf('Roles') !== -1, navJson)

  // OPEN MODAL + dump role options
  await send('Page.navigate', { url: APP + '/users' })
  await sleep(2500)
  await evalJs(
    "(function(){var b=[].slice.call(document.querySelectorAll('button'));" +
      "var t=b.find(function(x){return x.textContent.indexOf('Tambah Pengguna')!==-1;});" +
      "if(!t)return 'no button';t.click();return 'clicked';})()",
  )
  await sleep(1200)
  const opts = await evalJs(
    "(function(){var sel=document.querySelector('select[name=role]');" +
      "return sel?[].slice.call(sel.options).map(function(o){return o.text+'('+o.value+')';}):null;})()",
  )
  check('dropdown Role = 4 role', JSON.stringify(opts) === JSON.stringify(['Super Admin(super_admin)', 'Admin Institusi(institution_admin)', 'Alumni(alumni)', 'HRD(hrd)']), JSON.stringify(opts))

  // Select Admin Institusi → institution field must appear
  await evalJs(
    "(function(){var sel=document.querySelector('select[name=role]');" +
      "var setter=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;" +
      "setter.call(sel,'institution_admin');sel.dispatchEvent(new Event('change',{bubbles:true}));return true;})()",
  )
  await sleep(600)
  const hasInst = await evalJs(
    "(function(){var sel=document.querySelector('select[name=institution_id]');" +
      "var body=document.body.innerText;return {sel:!!sel,hasPilih:body.indexOf('Pilih institusi')!==-1};})()",
  )
  check('field Institusi muncul utk role Admin Institusi', hasInst.sel && hasInst.hasPilih, JSON.stringify(hasInst))

  // Switch to Super Admin → institution field must disappear
  await evalJs(
    "(function(){var sel=document.querySelector('select[name=role]');" +
      "var setter=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set;" +
      "setter.call(sel,'super_admin');sel.dispatchEvent(new Event('change',{bubbles:true}));return true;})()",
  )
  await sleep(600)
  const noInst = await evalJs("(function(){return !document.querySelector('select[name=institution_id]');})()")
  check('field Institusi hilang utk role Super Admin', noInst)

  await shot('10-superadmin-modal.png')

  console.log('---')
  console.log('CONSOLE ERRORS:', consoleErrors.length ? consoleErrors : 'none')
  const fails = results.filter((r) => !r.ok)
  console.log('RESULT: ' + (results.length - fails.length) + '/' + results.length + ' passed')
  ws.close()
  chrome.kill()
  process.exit(fails.length ? 1 : 0)
}

main().catch((e) => { console.error('SCRIPT ERROR:', e); process.exit(2) })