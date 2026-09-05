/* Repro: does data added via the UI appear without a manual refresh?
 * Login as SMK 11 admin -> /users -> Tambah Pengguna -> save -> row appears? */
const { spawn } = require('child_process')
const http = require('http')
const path = require('path')

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9229
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
      '--user-data-dir=' + path.join(process.env.TEMP || '/tmp', 'tc-refresh-profile'), 'about:blank',
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
        "var proto=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;" +
        "Object.getOwnPropertyDescriptor(proto,'value').set.call(el,'" + val + "');" +
        "el.dispatchEvent(new Event(el instanceof HTMLSelectElement?'change':'input',{bubbles:true}));return true;})()",
    )
  const setSelectText = (sel, text) =>
    evalJs(
      "(function(){var s=document.querySelector('" + sel + "');if(!s)return false;" +
        "var o=[].slice.call(s.options).filter(function(x){return x.text.indexOf('" + text + "')!==-1;})[0];" +
        "if(!o)return false;Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set.call(s,o.value);" +
        "s.dispatchEvent(new Event('change',{bubbles:true}));return true;})()",
    )

  await send('Runtime.enable')
  await send('Page.enable')

  const results = []
  const check = (name, ok, detail = '') => {
    results.push({ name, ok })
    console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' | ' + detail : ''))
  }

  // login
  await send('Page.navigate', { url: APP + '/login' })
  await sleep(3000)
  await setVal('input[name=email]', 'superadmin@tracerconnect.test')
  await setVal('input[name=password]', 'password')
  await sleep(200)
  await evalJs("(function(){var f=document.querySelector('form');if(!f)return false;f.requestSubmit();return true;})()")
  await sleep(4500)
  console.log('after login:', await evalJs('location.href'))

  // /users — add a user via modal
  await send('Page.navigate', { url: APP + '/users' })
  await sleep(6000)
  await evalJs(
    "(function(){var b=[].slice.call(document.querySelectorAll('button')).filter(function(x){return x.textContent.indexOf('Tambah Pengguna')!==-1;})[0];if(!b)return false;b.click();return true;})()",
  )
  await sleep(800)
  await setVal('input[name=name]', 'Operator Refresh Test')
  await setVal('input[name=email]', 'operator-refresh@example.test')
  await setSelectText('select[name=role]', 'HRD')
  await setVal('input[name=password]', 'Password123!')
  await setVal('input[name=password_confirmation]', 'Password123!')
  await sleep(200)
  await evalJs(
    "(function(){var m=document.querySelector('[role=dialog]')||document.body;" +
      "var b=[].slice.call(m.querySelectorAll('button[type=submit]')).filter(function(x){return x.textContent.indexOf('Simpan')!==-1;})[0];" +
      "if(!b)return false;b.click();return true;})()",
  )
  await sleep(2500)
  let body = await evalJs('document.body.innerText')
  check('pengguna baru tampil TANPA refresh', (body || '').indexOf('operator-refresh@example.test') !== -1)
  // navigation to /alumni without refresh
  await evalJs(
    "(function(){var a=[].slice.call(document.querySelectorAll('aside nav a')).filter(function(x){return x.textContent.indexOf('Alumni')!==-1;})[0];if(!a)return false;a.click();return true;})()",
  )
  await sleep(2500)
  const url2 = await evalJs('location.href')
  check('navigasi sidebar → /alumni (tanpa refresh)', url2.indexOf('/alumni') !== -1, url2)
  await evalJs(
    "(function(){var a=[].slice.call(document.querySelectorAll('aside nav a')).filter(function(x){return x.textContent.indexOf('Pengguna')!==-1;})[0];if(!a)return false;a.click();return true;})()",
  )
  await sleep(2000)
  body = await evalJs('document.body.innerText')
  check('kembali ke Pengguna via sidebar → data tetap tampil', (body || '').indexOf('operator-refresh@example.test') !== -1)

  console.log('---')
  console.log('CONSOLE ERRORS:', consoleErrors.length ? consoleErrors : 'none')
  const fails = results.filter((r) => !r.ok)
  console.log('RESULT: ' + (results.length - fails.length) + '/' + results.length + ' passed')
  ws.close()
  chrome.kill()
  process.exit(fails.length ? 1 : 0)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })