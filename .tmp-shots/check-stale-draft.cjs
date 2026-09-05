/* Simulasikan draft registrasi basi (institusi lama yang sudah dihapus) dan
 * pastikan form registrasi otomatis memakai SMK Negeri 11 Malang + jurusan terisi. */
const { spawn } = require('child_process')
const http = require('http')
const path = require('path')

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9232
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
      '--user-data-dir=' + path.join(process.env.TEMP || '/tmp', 'tc-stale-profile'), 'about:blank',
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
    if (msg.method === 'Network.requestWillBeSent' && /\/departments/.test(msg.params.request.url)) {
      net.push(msg.params.request.url)
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
  await send('Network.enable')

  await send('Page.navigate', { url: APP + '/register' })
  await sleep(3000)
  // seed draft basi dengan id institusi lama (sudah dihapus)
  const draft = JSON.stringify({
    step: 2,
    email: 'x@example.test',
    institutionId: '01a04d83-3451-73b7-ab49-7f47534bacfb',
    provinceId: '', provinceName: '', regencyId: '', regencyName: '', districtId: '',
    form: { name: '', department: '', gender: '', phone: '', nis: '', nisn: '', yearIn: '', yearOut: '', birthplace: '', birthDate: '', address: '', skills: [], socials: [] },
    career: null,
    careerDetails: {},
  })
  await evalJs("localStorage.setItem('tracerconnect-register-draft', " + JSON.stringify(draft) + ");true")
  await send('Page.navigate', { url: APP + '/register' })
  await sleep(4000)

  const state = await evalJs(
    "(function(){var t=document.body.innerText;var s=document.querySelector('#reg-department');" +
      "return {onStep2:t.indexOf('Personal Info')!==-1," +
      "showsNotAvailable:t.indexOf('Jurusan belum tersedia')!==-1," +
      "deptOptions:s?[].slice.call(s.options).map(function(o){return o.text;}):null," +
      "hasRetry:t.indexOf('muat ulang')!==-1};})()",
  )
  console.log('STATE:', JSON.stringify(state))
  console.log('NET depts:', JSON.stringify(net))
  ws.close()
  chrome.kill()
  process.exit(0)
}
main().catch((e) => { console.error('ERR', e); process.exit(2) })