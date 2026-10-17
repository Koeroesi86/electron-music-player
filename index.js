const { app } = require('electron')
const { resolve, basename } = require('path')
const fs = require('fs')
const fp = require('find-free-port')
const ws = require('windows-shortcuts-appid')
const package = require('./package')
const createWindow = require('./electron/createWindow')
const getLoadingWindow = require('./electron/getLoadingWindow')
const createDatabase = require('./electron/createDatabase')
const setupListeners = require('./electron/setupListeners')
const setupServer = require('./electron/setupServer')

process.env.ELECTRON_ENABLE_LOGGING = '1'

const isWin = process.platform === 'win32'
const isMac = process.platform === 'darwin'
const isDev = process.env.NODE_ENV === 'development'

const argv = require('minimist')(process.argv.slice(2))

global._appDataPath = resolve(app.getPath('appData'), `./${package.name}`)
const appDataPath = _appDataPath

let mainWindow
const windows = {
  main: null,
  loading: null
}

let windowLocation
let loadingLocation

if (argv.webpackPort) {
  windowLocation = `http://localhost:${argv.webpackPort}/index.html`
  loadingLocation = `http://localhost:${argv.webpackPort}/loading.html`
}

function setAppId() {
  const exeName = basename(process.execPath).replace(/\.exe$/i, '')

  if (isDev) {
    global._appId = `com.squirrel.${exeName}-${process.env.NODE_ENV}`;
  } else {
    global._appId = `com.squirrel.${exeName}`;
  }

  if (isWin && isDev) {
    app.setAppUserModelId(_appId)
    console.log('Registered app ID', _appId)

    const shortcutPath = `${app.getPath('appData')}\\Microsoft\\Windows\\Start Menu\\Programs\\eMusic${
      isDev ? '-' + process.env.NODE_ENV : ''
    }.lnk`

    if (fs.existsSync(shortcutPath)) {
      fs.unlinkSync(shortcutPath)
    }

    ws.create(shortcutPath, {
      target: process.execPath,
      desc: package.description,
      workingDir: resolve(__dirname),
      icon: resolve(__dirname, './icons/win/icon.ico')
    }, err => {
      if(err) throw err

      ws.addAppId(shortcutPath, _appId, err => {
        if(err) throw err
      })
    })
  }
}


const initWindow = () => {
  setAppId()
  windows.main = createWindow(app, windowLocation)
  windows.main.loadURL(windowLocation)

  windows.main.on('closed', () => {
    windows.main = null
    windows.loading = null
  })
}

if (!fs.existsSync(appDataPath)) {
  fs.mkdirSync(appDataPath)
}

const libraryLocation = resolve(appDataPath, './library.sqlite')

const getPort = () => {
    return fp(3000, '127.0.0.1')
      .then(freePorts => {
        global._port = freePorts[0]
        if (!windowLocation || !loadingLocation) {
          windowLocation = `http://localhost:${_port}/app/index.html?port=${_port}`
          loadingLocation = `http://localhost:${_port}/app/loading.html`
        } else {
          windowLocation += `?port=${_port}`
        }

        setupServer()

        return Promise.resolve()
      })
}

app.whenReady()
  .then(getPort)
  .then(() => {
    windows.loading = getLoadingWindow()
    windows.loading.loadURL(loadingLocation)
    windows.loading.once('ready-to-show', () => {
      windows.loading.show()
      if (isWin) windows.loading.setBackgroundMaterial('acrylic')
    })

    return Promise.resolve()
  })
  .then(() => createDatabase(libraryLocation))
  .then((d) => {
    console.log(`Connected to library ${libraryLocation}`)
    global._database = d

    initWindow()
    setupListeners(_database, windows, appDataPath)

    app.on('window-all-closed', () => {
      if (!isMac) {
        app.quit()
      }
    })

    app.on('activate', () => {
      if (mainWindow === null) {
        initWindow()
      }
    })
  })
  .catch(msg => {
    console.error(msg)
    process.exit(1)
  })
