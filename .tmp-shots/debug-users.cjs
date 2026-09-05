/* Debug: inspect what /users actually renders for the SMK 11 institution admin. */
const { spawn } = require('child_process')
const http = require('http')
const path = require('path')

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9228
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
  const chrome = spawn(
    CHROME,
    [
      '--headless=new', '--remote-debugging-port=' + PORT, '--no-first-run', '--no-default-browser-check',
      '--disable-gpu', '--window-size=1440,900',
      '--user-data-dir=' + path.join(process.env.TEMP || '/tmp', 'tc-debug-users-profile'), 'about:blank',
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
  if (!target) { console.error('no target'); chrome.kill(); process.exit(1) }
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
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id; pending.set(mid, resolve); ws.send(JSON.stringify({ id: mid, method, params }))
  })
  const evalJs = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (res.result?.exceptionDetails) throw new Error('EVAL: ' + JSON.stringify(res.result.exceptionDetails))
    return res.result?.result?.value
  }

  await send('Runtime.enable')
  await send('Page.enable')

  await send('Page.navigate', { url: APP + '/login' })
  await sleep(3000)
  await evalJs(
    "(function(){function setVal(sel,val){var el=document.querySelector(sel);if(!el)return false;" +
      "var setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;" +
      "setter.call(el,val);el.dispatchEvent(new Event('input',{bubbles:true}));return true;}" +
      "return setVal('input[name=email]','superadmin@tracerconnect.test')&&setVal('input[name=password]','password');})()",
  )
  await sleep(300)
  await evalJs("(function(){var f=document.querySelector('form');if(!f)return false;f.requestSubmit();return true;})()")
  await sleep(4500)
  console.log('after login:', await evalJs('location.href'))

  await send('Page.navigate', { url: APP + '/users' })
  await sleep(10000)
  const info = await evalJs(
    "(function(){var t=document.body.innerText;" +
      "var rows=[].slice.call(document.querySelectorAll('tbody tr')).map(function(r){return r.innerText.replace(/\\s+/g,' ').trim();});" +
      "var err=[].slice.call(document.querySelectorAll('div, p')).filter(function(e){return /Gagal|kesalahan|Terjadi/.test(e.textContent);}).map(function(e){return e.textContent.trim();}).slice(0,3);" +
      "return {url:location.pathname," +
      "hasEmail:t.indexOf('superadmin@tracerconnect.test')!==-1," +
      "hasUji:t.indexOf('uji.alumni.smk11@example.test')!==-1," +
      "loading:t.indexOf('Memuat data pengguna')!==-1," +
      "empty:t.indexOf('Tidak ada pengguna')!==-1," +
      "gagal:t.indexOf('Gagal memuat data pengguna')!==-1," +
      "rows:rows, errs:err," +
      "tail:t.slice(-400)};})()",
  )
  console.log('consoleErrors:', consoleErrors)
  console.log(JSON.stringify(info, null, 2))
  ws.close()
  chrome.kill()
  process.exit(0)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })