const { spawn, spawnSync } = require('child_process')
const { createServer } = require('net')
const { existsSync, mkdtempSync, rmSync } = require('fs')
const { tmpdir } = require('os')
const { join, resolve } = require('path')

// usage: node scripts/smoke.js [--packaged]
// starts the built app (out/index.js), or the packaged one from dist/, and checks that the window opens
// and that the local server answers from the database: a missing file or a native module that does not load shows up here
const root = resolve(__dirname, '..')
const packagedExecutables = {
  linux: 'dist/linux-unpacked/eMusic',
  darwin: 'dist/mac/eMusic.app/Contents/MacOS/eMusic',
  win32: 'dist/win-unpacked/eMusic.exe'
}
const timeout = 60000

const packaged = process.argv.includes('--packaged')
const executablePath = packaged ? resolve(root, packagedExecutables[process.platform]) : require('electron')
const args = [...(packaged ? [] : [resolve(root, 'out/index.js')]), ...(process.platform === 'linux' ? ['--no-sandbox'] : [])]

if (!existsSync(executablePath)) {
  console.error(`${executablePath} does not exist, build first`)
  process.exit(1)
}

// a clean user data folder, so the run does not touch the library of the machine
const home = mkdtempSync(join(tmpdir(), 'emusic-smoke-'))
const { ELECTRON_RUN_AS_NODE, ...inherited } = process.env
const env = { ...inherited, HOME: home, USERPROFILE: home, APPDATA: home, XDG_CONFIG_HOME: home, NODE_ENV: 'production' }

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
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`The app exited with ${child.exitCode} before a window opened`)
    const targets = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json(), () => [])
    const target = targets.find(candidate => candidate.url.includes('/app/index.html'))
    if (target) return target.url
    open = targets.map(candidate => candidate.url).join(', ') || open
    await new Promise(done => setTimeout(done, 500))
  }
  throw new Error(`No main window, open: ${open}`)
}

// taskkill also takes the helper processes down on windows
const stop = child =>
  process.platform === 'win32' ? spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']) : child.kill()

const run = async () => {
  const port = await freePort()
  const child = spawn(executablePath, [...args, `--remote-debugging-port=${port}`], { env, stdio: 'inherit' })
  try {
    const url = await findWindowUrl(port, child)
    const response = await fetch(`${new URL(url).origin}/library`)
    if (!response.ok) throw new Error(`/library answered ${response.status}`)
    const library = await response.json()
    if (!Array.isArray(library)) throw new Error('/library did not answer a list')
    console.log(`Smoke test passed: ${url}, ${library.length} tracks`)
  } finally {
    stop(child)
  }
}

run()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => rmSync(home, { recursive: true, force: true }))
