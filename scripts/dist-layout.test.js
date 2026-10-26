import { describe, expect, it } from 'vitest'
import { packagedExecutable, resourcesFolder, updateMetadata } from './dist-layout'

describe('packagedExecutable', () => {
  it.each([
    ['linux', 'x64', 'dist/linux-unpacked/eMusic'],
    ['linux', 'arm64', 'dist/linux-arm64-unpacked/eMusic'],
    ['darwin', 'x64', 'dist/mac/eMusic.app/Contents/MacOS/eMusic'],
    ['darwin', 'arm64', 'dist/mac-arm64/eMusic.app/Contents/MacOS/eMusic'],
    ['win32', 'x64', 'dist/win-unpacked/eMusic.exe'],
    ['win32', 'arm64', 'dist/win-arm64-unpacked/eMusic.exe']
  ])('finds the app of %s %s', (platform, arch, expected) => {
    expect(packagedExecutable(platform, arch)).toBe(expected)
  })
})

describe('resourcesFolder', () => {
  it.each([
    ['linux', 'arm64', 'dist/linux-arm64-unpacked/resources'],
    ['darwin', 'arm64', 'dist/mac-arm64/eMusic.app/Contents/Resources'],
    ['win32', 'x64', 'dist/win-unpacked/resources']
  ])('finds the resources of %s %s', (platform, arch, expected) => {
    expect(resourcesFolder(platform, arch)).toBe(expected)
  })
})

describe('updateMetadata', () => {
  it.each([
    ['linux', 'x64', 'dist/latest-linux.yml'],
    ['linux', 'arm64', 'dist/latest-linux-arm64.yml'],
    ['darwin', 'arm64', 'dist/latest-mac.yml'],
    ['win32', 'arm64', 'dist/latest.yml']
  ])('names the update file of %s %s', (platform, arch, expected) => {
    expect(updateMetadata(platform, arch)[0]).toBe(expected)
  })
})
