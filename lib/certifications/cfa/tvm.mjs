// ============================================================================
// tvm.mjs — CFA Level I Time-Value-of-Money engine (pure, programmatically verified).
// ----------------------------------------------------------------------------
// CFA prep must build UNDERSTANDING, not answer memorization. This module:
//   1. Computes every answer PROGRAMMATICALLY (an AI-authored key is never
//      authoritative — the correct value comes from these formulas).
//   2. Generates each DISTRACTOR from a NAMED misconception, so a wrong pick maps
//      to a specific weakness Alyce can teach (present-vs-future value, compounding
//      vs simple interest, period/rate conversion, ordinary-vs-due timing, …).
//
// All original: no CFA Institute questions or curriculum text are reproduced.
// ============================================================================

// ---- core formulas (the authoritative answer source) ---------------------------
export function fvSingle(pv, i, n) { return pv * Math.pow(1 + i, n); }
export function pvSingle(fv, i, n) { return fv / Math.pow(1 + i, n); }
export function fvAnnuityOrdinary(pmt, i, n) { return i === 0 ? pmt * n : pmt * (Math.pow(1 + i, n) - 1) / i; }
export function pvAnnuityOrdinary(pmt, i, n) { return i === 0 ? pmt * n : pmt * (1 - Math.pow(1 + i, -n)) / i; }
export function toAnnuityDue(ordinaryValue, i) { return ordinaryValue * (1 + i); }
export function ear(stated, m) { return Math.pow(1 + stated / m, m) - 1; }

// Named misconceptions — the diagnosis vocabulary Alyce teaches against.
export const TVM_MISCONCEPTIONS = Object.freeze({
  PV_FV_DIRECTION: 'present-vs-future-value',   // discounted when should compound, or vice versa
  SIMPLE_INTEREST: 'compounding',               // used simple interest instead of compounding
  PERIODS: 'periods',                           // wrong number of periods (off-by-one / units)
  RATE_CONVERSION: 'rate-conversion',           // used stated annual instead of periodic / EAR
  CASHFLOW_TIMING: 'cash-flow-timing',          // ordinary vs annuity-due (missed ×(1+i))
  ARITHMETIC: 'arithmetic',                     // right method, execution slip
});

const TEACH = {
  [TVM_MISCONCEPTIONS.PV_FV_DIRECTION]: 'Check the direction: future value COMPOUNDS forward (×(1+i)^n); present value DISCOUNTS back (÷(1+i)^n).',
  [TVM_MISCONCEPTIONS.SIMPLE_INTEREST]: 'This compounds — interest earns interest. Use (1+i)^n, not 1+i·n (simple interest).',
  [TVM_MISCONCEPTIONS.PERIODS]: 'Count the periods carefully and match the rate to the period (n and i must use the same period).',
  [TVM_MISCONCEPTIONS.RATE_CONVERSION]: 'Convert the rate to the compounding period first (periodic rate = stated ÷ m; EAR = (1+stated/m)^m − 1).',
  [TVM_MISCONCEPTIONS.CASHFLOW_TIMING]: 'Watch the timing: annuity-DUE payments occur at the START of each period, so multiply the ordinary result by (1+i).',
  [TVM_MISCONCEPTIONS.ARITHMETIC]: 'The method is right — recheck the calculation steps.',
};

const round2 = (x) => Math.round(x * 100) / 100;
const money = (x) => `$${round2(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (x) => `${(x * 100).toFixed(2)}%`;

// Assemble shuffled options while keeping each option's misconception aligned to
// its final index. `distractors` = [{ value, misconception }]. Guarantees 3 unique
// formatted options (CFA Level I uses three answer choices, A/B/C); the correct
// option's diagnostic is null.
const CHOICES = 3; // CFA Level I: exactly three answer choices
function assembleDiagnostic(rng, correctValue, distractors, format) {
  const entries = [{ value: correctValue, misconception: null, correct: true }];
  const seen = new Set([format(correctValue)]);
  for (const d of distractors) {
    const f = format(d.value);
    if (seen.has(f)) continue;               // skip collisions (keeps clean options)
    seen.add(f);
    entries.push({ value: d.value, misconception: d.misconception, correct: false });
    if (entries.length >= CHOICES) break;
  }
  // Pad with arithmetic-slip distractors if collisions left us short.
  let guard = 0;
  while (entries.length < CHOICES && guard++ < 50) {
    const v = correctValue * (1 + (0.03 + 0.02 * entries.length));
    const f = format(v);
    if (!seen.has(f)) { seen.add(f); entries.push({ value: v, misconception: TVM_MISCONCEPTIONS.ARITHMETIC, correct: false }); }
  }
  // Deterministic Fisher–Yates.
  for (let k = entries.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [entries[k], entries[j]] = [entries[j], entries[k]];
  }
  return {
    options: entries.map((e) => format(e.value)),
    correct: entries.findIndex((e) => e.correct),
    diagnostics: entries.map((e) => (e.correct ? null : { misconception: e.misconception, note: TEACH[e.misconception] })),
  };
}

const randint = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// ---- problem generators --------------------------------------------------------
// Each returns { concept, prompt, correct(index), options, explanation, verify(), meta }.
// `verify()` recomputes the answer from the formulas so tests (and generation-time
// checks) can confirm the key is correct — never trusting an authored value.

export const TVM_GENERATORS = {
  // Single-sum future value.
  singleSumFV(rng) {
    const pv = randint(rng, 2, 50) * 1000;
    const rate = pick(rng, [0.03, 0.04, 0.05, 0.06, 0.08]);
    const n = randint(rng, 3, 12);
    const answer = fvSingle(pv, rate, n);
    const { options, correct, diagnostics } = assembleDiagnostic(rng, answer, [
      { value: pvSingle(pv, rate, n), misconception: TVM_MISCONCEPTIONS.PV_FV_DIRECTION }, // discounted instead
      { value: pv * (1 + rate * n), misconception: TVM_MISCONCEPTIONS.SIMPLE_INTEREST },   // simple interest
      { value: fvSingle(pv, rate, n - 1), misconception: TVM_MISCONCEPTIONS.PERIODS },     // off-by-one n
    ], money);
    return {
      concept: 'single-sum-fv',
      prompt: `You invest ${money(pv)} today at ${pct(rate)} compounded annually. What is its value in ${n} years?`,
      options, correct,
      explanation: `Future value compounds forward: FV = PV(1+i)^n = ${money(pv)}(1+${rate})^${n} = ${money(answer)}.`,
      verify: () => round2(answer),
      meta: { diagnostics },
    };
  },

  // Single-sum present value (discounting).
  singleSumPV(rng) {
    const fv = randint(rng, 5, 60) * 1000;
    const rate = pick(rng, [0.03, 0.04, 0.05, 0.07]);
    const n = randint(rng, 3, 12);
    const answer = pvSingle(fv, rate, n);
    const { options, correct, diagnostics } = assembleDiagnostic(rng, answer, [
      { value: fvSingle(fv, rate, n), misconception: TVM_MISCONCEPTIONS.PV_FV_DIRECTION }, // compounded instead
      { value: fv / (1 + rate * n), misconception: TVM_MISCONCEPTIONS.SIMPLE_INTEREST },   // simple discount
      { value: pvSingle(fv, rate, n + 1), misconception: TVM_MISCONCEPTIONS.PERIODS },     // wrong n
    ], money);
    return {
      concept: 'single-sum-pv',
      prompt: `You will receive ${money(fv)} in ${n} years. At a ${pct(rate)} discount rate, what is it worth today?`,
      options, correct,
      explanation: `Present value discounts back: PV = FV/(1+i)^n = ${money(fv)}/(1+${rate})^${n} = ${money(answer)}.`,
      verify: () => round2(answer),
      meta: { diagnostics },
    };
  },

  // Present value of an ordinary annuity.
  annuityPV(rng) {
    const pmt = randint(rng, 1, 20) * 500;
    const rate = pick(rng, [0.04, 0.05, 0.06, 0.08]);
    const n = randint(rng, 4, 15);
    const answer = pvAnnuityOrdinary(pmt, rate, n);
    const { options, correct, diagnostics } = assembleDiagnostic(rng, answer, [
      { value: toAnnuityDue(answer, rate), misconception: TVM_MISCONCEPTIONS.CASHFLOW_TIMING }, // treated as due
      { value: pmt * n, misconception: TVM_MISCONCEPTIONS.SIMPLE_INTEREST },                     // summed undiscounted
      { value: fvAnnuityOrdinary(pmt, rate, n), misconception: TVM_MISCONCEPTIONS.PV_FV_DIRECTION }, // FV not PV
    ], money);
    return {
      concept: 'annuity-pv',
      prompt: `An investment pays ${money(pmt)} at the END of each year for ${n} years. At ${pct(rate)}, what is its present value?`,
      options, correct,
      explanation: `Ordinary annuity PV = PMT·[1−(1+i)^−n]/i = ${money(answer)}. (Payments at period-end ⇒ ordinary, no ×(1+i).)`,
      verify: () => round2(answer),
      meta: { diagnostics },
    };
  },

  // Effective annual rate from a stated nominal rate.
  effectiveAnnualRate(rng) {
    const stated = pick(rng, [0.06, 0.08, 0.10, 0.12]);
    const m = pick(rng, [2, 4, 12]);
    const answer = ear(stated, m);
    const { options, correct, diagnostics } = assembleDiagnostic(rng, answer, [
      { value: stated, misconception: TVM_MISCONCEPTIONS.RATE_CONVERSION },        // used stated as EAR
      { value: stated / m, misconception: TVM_MISCONCEPTIONS.RATE_CONVERSION },    // used periodic only
      { value: Math.pow(1 + stated, m) - 1, misconception: TVM_MISCONCEPTIONS.PERIODS }, // didn't divide by m
    ], pct);
    const per = ({ 2: 'semiannually', 4: 'quarterly', 12: 'monthly' })[m];
    return {
      concept: 'effective-annual-rate',
      prompt: `A loan quotes ${pct(stated)} compounded ${per}. What is the effective annual rate (EAR)?`,
      options, correct,
      explanation: `EAR = (1 + stated/m)^m − 1 = (1 + ${stated}/${m})^${m} − 1 = ${pct(answer)}.`,
      verify: () => round2(answer * 10000) / 10000,
      meta: { diagnostics },
    };
  },

  // CONCEPTUAL family (not a calculation) — tests understanding of TVM direction,
  // so quant mastery requires transfer beyond plugging the formula. Distractors carry
  // the same misconception vocabulary as the calc items.
  directionConcept(rng) {
    const variants = [
      { q: 'To find the value TODAY of a cash flow you will receive in the future, you should:',
        correct: 'Discount it — divide by (1 + i)ⁿ',
        wrong: [{ t: 'Compound it — multiply by (1 + i)ⁿ', k: TVM_MISCONCEPTIONS.PV_FV_DIRECTION }, { t: 'Multiply it by the number of periods', k: TVM_MISCONCEPTIONS.SIMPLE_INTEREST }],
        why: 'Present value moves a future amount BACKWARD in time, so you discount (divide), not compound.' },
      { q: 'Holding the amount and horizon fixed, a HIGHER discount rate makes a future cash flow’s present value:',
        correct: 'Lower',
        wrong: [{ t: 'Higher', k: TVM_MISCONCEPTIONS.PV_FV_DIRECTION }, { t: 'Unchanged', k: TVM_MISCONCEPTIONS.SIMPLE_INTEREST }],
        why: 'A larger denominator (1 + i)ⁿ means a smaller present value — PV falls as the rate rises.' },
      { q: 'For the same stated annual rate, MORE frequent compounding produces a future value that is:',
        correct: 'Higher',
        wrong: [{ t: 'Lower', k: TVM_MISCONCEPTIONS.RATE_CONVERSION }, { t: 'Exactly the same', k: TVM_MISCONCEPTIONS.RATE_CONVERSION }],
        why: 'More frequent compounding lets interest earn interest sooner, so FV (and the EAR) is higher.' },
    ];
    const v = pick(rng, variants);
    const { options, correct, diagnostics } = assembleDiagnostic(rng, v.correct, v.wrong.map((w) => ({ value: w.t, misconception: w.k })), (x) => x);
    return { concept: 'tvm-direction', prompt: v.q, options, correct, explanation: v.why, meta: { diagnostics } };
  },
};

// Map a learner's picked option to its misconception (or null if correct).
export function diagnoseTvmAnswer(question, pickedIndex) {
  const diags = question?.meta?.diagnostics;
  if (!Array.isArray(diags)) return null;
  return diags[pickedIndex] || null;
}
