/* CDP browser test: full alumni registration (regular flow, single-tenant =
 * SMK Negeri 11 Malang only) — account, personal info incl. the Jurusan
 * dropdown, career status, OTP verify, landing on /home. */
const { spawn, execSync } = require('child_process')
const http = require('http')
const fs = require('fs')
const path = require('path')

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9225
const SHOT_DIR = path.join(__dirname, 'shots')
const APP = 'http://localhost:5173'
const BACKEND = path.join(__dirname, '..', 'backend')

const EMAIL = 'uji.alumni.smk11@example.test'
const PASSWORD = 'Password123!'
const MAJOR = 'Rekayasa Perangkat Lunak'
const PROVINCE = 'Jawa Timur'
const REGENCY = 'Kota Malang'

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

function readOtp() {
  const cmd =
    "php artisan tinker --execute=\"echo \\Illuminate\\Support\\Facades\\Cache::get('otp:register:" +
    EMAIL.toLowerCase() +
    "');\""
  try {
    return (execSync(cmd, { cwd: BACKEND, encoding: 'utf8', timeout: 30000 }) || '').trim()
  } catch {
    return ''
  }
}

function cleanupPrevious() {
  const cmd =
    "php artisan tinker --execute=\"" +
    "$u=App\\Models\\User::where('email','" +
    EMAIL +
    "')->first();if($u){$u->alumni()->forceDelete();$u->forceDelete();echo 'cleaned';}else{echo 'none';}\""
  try {
    execSync(cmd, { cwd: BACKEND, encoding: 'utf8', timeout: 30000 })
  } catch (e) {
    console.error('cleanup warn:', e.message.split('\n')[0])
  }
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  cleanupPrevious()

  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--remote-debugging-port=' + PORT,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--window-size=1440,900',
      '--user-data-dir=' + path.join(process.env.TEMP || '/tmp', 'tc-register2-profile'),
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
  const setInput = (sel, val) =>
    evalJs(
      "(function(){var el=document.querySelector('" + sel +
        "');if(!el)return false;var proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;" +
        "Object.getOwnPropertyDescriptor(proto,'value').set.call(el,'" + val + "');" +
        "el.dispatchEvent(new Event('input',{bubbles:true}));return true;})()",
    )
  // Pick an <option> containing optionText; falls back to the first usable
  // option when text is not matched. Asserts a non-empty value was set.
  const setSelect = (sel, optionText) =>
    evalJs(
      "(function(){var s=document.querySelector('" + sel + "');if(!s||s.disabled)return {ok:false};" +
        "var want='" + optionText + "';var opts=[].slice.call(s.options);" +
        "var pool=want?opts.filter(function(x){return x.text.indexOf(want)!==-1;}):[];" +
        "var o=pool[0]||opts.find(function(x){return x.value&&!x.disabled;});" +
        "if(!o||!o.value){return {ok:false,total:opts.length,first:opts[0]?opts[0].text:''};}" +
        "Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set.call(s,o.value);" +
        "s.dispatchEvent(new Event('change',{bubbles:true}));return {ok:true,chosen:o.text,total:opts.length};})()",
    )
  const clickSubmit = () =>
    evalJs(
      "(function(){var f=document.querySelector('main form');if(!f)return false;var b=f.querySelector('button[type=submit]');if(!b)return false;b.click();return true;})()",
    )
  const readErrors = () =>
    evalJs(
      "(function(){var ps=[].slice.call(document.querySelectorAll('p.text-rose-600, div.text-rose-700'));" +
        "return ps.map(function(p){return p.textContent.trim();}).filter(Boolean).slice(0,8);})()",
    )
  const waitFor = async (expr, timeoutMs = 15000, label = 'condition') => {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const v = await evalJs(expr)
      if (v) return v
      await sleep(400)
    }
    throw new Error('timeout menunggu: ' + label)
  }
  // Wait until the select is enabled AND has usable options, then pick.
  const pickWhenReady = async (sel, optionText, label) => {
    await waitFor(
      "(function(){var s=document.querySelector('" + sel + "');if(!s||s.disabled)return false;" +
        "return [].slice.call(s.options).filter(function(o){return o.value;}).length>0;})()",
      20000,
      label + ' siap',
    )
    const r = await setSelect(sel, optionText)
    if (!r.ok) throw new Error('gagal memilih di ' + sel + ': ' + JSON.stringify(r))
    return r
  }

  await send('Runtime.enable')
  await send('Page.enable')

  const results = []
  const check = (name, ok, detail = '') => {
    results.push({ name, ok })
    console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' | ' + detail : ''))
  }

  // --- OPEN /register, clear stale draft --------------------------------------
  await send('Page.navigate', { url: APP + '/register' })
  await sleep(3000)
  await evalJs("localStorage.removeItem('tracerconnect-register-draft');true")
  await send('Page.navigate', { url: APP + '/register' })
  await sleep(3000)
  const hasStep1 = await evalJs("!!document.querySelector('#reg-email')")
  check('halaman register terbuka (Langkah 1)', hasStep1 === true)

  // --- STEP 1: account (single-tenant — no institution picker) -----------------
  await setInput('#reg-email', EMAIL)
  await setInput('#reg-password', PASSWORD)
  await setInput('#reg-confirmation', PASSWORD)
  await sleep(300)
  await clickSubmit()
  await sleep(2500)
  await waitFor("!!document.querySelector('#reg-name')", 15000, 'Langkah 2 (Personal Info)')
  const step2 = await evalJs("document.body.innerText.indexOf('Personal Info')!==-1")
  check('lanjut ke Langkah 2 (Personal Info)', step2 === true)
  await shot('08-reg-1-step2.png')

  // --- STEP 2: personal info -----------------------------------------------------
  await setInput('#reg-name', 'Uji Alumni SMK11')
  // Jurusan (SMK 11 majors, loaded automatically via the single tenant)
  const majors = await waitFor(
    "(function(){var s=document.querySelector('#reg-department');if(!s||s.disabled)return null;" +
      "var t=[].slice.call(s.options).map(function(o){return o.text;});" +
      "return t.length>1?t:null;})()",
    15000,
      'dropdown Jurusan terisi',
  )
  check(
    'dropdown Jurusan tidak terkunci & berisi jurusan SMK 11',
    Array.isArray(majors) &&
      (majors.some((m) => m.indexOf('Rekayasa Perangkat Lunak') !== -1) || majors.some((m) => m.indexOf('RPL') !== -1)),
    JSON.stringify(majors),
  )
  const deptSel = await setSelect('#reg-department', MAJOR)
  check('pilih jurusan ' + MAJOR, deptSel.ok === true, JSON.stringify(deptSel))
  await setSelect('#reg-gender', 'Laki-laki')
  await setInput('#reg-phone', '081234567890')
  await setInput('#reg-nis', '2025000001')
  await setInput('#reg-nisn', '0098765432')
  await pickWhenReady('#reg-year-in', '2021', 'Tahun Masuk')
  await pickWhenReady('#reg-year-out', '2024', 'Tahun Lulus')
  // Birthplace cascade
  await pickWhenReady('#reg-province', PROVINCE, 'Provinsi lahir')
  await pickWhenReady('#reg-birthplace', REGENCY, 'Kabupaten/Kota lahir')
  const dist = await pickWhenReady('#reg-district', '', 'Kecamatan lahir')
  check('Kecamatan lahir terpilih', dist.ok === true && !!dist.chosen, JSON.stringify(dist))
  await setInput('#reg-birthdate', '2007-05-12')
  await setInput('#reg-address', 'Jl. Uji Coba No. 12, Malang, Jawa Timur')
  await shot('08-reg-2-filled.png')
  await clickSubmit()
  await sleep(2500)
  const errs2 = await readErrors()
  check('Langkah 2 lolos validasi', errs2.length === 0, JSON.stringify(errs2))
  await waitFor("document.body.innerText.indexOf('Seperti apa karir anda sekarang')!==-1", 15000, 'Langkah 3 (Status Karir)')
  const step3 = await evalJs("document.body.innerText.indexOf('Seperti apa karir anda sekarang')!==-1")
  check('lanjut ke Langkah 3 (Status Karir)', step3 === true)

  // --- STEP 3: career = "Mencari Kerja" -------------------------------------------
  await evalJs(
    "(function(){var btns=[].slice.call(document.querySelectorAll('main button'));" +
      "var b=btns.filter(function(x){return x.textContent.indexOf('Mencari Kerja')!==-1;})[0];" +
      "if(!b)return false;b.click();return true;})()",
  )
  await sleep(500)
  await clickSubmit() // "Daftar Sekarang"
  await sleep(4000)
  const otpSeen = await evalJs("document.body.innerText.indexOf('Verifikasi Email')!==-1")
  if (!otpSeen) {
    const errs = await readErrors()
    const topErr = await evalJs(
      "(function(){var d=document.querySelector('div.text-rose-700, div.bg-rose-50');return d?d.textContent.trim():'';})()",
    )
    const preview = await evalJs("document.body.innerText.slice(0,400)")
    await shot('08-reg-otp-fail.png')
    console.log('DIAG errorBox=' + JSON.stringify(topErr))
    console.log('DIAG fieldErrors=' + JSON.stringify(errs))
    console.log('DIAG preview=' + JSON.stringify(preview))
  }
  await waitFor("document.body.innerText.indexOf('Verifikasi Email')!==-1", 20000, 'layar OTP')
  check('submit → layar Verifikasi Email (OTP)', true)
  await shot('08-reg-2-otp.png')

  // --- OTP ------------------------------------------------------------------------
  let code = ''
  for (let i = 0; i < 25 && !/^\\d{6}$/.test(code); i++) {
    await sleep(700)
    code = readOtp()
  }
  check('kode OTP terbaca dari cache', /^\\d{6}$/.test(code), code ? 'code=' + code : 'kosong')
  await setInput('#reg-otp', code)
  await evalJs(
    "(function(){var f=document.querySelector('form');if(!f)return false;" +
      "var b=f.querySelector('button[type=submit]');if(!b)return false;b.click();return true;})()",
  )
  await sleep(4500)
  const finalUrl = await evalJs('location.href')
  check('verifikasi sukses → masuk /home', finalUrl.indexOf('/home') !== -1, finalUrl)
  const homeText = await evalJs('document.body.innerText')
  check('halaman alumni (Beranda) tampil', (homeText || '').indexOf('Beranda') !== -1)
  await shot('08-reg-3-beranda.png')

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
