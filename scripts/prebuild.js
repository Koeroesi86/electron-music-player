const { resolve } = require('path')
const fs = require('fs')
const rimraf = require('rimraf')
const { homedir } = require('os')
const { generateIcons } = require('./generate-icons')

const cwd = resolve(__dirname, '../')

const bundlePath = resolve(cwd, './build')
if (fs.existsSync(bundlePath)) {
  rimraf.sync(bundlePath)
  console.log('Removed previous build.')
}

// Wayland shells take the window icon from the desktop entry matching the app ID (see setDesktopName in index.ts)
function registerDevDesktopEntry () {
  if (process.platform !== 'linux') return

  const applications = resolve(homedir(), '.local/share/applications')
  fs.mkdirSync(applications, { recursive: true })
  fs.writeFileSync(resolve(applications, 'emusic-dev.desktop'), [
    '[Desktop Entry]',
    'Type=Application',
    'Name=eMusic (dev)',
    `Icon=${resolve(cwd, 'icons/png/512x512.png')}`,
    'Exec=true',
    'StartupWMClass=emusic-dev',
    ''
  ].join('\n'))
  console.log('Registered the development desktop entry.')
}

generateIcons(resolve(cwd, 'assets/icon.png'), cwd)
  .then(() => console.log('Generated app icons.'))
  .then(registerDevDesktopEntry)
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
