import { readdirSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { describe, expect, it } from 'vitest'

// the rules of .claude/rules/workflows.md that a script can check
const directory = resolve(__dirname, '../.github/workflows')
const workflows = readdirSync(directory)
  .filter((name) => name.endsWith('.yml'))
  .map((name) => [name, readFileSync(join(directory, name), 'utf8')])
const read = (name) => workflows.find(([file]) => file === name)[1]

describe('workflows', () => {
  it.each(workflows)('%s skips no check to pass', (name, text) => {
    expect(text).not.toMatch(/continue-on-error|--no-verify/)
  })

  it.each(workflows)('%s sets permissions', (name, text) => {
    expect(text).toMatch(/^\s*permissions:/m)
  })

  it.each(workflows)('%s passes untrusted input through env', (name, text) => {
    const interpolated = text
      .split('\n')
      .filter((line) => /\$\{\{\s*github\.(head_ref|event\.(pull_request\.(title|body|head\.ref)|head_commit\.message|issue\.(title|body)|comment\.body))/.test(line))
      .filter((line) => !/^\s+[A-Z_]+: \$\{\{/.test(line))

    expect(interpolated).toEqual([])
  })

  it.each(['test.yml', 'dist.yml'])('%s runs on Linux, macOS and Windows without fail-fast', (name) => {
    const text = read(name)

    expect(text).toMatch(/fail-fast: false/)
    expect(text).toMatch(/ubuntu/)
    expect(text).toMatch(/macos/)
    expect(text).toMatch(/windows/)
  })

  it('test.yml runs the cheap checks first', () => {
    const text = read('test.yml')
    const order = ['npm run lint', 'npm run fallow', 'npm run typecheck', 'npm run test:coverage'].map((command) => text.indexOf(command))

    expect(order.every((index) => index >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('dist.yml builds before it packages', () => {
    const text = read('dist.yml')

    expect(text.indexOf('npm run build')).toBeLessThan(text.indexOf('npm run dist'))
  })
})
