// ============================================================================
// ethics.mjs — CFA Level I Ethics: ORIGINAL scenario practice (application, not
// memorization). Each item is a fictional situation the learner must map to the
// Code & Standards. All scenarios are original to UALE — no CFA Institute Standards
// Handbook cases or official questions are reproduced. 3 answer choices (A/B/C),
// matching the Level I format.
// ============================================================================
import { STANDARDS } from './cfaBlueprint.mjs';

// Flat lookup of "standard code -> subpart label" for building answer choices.
export const STANDARD_LABELS = (() => {
  const m = {};
  for (const [roman, def] of Object.entries(STANDARDS)) {
    for (const [letter, label] of Object.entries(def.subparts)) {
      m[`${roman}-${letter}`] = `Standard ${roman}(${letter}) — ${label}`;
    }
  }
  return m;
})();

const NAMES = ['Renata', 'Marcus', 'Priya', 'Tomás', 'Ingrid', 'Kwame', 'Sofia', 'Daniel'];
const FIRMS = ['Harbor Ridge Capital', 'Meridian Advisors', 'Blue Vale Asset Management', 'Northcliff Partners', 'Aster Investment Group'];
const pick = (rng, a) => a[Math.floor(rng() * a.length)];
const randSub = (rng, n) => { const c = [...NAMES]; const out = []; for (let i = 0; i < n && c.length; i++) out.push(c.splice(Math.floor(rng() * c.length), 1)[0]); return out; };

// Original scenarios. Each maps a described action to the Standard it most likely
// violates, with two plausible-but-wrong Standard distractors and a rationale.
const SCENARIOS = [
  {
    id: 'mnpi',
    standard: 'II-A',
    distractors: ['VI-A', 'III-B'],
    build: (rng, n, f) => `${n} overhears a client, who sits on a company's board, mention an unannounced merger during an unrelated meeting. ${n} immediately buys that company's shares for client accounts before the news is public.`,
    explain: 'Trading on material, nonpublic information violates Standard II(A) Material Nonpublic Information, regardless of how the information was obtained.',
  },
  {
    id: 'independence',
    standard: 'I-B',
    distractors: ['VI-A', 'I-C'],
    build: (rng, n, f) => `An issuer offers ${n}, an equity analyst at ${f}, an all-expenses-paid luxury trip to tour its facilities. ${n} accepts and shortly after issues a "buy" rating on the issuer.`,
    explain: 'Accepting lavish, issuer-paid benefits that could compromise objectivity violates Standard I(B) Independence and Objectivity. Modest, disclosed benefits may be acceptable; a lavish trip tied to coverage is not.',
  },
  {
    id: 'misrepresentation',
    standard: 'I-C',
    distractors: ['III-D', 'V-B'],
    build: (rng, n, f) => `${n} copies several paragraphs of a third-party research report into ${f}'s own report and presents the analysis as ${f}'s original work, without attribution.`,
    explain: 'Presenting others\' work as one\'s own is plagiarism, a violation of Standard I(C) Misrepresentation.',
  },
  {
    id: 'loyalty-employer',
    standard: 'IV-A',
    distractors: ['III-A', 'VI-B'],
    build: (rng, n, f) => `Before resigning from ${f}, ${n} secretly copies the firm's client contact list and proprietary models to solicit those clients for a new competing firm.`,
    explain: 'Misappropriating an employer\'s property and soliciting clients while still employed violates Standard IV(A) Loyalty (to employers).',
  },
  {
    id: 'suitability',
    standard: 'III-C',
    distractors: ['III-B', 'V-A'],
    build: (rng, n, f) => `${n} places a retired client with a low risk tolerance and short time horizon into a concentrated portfolio of speculative, illiquid startups.`,
    explain: 'Recommending investments inconsistent with the client\'s stated objectives and constraints violates Standard III(C) Suitability.',
  },
  {
    id: 'fair-dealing',
    standard: 'III-B',
    distractors: ['III-A', 'VI-B'],
    build: (rng, n, f) => `${n} phones the firm's three largest clients with a new "sell" recommendation and lets them trade first, only emailing the same recommendation to all other clients the next day.`,
    explain: 'Giving favored clients earlier access to a recommendation disadvantages others and violates Standard III(B) Fair Dealing.',
  },
  {
    id: 'conflicts-disclosure',
    standard: 'VI-A',
    distractors: ['II-B', 'I-B'],
    build: (rng, n, f) => `${n} recommends a stock in which ${n} personally holds a large position, without disclosing that ownership to clients or ${f}.`,
    explain: 'Failing to disclose a personal holding that could impair objectivity violates Standard VI(A) Disclosure of Conflicts.',
  },
  {
    id: 'diligence',
    standard: 'V-A',
    distractors: ['V-B', 'I-C'],
    build: (rng, n, f) => `${n} issues a "strong buy" on a company after reading only a promotional press release, performing no independent analysis of the financials.`,
    explain: 'Making a recommendation without a reasonable, adequately researched basis violates Standard V(A) Diligence and Reasonable Basis.',
  },
];

// Generate one original ethics item (violation-identification, 3 choices).
export function generateEthicsItem(rng) {
  const sc = pick(rng, SCENARIOS);
  const [n] = randSub(rng, 1);
  const f = pick(rng, FIRMS);
  const situation = sc.build(rng, n, f);
  const correctLabel = STANDARD_LABELS[sc.standard];
  const distractorLabels = sc.distractors.map((d) => STANDARD_LABELS[d]);
  // 3 choices (A/B/C): correct + 2 plausible standards, deterministically shuffled.
  const entries = [{ label: correctLabel, correct: true }, ...distractorLabels.map((l) => ({ label: l, correct: false }))].slice(0, 3);
  for (let k = entries.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); [entries[k], entries[j]] = [entries[j], entries[k]]; }
  return {
    concept: sc.id,
    prompt: `${situation}\n\nWhich CFA Standard of Professional Conduct is ${situation.startsWith('An') ? 'this action' : n + '’s action'} most likely to violate?`,
    options: entries.map((e) => e.label),
    correct: entries.findIndex((e) => e.correct),
    explanation: sc.explain,
    meta: { standard: sc.standard, standardTitle: correctLabel },
  };
}

export const ETHICS_SCENARIO_COUNT = SCENARIOS.length;
