import { execFileSync } from 'child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { assertNewer, compareVersions, createVersion, stampVersion, versionPattern } from './version'

describe('createVersion', () => {
  it.each([
    [new Date(2026, 9, 22), 14, '26.10.14'],
    [new Date(2027, 0, 3), 1, '27.1.1'],
    [new Date(2026, 5, 30), 120, '26.6.120'],
  ])('writes %s and run %s as %s', (date, runNumber, expected) => {
    const version = createVersion(date, runNumber)

    expect(version).toBe(expected)
    expect(version).toMatch(versionPattern)
  })
})

describe('compareVersions', () => {
  it.each([
    ['26.10.14', '26.10.9', 1],
    ['26.10.9', '26.10.14', -1],
    ['26.10.14', '26.10.14', 0],
    ['26.11.1', '26.10.99', 1],
    ['27.1.1', '26.12.50', 1],
    ['26.9.50', '26.10.1', -1],
  ])('orders %s against %s as %s', (a, b, sign) => {
    expect(Math.sign(compareVersions(a, b))).toBe(sign)
  })
})

describe('assertNewer', () => {
  it.each([
    ['26.10.15', 'v26.10.14'],
    ['26.10.100', 'v26.10.99'],
    ['26.11.1', 'v26.10.14'],
    ['26.10.1', ''],
    ['26.10.1', undefined],
  ])('accepts %s after %j', (version, latest) => {
    expect(() => assertNewer(version, latest)).not.toThrow()
  })

  it.each([
    ['26.10.14', 'v26.10.14'],
    ['26.10.3', 'v26.10.14'],
    ['26.9.99', 'v26.10.1'],
  ])('refuses %s after %s', (version, latest) => {
    expect(() => assertNewer(version, latest)).toThrow('is not greater than the latest release')
  })
})

describe('stampVersion', () => {
  const folders = []
  const createPackage = () => {
    const folder = mkdtempSync(join(tmpdir(), 'emusic-version-'))
    folders.push(folder)
    const packagePath = join(folder, 'package.json')
    writeFileSync(packagePath, JSON.stringify({ name: 'emusic', version: '1.0.0' }))
    return packagePath
  }

  afterEach(() => folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true, force: true })))

  it('writes the version and keeps the rest of the package', () => {
    const packagePath = createPackage()

    stampVersion(packagePath, '26.10.14')

    expect(JSON.parse(readFileSync(packagePath, 'utf8'))).toEqual({ name: 'emusic', version: '26.10.14' })
  })

  it.each(['1.0.0-master', '26.06.14', '26.13.1', '26.10.', 'v26.10.14', ''])('refuses %j', (version) => {
    const packagePath = createPackage()

    expect(() => stampVersion(packagePath, version)).toThrow('is not a version')
    expect(JSON.parse(readFileSync(packagePath, 'utf8')).version).toBe('1.0.0')
  })
})

describe('command line', () => {
  const run = (args, env) => {
    const output = execFileSync(process.execPath, [join(__dirname, 'version.js'), ...args], { env, encoding: 'utf8', stdio: 'pipe' })
    return output.trim()
  }

  it('prints the version of a new release from the run number', () => {
    expect(run([], { GITHUB_RUN_NUMBER: '14' })).toMatch(new RegExp(`^\\d{2}\\.[1-9]\\d?\\.14$`))
  })

  it('refuses a run number that is not greater than the latest release', () => {
    expect(() => run(['--after', 'v99.12.1'], { GITHUB_RUN_NUMBER: '14' })).toThrow('is not greater than the latest release v99.12.1')
  })

  it('prints the version when it is greater than the latest release or there is none', () => {
    expect(run(['--after', 'v20.1.1'], { GITHUB_RUN_NUMBER: '14' })).toMatch(/\.14$/)
    expect(run(['--after', ''], { GITHUB_RUN_NUMBER: '14' })).toMatch(/\.14$/)
  })

  it('refuses to print a version without a run number', () => {
    expect(() => run([], {})).toThrow('GITHUB_RUN_NUMBER is not set')
  })
})
