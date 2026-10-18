const { spawnSync } = require('child_process')
const { mkdtempSync, readFileSync, writeFileSync } = require('fs')
const { tmpdir } = require('os')
const { join, resolve } = require('path')

// usage: node scripts/security-scan.js [--update]
// runs Electronegativity on the main process sources and fails on a finding that is not in the baseline,
// so the known misconfigurations are tracked and a new one cannot be added unnoticed
const baselineFile = resolve(__dirname, '../electronegativity-baseline.json')
const { version } = require('electron/package.json')
const output = join(mkdtempSync(join(tmpdir(), 'electronegativity-')), 'results.sarif')

const { status } = spawnSync(
  process.execPath,
  [require.resolve('@doyensec/electronegativity/dist/index.js'), '-i', 'electron', '-e', version, '-r', '-o', output],
  { stdio: 'ignore' }
)
if (status !== 0) {
  console.error('Electronegativity failed to run')
  process.exit(1)
}

const [{ results }] = JSON.parse(readFileSync(output, 'utf8')).runs
const findings = [...new Set(results.map(({ ruleId, locations }) => `${ruleId} ${locations?.[0]?.physicalLocation?.artifactLocation?.uri ?? 'global'}`))].sort()

if (process.argv.includes('--update')) {
  writeFileSync(baselineFile, `${JSON.stringify(findings, null, 2)}\n`)
  console.log(`Baseline updated with ${findings.length} findings`)
  process.exit(0)
}

const accepted = JSON.parse(readFileSync(baselineFile, 'utf8'))
const added = findings.filter(finding => !accepted.includes(finding))
const fixed = accepted.filter(finding => !findings.includes(finding))

fixed.forEach(finding => console.log(`Fixed, remove from the baseline: ${finding}`))
added.forEach(finding => console.error(`New finding: ${finding}`))
console.log(`${findings.length} findings, ${added.length} new`)
process.exit(added.length || fixed.length ? 1 : 0)
