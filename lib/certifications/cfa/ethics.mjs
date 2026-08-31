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

// Original "which action is COMPLIANT?" items — the REVERSE reasoning family, so
// ethics mastery needs more than pattern-matching "bad action -> Standard X".
const COMPLIANT_ITEMS = [
  { prompt: 'An analyst receives material nonpublic information by accident. Which action is CONSISTENT with the Code and Standards?',
    correct: 'Refrain from trading or causing others to trade on it until it is public',
    wrong: ['Trade quickly before anyone else learns it', 'Share it privately with the firm’s three largest clients'] },
  { prompt: 'A member wants to reference earning the CFA charter. Which is COMPLIANT?',
    correct: 'State “I am a CFA charterholder,” using the marks correctly',
    wrong: ['Write “CFA, Level III candidate” as if the charter were complete', 'Claim the charter guarantees superior performance'] },
  { prompt: 'An analyst is offered a modest gift by a client for good service. Which is COMPLIANT?',
    correct: 'Accept only if it can’t reasonably compromise independence, and disclose per firm policy',
    wrong: ['Accept a lavish, ongoing benefit tied to future recommendations', 'Accept secretly without telling the employer'] },
  { prompt: 'When presenting a composite’s past performance, which is COMPLIANT?',
    correct: 'Present performance that is fair, accurate, and complete',
    wrong: ['Show only the accounts that performed best', 'Imply past returns will be repeated'] },
];

// Generate one original ethics item — violation-identification (SCENARIO family) OR
// which-action-is-compliant (REVERSE family), 3 choices.
export function generateEthicsItem(rng) {
  if (rng() < 0.34) {
    const it = COMPLIANT_ITEMS[Math.floor(rng() * COMPLIANT_ITEMS.length)];
    const entries = [{ label: it.correct, correct: true }, ...it.wrong.map((w) => ({ label: w, correct: false }))].slice(0, 3);
    for (let k = entries.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); [entries[k], entries[j]] = [entries[j], entries[k]]; }
    return {
      concept: 'ethics-compliant',
      prompt: it.prompt,
      options: entries.map((e) => e.label),
      correct: entries.findIndex((e) => e.correct),
      explanation: 'The compliant choice upholds the Code and Standards; the others describe conduct the Standards prohibit.',
      meta: { family: 'reverse' },
    };
  }
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
