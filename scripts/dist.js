const { resolve } = require('path')
const rimraf = require('rimraf')
const fs = require('fs')
const cache = require('../config/cache')

process.env.ELECTRON_CACHE = process.env.ELECTRON_CACHE || cache.electron
process.env.ELECTRON_BUILDER_CACHE = process.env.ELECTRON_BUILDER_CACHE || cache.electronBuilder

const electronBuilder = require('electron-builder')

const cwd = resolve(__dirname, '../')

console.log('Packaging started...')

const isWin = process.platform === 'win32'
const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'

// process.env.DEBUG = 'electron-builder' // TODO: find another way to log
// process.env.NODE_OPTIONS = '--max-old-space-size=2048'

const distPath = resolve(cwd, './dist')
if (fs.existsSync(distPath)) {
  rimraf.sync(distPath)
  console.log('Removed previous build.')
}

const platforms = [
  [isWin, 'win', 'Windows'],
  [isMac, 'mac', 'Mac OS'],
  [isLinux, 'linux', 'Linux']
]

// snap removes chrome-sandbox from the shared unpacked dir, so it must not run alongside the other linux targets;
// flatpak needs flatpak-builder on the machine and is not known to be safe next to the other targets, so it has its own build
const extraBuilds = {
  win: [],
  mac: [],
  linux: [{ linux: ['flatpak'] }, { linux: ['snap'] }]
}

const build = options => electronBuilder.build(options)

platforms
  .filter(([enabled]) => enabled)
  .forEach(([, option, label]) => {
    // an empty target list makes electron-builder use the targets from package.json
    extraBuilds[option]
      .reduce((previous, options) => previous.then(() => build(options)), build({ [option]: [] }))
      .then(() => {
        console.log(`${label} package created.`)
        process.exit(0)
      })
      .catch(error => {
        console.error(error)
        process.exit(1)
      })
  })
