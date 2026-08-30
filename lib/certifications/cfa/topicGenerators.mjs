// ============================================================================
// topicGenerators.mjs — ORIGINAL foundational practice for the eight CFA Level I
// topics beyond Quant/TVM and Ethics. Quality over volume: a representative,
// authoritative-concept-aligned set per topic (not the whole curriculum). Every
// calculation answer is computed programmatically (verify()); distractors are
// plausible common errors with a rationale. 3 answer choices (CFA A/B/C).
//
// COPYRIGHT: original UALE content aligned to publicly documented Level I concepts;
// no CFA Institute questions, mocks, or curriculum passages reproduced.
// ============================================================================

const round2 = (x) => Math.round(x * 100) / 100;
const pct = (x) => `${round2(x * 100).toFixed(2)}%`;
const money = (x) => `$${round2(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (x) => `${round2(x)}`;
const randint = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = (rng, a) => a[Math.floor(rng() * a.length)];

// Build 3 shuffled options; distractors = [{ value, why }]. Keeps each option's
// rationale aligned to its final index (correct option's rationale = null).
function assemble3(rng, correct, distractors, format) {
  const entries = [{ value: correct, why: null, correct: true }];
  const seen = new Set([format(correct)]);
  for (const d of distractors) {
    const f = format(d.value);
    if (seen.has(f)) continue;
    seen.add(f);
    entries.push({ value: d.value, why: d.why, correct: false });
    if (entries.length >= 3) break;
  }
  let g = 0;
  while (entries.length < 3 && g++ < 40) {
    const v = typeof correct === 'number' ? correct * (1 + 0.05 * entries.length) : `${correct}*`;
    const f = format(v);
    if (!seen.has(f)) { seen.add(f); entries.push({ value: v, why: 'common miscalculation', correct: false }); }
  }
  for (let k = entries.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); [entries[k], entries[j]] = [entries[j], entries[k]]; }
  return {
    options: entries.map((e) => format(e.value)),
    correct: entries.findIndex((e) => e.correct),
    distractorRationale: entries.map((e) => (e.correct ? null : e.why)),
  };
}

// ---- generators, keyed by `${topic}:${subskill}` --------------------------------
export const TOPIC_GENERATORS = {
  // ECONOMICS -----------------------------------------------------------------
  'economics:concepts': (rng) => {
    const mode = pick(rng, ['elasticity', 'ceiling']);
    if (mode === 'elasticity') {
      const sets = [{ p1: 10, p2: 8, q1: 100, q2: 130 }, { p1: 20, p2: 18, q1: 50, q2: 56 }, { p1: 5, p2: 4, q1: 200, q2: 260 }];
      const s = pick(rng, sets);
      const pctQ = (s.q2 - s.q1) / s.q1, pctP = (s.p2 - s.p1) / s.p1;
      const e = Math.abs(pctQ / pctP);
      const { options, correct, distractorRationale } = assemble3(rng, e, [
        { value: Math.abs(pctP / pctQ), why: 'ratio inverted (%ΔP over %ΔQ)' },
        { value: Math.abs((s.q2 - s.q1) / (s.p2 - s.p1)), why: 'used absolute changes, not percentages' },
      ], (x) => num(x));
      return { concept: 'elasticity', prompt: `When price falls from $${s.p1} to $${s.p2}, quantity demanded rises from ${s.q1} to ${s.q2}. What is the price elasticity of demand (absolute value)?`, options, correct, explanation: `Elasticity = %ΔQ ÷ %ΔP = ${(pctQ * 100).toFixed(0)}% ÷ ${(pctP * 100).toFixed(0)}% = ${num(e)} (absolute value).`, verify: () => round2(e), meta: { distractorRationale } };
    }
    const { options, correct, distractorRationale } = assemble3(rng, 'A shortage', [{ value: 'A surplus', why: 'confuses a ceiling (shortage) with a floor (surplus)' }, { value: 'No effect on quantity', why: 'a binding ceiling does distort quantity' }], (x) => x);
    return { concept: 'price-controls', prompt: 'A government sets a price CEILING below the market equilibrium price. What is the most likely result?', options, correct, explanation: 'A binding price ceiling (below equilibrium) creates excess demand — a shortage.', meta: { distractorRationale } };
  },

  // FINANCIAL STATEMENT ANALYSIS ---------------------------------------------
  'fsa:concepts': (rng) => {
    const mode = pick(rng, ['currentRatio', 'equation']);
    if (mode === 'currentRatio') {
      const ca = randint(rng, 12, 40) * 10000;
      const cl = randint(rng, 8, 25) * 10000;
      const r = ca / cl;
      const { options, correct, distractorRationale } = assemble3(rng, r, [
        { value: cl / ca, why: 'ratio inverted (liabilities ÷ assets)' },
        { value: (ca - cl) / cl, why: 'that is (working capital ÷ CL), not the current ratio' },
      ], (x) => num(x));
      return { concept: 'liquidity-ratios', prompt: `A firm reports current assets of ${money(ca)} and current liabilities of ${money(cl)}. What is its current ratio?`, options, correct, explanation: `Current ratio = current assets ÷ current liabilities = ${money(ca)} ÷ ${money(cl)} = ${num(r)}.`, verify: () => round2(r), meta: { distractorRationale } };
    }
    const { options, correct, distractorRationale } = assemble3(rng, 'Assets = Liabilities + Equity', [{ value: 'Assets = Liabilities − Equity', why: 'equity is added, not subtracted' }, { value: 'Assets + Liabilities = Equity', why: 'rearranged incorrectly' }], (x) => x);
    return { concept: 'accounting-equation', prompt: 'Which expresses the fundamental accounting equation?', options, correct, explanation: 'The balance sheet identity is Assets = Liabilities + Owners’ Equity.', meta: { distractorRationale } };
  },

  // CORPORATE FINANCE ---------------------------------------------------------
  'corpFinance:concepts': (rng) => {
    const outlay = randint(rng, 8, 20) * 100;
    const cf = randint(rng, 5, 12) * 100;
    const r = pick(rng, [0.08, 0.10, 0.12]);
    const npv = -outlay + cf / (1 + r) + cf / Math.pow(1 + r, 2);
    const { options, correct, distractorRationale } = assemble3(rng, npv, [
      { value: -outlay + 2 * cf, why: 'summed cash flows without discounting' },
      { value: cf / (1 + r) + cf / Math.pow(1 + r, 2), why: 'ignored the initial outlay' },
    ], (x) => money(x));
    return { concept: 'npv', prompt: `A project costs ${money(outlay)} today and returns ${money(cf)} at the end of each of the next two years. At a ${pct(r)} discount rate, what is its NPV?`, options, correct, explanation: `NPV = −${money(outlay)} + ${money(cf)}/(1+${r}) + ${money(cf)}/(1+${r})² = ${money(npv)}. Accept if NPV > 0.`, verify: () => round2(npv), meta: { distractorRationale } };
  },

  // EQUITIES ------------------------------------------------------------------
  'equity:concepts': (rng) => {
    const mode = pick(rng, ['ddm', 'orders']);
    if (mode === 'ddm') {
      const d1 = randint(rng, 1, 5);
      const r = pick(rng, [0.10, 0.12, 0.09]);
      const g = pick(rng, [0.02, 0.03, 0.04]);
      const price = d1 / (r - g);
      const { options, correct, distractorRationale } = assemble3(rng, price, [
        { value: d1 / r, why: 'omitted growth (used r, not r − g)' },
        { value: d1 / (r + g), why: 'added growth instead of subtracting' },
      ], (x) => money(x));
      return { concept: 'gordon-growth', prompt: `A stock is expected to pay a ${money(d1)} dividend next year, dividends grow at ${pct(g)} forever, and the required return is ${pct(r)}. Using the Gordon growth model, what is its value?`, options, correct, explanation: `Gordon growth: V = D₁ ÷ (r − g) = ${money(d1)} ÷ (${r} − ${g}) = ${money(price)}.`, verify: () => round2(price), meta: { distractorRationale } };
    }
    const { options, correct, distractorRationale } = assemble3(rng, 'A limit order', [{ value: 'A market order', why: 'a market order prioritizes speed, not price' }, { value: 'A stop order', why: 'a stop order triggers at a stop price, not a price limit for execution' }], (x) => x);
    return { concept: 'order-types', prompt: 'Which order type executes only at a specified price or better?', options, correct, explanation: 'A limit order sets a price boundary; it executes only at the limit price or better (it may not fill).', meta: { distractorRationale } };
  },

  // FIXED INCOME --------------------------------------------------------------
  'fixedIncome:concepts': (rng) => {
    const mode = pick(rng, ['currentYield', 'priceYield']);
    if (mode === 'currentYield') {
      const face = 1000;
      const couponRate = pick(rng, [0.04, 0.05, 0.06]);
      const price = pick(rng, [920, 950, 980, 1020, 1050]);
      const coupon = face * couponRate;
      const cy = coupon / price;
      const { options, correct, distractorRationale } = assemble3(rng, cy, [
        { value: couponRate, why: 'used the coupon rate (coupon ÷ face), not ÷ market price' },
        { value: coupon / face * (face / price) * 0 + coupon / (2 * price), why: 'halved the annual coupon' },
      ], (x) => pct(x));
      return { concept: 'current-yield', prompt: `A ${money(face)} face bond with a ${pct(couponRate)} annual coupon trades at ${money(price)}. What is its current yield?`, options, correct, explanation: `Current yield = annual coupon ÷ price = ${money(coupon)} ÷ ${money(price)} = ${pct(cy)}.`, verify: () => round2(cy * 10000) / 10000, meta: { distractorRationale } };
    }
    const { options, correct, distractorRationale } = assemble3(rng, 'The bond’s price falls', [{ value: 'The bond’s price rises', why: 'price and yield move inversely' }, { value: 'The bond’s price is unchanged', why: 'fixed-coupon bond prices are sensitive to yields' }], (x) => x);
    return { concept: 'price-yield-inverse', prompt: 'If market interest rates rise, what happens to the price of an existing fixed-coupon bond?', options, correct, explanation: 'Bond prices and yields move inversely: when rates rise, existing fixed-coupon bond prices fall.', meta: { distractorRationale } };
  },

  // DERIVATIVES ---------------------------------------------------------------
  'derivatives:concepts': (rng) => {
    const mode = pick(rng, ['callPayoff', 'obligation']);
    if (mode === 'callPayoff') {
      const k = randint(rng, 30, 60);
      const s = k + pick(rng, [-8, -4, 3, 6, 10]);
      const payoff = Math.max(s - k, 0);
      const { options, correct, distractorRationale } = assemble3(rng, payoff, [
        { value: Math.max(k - s, 0), why: 'that is a PUT payoff (K − S), not a call' },
        { value: s - k, why: 'ignored the floor at zero (a call is never exercised for a loss)' },
      ], (x) => money(x));
      return { concept: 'option-payoff', prompt: `At expiration a call option has a strike of ${money(k)} and the underlying trades at ${money(s)}. What is the option’s payoff (ignoring premium)?`, options, correct, explanation: `Call payoff = max(S − K, 0) = max(${money(s)} − ${money(k)}, 0) = ${money(payoff)}.`, verify: () => round2(payoff), meta: { distractorRationale } };
    }
    const { options, correct, distractorRationale } = assemble3(rng, 'A forward commits BOTH parties to transact', [{ value: 'A forward gives the buyer a right but not an obligation', why: 'that describes an option, not a forward' }, { value: 'A forward is exchange-traded and standardized', why: 'that describes a future; forwards are OTC/customized' }], (x) => x);
    return { concept: 'derivative-features', prompt: 'Which statement best describes a forward contract?', options, correct, explanation: 'A forward is a customized OTC contract that obligates both parties to transact at a set price on a future date (unlike an option’s right, or a standardized exchange-traded future).', meta: { distractorRationale } };
  },

  // ALTERNATIVE INVESTMENTS ---------------------------------------------------
  'altInvestments:concepts': (rng) => {
    const { options, correct, distractorRationale } = assemble3(rng, 'A publicly traded large-cap stock', [{ value: 'A private equity buyout fund', why: 'private equity is a core alternative investment' }, { value: 'A direct real estate holding', why: 'real assets like real estate are alternatives' }], (x) => x);
    return { concept: 'alt-categories', prompt: 'Which of the following is generally NOT classified as an alternative investment?', options, correct, explanation: 'Publicly traded large-cap equity is a traditional investment. Private equity, real assets/real estate, hedge funds, and commodities are alternatives.', meta: { distractorRationale } };
  },

  // PORTFOLIO CONSTRUCTION ----------------------------------------------------
  'portfolio:concepts': (rng) => {
    const mode = pick(rng, ['expReturn', 'diversification']);
    if (mode === 'expReturn') {
      const w1 = pick(rng, [0.3, 0.4, 0.6, 0.7]);
      const r1 = pick(rng, [0.06, 0.08]);
      const r2 = pick(rng, [0.10, 0.12]);
      const er = w1 * r1 + (1 - w1) * r2;
      const { options, correct, distractorRationale } = assemble3(rng, er, [
        { value: (r1 + r2) / 2, why: 'simple average — ignored the weights' },
        { value: (1 - w1) * r1 + w1 * r2, why: 'weights applied to the wrong assets' },
      ], (x) => pct(x));
      return { concept: 'expected-return', prompt: `A portfolio holds ${pct(w1)} in Asset A (expected return ${pct(r1)}) and the rest in Asset B (expected return ${pct(r2)}). What is the portfolio’s expected return?`, options, correct, explanation: `Portfolio E[R] = w₁r₁ + w₂r₂ = ${pct(w1)}·${pct(r1)} + ${pct(1 - w1)}·${pct(r2)} = ${pct(er)}.`, verify: () => round2(er * 10000) / 10000, meta: { distractorRationale } };
    }
    const { options, correct, distractorRationale } = assemble3(rng, 'It reduces portfolio risk (as long as correlation < 1)', [{ value: 'It reduces expected return proportionally', why: 'diversification targets risk, not expected return' }, { value: 'It has no effect unless assets are perfectly correlated', why: 'benefit exists whenever correlation < 1; it is greatest as correlation falls' }], (x) => x);
    return { concept: 'diversification', prompt: 'What is the primary effect of combining assets whose returns are not perfectly correlated?', options, correct, explanation: 'Diversification lowers portfolio risk (standard deviation) whenever asset correlation is below 1; the lower the correlation, the greater the benefit.', meta: { distractorRationale } };
  },
};
