const { readFileSync, writeFileSync } = require('fs')
const { resolve } = require('path')

// usage: node scripts/version.js            prints the version of a new release, from GITHUB_RUN_NUMBER and today
//        node scripts/version.js <version>  writes that version to package.json, so the package, latest*.yml and the release agree
// year, month and the number of the run of the release workflow, for example 26.10.14: valid semver for electron-updater (no zero padded month, no
// prerelease part, which it would take for an update channel) and small enough for the numbers of a windows file version
const versionPattern = /^\d{2}\.(?:[1-9]|1[0-2])\.\d{1,5}$/

const createVersion = (date, runNumber) => `${String(date.getFullYear()).slice(2)}.${date.getMonth() + 1}.${runNumber}`

const stampVersion = (packagePath, version) => {
  if (!versionPattern.test(version)) throw new Error(`${version} is not a version like 26.10.14`)

  const packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'))
  writeFileSync(packagePath, `${JSON.stringify({ ...packageInfo, version }, undefined, 2)}\n`)
}

if (require.main === module) {
  const [version] = process.argv.slice(2)
  if (version) stampVersion(resolve(__dirname, '../package.json'), version)
  else if (!process.env.GITHUB_RUN_NUMBER) throw new Error('GITHUB_RUN_NUMBER is not set')
  else console.log(createVersion(new Date(), process.env.GITHUB_RUN_NUMBER))
}

module.exports = { createVersion, stampVersion, versionPattern }
