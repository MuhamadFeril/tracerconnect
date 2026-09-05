/* CDP: login, open Tambah Pengguna modal, dump Role select options + Institusi field presence. */
const { spawn } = require('child_process')
const http = require('http')
const fs = require('fs')
const path = require('path')

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9229
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
  const profile = path.join(process.env.TEMP || '/tmp', 'tc-role-modal-' + Date.now())
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
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
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
  console.log('URL:', await evalJs('location.href'))
  console.log('STORED USER (localStorage):', await evalJs("(function(){try{return JSON.stringify(JSON.parse(localStorage.getItem('tc.user')||'null'));}catch(e){return 'err:'+e.message;}})()"))

  // OPEN MODAL
  await send('Page.navigate', { url: APP + '/users' })
  await sleep(2500)
  const clicked = await evalJs(
    "(function(){var b=[].slice.call(document.querySelectorAll('button'));" +
      "var t=b.find(function(x){return x.textContent.indexOf('Tambah Pengguna')!==-1;});" +
      "if(!t)return 'no button';t.click();return 'clicked';})()",
  )
  console.log('OPEN MODAL:', clicked)
  await sleep(1200)

  const dump = await evalJs(
    "(function(){var sel=document.querySelector('select[name=role]');" +
      "var opts=sel?[].slice.call(sel.options).map(function(o){return o.text+'('+o.value+')';}):null;" +
      "var labels=[].slice.call(document.querySelectorAll('label')).map(function(l){return l.textContent.trim();});" +
      "var body=document.body.innerText;return {opts:opts,hasInstitusi:body.indexOf('Pilih institusi')!==-1||labels.some(function(l){return l.indexOf('Institusi')!==-1;})," +
      "labels:labels,bodyHead:body.slice(0,400)};})()",
  )
  console.log('ROLE OPTIONS:', JSON.stringify(dump.opts))
  console.log('HAS INSTITUSI FIELD:', dump.hasInstitusi)
  console.log('LABELS:', JSON.stringify(dump.labels))

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  if (shot.result?.data) fs.writeFileSync(path.join(SHOT_DIR, 'debug-role-modal.png'), Buffer.from(shot.result.data, 'base64'))
  console.log('SCREENSHOT: debug-role-modal.png')

  ws.close()
  chrome.kill()
  process.exit(0)
}

main().catch((e) => { console.error('SCRIPT ERROR:', e); process.exit(2) })