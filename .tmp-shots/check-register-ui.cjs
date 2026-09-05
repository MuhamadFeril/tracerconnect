/* Cek UI registrasi web: pemilih institusi & dropdown Jurusan di mode single-tenant. */
const { spawn } = require('child_process')
const http = require('http')
const path = require('path')

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9231
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
      '--user-data-dir=' + path.join(process.env.TEMP || '/tmp', 'tc-reg-ui-profile'), 'about:blank',
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
  const net = []
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
    if (msg.method === 'Network.requestWillBeSent' && /\/institutions\/|\/regions\//.test(msg.params.request.url)) {
      net.push(msg.method + ' ' + msg.params.request.method + ' ' + msg.params.request.url)
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
  const setVal = (sel, val) =>
    evalJs(
      "(function(){var el=document.querySelector('" + sel + "');if(!el)return false;" +
        "Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el,'" + val + "');" +
        "el.dispatchEvent(new Event('input',{bubbles:true}));return true;})()",
    )

  await send('Runtime.enable')
  await send('Page.enable')
  await send('Network.enable')

  await send('Page.navigate', { url: APP + '/register' })
  await sleep(4000)
  await evalJs("localStorage.removeItem('tracerconnect-register-draft');true")
  await send('Page.navigate', { url: APP + '/register' })
  await sleep(4000)

  const step1 = await evalJs(
    "(function(){return {hasInstitutionSelect:!!document.querySelector('select[name=institution_id]')," +
      "institutionOptions:[].slice.call(document.querySelectorAll('select[name=institution_id] option')).map(function(o){return o.text;})," +
      "hasEmail:!!document.querySelector('#reg-email')};})()",
  )
  console.log('STEP1:', JSON.stringify(step1))

  await setVal('#reg-email', 'cek-ui-alumni@example.test')
  await setVal('#reg-password', 'Password123!')
  await setVal('#reg-confirmation', 'Password123!')
  await sleep(300)
  await evalJs("(function(){var f=document.querySelector('main form');if(!f)return false;var b=f.querySelector('button[type=submit]');if(!b)return false;b.click();return true;})()")
  await sleep(3500)
  const step2 = await evalJs(
    "(function(){var s=document.querySelector('#reg-department');" +
      "return {onStep2:!!document.querySelector('#reg-name')," +
      "deptDisabled:s?s.disabled:null," +
      "deptOptions:s?[].slice.call(s.options).map(function(o){return o.text;}):null};})()",
  )
  console.log('STEP2:', JSON.stringify(step2))
  console.log('NET:', JSON.stringify(net.filter((x, i, a) => a.indexOf(x) === i)))

  ws.close()
  chrome.kill()
  process.exit(0)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })