// Runs repro.mjs in a fresh process for each delay, RUNS times each, and tallies the results.
import { execFileSync } from 'node:child_process'

const DELAYS = [0, 1, 2, 5, 10, 20, 50]
const RUNS = Number(process.env.RUNS ?? 5)

for (const delay of DELAYS) {
  const tally = {}
  for (let i = 0; i < RUNS; i++) {
    const out = execFileSync(process.execPath, ['repro.mjs', String(delay)], { encoding: 'utf8', timeout: 30_000 })
    const { result } = JSON.parse(out.trim().split('\n').at(-1))
    tally[result] = (tally[result] ?? 0) + 1
  }
  const summary = Object.entries(tally).map(([result, count]) => `${count}/${RUNS} ${result}`).join(', ')
  console.log(`first write after ${String(delay).padStart(2)} ms: ${summary}`)
}
