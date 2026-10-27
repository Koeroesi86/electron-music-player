const { spawn, spawnSync } = require('child_process')
const { createServer } = require('net')
const { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('fs')
const { tmpdir } = require('os')
const { dirname, join, resolve } = require('path')
const { packagedExecutable } = require('./dist-layout')

// usage: node scripts/smoke.js [--packaged | --flatpak]
// starts the built app (out/index.js), the packaged one from dist/, or the installed flatpak (flatpak install dist/eMusic-*.flatpak), and checks that the window opens
// and that the local server answers from the database: a missing file or a native module that does not load shows up here
// the updater is turned off (EMUSIC_NO_UPDATE), so a newer release can not be downloaded and installed in the middle of the run
const root = resolve(__dirname, '..')
const timeout = 60000

const flatpak = process.argv.includes('--flatpak')
const packaged = flatpak || process.argv.includes('--packaged')
const executablePath = flatpak ? 'flatpak' : packaged ? resolve(root, packagedExecutable(process.platform, process.arch)) : require('electron')
// the flatpak starts its own sandbox: zypak sets the chromium sandbox up, so --no-sandbox is not passed
const args = flatpak
  ? ['run', '--env=EMUSIC_NO_UPDATE=1', require('../package.json').build.appId]
  : [...(packaged ? [] : [resolve(root, 'out/index.js')]), ...(process.platform === 'linux' ? ['--no-sandbox'] : [])]

if (!flatpak && !existsSync(executablePath)) {
  console.error(`${executablePath} does not exist, build first`)
  process.exit(1)
}

// a clean user data folder, so the run does not touch the library of the machine
const home = mkdtempSync(join(tmpdir(), 'emusic-smoke-'))
const logFile = join(home, 'chromium.log')
const { ELECTRON_RUN_AS_NODE, ...inherited } = process.env
// windows keeps its profile folders (chromium needs them to start, and the app data folder does not follow the variables there), the other systems get the clean ones
// the flatpak finds its user installation through HOME and keeps the data of the app in its own folder, so it keeps them too
const env =
  process.platform === 'win32' || flatpak
    ? { ...inherited, NODE_ENV: 'production', EMUSIC_NO_UPDATE: '1' }
    : { ...inherited, HOME: home, XDG_CONFIG_HOME: home, NODE_ENV: 'production', EMUSIC_NO_UPDATE: '1' }

const freePort = () =>
  new Promise((done, fail) => {
    const server = createServer().once('error', fail)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => done(port))
    })
  })

// the window may open after the app started, so the debugging endpoint of the chromium is polled
const findWindowUrl = async (port, child) => {
  const deadline = Date.now() + timeout
  let open = 'none'
  let endpointError = 'none'
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`The app exited with ${child.exitCode} before a window opened`)
    const targets = await fetch(`http://127.0.0.1:${port}/json`).then(
      response => response.json(),
      error => {
        endpointError = String(error.cause?.code ?? error)
        return []
      }
    )
    const target = targets.find(candidate => candidate.url.includes('/app/index.html'))
    if (target) return target
    open = targets.map(candidate => candidate.url).join(', ') || open
    await new Promise(done => setTimeout(done, 500))
  }
  throw new Error(`No main window, open: ${open}, debugging endpoint error: ${endpointError}`)
}

// a mono 8 bit wav of one second per 8000 bytes, the smallest file the library scan takes for a track
const writeWav = (file, seconds) => {
  const data = Buffer.alloc(8000 * seconds, 128)
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(8000, 24)
  header.writeUInt32LE(8000, 28)
  header.writeUInt16LE(1, 32)
  header.writeUInt16LE(8, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  writeFileSync(file, Buffer.concat([header, data]))
}

// runs an expression in the window through the debugging endpoint and answers its value
const evaluateIn = (socketUrl, expression) =>
  new Promise((done, fail) => {
    const socket = new WebSocket(socketUrl)
    // a page that waits for an event that never comes would hold the run until the limit of the job
    const timer = setTimeout(() => {
      socket.close()
      fail(new Error(`The window did not answer in ${timeout} ms`))
    }, timeout)
    socket.onerror = () => fail(new Error('The debugging socket failed'))
    socket.onopen = () => socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }))
    socket.onmessage = ({ data }) => {
      const { result, error } = JSON.parse(data)
      clearTimeout(timer)
      socket.close()
      if (error || result.exceptionDetails) return fail(new Error(JSON.stringify(error ?? result.exceptionDetails)))
      done(result.result.value)
    }
  })

// the tracks are served over the emusic protocol: the whole file, a range of it, and a seek of an audio element that needs ranges
const checkTrackProtocol = async (socketUrl, port) => {
  const folder = join(home, 'music')
  const file = join(folder, 'smoke.wav')
  mkdirSync(folder)
  writeWav(file, 10)

  // the library keeps the path as the scan made it, which is not always the spelling of the one that was added (short names, separators, the case of a drive)
  const deadline = Date.now() + timeout
  let tracks = []
  let stored
  while (!stored && Date.now() < deadline) {
    await evaluateIn(socketUrl, `window.electronAPI.send('ADD_FOLDERS_TO_LIBRARY', [{ path: ${JSON.stringify(folder)}, lastModified: 0 }])`)
    tracks = await fetch(`http://127.0.0.1:${port}/library`).then(response => response.json())
    stored = tracks.find(track => /(^|[\\/])smoke\.wav$/.test(track.path))
    if (!stored) await new Promise(done => setTimeout(done, 1000))
  }
  if (!stored) throw new Error(`${file} did not get into the library in ${timeout} ms, it has: ${JSON.stringify(tracks.map(track => track.path))}`)
  const trackPath = stored.path

  const result = await evaluateIn(
    socketUrl,
    `(async () => {
      const url = 'emusic://track?path=' + encodeURIComponent(${JSON.stringify(trackPath)})
      const whole = await fetch(url)
      const part = await fetch(url, { headers: { range: 'bytes=100-199' } })
      const suffix = await fetch(url, { headers: { range: 'bytes=-50' } })
      const outside = await fetch('emusic://track?path=' + encodeURIComponent(${JSON.stringify(join(home, 'other.wav'))}))
      const describe = audio => 'readyState ' + audio.readyState + ', networkState ' + audio.networkState + ', error ' + audio.error?.code + ', currentTime ' + audio.currentTime
      const waitFor = (audio, event, source) =>
        new Promise((done, fail) => {
          const timer = setTimeout(() => fail(new Error('no ' + event + ' of ' + source + ' (' + describe(audio) + ')')), 15000)
          audio.addEventListener(event, () => { clearTimeout(timer); done() }, { once: true })
          audio.addEventListener('error', () => { clearTimeout(timer); fail(new Error('audio error of ' + source + ' (' + describe(audio) + ')')) }, { once: true })
        })
      const seek = async source => {
        const audio = new Audio()
        audio.crossOrigin = 'anonymous'
        audio.src = source
        await waitFor(audio, 'loadedmetadata', source)
        const seeked = waitFor(audio, 'seeked', source)
        audio.currentTime = 6
        await seeked
        return [Math.round(audio.duration), Math.round(audio.currentTime)]
      }
      return {
        whole: [whole.status, (await whole.arrayBuffer()).byteLength],
        part: [part.status, part.headers.get('content-range'), (await part.arrayBuffer()).byteLength],
        suffix: [suffix.status, suffix.headers.get('content-range'), (await suffix.arrayBuffer()).byteLength],
        outside: outside.status,
        emusicSeek: await seek(url),
        httpSeek: await seek('http://127.0.0.1:${port}/local?path=' + encodeURIComponent(${JSON.stringify(trackPath)}))
      }
    })()`
  )
  const expected = { whole: [200, 80044], part: [206, 'bytes 100-199/80044', 100], suffix: [206, 'bytes 79994-80043/80044', 50], outside: 404, emusicSeek: [10, 6], httpSeek: [10, 6] }
  if (JSON.stringify(result) !== JSON.stringify(expected)) throw new Error(`The emusic protocol answered ${JSON.stringify(result)}, expected ${JSON.stringify(expected)}`)
  console.log(`emusic protocol passed: ${JSON.stringify(result)}`)
}

// taskkill also takes the helper processes down on windows
const stop = child => {
  if (child.exitCode !== null) return Promise.resolve()
  const exited = new Promise(done => child.once('exit', done))
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'])
  else child.kill()
  return exited
}

// loads every dependency of the app from inside the package in the node mode of the executable: the one that does not load is the reason for an app that hangs on its error dialog
const loadDependencies = () => {
  const archive = join(dirname(executablePath), 'resources', 'app.asar')
  const script = `const { dependencies } = require(${JSON.stringify(join(archive, 'package.json'))})
for (const name of Object.keys(dependencies)) {
  try { require(require.resolve(name, { paths: [${JSON.stringify(archive)}] })); console.log('ok   ' + name) } catch (error) { console.log('FAIL ' + name + ': ' + error.message) }
}`
  const { stdout, stderr, error } = spawnSync(executablePath, ['-e', script], {
    env: { ...env, ELECTRON_RUN_AS_NODE: '1' },
    encoding: 'utf8',
    timeout: 30000
  })
  return [stdout, stderr, error?.message].filter(Boolean).join('\n')
}

const run = async () => {
  const port = await freePort()
  const child = spawn(executablePath, [...args, `--remote-debugging-port=${port}`, '--enable-logging', `--log-file=${logFile}`, `--user-data-dir=${join(home, 'user-data')}`], { env, stdio: 'inherit' })
  try {
    const target = await findWindowUrl(port, child)
    const { url } = target
    const response = await fetch(`${new URL(url).origin}/library`)
    if (!response.ok) throw new Error(`/library answered ${response.status}`)
    const library = await response.json()
    if (!Array.isArray(library)) throw new Error('/library did not answer a list')
    // the flatpak sandbox does not see the folder of the run
    if (!flatpak) await checkTrackProtocol(target.webSocketDebuggerUrl, new URL(url).port)
    console.log(`Smoke test passed: ${url}, ${library.length} tracks`)
  } finally {
    await stop(child)
  }
}

run()
  .catch(error => {
    console.error(error)
    if (packaged && !flatpak) console.error(`Packaged dependencies:\n${loadDependencies()}`)
    if (existsSync(logFile)) console.error(`Log of the app:\n${readFileSync(logFile, 'utf8')}`)
    process.exitCode = 1
  })
  .finally(() => rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }))
