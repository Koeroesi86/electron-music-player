const { spawn, spawnSync } = require('child_process')
const { createServer } = require('net')
const { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } = require('fs')
const { tmpdir } = require('os')
const { join, resolve } = require('path')
const { startDirectory, writeLibrary } = require('./screenshot-fixtures')
const { scenes, setup } = require('./screenshot-scenes')
const { waitForPage } = require('./wait-for-page')

// usage: node scripts/screenshots.js [scene...] [--out folder]
// takes the pictures of the website (site/screenshots by default) from the built app (npm run build first), the same ones every time:
// a library of generated tagged files, a made up station directory, a clean profile, English, reduced motion, 1360 x 850, and a clock that is held where the scene wants it
// the scenes are in scripts/screenshot-scenes.js, the files and stations in scripts/screenshot-fixtures.js; a display is needed (xvfb-run on a headless Linux)
const root = resolve(__dirname, '..')
const timeout = 60000
const size = { width: 1360, height: 850 }

const argv = process.argv.slice(2)
const outFlag = argv.indexOf('--out')
const outFolder = resolve(root, outFlag === -1 ? 'site/screenshots' : (argv[outFlag + 1] ?? ''))
const names = argv.filter((argument, index) => !argument.startsWith('--') && index !== outFlag + 1)
const selected = names.length ? scenes.filter(scene => names.includes(scene.name)) : scenes
const unknown = names.filter(name => !scenes.some(scene => scene.name === name))

if (unknown.length) {
  console.error(`No scene named ${unknown.join(', ')}, there are: ${scenes.map(scene => scene.name).join(', ')}`)
  process.exit(1)
}
if (!existsSync(resolve(root, 'out/index.js'))) {
  console.error('out/index.js does not exist, run npm run build first')
  process.exit(1)
}

const wait = milliseconds => new Promise(done => setTimeout(done, milliseconds))

const freePort = () =>
  new Promise((done, fail) => {
    const server = createServer().once('error', fail)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => done(port))
    })
  })

const findWindow = async (port, child) => {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`The app exited with ${child.exitCode} before a window opened`)
    const targets = await fetch(`http://127.0.0.1:${port}/json`).then(
      response => response.json(),
      () => []
    )
    const target = targets.find(candidate => candidate.url === 'emusic://app/index.html')
    if (target) return target
    await wait(500)
  }
  throw new Error('No main window opened')
}

// one socket for the whole run: the window answers a command with the message that has its id
const connect = socketUrl =>
  new Promise((done, fail) => {
    const socket = new WebSocket(socketUrl)
    const pending = new Map()
    let last = 0
    socket.onerror = () => fail(new Error('The debugging socket failed'))
    socket.onmessage = ({ data }) => {
      const { id, result, error } = JSON.parse(data)
      const answer = pending.get(id)
      pending.delete(id)
      if (answer) error ? answer.fail(new Error(JSON.stringify(error))) : answer.done(result)
    }
    socket.onopen = () =>
      done({
        send: (method, params = {}) =>
          new Promise((resolveCommand, rejectCommand) => {
            last += 1
            pending.set(last, { done: resolveCommand, fail: rejectCommand })
            setTimeout(() => rejectCommand(new Error(`The window did not answer ${method} in 15 s`)), 15000).unref()
            socket.send(JSON.stringify({ id: last, method, params }))
          }),
        close: () => socket.close()
      })
  })

const evaluate = (window, expression) =>
  window.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }).then(({ result, exceptionDetails }) => {
    if (exceptionDetails) throw new Error(`${expression}\n${exceptionDetails.exception?.description ?? exceptionDetails.text}`)
    return result.value
  })

// the first element, in the order of the page, that says the text: it is its own text, so a row does not say what its cells say, or its label or title
const findScript = (text, nth = 0) => `(() => {
  const says = element => element.getAttribute('aria-label') === ${JSON.stringify(text)} || element.title === ${JSON.stringify(text)} || (element.textContent.trim() === ${JSON.stringify(text)} && ![...element.children].some(child => child.textContent.trim() === ${JSON.stringify(text)}))
  return [...document.body.querySelectorAll('*')].filter(says).at(${nth})
})()`

const waitUntil = async (window, script, what, limit = 20000) => {
  const deadline = Date.now() + limit
  while (Date.now() < deadline) {
    if (await evaluate(window, `(async () => Boolean(await (${script})))()`).catch(() => false)) return
    await wait(100)
  }
  throw new Error(`Gave up waiting for ${what}`)
}

// a click that the page was not ready for does nothing: it is made again, a second apart, until what it is meant to cause is there
const clickAgainUntil = async (window, step, attempts = 10) => {
  const done = await waitUntil(window, step.until, step.until, 1000).then(
    () => true,
    () => false
  )
  if (done) return
  if (attempts === 0) throw new Error(`"${step.click}" did not cause ${step.until}`)

  await evaluate(window, `(${step.from ?? '(element => element)'})(${findScript(step.click, step.nth)}).click()`)
  return clickAgainUntil(window, step, attempts - 1)
}

const runStep = async (window, step) => {
  console.log(`  ${JSON.stringify(step, (key, value) => (typeof value === 'function' ? String(value) : value))}`)
  if ('click' in step) {
    await waitUntil(window, findScript(step.click, step.nth), `"${step.click}" to be on the page`)
    await evaluate(window, `(${step.from ?? '(element => element)'})(${findScript(step.click, step.nth)}).click()`)
    return step.until && clickAgainUntil(window, step)
  }
  if ('wait' in step) return waitUntil(window, `document.body.innerText.includes(${JSON.stringify(step.wait)})`, `"${step.wait}" to be on the page`)
  if ('waitFor' in step) return waitUntil(window, step.waitFor, step.waitFor)
  if ('run' in step) return evaluate(window, step.run)
  throw new Error(`Unknown step ${JSON.stringify(step)}`)
}

// the animations that end have run their course, and the ones that never end (a meter that plays) are set to their first frame, so the picture does not depend on the moment it is taken
const settle = window =>
  evaluate(
    window,
    `(async () => {
      const [endless, ending] = [true, false].map(isEndless => document.getAnimations().filter(animation => (animation.effect.getComputedTiming().iterations === Infinity) === isEndless))
      endless.forEach(animation => { animation.pause(); animation.currentTime = 0 })
      await Promise.all(ending.map(animation => animation.finished.catch(() => undefined)))
      // a cover that faded in keeps the one it replaced under itself until the end of the fade
      for (let waited = 0; [...document.querySelectorAll('[class*="CoverFade__cover"]')].some(cover => cover.children.length > 1) && waited < 5000; waited += 50) await new Promise(done => setTimeout(done, 50))
      await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))
    })()`
  )

const shoot = window => window.send('Page.captureScreenshot', { format: 'webp', quality: 92 }).then(({ data }) => data)

// what is loaded after the steps (an image, a tint that follows a cover) is not in the first picture: it is taken again until two in a row are the same
const settled = async (window, previous, attempts = 40) => {
  const data = await shoot(window)
  if (data === previous) return data
  if (attempts === 0) throw new Error('The window kept changing, no two pictures in a row were the same')

  await wait(100)
  return settled(window, data, attempts - 1)
}

const capture = async (window, scene) => {
  await settle(window)
  const file = join(outFolder, `${scene.name}.webp`)
  writeFileSync(file, Buffer.from(await settled(window), 'base64'))
  console.log(`${scene.name}: ${file}`)
}

const stop = child => {
  if (child.exitCode !== null) return Promise.resolve()
  const exited = new Promise(done => child.once('exit', done))
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'])
  else child.kill()
  return exited
}

const run = async home => {
  const port = await freePort()
  const directory = await startDirectory()
  const music = join(home, 'music')
  writeLibrary(music)
  // a Wayland session without an X server needs to be told, the others pick their own
  const display = process.platform === 'linux' && !process.env.DISPLAY && process.env.WAYLAND_DISPLAY ? ['--ozone-platform=wayland'] : []
  const { ELECTRON_RUN_AS_NODE, ...inherited } = process.env
  const env =
    process.platform === 'win32'
      ? { ...inherited, NODE_ENV: 'production' }
      : { ...inherited, HOME: home, XDG_CONFIG_HOME: home, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8', NODE_ENV: 'production' }
  const child = spawn(
    require('electron'),
    [resolve(root, 'out/index.js'), ...(process.platform === 'linux' ? ['--no-sandbox'] : []), ...display, '--lang=en-US', `--remote-debugging-port=${port}`, `--user-data-dir=${join(home, 'user-data')}`],
    { env: { ...env, EMUSIC_NO_UPDATE: '1', EMUSIC_NO_ARTIST_PHOTOS: '1', EMUSIC_RADIO_DIRECTORY: directory.origin }, stdio: 'inherit' }
  )
  const { webSocketDebuggerUrl } = await findWindow(port, child).catch(async error => {
    await stop(child)
    throw error
  })
  const window = await connect(webSocketDebuggerUrl)
  try {
    await waitForPage(expression => evaluate(window, expression), Date.now() + timeout)
    await window.send('Emulation.setDeviceMetricsOverride', { ...size, deviceScaleFactor: 1, mobile: false })
    // the app stops what moves on its own for this setting (the wave of a station is drawn once, the covers change at once), so a picture does not depend on the moment it is taken
    await window.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    // the window is transparent and its panels are translucent: what is behind it is black, as on a desktop of its own
    await evaluate(window, `document.head.append(Object.assign(document.createElement('style'), { textContent: 'html { background: #000 !important; }' }))`)
    await evaluate(window, `window.electronAPI.send('ADD_FOLDERS_TO_LIBRARY', [{ path: ${JSON.stringify(music)}, lastModified: 0 }])`)
    await waitUntil(window, `fetch('emusic://app/library').then(response => response.json()).then(tracks => tracks.length === 20)`, 'the 20 tracks of the library')

    mkdirSync(outFolder, { recursive: true })
    await [...setup].reduce((done, step) => done.then(() => runStep(window, step)), Promise.resolve())
    await selected.reduce(
      (done, scene) =>
        done
          .then(() => scene.steps.reduce((steps, step) => steps.then(() => runStep(window, step)), Promise.resolve()))
          .then(() => capture(window, scene)),
      Promise.resolve()
    )
  } catch (error) {
    // what the window showed when a step did not work out
    const text = await evaluate(window, 'document.body.innerText').catch(() => 'no answer')
    const { data } = await window.send('Page.captureScreenshot', { format: 'webp' }).catch(() => ({ data: '' }))
    // not in the folder of the pictures, which is in the repository, and in a folder of its own, as the one of the run is removed
    const failed = join(mkdtempSync(join(tmpdir(), 'emusic-screenshots-failed-')), 'failed.webp')
    writeFileSync(failed, Buffer.from(data, 'base64'))
    console.error(`The window showed:\n${text}\n(and ${failed})`)
    throw error
  } finally {
    window.close()
    directory.close()
    await stop(child)
  }
}

// a clean folder for the profile and the files of the library, so the run does not touch the library of the machine
const home = mkdtempSync(join(tmpdir(), 'emusic-screenshots-'))
run(home)
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }))
