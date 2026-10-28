const { execFileSync } = require('child_process')

// usage: node scripts/ci-failure.js [run id | run url]   the failed jobs of a run (default: the latest run of the current branch), each with its
// operating system, the step that failed and the first error of its log, so the cause is found without reading the whole log
const errorPattern = /(?:\w*error|failed|fatal)\b|ERR!|✖|✘/i
const logLines = 60

const gh = (args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

const parseRunId = (value) => value.match(/runs\/(\d+)/)?.[1] ?? value

const failedJobs = (jobs) =>
  jobs
    .filter((job) => job.conclusion === 'failure')
    .map(({ name, databaseId, steps }) => ({ name, databaseId, step: steps.find((step) => step.conclusion === 'failure')?.name }))

const firstError = (log) => log.split('\n').find((line) => errorPattern.test(line))?.trim()

const describeJob = ({ name, step }, log) => [`FAILED ${name}`, `step: ${step ?? 'unknown (the job did not start or a "needs" failed)'}`, `first error: ${firstError(log) ?? 'none found'}`, '', log.trimEnd().split('\n').slice(-logLines).join('\n')].join('\n')

const latestRunId = () => {
  const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim()
  return gh(['run', 'list', '--branch', branch, '--limit', '1', '--json', 'databaseId', '-q', '.[0].databaseId']).trim()
}

if (require.main === module) {
  const [argument] = process.argv.slice(2)
  const run = argument ? parseRunId(argument) : latestRunId()
  const { headSha, conclusion, jobs } = JSON.parse(gh(['run', 'view', run, '--json', 'headSha,conclusion,jobs']))
  console.log(`run ${run} on ${headSha}: ${conclusion || 'not finished'}`)
  failedJobs(jobs).forEach((job) => console.log(`\n${describeJob(job, gh(['run', 'view', run, '--job', String(job.databaseId), '--log-failed']))}`))
}

module.exports = { parseRunId, failedJobs, firstError, describeJob }
