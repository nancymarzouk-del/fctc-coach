// ============================================================================
// questionEngine.js
// ----------------------------------------------------------------------------
// The question engine is built behind a single interface (QuestionProvider) so
// that the source of questions can change later WITHOUT touching the rest of
// the app. Today the only provider is TemplateProvider (free, offline, hundreds
// of unique variations). Later you can add AIProvider implementing the same
// interface and register it — nothing else changes.
//
// Contract every provider must satisfy:
//   generate({ domain, subskill, difficulty, count, rng }) -> Question[]
//
// Question shape (stable contract — the UI and learning engine depend on it):
//   {
//     id:          string   unique per generated instance
//     domain:      string   'mechanical' | 'math' | 'reading' | 'recall'
//     subskill:    string   e.g. 'levers', 'fractions'
//     difficulty:  number   1..5
//     prompt:      string   question text (may include a scenario/passage)
//     passage:     string?  optional longer context (reading/recall)
//     options:     string[] answer choices
//     correct:     number   index into options
//     explanation: string   why the answer is right (always provided)
//     meta:        object?   provider-specific extras
//   }
// ============================================================================

// ---- deterministic RNG so a session can be replayed/seeded if needed --------
export function makeRng(seed = Date.now()) {
  let s = seed >>> 0;
  return function rng() {
    // xorshift32
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 0xffffffff;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const randint = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const shuffle = (rng, arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Build an options array from a correct value + distractors, shuffle, and
// report the new correct index. GUARANTEES exactly 4 unique formatted options:
// if the supplied distractors collide with the answer or each other, it
// synthesizes additional numeric distractors (or suffixed labels for strings)
// so the UI always renders a clean A–D set. Keeps every generator simple.
function assemble(rng, correctValue, distractors, format = (x) => String(x)) {
  const wantedFormatted = format(correctValue);
  const formattedSet = new Set([wantedFormatted]);
  const chosen = [];

  const tryAdd = (val) => {
    if (chosen.length >= 3) return;
    const f = format(val);
    if (!formattedSet.has(f)) { formattedSet.add(f); chosen.push(val); }
  };

  for (const d of distractors) tryAdd(d);

  // Fallback: synthesize distractors until we have 3.
  const numeric = typeof correctValue === 'number';
  let guard = 0;
  while (chosen.length < 3 && guard < 200) {
    guard++;
    if (numeric) {
      const base = correctValue === 0 ? randint(rng, 1, 9) : correctValue;
      const deltas = [base * 2, Math.round(base / 2), base + randint(rng, 1, 9),
        Math.max(0, base - randint(rng, 1, 9)), base + randint(rng, 10, 30)];
      tryAdd(pick(rng, deltas));
    } else {
      // String answer with too few distractors: append a disambiguating marker.
      tryAdd(`${correctValue} (alt ${chosen.length + 1})`);
    }
  }

  const opts = shuffle(rng, [correctValue, ...chosen]).map(format);
  return { options: opts, correct: opts.indexOf(wantedFormatted) };
}

let _counter = 0;
const uid = () => `q_${Date.now().toString(36)}_${(_counter++).toString(36)}`;

// ---- firefighter-themed variable pools (drive surface variety) --------------
const NAMES = ['Alvarez', 'Chen', 'Okafor', 'Murphy', 'Reyes', 'Nguyen', 'Brooks', 'Santos', 'Patel', 'Walsh'];
const APPARATUS = ['Engine 12', 'Truck 7', 'Ladder 3', 'Rescue 9', 'Engine 21', 'Squad 5'];
const TOOLS = ['halligan bar', 'pike pole', 'flathead axe', 'hydraulic spreader', 'pry bar', 'come-along'];

// ============================================================================
// MECHANICAL REASONING GENERATORS
// ============================================================================
const mechanical = {
  levers(rng, difficulty) {
    // First/second/third class lever reasoning OR moment balance.
    if (difficulty <= 2) {
      const examples = {
        'first': ['a crowbar prying a beam', 'scissors cutting webbing', 'a seesaw at the academy'],
        'second': ['a wheelbarrow hauling debris', 'a nutcracker', 'a bottle opener'],
        'third': ['tweezers gripping a splinter', 'a fishing rod', 'swinging an axe'],
      };
      const cls = pick(rng, ['first', 'second', 'third']);
      const ex = pick(rng, examples[cls]);
      const { options, correct } = assemble(rng, cls,
        ['first', 'second', 'third', 'fourth'].filter(c => c !== cls),
        c => `${c.charAt(0).toUpperCase() + c.slice(1)}-class lever`);
      return {
        prompt: `A firefighter uses ${ex}. Which class of lever is this?`,
        options, correct,
        explanation: `${ex} is a ${cls}-class lever. First-class: fulcrum between effort and load. Second-class: load between fulcrum and effort. Third-class: effort between fulcrum and load.`,
      };
    }
    // Moment balance (load/effort)
    const effortArm = randint(rng, 3, 8);
    const loadArm = randint(rng, 1, effortArm - 1);
    const load = randint(rng, 4, 12) * 10;
    const effort = Math.round((load * loadArm) / effortArm);
    const distractors = [Math.round(load * effortArm / loadArm), load, load - effort];
    const { options, correct } = assemble(rng, effort, distractors, x => `${x} lbs`);
    return {
      prompt: `On a pry bar, the load sits ${loadArm} ft from the fulcrum and ${NAMES[randint(rng,0,NAMES.length-1)]} pushes ${effortArm} ft from the fulcrum. To balance a ${load} lb load, how much effort is needed?`,
      options, correct,
      explanation: `Balance means load × loadArm = effort × effortArm. So effort = (${load} × ${loadArm}) ÷ ${effortArm} = ${effort} lbs. Longer effort arm means less force needed.`,
    };
  },

  pulleys(rng, difficulty) {
    const supporting = randint(rng, 2, difficulty <= 2 ? 4 : 6);
    const load = randint(rng, 10, 40) * 10;
    const effort = Math.round(load / supporting);
    const { options, correct } = assemble(rng, effort,
      [load, Math.round(load / 2), load * supporting], x => `${x} lbs`);
    return {
      prompt: `A block and tackle on ${pick(rng, APPARATUS)} has ${supporting} rope sections supporting the load. Ignoring friction, how much force lifts a ${load} lb load?`,
      options, correct,
      explanation: `Mechanical advantage equals the number of supporting rope sections (${supporting}). Effort = load ÷ MA = ${load} ÷ ${supporting} = ${effort} lbs. The tradeoff: you must pull ${supporting}× more rope.`,
    };
  },

  gears(rng, difficulty) {
    const drive = randint(rng, 8, 20);
    const driven = drive * randint(rng, 2, 4);
    const ratio = driven / drive;
    const { options, correct } = assemble(rng, ratio,
      [drive / driven, ratio + 1, ratio * 2], x => `${x}:1`);
    return {
      prompt: `A driving gear with ${drive} teeth meshes with a driven gear of ${driven} teeth. What is the gear ratio?`,
      options, correct,
      explanation: `Gear ratio = driven ÷ driving = ${driven} ÷ ${drive} = ${ratio}:1. The driven gear turns slower but with more torque — useful for powering tools that need force over speed.`,
    };
  },

  hydraulics(rng, difficulty) {
    const inArea = randint(rng, 2, 6);
    const outArea = inArea * randint(rng, 5, 12);
    const ma = outArea / inArea;
    const inForce = randint(rng, 20, 80);
    const outForce = inForce * ma;
    if (difficulty <= 2) {
      const { options, correct } = assemble(rng, ma, [inArea / outArea, ma + 2, ma / 2], x => `${x}`);
      return {
        prompt: `A hydraulic spreader has an input piston of ${inArea} cm² and an output piston of ${outArea} cm². What is the mechanical advantage?`,
        options, correct,
        explanation: `Hydraulic MA = output area ÷ input area = ${outArea} ÷ ${inArea} = ${ma}. Pascal's principle: pressure is equal throughout, so larger output area multiplies force.`,
      };
    }
    const { options, correct } = assemble(rng, outForce, [inForce, outForce / 2, outForce + inForce], x => `${x} N`);
    return {
      prompt: `${NAMES[randint(rng,0,NAMES.length-1)]} applies ${inForce} N to a ${inArea} cm² input piston. The output piston is ${outArea} cm². What force does the output deliver?`,
      options, correct,
      explanation: `Output force = input force × (output area ÷ input area) = ${inForce} × ${ma} = ${outForce} N. This is why hydraulic rescue tools can cut and spread steel.`,
    };
  },

  inclinedPlane(rng, difficulty) {
    const length = randint(rng, 4, 12) * 2;
    const height = randint(rng, 2, length / 2 - 1);
    const ma = +(length / height).toFixed(1);
    const { options, correct } = assemble(rng, ma, [height / length, ma + 1, +(ma / 2).toFixed(1)], x => `${x}`);
    return {
      prompt: `A ramp used to roll equipment into ${pick(rng, APPARATUS)} is ${length} ft long and rises ${height} ft. What is its mechanical advantage?`,
      options, correct,
      explanation: `Inclined plane MA = length ÷ height = ${length} ÷ ${height} = ${ma}. A longer, shallower ramp needs less force but covers more distance.`,
    };
  },

  forceMotion(rng, difficulty) {
    const mass = randint(rng, 5, 30);
    const accel = randint(rng, 2, 8);
    const force = mass * accel;
    const { options, correct } = assemble(rng, force, [mass + accel, force / 2, mass * (accel + 2)], x => `${x} N`);
    return {
      prompt: `A charged hose section has a mass of ${mass} kg. To accelerate it at ${accel} m/s², how much net force is required?`,
      options, correct,
      explanation: `Newton's second law: Force = mass × acceleration = ${mass} × ${accel} = ${force} N.`,
    };
  },
};

// ============================================================================
// MATH GENERATORS
// ============================================================================
const math = {
  fractions(rng, difficulty) {
    const denom = pick(rng, [2, 3, 4, 5, 8]);
    const num = randint(rng, 1, denom - 1);
    const total = denom * randint(rng, 20, 60);
    const answer = (num / denom) * total;
    const { options, correct } = assemble(rng, answer, [total - answer, answer / 2, total / denom], x => `${x} gal`);
    return {
      prompt: `A ${total}-gallon tank on ${pick(rng, APPARATUS)} is ${num}/${denom} full. How many gallons of water does it hold?`,
      options, correct,
      explanation: `${num}/${denom} of ${total} = (${num} ÷ ${denom}) × ${total} = ${answer} gallons.`,
    };
  },

  ratios(rng, difficulty) {
    const per = randint(rng, 2, 6);
    const units = randint(rng, 3, 9);
    const total = per * units;
    const { options, correct } = assemble(rng, total, [per + units, total / 2, total + per], x => `${x} firefighters`);
    return {
      prompt: `Department policy assigns ${per} firefighters per apparatus. For ${units} apparatus at a multi-alarm fire, how many firefighters are needed?`,
      options, correct,
      explanation: `Ratio of ${per}:1 means multiply: ${per} × ${units} = ${total} firefighters.`,
    };
  },

  percentages(rng, difficulty) {
    const pct = pick(rng, [10, 15, 20, 25, 40, 60, 75]);
    const base = randint(rng, 4, 20) * 10;
    const answer = (pct / 100) * base;
    const { options, correct } = assemble(rng, answer, [base - answer, answer * 2, base / 2], x => `${x}`);
    return {
      prompt: `Of ${base} calls last month, ${pct}% were medical aid responses. How many calls were medical aid?`,
      options, correct,
      explanation: `${pct}% of ${base} = (${pct} ÷ 100) × ${base} = ${answer} calls.`,
    };
  },

  unitConversion(rng, difficulty) {
    const type = pick(rng, ['tempFC', 'tempCF']);
    if (type === 'tempFC') {
      const f = pick(rng, [32, 50, 68, 86, 98.6, 212]);
      const c = +(((f - 32) * 5) / 9).toFixed(1);
      const { options, correct } = assemble(rng, c, [+(f / 2).toFixed(1), c + 10, +((f - 32) * 9 / 5).toFixed(1)], x => `${x}°C`);
      return {
        prompt: `A thermal probe reads ${f}°F. Convert to Celsius using C = (F − 32) × 5/9.`,
        options, correct,
        explanation: `C = (${f} − 32) × 5/9 = ${c}°C.`,
      };
    }
    const c = pick(rng, [0, 20, 37, 50, 100]);
    const f = +((c * 9) / 5 + 32).toFixed(1);
    const { options, correct } = assemble(rng, f, [c + 32, +(c * 2).toFixed(1), f + 18], x => `${x}°F`);
    return {
      prompt: `A scene temperature is ${c}°C. Convert to Fahrenheit using F = C × 9/5 + 32.`,
      options, correct,
      explanation: `F = ${c} × 9/5 + 32 = ${f}°F.`,
    };
  },

  timeDistance(rng, difficulty) {
    const speed = randint(rng, 30, 60);
    const time = +(randint(rng, 5, 25) / 10).toFixed(1);
    const dist = +(speed * time).toFixed(1);
    const { options, correct } = assemble(rng, dist, [speed + time, dist / 2, speed * (time + 1)], x => `${x} miles`);
    return {
      prompt: `${pick(rng, APPARATUS)} responds at an average ${speed} mph for ${time} hours. How far does it travel?`,
      options, correct,
      explanation: `Distance = speed × time = ${speed} × ${time} = ${dist} miles.`,
    };
  },

  areaVolume(rng, difficulty) {
    if (difficulty <= 2) {
      const w = randint(rng, 8, 30);
      const l = randint(rng, 8, 30);
      const area = w * l;
      const { options, correct } = assemble(rng, area, [2 * (w + l), area / 2, w + l], x => `${x} sq ft`);
      return {
        prompt: `A room measures ${w} ft by ${l} ft. What is its floor area?`,
        options, correct,
        explanation: `Area = length × width = ${l} × ${w} = ${area} sq ft.`,
      };
    }
    const r = randint(rng, 3, 10);
    const h = randint(rng, 6, 24);
    const vol = +(3.14 * r * r * h).toFixed(0);
    const { options, correct } = assemble(rng, vol, [+(3.14 * r * h).toFixed(0), vol / 2, +(2 * 3.14 * r * h).toFixed(0)], x => `${x} cu ft`);
    return {
      prompt: `A cylindrical water tank has a radius of ${r} ft and height of ${h} ft. Find its volume (use π ≈ 3.14).`,
      options, correct,
      explanation: `Volume of a cylinder = π × r² × h = 3.14 × ${r}² × ${h} = ${vol} cu ft.`,
    };
  },

  wordProblem(rng, difficulty) {
    const rate = randint(rng, 50, 250);
    const tank = rate * randint(rng, 4, 20);
    const mins = tank / rate;
    const { options, correct } = assemble(rng, mins, [rate, tank / 2 / rate, mins + 5], x => `${x} min`);
    return {
      prompt: `A pump moves ${rate} gallons per minute. How long to drain a ${tank}-gallon tank?`,
      options, correct,
      explanation: `Time = volume ÷ rate = ${tank} ÷ ${rate} = ${mins} minutes.`,
    };
  },
};

// ============================================================================
// READING COMPREHENSION GENERATORS (template passages + reasoning questions)
// ============================================================================
const reading = {
  sop(rng, difficulty) {
    const minutes = randint(rng, 10, 30);
    const psi = randint(rng, 80, 150);
    const passage = `STANDARD OPERATING PROCEDURE ${randint(rng, 100, 999)} — HOSE DEPLOYMENT\n\nUpon arrival, the nozzle firefighter shall advance the attack line to the entry point before the line is charged. The pump operator shall not charge the line above ${psi} PSI without confirmation from the nozzle firefighter. Personnel shall rotate off the nozzle every ${minutes} minutes to prevent fatigue. No member shall enter an IDLH atmosphere without a charged backup line in place.`;
    const q = pick(rng, [
      {
        prompt: 'According to this SOP, what must happen before the attack line is charged?',
        correct: 'The nozzle firefighter advances the line to the entry point',
        distractors: ['The pump reaches maximum PSI', 'A backup line is removed', 'Personnel rotate off the nozzle'],
        explanation: 'The SOP states the line is advanced to the entry point before it is charged.',
      },
      {
        prompt: `What is the maximum PSI the pump operator may use without confirmation?`,
        correct: `${psi} PSI`,
        distractors: [`${psi + 20} PSI`, `${psi - 30} PSI`, 'No limit'],
        explanation: `The SOP caps charging at ${psi} PSI without nozzle firefighter confirmation.`,
      },
      {
        prompt: 'What is required before entering an IDLH atmosphere?',
        correct: 'A charged backup line in place',
        distractors: ['Confirmation from dispatch', 'A rotation off the nozzle', 'Maximum pump pressure'],
        explanation: 'The final clause requires a charged backup line before IDLH entry.',
      },
    ]);
    const { options, correct } = assemble(rng, q.correct, q.distractors, x => x);
    return { passage, prompt: q.prompt, options, correct, explanation: q.explanation };
  },

  equipment(rng, difficulty) {
    const psi = randint(rng, 4000, 4500);
    const lowAir = randint(rng, 1000, 1500);
    const passage = `EQUIPMENT INSTRUCTION — SCBA CHECK\n\nBefore each shift, inspect the SCBA. A fully charged cylinder reads ${psi} PSI. The low-air alarm activates at ${lowAir} PSI; upon hearing it, the member shall immediately begin exit. Check that the regulator seats firmly and that the facepiece holds a negative-pressure seal. Any cylinder below 90% of full charge shall be replaced, not used.`;
    const threshold = Math.round(psi * 0.9);
    const q = pick(rng, [
      {
        prompt: 'When the low-air alarm sounds, what must the member do?',
        correct: 'Immediately begin exiting',
        distractors: ['Switch to the backup regulator', 'Refill the cylinder in place', 'Continue for 10 more minutes'],
        explanation: 'The instruction requires immediate exit when the low-air alarm activates.',
      },
      {
        prompt: `Below what pressure must a cylinder be replaced rather than used?`,
        correct: `${threshold} PSI (90% of full)`,
        distractors: [`${lowAir} PSI`, `${psi} PSI`, `${Math.round(psi * 0.5)} PSI`],
        explanation: `90% of a ${psi} PSI full charge is ${threshold} PSI; below that, replace the cylinder.`,
      },
    ]);
    const { options, correct } = assemble(rng, q.correct, q.distractors, x => x);
    return { passage, prompt: q.prompt, options, correct, explanation: q.explanation };
  },

  incidentReport(rng, difficulty) {
    const unit = pick(rng, APPARATUS);
    const t1 = randint(rng, 1, 9);
    const t2 = t1 + randint(rng, 4, 9);
    const passage = `INCIDENT REPORT\n\n${unit} was dispatched at 14:0${t1} to a reported structure fire. On arrival at 14:${t2 < 10 ? '0' + t2 : t2}, command found smoke showing from a two-story residence. ${pick(rng, NAMES)} performed a primary search of the first floor while a second crew advanced a line to the seat of the fire. The fire was declared under control 18 minutes after arrival. No injuries were reported.`;
    const elapsed = t2 - t1;
    const q = pick(rng, [
      {
        prompt: 'How many minutes elapsed between dispatch and arrival?',
        correct: `${elapsed} minutes`,
        distractors: [`${elapsed + 3} minutes`, `${Math.max(1, elapsed - 2)} minutes`, '18 minutes'],
        explanation: `Dispatch 14:0${t1}, arrival 14:${t2 < 10 ? '0' + t2 : t2}. Difference = ${elapsed} minutes.`,
      },
      {
        prompt: 'What did the first crew do on arrival?',
        correct: 'Performed a primary search of the first floor',
        distractors: ['Advanced a line to the seat of the fire', 'Declared the fire under control', 'Reported injuries'],
        explanation: `The report states ${'a named member'} performed a primary search of the first floor.`,
      },
    ]);
    const { options, correct } = assemble(rng, q.correct, q.distractors, x => x);
    return { passage, prompt: q.prompt, options, correct, explanation: q.explanation };
  },

  safety(rng, difficulty) {
    const passage = `SAFETY BULLETIN — ${pick(rng, ['ROOF OPERATIONS', 'ELECTRICAL HAZARDS', 'FLASHOVER WARNING SIGNS'])}\n\nMembers shall maintain situational awareness at all times. Rapidly increasing heat, rollover at the ceiling, and free-burning conditions are warning signs of imminent flashover and require immediate withdrawal. Never operate above a fire without a charged hoseline and a second means of egress. Report deteriorating conditions to command without delay.`;
    const q = {
      prompt: 'Which combination is described as a warning sign of imminent flashover?',
      correct: 'Rapidly increasing heat and rollover at the ceiling',
      distractors: ['Decreasing smoke and cool air', 'A charged hoseline and second egress', 'A completed primary search'],
      explanation: 'The bulletin names rapidly increasing heat, rollover, and free-burning conditions as flashover warning signs.',
    };
    const { options, correct } = assemble(rng, q.correct, q.distractors, x => x);
    return { passage, prompt: q.prompt, options, correct, explanation: q.explanation };
  },
};

// ============================================================================
// RECALL GENERATORS (generate a scene, then quiz a detail from it)
// ============================================================================
const recall = {
  observation(rng, difficulty) {
    const truck = pick(rng, ['red', 'yellow', 'white']);
    const crew = randint(rng, 2, 5);
    const floors = randint(rng, 1, 4);
    const address = randint(rng, 100, 999);
    const tool = pick(rng, TOOLS);
    const passage = `OBSERVE THIS SCENE (you will be asked about a detail):\n\nA ${truck} apparatus arrives at ${address} Oak Street, a ${floors}-story building. A crew of ${crew} firefighters dismounts. The first firefighter carries a ${tool}. Light smoke shows from a second-floor window. The address placard reads ${address}.`;
    const facts = [
      { prompt: 'What color was the apparatus?', correct: truck, distractors: ['red', 'yellow', 'white', 'blue'].filter(c => c !== truck) },
      { prompt: 'How many firefighters dismounted?', correct: String(crew), distractors: [String(crew + 1), String(crew + 2), String(Math.max(1, crew - 1) === crew ? crew + 3 : crew - 1)] },
      { prompt: 'How many stories was the building?', correct: String(floors), distractors: [String(floors + 1), String(floors + 2), String(floors + 3)] },
      { prompt: 'What was the street address number?', correct: String(address), distractors: [String(address + 10), String(address - 100), String(address + 1)] },
      { prompt: 'What tool did the first firefighter carry?', correct: tool, distractors: TOOLS.filter(t => t !== tool) },
    ];
    const f = pick(rng, facts);
    const { options, correct } = assemble(rng, f.correct, f.distractors, x => x);
    return { passage, prompt: f.prompt, options, correct, explanation: `Re-read the scene: the correct detail is "${f.correct}". Recall questions reward careful observation, not guessing.`, meta: { isRecall: true } };
  },

  sequence(rng, difficulty) {
    // Always keep >=4 steps so there are 3 real distractors; difficulty raises
    // the count toward the full sequence (longer = harder to recall).
    const pool = ['Size up the scene', 'Establish water supply', 'Advance the attack line', 'Perform primary search', 'Ventilate the structure'];
    const steps = shuffle(rng, pool).slice(0, difficulty <= 2 ? 4 : 5);
    const passage = `MEMORIZE THIS ACTION SEQUENCE (in order):\n\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    const idx = randint(rng, 0, steps.length - 1);
    const ord = ['first', 'second', 'third', 'fourth', 'fifth'][idx];
    const { options, correct } = assemble(rng, steps[idx], steps.filter((_, i) => i !== idx), x => x);
    return { passage, prompt: `What was the ${ord} action in the sequence?`, options, correct, explanation: `The ${ord} step was "${steps[idx]}". Sequence memory tests order, not just content.`, meta: { isRecall: true } };
  },

  tracking(rng, difficulty) {
    const assignments = shuffle(rng, NAMES).slice(0, 4);
    const roles = ['nozzle', 'backup', 'search', 'pump operator'];
    const passage = `PERSONNEL ASSIGNMENTS (memorize):\n\n${assignments.map((n, i) => `${n} — ${roles[i]}`).join('\n')}`;
    const idx = randint(rng, 0, 3);
    const { options, correct } = assemble(rng, roles[idx], roles.filter((_, i) => i !== idx), x => x);
    return { passage, prompt: `What was ${assignments[idx]}'s assignment?`, options, correct, explanation: `${assignments[idx]} was assigned ${roles[idx]}. Tracking personnel and equipment is a core fireground skill.`, meta: { isRecall: true } };
  },

  directional(rng, difficulty) {
    const turns = [];
    const dirs = ['north', 'east', 'south', 'west'];
    let facing = randint(rng, 0, 3);
    const start = dirs[facing];
    const n = difficulty <= 2 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const t = pick(rng, ['left', 'right']);
      turns.push(t);
      facing = t === 'right' ? (facing + 1) % 4 : (facing + 3) % 4;
    }
    const passage = `DIRECTIONAL AWARENESS:\n\nYou enter a smoke-filled structure facing ${start}. You then turn ${turns.join(', then ')}.`;
    const { options, correct } = assemble(rng, dirs[facing], dirs.filter(d => d !== dirs[facing]), x => x);
    return { passage, prompt: 'Which direction are you now facing?', options, correct, explanation: `Starting ${start} and turning ${turns.join(', ')} leaves you facing ${dirs[facing]}. In zero-visibility, directional tracking helps you find your way out.`, meta: { isRecall: true } };
  },
};

// ============================================================================
// SUBSKILL REGISTRY — maps domain/subskill to a generator function
// ============================================================================
export const SUBSKILLS = {
  mechanical: {
    label: 'Mechanical Reasoning',
    subskills: {
      levers: { label: 'Levers', gen: mechanical.levers },
      pulleys: { label: 'Pulleys', gen: mechanical.pulleys },
      gears: { label: 'Gears', gen: mechanical.gears },
      hydraulics: { label: 'Hydraulics', gen: mechanical.hydraulics },
      inclinedPlane: { label: 'Mechanical Advantage', gen: mechanical.inclinedPlane },
      forceMotion: { label: 'Force & Motion', gen: mechanical.forceMotion },
    },
  },
  math: {
    label: 'Firefighter Math',
    subskills: {
      fractions: { label: 'Fractions', gen: math.fractions },
      ratios: { label: 'Ratios', gen: math.ratios },
      percentages: { label: 'Percentages', gen: math.percentages },
      unitConversion: { label: 'Unit Conversions', gen: math.unitConversion },
      timeDistance: { label: 'Time & Distance', gen: math.timeDistance },
      areaVolume: { label: 'Area & Volume', gen: math.areaVolume },
      wordProblem: { label: 'Word Problems', gen: math.wordProblem },
    },
  },
  reading: {
    label: 'Reading Comprehension',
    subskills: {
      sop: { label: 'SOPs', gen: reading.sop },
      equipment: { label: 'Equipment Instructions', gen: reading.equipment },
      incidentReport: { label: 'Incident Reports', gen: reading.incidentReport },
      safety: { label: 'Safety Procedures', gen: reading.safety },
    },
  },
  recall: {
    label: 'Visual & Verbal Recall',
    subskills: {
      observation: { label: 'Observation', gen: recall.observation },
      sequence: { label: 'Sequence Memory', gen: recall.sequence },
      tracking: { label: 'Personnel Tracking', gen: recall.tracking },
      directional: { label: 'Directional Awareness', gen: recall.directional },
    },
  },
};

// ============================================================================
// PROVIDER INTERFACE + TEMPLATE IMPLEMENTATION
// ============================================================================

// The interface every provider implements. Documented for the future AI provider.
export class QuestionProvider {
  // eslint-disable-next-line no-unused-vars
  generate({ domain, subskill, difficulty, count, rng }) {
    throw new Error('Not implemented');
  }
}

export class TemplateProvider extends QuestionProvider {
  generate({ domain, subskill, difficulty = 2, count = 1, rng = makeRng() }) {
    const out = [];
    const domainDef = SUBSKILLS[domain];
    if (!domainDef) return out;

    // If no subskill given, rotate through all subskills in the domain.
    const subskillKeys = subskill ? [subskill] : Object.keys(domainDef.subskills);

    for (let i = 0; i < count; i++) {
      const sk = subskillKeys[i % subskillKeys.length];
      const def = domainDef.subskills[sk];
      if (!def) continue;
      const q = def.gen(rng, difficulty);
      out.push({
        id: uid(),
        domain,
        subskill: sk,
        difficulty,
        prompt: q.prompt,
        passage: q.passage || null,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation,
        meta: q.meta || null,
      });
    }
    return out;
  }
}

// ----------------------------------------------------------------------------
// Future: AIProvider would extend QuestionProvider and call your API route.
// Because the rest of the app only ever calls provider.generate(...), swapping
// or blending providers requires no UI/engine changes.
//
//   export class AIProvider extends QuestionProvider {
//     async generate(opts) { /* fetch('/api/generate', ...) -> Question[] */ }
//   }
// ----------------------------------------------------------------------------

// Singleton the app imports. Swap this line to change providers globally.
export const questionProvider = new TemplateProvider();
