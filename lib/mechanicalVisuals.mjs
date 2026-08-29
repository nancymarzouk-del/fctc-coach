// ============================================================================
// mechanicalVisuals.mjs — the mechanically-correct core for visual questions.
// ----------------------------------------------------------------------------
// PURE and deterministic: the physics (mechanical advantage, moments, gear/belt
// direction, pressure) lives here as small tested functions, SEPARATE from any
// SVG/React rendering. A question carries a structured `visual` spec produced
// here; components/MechanicalDiagram.jsx renders it. This split means the
// mechanics can be unit-tested in plain Node with known-answer fixtures, and the
// renderer can never disagree with the physics because both read the same spec.
//
// Spec shape attached to a question as `q.visual`:
//   {
//     type: 'pulley' | 'lever' | 'gear' | 'belt' | 'hydraulic' | 'balance',
//     config:    { ...deterministic geometry / relationships... },
//     answerKey: { ...derived facts the reveal layer labels (MA, effort, ...)  },
//     reveal:    { highlight: [...], caption: '...' }   // shown only after answering
//   }
// Text-only questions simply omit `visual`, so nothing here affects them.
// ============================================================================

// ---- tiny deterministic helpers (self-contained so tests need no other deps) --
export function makeRng(seed) {
  // Mulberry32 — deterministic, dependency-free.
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function randint(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// Build 4 options from a correct value + distractors, de-duplicated, shuffled.
function assemble(rng, correct, distractors, fmt = (x) => `${x}`) {
  const seen = new Set([String(correct)]);
  const opts = [correct];
  for (const d of distractors) {
    const k = String(d);
    if (!seen.has(k) && d != null && !(typeof d === 'number' && !Number.isFinite(d))) { seen.add(k); opts.push(d); }
    if (opts.length === 4) break;
  }
  let pad = 1;
  while (opts.length < 4) { // guarantee 4 distinct options even if distractors collided
    const cand = (typeof correct === 'number') ? correct + pad : `${correct}-${pad}`;
    if (!seen.has(String(cand))) { seen.add(String(cand)); opts.push(cand); }
    pad += 1;
  }
  const shown = shuffle(rng, opts.map(fmt));
  return { options: shown, correct: shown.indexOf(fmt(correct)) };
}

// ============================================================================
// PULLEYS
// ============================================================================
// Mechanical advantage of an ideal block-and-tackle = the number of rope
// segments that support the movable block (the load). Effort = load / MA. The
// tradeoff: the effort rope must be pulled MA times as far as the load rises.
export function pulleyMechanics({ strands, load }) {
  const ma = strands;
  const effort = Math.round(load / ma);
  return { ma, effort, pullDistanceRatio: ma };
}

// system -> supporting strands. 'fixed' only changes direction (MA 1); a single
// 'movable' pulley gives MA 2; a 'compound' block-and-tackle gives MA = strands.
function pulleyStrandsFor(system, strands) {
  if (system === 'fixed') return 1;
  if (system === 'movable') return 2;
  return strands; // compound
}

export function makePulleyItem(rng, difficulty) {
  const system = difficulty <= 1 ? pick(rng, ['fixed', 'movable'])
    : difficulty <= 3 ? pick(rng, ['movable', 'compound'])
      : 'compound';
  const strands = pulleyStrandsFor(system, randint(rng, 3, difficulty >= 4 ? 6 : 4));
  const load = randint(rng, 12, 40) * 10;
  const { ma, effort } = pulleyMechanics({ strands, load });

  const variant = pick(rng, system === 'fixed'
    ? ['strands', 'pull', 'ma']
    : ['ma', 'effort', 'strands', 'pull']);

  const config = { system, strands, load };
  const answerKey = { ma, effort, pullDistanceRatio: ma, loadDirection: 'up', pullDirection: system === 'fixed' ? 'down' : 'down' };

  let item;
  if (variant === 'ma' || variant === 'strands') {
    const q = variant === 'ma'
      ? `The block and tackle below lifts a ${load} lb load. What is its mechanical advantage?`
      : `How many rope segments support the load in the system below?`;
    const { options, correct } = assemble(rng, ma, [ma + 1, ma - 1, ma * 2], (x) => `${x}`);
    item = { prompt: q, options, correct,
      explanation: `Count the rope segments pulling up on the movable block: there are ${ma}. Mechanical advantage equals that count, so MA = ${ma}. Effort = load ÷ MA = ${load} ÷ ${ma} = ${effort} lbs.` };
  } else if (variant === 'effort') {
    const { options, correct } = assemble(rng, effort, [load, Math.round(load / 2), load - effort], (x) => `${x} lbs`);
    item = { prompt: `Ignoring friction, how much effort lifts the ${load} lb load in the system below?`, options, correct,
      explanation: `MA = ${ma} supporting segments, so effort = load ÷ MA = ${load} ÷ ${ma} = ${effort} lbs. You pull ${ma}× more rope in exchange for the easier pull.` };
  } else { // pull / predict movement
    const { options, correct } = assemble(rng, 'The load rises',
      ['The load lowers', 'The load stays still', 'The anchor moves'], (x) => x);
    item = { prompt: `You pull the free rope end downward. What happens to the load?`, options, correct,
      explanation: `Pulling the free end downward shortens the supporting segments, so the movable block — and the load — rises. Effort here is ${effort} lbs against a ${load} lb load (MA ${ma}).` };
  }

  item.visual = {
    type: 'pulley', config, answerKey,
    reveal: {
      highlight: ['supportingStrands', 'effort', 'load'],
      caption: `MA = number of supporting rope segments = ${ma}. Effort = ${load} ÷ ${ma} = ${effort} lbs.`,
    },
  };
  return item;
}

// ============================================================================
// LEVERS
// ============================================================================
// Moment balance: load × loadArm = effort × effortArm  =>  effort = load·loadArm/effortArm.
// MA = effortArm / loadArm. Class describes WHICH point sits between the others:
//   1st: fulcrum between effort and load
//   2nd: load between fulcrum and effort   (MA > 1 always)
//   3rd: effort between fulcrum and load   (MA < 1 always)
export function leverMechanics({ load, loadArm, effortArm }) {
  const effort = Math.round((load * loadArm) / effortArm);
  const ma = +(effortArm / loadArm).toFixed(2);
  return { effort, ma };
}

const LEVER_EXAMPLES = {
  1: ['a crowbar prying a beam', 'a seesaw', 'scissors'],
  2: ['a wheelbarrow', 'a nutcracker', 'a bottle opener'],
  3: ['tweezers', 'a fishing rod', 'a broom swept with the top hand fixed'],
};

export function makeLeverItem(rng, difficulty) {
  const klass = pick(rng, [1, 2, 3]);
  // Arm lengths consistent with the class so the geometry and MA agree.
  let effortArm, loadArm;
  if (klass === 2) { effortArm = randint(rng, 5, 9); loadArm = randint(rng, 2, effortArm - 2); } // MA>1
  else if (klass === 3) { loadArm = randint(rng, 5, 9); effortArm = randint(rng, 2, loadArm - 2); } // MA<1
  else { effortArm = randint(rng, 4, 8); loadArm = randint(rng, 2, 6); }
  const load = randint(rng, 4, 15) * 10;
  const { effort, ma } = leverMechanics({ load, loadArm, effortArm });

  const variant = difficulty <= 1 ? 'class' : pick(rng, ['class', 'effort', 'ma', 'predict']);
  const config = { klass, effortArm, loadArm, load };
  const answerKey = { effort, ma, effortArm, loadArm, load };

  let item;
  if (variant === 'class') {
    const ex = pick(rng, LEVER_EXAMPLES[klass]);
    const { options, correct } = assemble(rng, klass, [1, 2, 3].filter((k) => k !== klass),
      (k) => `${['', 'First', 'Second', 'Third'][k]}-class lever`);
    item = { prompt: `In the lever shown, the fulcrum, effort, and load are arranged like ${ex}. Which class of lever is it?`, options, correct,
      explanation: `${ex} is a ${['', 'first', 'second', 'third'][klass]}-class lever. 1st: fulcrum between effort and load. 2nd: load between fulcrum and effort. 3rd: effort between fulcrum and load.` };
  } else if (variant === 'effort') {
    const { options, correct } = assemble(rng, effort, [Math.round(load * effortArm / loadArm), load, load - effort], (x) => `${x} lbs`);
    item = { prompt: `The load (${load} lb) sits ${loadArm} units from the fulcrum; effort is applied ${effortArm} units from the fulcrum. How much effort balances the load?`, options, correct,
      explanation: `Balance: load × loadArm = effort × effortArm. effort = (${load} × ${loadArm}) ÷ ${effortArm} = ${effort} lbs. The longer effort arm is why less force is needed.` };
  } else if (variant === 'ma') {
    const { options, correct } = assemble(rng, ma, [+(loadArm / effortArm).toFixed(2), ma + 1, +(ma / 2).toFixed(2)], (x) => `${x}`);
    item = { prompt: `Effort arm is ${effortArm} units and load arm is ${loadArm} units. What is the mechanical advantage?`, options, correct,
      explanation: `MA = effort arm ÷ load arm = ${effortArm} ÷ ${loadArm} = ${ma}. MA > 1 multiplies force; MA < 1 trades force for speed/range.` };
  } else { // predict
    const { options, correct } = assemble(rng, 'Less effort is needed',
      ['More effort is needed', 'No change', 'The load gets heavier'], (x) => x);
    item = { prompt: `If you move the effort point farther from the fulcrum (longer effort arm), what happens to the effort required?`, options, correct,
      explanation: `A longer effort arm increases MA (effortArm ÷ loadArm), so less effort is needed to move the same load — at the cost of moving your hand a greater distance.` };
  }

  item.visual = {
    type: 'lever', config, answerKey,
    reveal: {
      highlight: ['effortArm', 'loadArm', 'fulcrum'],
      caption: `load × loadArm = effort × effortArm → ${load} × ${loadArm} = ${effort} × ${effortArm}. MA = ${ma}.`,
    },
  };
  return item;
}

// ============================================================================
// GEARS
// ============================================================================
// Meshed gears rotate in OPPOSITE directions. In a train, direction alternates
// each mesh, so gear i spins with the input if i is even, opposite if odd.
// Gear ratio (2 gears) = driven teeth / driver teeth; the larger gear turns
// slower (more torque). Idler gears flip direction but don't change the ratio.
export function gearTrainDirections(count, inputDirection) {
  const other = inputDirection === 'cw' ? 'ccw' : 'cw';
  return Array.from({ length: count }, (_, i) => (i % 2 === 0 ? inputDirection : other));
}
export function gearRatio(driverTeeth, drivenTeeth) { return +(drivenTeeth / driverTeeth).toFixed(2); }

export function makeGearItem(rng, difficulty) {
  const trainLen = difficulty >= 4 ? pick(rng, [2, 3]) : 2;
  const inputDirection = pick(rng, ['cw', 'ccw']);
  const driver = randint(rng, 8, 16);
  const driven = driver * pick(rng, [2, 3]);
  const teeth = trainLen === 3 ? [driver, randint(rng, 10, 14), driven] : [driver, driven];
  const dirs = gearTrainDirections(teeth.length, inputDirection);
  const ratio = gearRatio(driver, driven);
  const outDir = dirs[dirs.length - 1];

  const variant = pick(rng, ['direction', 'ratio', 'speed']);
  const config = { teeth, inputDirection };
  const answerKey = { directions: dirs, ratio, outputDirection: outDir };

  let item;
  if (variant === 'direction') {
    const other = inputDirection === 'cw' ? 'counter-clockwise' : 'clockwise';
    const word = (d) => (d === 'cw' ? 'clockwise' : 'counter-clockwise');
    const { options, correct } = assemble(rng, word(outDir), [other, 'It does not turn', 'Same as the input'], (x) => x);
    item = { prompt: `The input gear turns ${word(inputDirection)}. Which way does the output gear turn?`, options, correct,
      explanation: `Meshed gears turn opposite ways, alternating along the train. With ${teeth.length} gears, the output turns ${word(outDir)}.` };
  } else if (variant === 'ratio') {
    const { options, correct } = assemble(rng, ratio, [+(driver / driven).toFixed(2), ratio + 1, ratio * 2], (x) => `${x}:1`);
    item = { prompt: `A ${driver}-tooth driver gear meshes with a ${driven}-tooth driven gear. What is the gear ratio?`, options, correct,
      explanation: `Gear ratio = driven ÷ driver = ${driven} ÷ ${driver} = ${ratio}:1. The driven gear turns ${ratio}× slower but with more torque.` };
  } else {
    const { options, correct } = assemble(rng, 'The smaller gear', ['The larger gear', 'They turn at the same speed', 'Neither turns'], (x) => x);
    item = { prompt: `Between the ${driver}-tooth and ${driven}-tooth gears, which spins faster?`, options, correct,
      explanation: `The smaller gear (fewer teeth) spins faster. Speed is inversely proportional to teeth: the ${driver}-tooth gear turns ${ratio}× faster than the ${driven}-tooth gear.` };
  }

  item.visual = {
    type: 'gear', config, answerKey,
    reveal: { highlight: ['directions'], caption: `Meshed gears alternate direction. Ratio = ${driven} ÷ ${driver} = ${ratio}:1.` },
  };
  return item;
}

// ============================================================================
// BELTS
// ============================================================================
// An OPEN belt drives the driven pulley the SAME direction as the driver; a
// CROSSED belt reverses it. Belt speed is shared, so the smaller pulley spins
// faster: driven_rpm = driver_rpm × (driver_r / driven_r).
export function beltMechanics({ arrangement, driverR, drivenR, driverDirection }) {
  const drivenDirection = arrangement === 'crossed'
    ? (driverDirection === 'cw' ? 'ccw' : 'cw')
    : driverDirection;
  const speedRatio = +(driverR / drivenR).toFixed(2); // driven turns this many × the driver's rpm
  return { drivenDirection, speedRatio };
}

export function makeBeltItem(rng, difficulty) {
  const arrangement = pick(rng, ['open', 'crossed']);
  const driverDirection = pick(rng, ['cw', 'ccw']);
  const driverR = randint(rng, 3, 6) * 10;
  const drivenR = randint(rng, 3, 6) * 10;
  const { drivenDirection, speedRatio } = beltMechanics({ arrangement, driverR, drivenR, driverDirection });

  const variant = (driverR === drivenR) ? 'direction' : pick(rng, ['direction', 'speed']);
  const config = { arrangement, driverR, drivenR, driverDirection };
  const answerKey = { drivenDirection, speedRatio };

  let item;
  const word = (d) => (d === 'cw' ? 'clockwise' : 'counter-clockwise');
  if (variant === 'direction') {
    const other = driverDirection === 'cw' ? 'counter-clockwise' : 'clockwise';
    const { options, correct } = assemble(rng, word(drivenDirection), [other, 'It does not turn', 'It reverses back and forth'], (x) => x);
    item = { prompt: `The driver pulley turns ${word(driverDirection)} with a ${arrangement} belt. Which way does the driven pulley turn?`, options, correct,
      explanation: `An ${arrangement} belt turns the driven pulley ${arrangement === 'open' ? 'the SAME direction as' : 'OPPOSITE to'} the driver, so it turns ${word(drivenDirection)}.` };
  } else {
    const faster = driverR < drivenR ? 'The driver pulley' : 'The driven pulley';
    const { options, correct } = assemble(rng, faster, ['They spin at the same speed', driverR < drivenR ? 'The driven pulley' : 'The driver pulley', 'Neither spins'], (x) => x);
    item = { prompt: `The driver pulley radius is ${driverR} and the driven is ${drivenR}. Which pulley spins faster?`, options, correct,
      explanation: `The belt speed is shared, so the smaller pulley spins faster. The driven pulley turns ${speedRatio}× the driver's rpm (driver_r ÷ driven_r).` };
  }

  item.visual = {
    type: 'belt', config, answerKey,
    reveal: { highlight: ['direction'], caption: `${arrangement === 'open' ? 'Open belt: same direction.' : 'Crossed belt: reversed direction.'} Smaller pulley spins faster.` },
  };
  return item;
}

// ============================================================================
// HYDRAULICS
// ============================================================================
// Pascal's principle: pressure is equal throughout, so F1/A1 = F2/A2. A larger
// output piston multiplies force: F2 = F1 × (A2/A1); MA = A2 / A1.
export function hydraulicMechanics({ inputArea, outputArea, inputForce }) {
  const ma = +(outputArea / inputArea).toFixed(2);
  const outputForce = inputForce != null ? Math.round(inputForce * ma) : null;
  return { ma, outputForce };
}

export function makeHydraulicItem(rng, difficulty) {
  const inputArea = randint(rng, 2, 5);
  const outputArea = inputArea * randint(rng, 4, 10);
  const inputForce = randint(rng, 20, 80);
  const { ma, outputForce } = hydraulicMechanics({ inputArea, outputArea, inputForce });

  const variant = difficulty <= 2 ? 'ma' : pick(rng, ['ma', 'force']);
  const config = { inputArea, outputArea, inputForce };
  const answerKey = { ma, outputForce };

  let item;
  if (variant === 'ma') {
    const { options, correct } = assemble(rng, ma, [+(inputArea / outputArea).toFixed(2), ma + 2, +(ma / 2).toFixed(2)], (x) => `${x}`);
    item = { prompt: `A hydraulic spreader has a ${inputArea} cm² input piston and a ${outputArea} cm² output piston. What is the mechanical advantage?`, options, correct,
      explanation: `Hydraulic MA = output area ÷ input area = ${outputArea} ÷ ${inputArea} = ${ma}. Pressure is equal throughout, so the larger area multiplies force.` };
  } else {
    const { options, correct } = assemble(rng, outputForce, [inputForce, Math.round(outputForce / 2), outputForce + inputForce], (x) => `${x} N`);
    item = { prompt: `You apply ${inputForce} N to a ${inputArea} cm² input piston; the output piston is ${outputArea} cm². What force does the output deliver?`, options, correct,
      explanation: `F_out = F_in × (A_out ÷ A_in) = ${inputForce} × ${ma} = ${outputForce} N. This is how hydraulic rescue tools cut and spread steel.` };
  }

  item.visual = {
    type: 'hydraulic', config, answerKey,
    reveal: { highlight: ['areas', 'force'], caption: `Pressure equal: F_out = F_in × (A_out ÷ A_in). MA = ${outputArea} ÷ ${inputArea} = ${ma}.` },
  };
  return item;
}

// ============================================================================
// FORCE / LOAD BALANCE
// ============================================================================
// A beam balances when the moments about the pivot are equal: wL·dL = wR·dR.
// Otherwise it tips toward the larger moment.
export function balanceMechanics({ left, right }) {
  const mL = left.weight * left.distance;
  const mR = right.weight * right.distance;
  const tip = mL === mR ? 'balanced' : (mL > mR ? 'left' : 'right');
  return { momentLeft: mL, momentRight: mR, tip };
}

export function makeBalanceItem(rng, difficulty) {
  const balanced = pick(rng, [true, false]);
  const dL = randint(rng, 2, 6);
  const wL = randint(rng, 2, 8) * 10;
  let dR, wR;
  if (balanced) { dR = randint(rng, 2, 6); wR = Math.round((wL * dL) / dR); }
  else { dR = randint(rng, 2, 6); wR = randint(rng, 2, 8) * 10; }
  const left = { weight: wL, distance: dL };
  const right = { weight: wR, distance: dR };
  const { momentLeft, momentRight, tip } = balanceMechanics({ left, right });

  const config = { left, right };
  const answerKey = { momentLeft, momentRight, tip };

  const label = tip === 'balanced' ? 'It stays balanced' : (tip === 'left' ? 'It tips left' : 'It tips right');
  const { options, correct } = assemble(rng, label, ['It stays balanced', 'It tips left', 'It tips right'].filter((x) => x !== label), (x) => x);
  const item = {
    prompt: `A beam has ${wL} lb at ${dL} units left of the pivot and ${wR} lb at ${dR} units right. What happens?`,
    options, correct,
    explanation: `Compare moments (weight × distance): left = ${wL}×${dL} = ${momentLeft}, right = ${wR}×${dR} = ${momentRight}. ${tip === 'balanced' ? 'Equal moments → it balances.' : `The ${tip} side has the larger moment, so it tips ${tip}.`}`,
    visual: {
      type: 'balance', config, answerKey,
      reveal: { highlight: ['moments'], caption: `Moment = weight × distance. Left ${momentLeft} vs right ${momentRight} → ${tip === 'balanced' ? 'balanced' : 'tips ' + tip}.` },
    },
  };
  return item;
}

// ---- Registry of visual builders, keyed by subskill ------------------------
export const VISUAL_BUILDERS = {
  pulleys: makePulleyItem,
  levers: makeLeverItem,
  gears: makeGearItem,
  belts: makeBeltItem,
  hydraulics: makeHydraulicItem,
  balance: makeBalanceItem,
};
