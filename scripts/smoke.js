const { spawn, spawnSync } = require('child_process')
const { createServer } = require('net')
const { existsSync, mkdtempSync, readFileSync, rmSync } = require('fs')
const { tmpdir } = require('os')
const { dirname, join, resolve } = require('path')

// usage: node scripts/smoke.js [--packaged [--ia32] | --flatpak]
// starts the built app (out/index.js), the packaged one from dist/, or the installed flatpak (flatpak install dist/eMusic-*.flatpak), and checks that the window opens
// and that the local server answers from the database: a missing file or a native module that does not load shows up here
const root = resolve(__dirname, '..')
const packagedExecutables = {
  linux: 'dist/linux-unpacked/eMusic',
  darwin: 'dist/mac/eMusic.app/Contents/MacOS/eMusic',
  win32: 'dist/win-unpacked/eMusic.exe'
}
// the 32 bit windows build runs on the 64 bit runner
const packagedIa32Executable = 'dist/win-ia32-unpacked/eMusic.exe'
const timeout = 60000

const flatpak = process.argv.includes('--flatpak')
const packaged = flatpak || process.argv.includes('--packaged')
const ia32 = process.argv.includes('--ia32')
const executablePath = flatpak ? 'flatpak' : packaged ? resolve(root, ia32 ? packagedIa32Executable : packagedExecutables[process.platform]) : require('electron')
// the flatpak starts its own sandbox: zypak sets the chromium sandbox up, so --no-sandbox is not passed
const args = flatpak
  ? ['run', require('../package.json').build.appId]
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
    ? { ...inherited, NODE_ENV: 'production' }
    : { ...inherited, HOME: home, XDG_CONFIG_HOME: home, NODE_ENV: 'production' }

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
    if (target) return target.url
    open = targets.map(candidate => candidate.url).join(', ') || open
    await new Promise(done => setTimeout(done, 500))
  }
  throw new Error(`No main window, open: ${open}, debugging endpoint error: ${endpointError}`)
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
    const url = await findWindowUrl(port, child)
    const response = await fetch(`${new URL(url).origin}/library`)
    if (!response.ok) throw new Error(`/library answered ${response.status}`)
    const library = await response.json()
    if (!Array.isArray(library)) throw new Error('/library did not answer a list')
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
