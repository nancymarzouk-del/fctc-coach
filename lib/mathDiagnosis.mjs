// ============================================================================
// mathDiagnosis.mjs — math questions whose WRONG answers are diagnostic.
// ----------------------------------------------------------------------------
// Pure and deterministic. Each distractor is tied to a specific, common
// misconception, so when a learner picks a particular wrong option the app can
// say "Likely issue: you used the percent as a whole number" instead of a bare
// "incorrect". The diagnosis is a HYPOTHESIS (the wording is always "Likely
// issue: …"), never a certainty — a single pick is thin evidence. Tested in
// tests/math.test.mjs; delegated to from questionEngine's math generators.
// ============================================================================
import { randint, pick } from './mechanicalVisuals.mjs';

function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Build options from a correct value plus TAGGED distractors [{ value, tag }].
// Returns { options, correct, diagnostics } where diagnostics maps each wrong
// option's displayed text -> its "Likely issue" sentence. De-dupes against the
// correct value and each other; pads with an untagged safe distractor if needed.
function buildTagged(rng, correctVal, tagged, fmt) {
  const seen = new Set([fmt(correctVal)]);
  const entries = [{ text: fmt(correctVal), tag: null }];
  for (const d of tagged) {
    const t = fmt(d.value);
    if (!seen.has(t) && Number.isFinite(d.value)) { seen.add(t); entries.push({ text: t, tag: d.tag }); }
    if (entries.length === 4) break;
  }
  let pad = 1;
  while (entries.length < 4) {
    const cand = fmt(correctVal + pad);
    if (!seen.has(cand)) { seen.add(cand); entries.push({ text: cand, tag: null }); }
    pad += 1;
  }
  const shown = shuffle(rng, entries);
  const options = shown.map((e) => e.text);
  const diagnostics = {};
  shown.forEach((e) => { if (e.tag) diagnostics[e.text] = e.tag; });
  return { options, correct: options.indexOf(fmt(correctVal)), diagnostics };
}

const APPARATUS = ['Engine 12', 'Ladder 7', 'Rescue 3', 'the tanker'];

// ---- Percentages ------------------------------------------------------------
export function makePercentageItem(rng, difficulty) {
  const pct = pick(rng, [10, 15, 20, 25, 40, 60, 75]);
  const base = randint(rng, 4, 20) * 10;
  const answer = (pct / 100) * base;
  const tagged = [
    { value: pct * base, tag: 'Likely issue: you used the percent as a whole number. Convert it to a decimal first — ' + pct + '% = ' + (pct / 100) + '.' },
    { value: base - answer, tag: 'Likely issue: that is the remaining amount. The question asks for the part that IS medical aid.' },
    { value: Math.round(base / 2), tag: 'Likely issue: that looks like a rough "half" estimate — use the actual percentage, not a guess.' },
  ];
  const { options, correct, diagnostics } = buildTagged(rng, answer, tagged, (x) => `${x}`);
  return {
    prompt: `Of ${base} calls last month, ${pct}% were medical aid responses. How many calls were medical aid?`,
    options, correct,
    explanation: `${pct}% of ${base} = (${pct} ÷ 100) × ${base} = ${answer} calls. Turn the percent into a decimal (${pct / 100}), then multiply.`,
    meta: { errorDomain: 'percentages', diagnostics },
  };
}

// ---- Ratios -----------------------------------------------------------------
export function makeRatioItem(rng, difficulty) {
  const per = randint(rng, 2, 6);
  const units = randint(rng, 3, 9);
  const total = per * units;
  const tagged = [
    { value: per + units, tag: 'Likely issue: you added instead of multiplying. "' + per + ' per apparatus" means multiply by the number of apparatus.' },
    { value: units, tag: 'Likely issue: you used only the number of apparatus and ignored the "' + per + ' per apparatus" rate.' },
    { value: total + per, tag: 'Likely issue: close — but that counts one extra apparatus’ worth of firefighters.' },
  ];
  const { options, correct, diagnostics } = buildTagged(rng, total, tagged, (x) => `${x} firefighters`);
  return {
    prompt: `Department policy assigns ${per} firefighters per apparatus. For ${units} apparatus at a multi-alarm fire, how many firefighters are needed?`,
    options, correct,
    explanation: `A rate of ${per} per apparatus scales up by multiplying: ${per} × ${units} = ${total} firefighters.`,
    meta: { errorDomain: 'ratios', diagnostics },
  };
}

// ---- Fractions --------------------------------------------------------------
export function makeFractionItem(rng, difficulty) {
  const denom = pick(rng, [2, 3, 4, 5, 8]);
  const num = randint(rng, 1, denom - 1);
  const total = denom * randint(rng, 20, 60);
  const answer = (num / denom) * total;
  const tagged = [
    { value: total / denom, tag: 'Likely issue: you used 1/' + denom + ' and forgot to multiply by the numerator (' + num + ').' },
    { value: total - answer, tag: 'Likely issue: that is the empty space in the tank, not the water it holds.' },
    { value: Math.round(total / num), tag: 'Likely issue: you divided by the numerator. Divide by the denominator (' + denom + '), then multiply by the numerator.' },
  ];
  const { options, correct, diagnostics } = buildTagged(rng, answer, tagged, (x) => `${x} gal`);
  return {
    prompt: `A ${total}-gallon tank is ${num}/${denom} full. How many gallons of water does it hold?`,
    options, correct,
    explanation: `${num}/${denom} of ${total} = (${num} ÷ ${denom}) × ${total} = ${answer} gallons. Divide by the denominator, then multiply by the numerator.`,
    meta: { errorDomain: 'fractions', diagnostics },
  };
}

// Given a question's meta and the text of the option the learner picked, return
// the "Likely issue: …" hypothesis for that specific wrong choice, or null.
export function diagnoseMathAnswer(meta, pickedText) {
  if (!meta || !meta.diagnostics) return null;
  return meta.diagnostics[pickedText] || null;
}

export const MATH_DIAGNOSIS_BUILDERS = {
  percentages: makePercentageItem,
  ratios: makeRatioItem,
  fractions: makeFractionItem,
};
