import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

const { build } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

// scripts/dist.js passes the architecture of the runner: a fixed one in the target made the Windows ARM runner build x64 as well, and
// a combined installer without an architecture in its name that ended up in the release
describe('packaging targets', () => {
  it.each(['win', 'mac', 'linux'])('leaves the architecture of %s to the runner', platform => {
    expect(JSON.stringify(build[platform].target)).not.toContain('"arch"')
  })
})
