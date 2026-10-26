const { readFileSync, writeFileSync } = require('fs')
const { resolve } = require('path')

// usage: node scripts/version.js                    prints the version of a new release, from GITHUB_RUN_NUMBER and today
//        node scripts/version.js --after <latest>   the same, but fails when it is not greater than the latest release (empty: no release yet)
//        node scripts/version.js <version>          writes that version to package.json, so the package, latest*.yml and the release agree
// year, month and the number of the run of the release workflow, for example 26.10.14: valid semver for electron-updater (no zero padded month, no
// prerelease part, which it would take for an update channel) and small enough for the numbers of a windows file version
const versionPattern = /^\d{2}\.(?:[1-9]|1[0-2])\.\d{1,5}$/

const createVersion = (date, runNumber) => `${String(date.getFullYear()).slice(2)}.${date.getMonth() + 1}.${runNumber}`

const compareVersions = (a, b) => {
  const [left, right] = [a, b].map((version) => version.split('.').map(Number))
  return left.map((part, index) => part - right[index]).find((difference) => difference !== 0) ?? 0
}

// the run number restarts when release.yml is renamed or recreated or its runs are deleted: electron-updater would never offer a version that is
// not greater than the installed one
const assertNewer = (version, latest) => {
  if (latest && compareVersions(version, latest.replace(/^v/, '')) <= 0)
    throw new Error(`${version} is not greater than the latest release ${latest}: electron-updater would not offer it, raise the run number of release.yml or release by hand with a greater version`)
}

const stampVersion = (packagePath, version) => {
  if (!versionPattern.test(version)) throw new Error(`${version} is not a version like 26.10.14`)

  const packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'))
  writeFileSync(packagePath, `${JSON.stringify({ ...packageInfo, version }, undefined, 2)}\n`)
}

if (require.main === module) {
  const [first, latest] = process.argv.slice(2)
  const checkLatest = first === '--after'
  const [version] = checkLatest ? [] : [first]
  if (version) stampVersion(resolve(__dirname, '../package.json'), version)
  else if (!process.env.GITHUB_RUN_NUMBER) throw new Error('GITHUB_RUN_NUMBER is not set')
  else {
    const created = createVersion(new Date(), process.env.GITHUB_RUN_NUMBER)
    if (checkLatest) assertNewer(created, latest)
    console.log(created)
  }
}

module.exports = { assertNewer, compareVersions, createVersion, stampVersion, versionPattern }
