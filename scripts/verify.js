const { spawnSync } = require('child_process')

// usage: node scripts/verify.js [--from <check>]   runs the checks of CLAUDE.md in order and stops at the first failure
//        prints one line per check and only the end of the output of the one that failed, so a run costs a few lines instead of the whole log
const checks = [
  ['lint', ['run', 'lint']],
  ['fallow', ['run', 'fallow']],
  ['typecheck', ['run', 'typecheck']],
  ['test:coverage', ['run', 'test:coverage']],
  ['security:electron', ['run', 'security:electron']],
  ['build', ['run', 'build']],
]
const failureLines = 40

const tail = (output, lines) => output.trimEnd().split('\n').slice(-lines).join('\n')

const runNpm = (args) => {
  const { status, stdout, stderr } = spawnSync('npm', args, { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 })
  return { ok: status === 0, output: `${stdout ?? ''}${stderr ?? ''}` }
}

// the checks from `from` on, each result `{ name, ok, output }`; nothing runs after a failure
const runChecks = (list, run, from) => {
  const start = Math.max(0, list.findIndex(([name]) => name === from))
  return list.slice(start).reduce((results, [name, args]) => (results.some((result) => !result.ok) ? results : [...results, { name, ...run(args) }]), [])
}

const report = (results) =>
  results
    .map(({ name, ok, output }) => (ok ? `PASS ${name}` : `FAIL ${name}\n${tail(output, failureLines)}`))
    .join('\n')

if (require.main === module) {
  const [flag, from] = process.argv.slice(2)
  const start = Math.max(0, checks.findIndex(([name]) => name === (flag === '--from' ? from : undefined)))
  const results = runChecks(checks, runNpm, flag === '--from' ? from : undefined)
  console.log(report(results))
  console.log(`not run: ${checks.slice(start + results.length).map(([name]) => name).join(', ') || 'none'}`)
  process.exit(results.every((result) => result.ok) ? 0 : 1)
}

module.exports = { checks, tail, runChecks, report }
