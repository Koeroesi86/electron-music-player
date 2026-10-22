const { listPackage } = require('@electron/asar')
const { existsSync, readFileSync } = require('fs')
const { resolve } = require('path')

// usage: node scripts/check-dist.js
// lists what the packaged app contains and fails on files that must not ship: secrets, source maps, tests and the sources of the app
// the update metadata that electron-updater reads from the release, and the installer it has to list
const updateMetadata = {
  linux: ['dist/latest-linux.yml', /\.AppImage\b/],
  darwin: ['dist/latest-mac.yml', /\.zip\b/],
  win32: ['dist/latest.yml', /\.exe\b/]
}
const resources = {
  linux: 'dist/linux-unpacked/resources',
  darwin: 'dist/mac/eMusic.app/Contents/Resources',
  win32: 'dist/win-unpacked/resources'
}
const archive = resolve(__dirname, '..', resources[process.platform], 'app.asar')

const forbidden = [
  [/(^|\/)\.env(\.|$)/, 'environment file'],
  [/\.(pem|key|p12|pfx|crt)$/, 'key or certificate'],
  [/(^|\/)\.git(\/|$)/, 'git folder'],
  [/\.map$/, 'source map'],
  [/\.(test|spec)\.[jt]sx?$/, 'test'],
  [/^\/(electron|client|components|scripts|coverage|\.cache|\.claude|\.github)\//, 'source or tooling folder'],
  [/^\/(index|test-utils-style-stub)\.ts$/, 'source file']
]
// the required files, so that a changed glob in package.json can not silently drop them
const required = ['/package.json', '/out/index.js', '/out/electron/preload.js', '/out/electron/splashPreload.js', '/build/index.html', '/build/loading.html', '/migrations']

if (!existsSync(archive)) {
  console.error(`${archive} does not exist, run npm run dist first`)
  process.exit(1)
}

const files = listPackage(archive, { isPack: false }).map(file => file.replace(/\\/g, '/'))
const problems = [
  ...files.flatMap(file => forbidden.filter(([pattern]) => pattern.test(file)).map(([, label]) => `${label}: ${file}`)),
  ...required.filter(path => !files.some(file => file === path || file.startsWith(`${path}/`))).map(path => `missing: ${path}`)
]

const [metadataPath, installer] = updateMetadata[process.platform]
const metadataFile = resolve(__dirname, '..', metadataPath)
if (!existsSync(metadataFile)) problems.push(`missing: ${metadataPath}`)
else if (!installer.test(readFileSync(metadataFile, 'utf8'))) problems.push(`${metadataPath} does not list ${installer}`)
// the packaged app must know where to look for updates, linux-unpacked is rebuilt by the flatpak and snap builds, which have none on purpose
if (process.platform !== 'linux' && !existsSync(resolve(archive, '..', 'app-update.yml'))) problems.push('missing: app-update.yml')

problems.slice(0, 50).forEach(problem => console.error(problem))
console.log(`${files.length} files in ${archive}, ${problems.length} problems`)
process.exit(problems.length ? 1 : 0)
