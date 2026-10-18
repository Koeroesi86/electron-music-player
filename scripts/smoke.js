const { _electron: electron } = require('playwright-core')
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

// the window may open before the listener is attached, so the open ones are checked as well
const findWindow = async app => {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const page = app.windows().find(candidate => candidate.url().includes('/app/index.html'))
    if (page) return page
    await new Promise(done => setTimeout(done, 500))
  }
  throw new Error(`No main window, open: ${app.windows().map(candidate => candidate.url()).join(', ') || 'none'}`)
}

const run = async () => {
  const app = await electron.launch({ executablePath, args, env, timeout })
  try {
    const page = await findWindow(app)
    await page.waitForLoadState('load', { timeout })
    const { origin } = new URL(page.url())
    const response = await fetch(`${origin}/library`)
    if (!response.ok) throw new Error(`/library answered ${response.status}`)
    const library = await response.json()
    if (!Array.isArray(library)) throw new Error('/library did not answer a list')
    console.log(`Smoke test passed: ${page.url()}, ${library.length} tracks`)
  } finally {
    await app.close()
  }
}

run()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => rmSync(home, { recursive: true, force: true }))
