/* Debug the Tambah Pengguna modal submit path. */
const { spawn } = require('child_process')
const http = require('http')
const path = require('path')

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9230
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
  // bersihkan user uji dari percobaan sebelumnya supaya tidak bentrok
  try {
    require('child_process').execSync(
      "php artisan tinker --execute=\"$u=App\\Models\\User::where('email','operator-refresh@example.test')->first();if($u){$u->forceDelete();echo 'cleaned';}\"",
      { cwd: path.join(__dirname, '..', 'backend'), timeout: 30000, stdio: 'pipe' },
    )
  } catch {}
  const chrome = spawn(
    CHROME,
    [
      '--headless=new', '--remote-debugging-port=' + PORT, '--no-first-run', '--no-default-browser-check',
      '--disable-gpu', '--window-size=1440,900',
      '--user-data-dir=' + path.join(process.env.TEMP || '/tmp', 'tc-modal-profile'), 'about:blank',
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
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
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
      "(function(){var el=document.querySelector('" + sel + "');if(!el)return {ok:false};" +
        "var proto=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;" +
        "Object.getOwnPropertyDescriptor(proto,'value').set.call(el,'" + val + "');" +
        "el.dispatchEvent(new Event(el instanceof HTMLSelectElement?'change':'input',{bubbles:true}));return {ok:true,tag:el.tagName,id:el.id};})()",
    )

  await send('Runtime.enable')
  await send('Page.enable')
  await send('Network.enable')
  const netLog = []
  const netOn = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.method === 'Network.requestWillBeSent' && /\/api\/v1\/users/.test(msg.params.request.url)) {
      netLog.push({ kind: 'REQ', url: msg.params.request.url, method: msg.params.request.method, body: (msg.params.request.postData || '').slice(0, 300) })
    }
    if (msg.method === 'Network.responseReceived' && /\/api\/v1\/users/.test(msg.params.response.url)) {
      netLog.push({ kind: 'RES', url: msg.params.response.url, status: msg.params.response.status })
    }
  }
  const _orig = ws.onmessage
  ws.onmessage = (ev) => { netOn(ev); _orig(ev) }

  await send('Page.navigate', { url: APP + '/login' })
  await sleep(3000)
  await setVal('input[name=email]', 'superadmin@tracerconnect.test')
  await setVal('input[name=password]', 'password')
  await sleep(200)
  await evalJs("(function(){var f=document.querySelector('form');if(!f)return false;f.requestSubmit();return true;})()")
  await sleep(4500)

  await send('Page.navigate', { url: APP + '/users' })
  await sleep(7000)
  const opened = await evalJs(
    "(function(){var b=[].slice.call(document.querySelectorAll('button')).filter(function(x){return x.textContent.indexOf('Tambah Pengguna')!==-1;})[0];if(!b)return {ok:false};b.click();return {ok:true};})()",
  )
  await sleep(1000)
  const modalInfo = await evalJs(
    "(function(){var dlg=document.querySelector('[role=dialog]');" +
      "var inputs=[].slice.call(document.querySelectorAll('input,select')).map(function(i){return {id:i.id,name:i.name,type:i.type};});" +
      "var btns=[].slice.call(document.querySelectorAll('button')).filter(function(b){return b.textContent.trim()==='Simpan';}).map(function(b){return {text:b.textContent.trim(),type:b.type,form:b.getAttribute('form')};});" +
      "return {dialog:!!dlg, inputs:inputs, simpanBtns:btns, bodyHasModalTitle:document.body.innerText.indexOf('Tambah Pengguna')!==-1};})()",
  )
  console.log('opened=', JSON.stringify(opened))
  console.log('modal=', JSON.stringify(modalInfo, null, 1))

  const r1 = await setVal('input[name=name]', 'Operator Refresh Test')
  const r2 = await setVal('input[name=email]', 'operator-refresh@example.test')
  const r3 = await setVal('select[name=role]', 'hrd')
  const r4 = await setVal('input[name=password]', 'Password123!')
  const r5 = await setVal('input[name=password_confirmation]', 'Password123!')
  console.log('fills=', JSON.stringify({ r1, r2, r3, r4, r5 }))
  const readback = await evalJs(
    "(function(){function v(sel){var e=document.querySelector(sel);return e?e.value:null;}" +
      "return {name:v('input[name=name]'),email:v('input[name=email]'),role:v('select[name=role]'),pw:v('input[name=password]'),pw2:v('input[name=password_confirmation]')};})()",
  )
  console.log('readback=', JSON.stringify(readback))

  const submit = await evalJs(
    "(function(){var form=document.getElementById('user-form');if(!form)return {ok:false,why:'no form'};" +
      "var b=document.querySelector('button[form=user-form]');if(b){b.click();return {ok:true,how:'button'};}" +
      "form.requestSubmit();return {ok:true,how:'requestSubmit'};})()",
  )
  console.log('submit=', JSON.stringify(submit))
  await sleep(3000)
  const after = await evalJs(
    "(function(){var t=document.body.innerText;" +
      "var rows=[].slice.call(document.querySelectorAll('tbody tr')).map(function(r){return r.innerText.replace(/\\s+/g,' ');});" +
      "var err=[].slice.call(document.querySelectorAll('div, p')).filter(function(e){return /Gagal|kesalahan|sudah|wajib|tidak cocok|institusi/i.test(e.textContent);}).map(function(e){return e.textContent.trim();}).slice(0,5);" +
      "var toast=[].slice.call(document.querySelectorAll('[data-sonner-toast], li')).map(function(e){return e.textContent.trim();}).filter(function(x){return x.length<120;}).slice(0,3);" +
      "return {rowInTable:rows.some(function(r){return r.indexOf('operator-refresh@example.test')!==-1;}), rows:rows, dialogStill:!!document.querySelector('[role=dialog]'), errs:err, toast:toast};})()",
  )
  console.log('afterSubmit=', JSON.stringify(after, null, 1))
  console.log('netLog=', JSON.stringify(netLog, null, 1))
  ws.close()
  chrome.kill()
  process.exit(0)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })