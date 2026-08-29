// ============================================================================
// tests/metrics-report.mjs — prints the full metrics-validation report for the
// ten simulated learners. Run: `node tests/metrics-report.mjs` (or `npm run
// metrics:report`). Not a test; a readable audit artifact.
// ============================================================================
import { analyzeSkills, readiness, nextBestAction, EVIDENCE } from '../lib/metrics.mjs';
import { LEARNERS, REGISTRY } from './fixtures.mjs';

const pct = (x) => (x == null ? '  —' : `${Math.round(x * 100)}%`.padStart(3));
const ev = (s) => ({ [EVIDENCE.UNTESTED]: 'untested', [EVIDENCE.INSUFFICIENT]: 'insufficient', [EVIDENCE.EVALUATED]: 'evaluated' }[s]);

function line(w = 78) { return '─'.repeat(w); }

let i = 0;
for (const make of Object.values(LEARNERS)) {
  const L = make();
  i += 1;
  const analysis = analyzeSkills(L.domains, REGISTRY);
  const touched = analysis.filter((c) => c.attempts > 0);
  const r = readiness(L.domains, REGISTRY);
  const a = nextBestAction(L.domains, REGISTRY, { totalAnswered: L.totalAnswered });

  console.log('\n' + line());
  console.log(`LEARNER ${i}: ${L.label}   (${L.totalAnswered} answered)`);
  console.log(line());
  console.log('  Subskill (touched)      att  mastery  conf  recentAcc  evidence      flags');
  for (const c of touched.sort((x, y) => y.need - x.need)) {
    const flags = [
      c.demonstratedWeak ? 'WEAK' : '',
      c.demonstratedStrong ? 'MASTERED' : '',
      c.provisionalWeak ? 'leaning-weak' : '',
      c.due ? 'due' : '',
      c.trend.trend === 'improving' ? 'improving' : '',
    ].filter(Boolean).join(' ');
    const name = `${c.subskillLabel}`.padEnd(20);
    console.log(
      `  ${name}   ${String(c.attempts).padStart(2)}   ${pct(c.mastery)}    ${pct(c.confidence)}    ${pct(c.recent?.accuracy)}     ${ev(c.evidenceState).padEnd(12)} ${flags}`
    );
  }
  const untestedCount = analysis.filter((c) => c.untested).length;
  console.log(`  (+ ${untestedCount} untested subskills, correctly NOT treated as weak)`);
  console.log('  ' + line(74));
  console.log(`  Readiness       : ${r.score == null ? 'withheld — building baseline' : r.score + '/100 (' + r.band + ')'}  [${r.evaluatedCount}/${r.totalCount} skills evaluated]`);
  const weakest = analysis.filter((c) => c.demonstratedWeak).sort((x, y) => y.need - x.need)[0];
  console.log(`  Weakest (real)  : ${weakest ? weakest.subskillLabel + ' (' + weakest.domainLabel + ')' : 'none demonstrated yet'}`);
  console.log(`  ► NEXT [${a.kind}] : ${a.title}`);
  console.log(`    Why           : ${a.why}`);
  console.log(`    Difficulty    : ${a.difficulty}`);
}
console.log('\n' + line());
console.log('All recommendations are deterministic and evidence-gated: no skill is');
console.log('labelled weak on < ' + '4 attempts, and readiness is withheld until enough');
console.log('of the exam is actually evaluated.');
console.log(line() + '\n');
