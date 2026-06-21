// ============================================================================
// recallScenario.js
// ----------------------------------------------------------------------------
// Visual recall training. Instead of a paragraph to read, we build an
// operational BOARD — a structured data object the UI renders as a visual
// display (incident command board, personnel roster, apparatus assignment
// board, dispatch screen, equipment inventory, or a building floor plan).
//
// Flow the UI implements:
//   1. Show the board as visual cards/diagram for a limited time.
//   2. Hide it completely.
//   3. Ask recall questions whose answers come from the same board object,
//      so questions and display can never disagree.
//
// Difficulty controls how many details are on the board:
//   D1: 3-4 details   D2: 5-6   D3: 7-8   D4: 10+   D5: complex multi-board
//
// Exports:
//   generateBoard(seed, difficulty) -> Board
//   generateRecallQuestions(board, seed, count) -> Question[]
//   (generateScenario / legacy name kept as alias for compatibility)
// ============================================================================

import { makeRng } from './questionEngine';

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
let _c = 0;
const uid = () => `rb_${Date.now().toString(36)}_${(_c++).toString(36)}`;

// ---- data pools -------------------------------------------------------------
const NAMES = ['Alvarez', 'Chen', 'Okafor', 'Murphy', 'Reyes', 'Nguyen', 'Brooks', 'Santos', 'Patel', 'Walsh', 'Diaz', 'Kim', 'Foster', 'Cole', 'Hayes', 'Ramos'];
const RANKS = ['Captain', 'Lieutenant', 'Engineer', 'Firefighter', 'Firefighter', 'Firefighter'];
const UNIT_TYPES = ['Engine', 'Truck', 'Ladder', 'Rescue', 'Squad', 'Medic', 'Battalion'];
const APP_COLORS = ['red', 'yellow', 'lime-green', 'white'];
const STREETS = ['Oak St', 'Maple Ave', 'Cedar Ln', 'Pine Rd', 'Birch Ct', 'Elm Dr', 'Walnut Blvd', 'Ash Way'];
const OCCUPANCIES = ['Single-family residence', 'Apartment complex', 'Commercial warehouse', 'Retail storefront', 'Restaurant', 'School', 'Office building'];
const INCIDENT_TYPES = ['Structure Fire', 'Vehicle Fire', 'Medical Aid', 'Hazmat Spill', 'Vehicle Accident', 'Alarm Activation', 'Gas Leak'];
const TOOLS = ['Halligan bar', 'Pike pole', 'Flathead axe', 'Hydraulic spreader', 'Pry bar', 'Come-along', 'Thermal camera', 'Chainsaw', 'Bolt cutters', 'Search rope'];
const ASSIGNMENTS = ['Nozzle', 'Backup', 'Search & Rescue', 'Ventilation', 'Water Supply', 'RIT', 'Overhaul', 'Pump Operator'];
const HELMETS = ['black', 'red', 'yellow', 'white'];
const SIDES = ['Alpha (front)', 'Bravo (left)', 'Charlie (rear)', 'Delta (right)'];
const HAZARDS = ['downed power line', 'propane tank', 'natural gas leak', 'structural collapse risk', 'hazmat container', 'blocked exit'];
const ROOMS = ['Kitchen', 'Living room', 'Master bedroom', 'Garage', 'Basement', 'Attic', 'Bathroom', 'Hallway'];
const PRIORITIES = ['Priority 1 (Emergency)', 'Priority 2 (Urgent)', 'Priority 3 (Routine)'];

const BOARD_TYPES = ['command', 'roster', 'apparatus', 'dispatch', 'equipment', 'floorplan'];

// detail budget by difficulty
function detailBudget(difficulty) {
  return { 1: 3, 2: 5, 3: 7, 4: 10, 5: 12 }[difficulty] || 5;
}

function makeUnit(rng) {
  return `${pick(rng, UNIT_TYPES)} ${randint(rng, 1, 49)}`;
}

// ---- board generators (each returns { kind, title, fields:[{label,value,icon}], rows?, diagram? }) ----
function commandBoard(rng, n) {
  const units = [];
  const count = Math.min(Math.max(2, Math.round(n / 2)), 6);
  const usedUnits = new Set();
  for (let i = 0; i < count; i++) {
    let u = makeUnit(rng); let guard = 0;
    while (usedUnits.has(u) && guard++ < 20) u = makeUnit(rng);
    usedUnits.add(u);
    units.push({ unit: u, assignment: pick(rng, ASSIGNMENTS), arrival: i + 1 });
  }
  const incident = pick(rng, INCIDENT_TYPES);
  const address = `${randint(rng, 100, 9999)} ${pick(rng, STREETS)}`;
  const command = pick(rng, NAMES);
  return {
    kind: 'command',
    title: 'Incident Command Board',
    header: { incident, address, command: `IC: ${command}` },
    rows: units, // ordered by arrival
    extra: { command, incident, address },
  };
}

function rosterBoard(rng, n) {
  const count = Math.min(Math.max(3, n - 1), 8);
  const people = shuffle(rng, NAMES).slice(0, count).map((name, i) => ({
    name,
    rank: i === 0 ? 'Captain' : pick(rng, RANKS),
    assignment: pick(rng, ASSIGNMENTS),
    helmet: i === 0 ? 'white' : pick(rng, HELMETS),
  }));
  return {
    kind: 'roster',
    title: 'Personnel Roster',
    header: { unit: makeUnit(rng), shift: pick(rng, ['A Shift', 'B Shift', 'C Shift']) },
    rows: people,
  };
}

function apparatusBoard(rng, n) {
  const count = Math.min(Math.max(3, n - 1), 7);
  const usedUnits = new Set();
  const rigs = [];
  for (let i = 0; i < count; i++) {
    let u = makeUnit(rng); let guard = 0;
    while (usedUnits.has(u) && guard++ < 20) u = makeUnit(rng);
    usedUnits.add(u);
    rigs.push({ unit: u, color: pick(rng, APP_COLORS), status: pick(rng, ['Responding', 'On Scene', 'Available', 'Staging']), crew: randint(rng, 2, 5) });
  }
  return { kind: 'apparatus', title: 'Apparatus Assignment Board', header: { station: `Station ${randint(rng, 1, 40)}` }, rows: rigs };
}

function dispatchBoard(rng, n) {
  const incident = pick(rng, INCIDENT_TYPES);
  const address = `${randint(rng, 100, 9999)} ${pick(rng, STREETS)}`;
  const fields = [
    { label: 'Incident Type', value: incident, icon: 'flame' },
    { label: 'Address', value: address, icon: 'pin' },
    { label: 'Priority', value: pick(rng, PRIORITIES), icon: 'alert' },
    { label: 'Time Dispatched', value: `${String(randint(rng, 0, 23)).padStart(2, '0')}:${String(randint(rng, 0, 59)).padStart(2, '0')}`, icon: 'clock' },
    { label: 'Units Assigned', value: `${makeUnit(rng)}, ${makeUnit(rng)}`, icon: 'truck' },
    { label: 'Occupancy', value: pick(rng, OCCUPANCIES), icon: 'building' },
    { label: 'Caller Reports', value: pick(rng, ['Smoke showing', 'Flames visible', 'Person trapped', 'Alarm sounding', 'Odor of gas']), icon: 'eye' },
    { label: 'Cross Street', value: pick(rng, STREETS), icon: 'pin' },
    { label: 'Box Number', value: `${randint(rng, 100, 999)}`, icon: 'hash' },
    { label: 'Battalion', value: `Battalion ${randint(rng, 1, 12)}`, icon: 'shield' },
    { label: 'Weather', value: pick(rng, ['Clear', 'Rain', 'Wind 15mph', 'Fog']), icon: 'wind' },
    { label: 'Hydrant', value: pick(rng, SIDES), icon: 'droplet' },
  ];
  return { kind: 'dispatch', title: 'Dispatch Screen', header: { cad: `CAD #${randint(rng, 10000, 99999)}` }, fields: fields.slice(0, n) };
}

function equipmentBoard(rng, n) {
  const count = Math.min(Math.max(3, n), 12);
  const tools = shuffle(rng, TOOLS).slice(0, Math.min(count, TOOLS.length)).map((tool, i) => ({
    tool, compartment: `Compartment ${String.fromCharCode(65 + (i % 6))}`, qty: randint(rng, 1, 4),
  }));
  return { kind: 'equipment', title: 'Equipment Inventory', header: { unit: makeUnit(rng) }, rows: tools };
}

function floorplanBoard(rng, n) {
  // a simple grid of rooms with one victim and one hazard placed
  const roomCount = Math.min(Math.max(4, n), 8);
  const rooms = shuffle(rng, ROOMS).slice(0, roomCount);
  const victimRoom = pick(rng, rooms);
  const hazardSide = pick(rng, SIDES);
  const hazard = pick(rng, HAZARDS);
  const entry = pick(rng, SIDES);
  const stories = randint(rng, 1, 3);
  return {
    kind: 'floorplan',
    title: 'Building Floor Plan',
    header: { occupancy: pick(rng, OCCUPANCIES), stories: `${stories}-story` },
    diagram: { rooms, victimRoom, hazardSide, hazard, entry, stories },
  };
}

const BOARD_BUILDERS = {
  command: commandBoard, roster: rosterBoard, apparatus: apparatusBoard,
  dispatch: dispatchBoard, equipment: equipmentBoard, floorplan: floorplanBoard,
};

// Map each board kind to the recall subskill it primarily trains.
const KIND_SUBSKILL = {
  command: 'sequence', roster: 'personnel', apparatus: 'equipment',
  dispatch: 'dispatch', equipment: 'equipment', floorplan: 'directional',
};

export function generateBoard(seed = Date.now(), difficulty = 2) {
  const rng = makeRng(seed);
  const n = detailBudget(difficulty);
  // D5 = complex: pick a board with maximum details
  const kind = pick(rng, BOARD_TYPES);
  const board = BOARD_BUILDERS[kind](rng, n);
  return {
    id: uid(),
    seed,
    difficulty,
    durationMs: ({ 1: 9000, 2: 11000, 3: 13000, 4: 16000, 5: 20000 }[difficulty]) || 11000,
    detailCount: n,
    ...board,
  };
}

// Keep the old export name working for any existing imports.
export const generateScenario = generateBoard;

// ---- question generation ----------------------------------------------------
export function generateRecallQuestions(board, seed = Date.now(), count = 6) {
  const rng = makeRng(seed);

  const assemble = (correct, distractors, format = (x) => String(x)) => {
    const wanted = format(correct);
    const set = new Set([wanted]);
    const chosen = [];
    for (const d of distractors) {
      const f = format(d);
      if (!set.has(f) && chosen.length < 3) { set.add(f); chosen.push(d); }
    }
    let guard = 0;
    while (chosen.length < 3 && guard < 100) {
      guard++;
      const n = typeof correct === 'number' ? correct + randint(rng, 1, 9) : `${correct} ${chosen.length + 1}`;
      const f = format(n);
      if (!set.has(f)) { set.add(f); chosen.push(n); }
    }
    const opts = shuffle(rng, [correct, ...chosen]).map(format);
    return { options: opts, correct: opts.indexOf(wanted) };
  };

  const pool = []; // { prompt, options, correct, explanation, subskill }
  const ordWord = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

  if (board.kind === 'command') {
    const rows = board.rows;
    pool.push({ subskill: 'sequence', prompt: 'Which unit arrived first?',
      ...assemble(rows[0].unit, rows.slice(1).map(r => r.unit)),
      explanation: `${rows[0].unit} arrived first (position 1 on the board).` });
    if (rows.length > 2) {
      const idx = randint(rng, 1, rows.length - 1);
      pool.push({ subskill: 'sequence', prompt: `Which unit arrived ${ordWord[idx]}?`,
        ...assemble(rows[idx].unit, rows.filter((_, i) => i !== idx).map(r => r.unit)),
        explanation: `${rows[idx].unit} was ${ordWord[idx]} to arrive.` });
    }
    const ri = randint(rng, 0, rows.length - 1);
    pool.push({ subskill: 'personnel', prompt: `What was ${rows[ri].unit}'s assignment?`,
      ...assemble(rows[ri].assignment, ASSIGNMENTS.filter(a => a !== rows[ri].assignment)),
      explanation: `${rows[ri].unit} was assigned ${rows[ri].assignment}.` });
    pool.push({ subskill: 'dispatch', prompt: 'What was the incident type?',
      ...assemble(board.extra.incident, INCIDENT_TYPES.filter(t => t !== board.extra.incident)),
      explanation: `The incident was a ${board.extra.incident}.` });
    pool.push({ subskill: 'dispatch', prompt: 'What address was displayed?',
      ...assemble(board.extra.address, [
        `${parseInt(board.extra.address) + 100} ${board.extra.address.split(' ').slice(1).join(' ')}`,
        `${parseInt(board.extra.address) - 50} ${board.extra.address.split(' ').slice(1).join(' ')}`,
        `${parseInt(board.extra.address) + 10} ${pick(rng, STREETS)}`,
      ]),
      explanation: `The address was ${board.extra.address}.` });
    pool.push({ subskill: 'personnel', prompt: 'Who was Incident Command?',
      ...assemble(board.extra.command, NAMES.filter(nm => nm !== board.extra.command)),
      explanation: `${board.extra.command} held command.` });
    pool.push({ subskill: 'observation', prompt: 'How many units were on the board?',
      ...assemble(rows.length, [rows.length + 1, rows.length - 1, rows.length + 2]),
      explanation: `There were ${rows.length} units listed.` });
  }

  if (board.kind === 'roster') {
    const rows = board.rows;
    const ri = randint(rng, 0, rows.length - 1);
    pool.push({ subskill: 'personnel', prompt: `What was ${rows[ri].name}'s rank?`,
      ...assemble(rows[ri].rank, RANKS.filter(r => r !== rows[ri].rank)),
      explanation: `${rows[ri].name} was a ${rows[ri].rank}.` });
    const ri2 = randint(rng, 0, rows.length - 1);
    pool.push({ subskill: 'personnel', prompt: `What was ${rows[ri2].name}'s assignment?`,
      ...assemble(rows[ri2].assignment, ASSIGNMENTS.filter(a => a !== rows[ri2].assignment)),
      explanation: `${rows[ri2].name} was assigned ${rows[ri2].assignment}.` });
    const cap = rows.find(r => r.rank === 'Captain') || rows[0];
    pool.push({ subskill: 'personnel', prompt: 'Which member was the Captain?',
      ...assemble(cap.name, rows.filter(r => r.name !== cap.name).map(r => r.name)),
      explanation: `${cap.name} was the Captain.` });
    pool.push({ subskill: 'observation', prompt: 'How many personnel were on the roster?',
      ...assemble(rows.length, [rows.length + 1, rows.length - 1, rows.length + 2]),
      explanation: `${rows.length} personnel were listed.` });
    const ri3 = randint(rng, 0, rows.length - 1);
    pool.push({ subskill: 'observation', prompt: `What helmet color did ${rows[ri3].name} wear?`,
      ...assemble(rows[ri3].helmet, HELMETS.filter(h => h !== rows[ri3].helmet)),
      explanation: `${rows[ri3].name} wore a ${rows[ri3].helmet} helmet.` });
  }

  if (board.kind === 'apparatus') {
    const rows = board.rows;
    const ri = randint(rng, 0, rows.length - 1);
    pool.push({ subskill: 'observation', prompt: `What color was ${rows[ri].unit}?`,
      ...assemble(rows[ri].color, APP_COLORS.filter(c => c !== rows[ri].color)),
      explanation: `${rows[ri].unit} was ${rows[ri].color}.` });
    const ri2 = randint(rng, 0, rows.length - 1);
    pool.push({ subskill: 'dispatch', prompt: `What was ${rows[ri2].unit}'s status?`,
      ...assemble(rows[ri2].status, ['Responding', 'On Scene', 'Available', 'Staging'].filter(s => s !== rows[ri2].status)),
      explanation: `${rows[ri2].unit} was ${rows[ri2].status}.` });
    const ri3 = randint(rng, 0, rows.length - 1);
    pool.push({ subskill: 'personnel', prompt: `How many crew were on ${rows[ri3].unit}?`,
      ...assemble(rows[ri3].crew, [rows[ri3].crew + 1, rows[ri3].crew - 1, rows[ri3].crew + 2]),
      explanation: `${rows[ri3].unit} carried ${rows[ri3].crew} crew.` });
    pool.push({ subskill: 'equipment', prompt: 'How many apparatus were on the board?',
      ...assemble(rows.length, [rows.length + 1, rows.length - 1, rows.length + 2]),
      explanation: `${rows.length} apparatus were listed.` });
    pool.push({ subskill: 'equipment', prompt: 'Which unit was listed first?',
      ...assemble(rows[0].unit, rows.slice(1).map(r => r.unit)),
      explanation: `${rows[0].unit} was at the top of the board.` });
  }

  if (board.kind === 'dispatch') {
    for (const f of board.fields) {
      let distractors = [];
      if (f.label === 'Incident Type') distractors = INCIDENT_TYPES.filter(x => x !== f.value);
      else if (f.label === 'Priority') distractors = PRIORITIES.filter(x => x !== f.value);
      else if (f.label === 'Occupancy') distractors = OCCUPANCIES.filter(x => x !== f.value);
      else if (f.label === 'Hydrant') distractors = SIDES.filter(x => x !== f.value);
      else if (f.label === 'Address' || f.label === 'Cross Street') distractors = STREETS.map(s => s);
      else distractors = [f.value + ' X', f.value + ' Y', f.value + ' Z'];
      pool.push({ subskill: 'dispatch', prompt: `Dispatch: what was the "${f.label}"?`,
        ...assemble(f.value, distractors),
        explanation: `${f.label} was ${f.value}.` });
    }
  }

  if (board.kind === 'equipment') {
    const rows = board.rows;
    const ri = randint(rng, 0, rows.length - 1);
    pool.push({ subskill: 'equipment', prompt: 'Which tool was listed on the inventory?',
      ...assemble(rows[ri].tool, TOOLS.filter(t => !rows.some(r => r.tool === t))),
      explanation: `${rows[ri].tool} was on the inventory.` });
    pool.push({ subskill: 'equipment', prompt: `Which compartment held the ${rows[ri].tool}?`,
      ...assemble(rows[ri].compartment, ['Compartment A', 'Compartment B', 'Compartment C', 'Compartment D', 'Compartment E'].filter(c => c !== rows[ri].compartment)),
      explanation: `The ${rows[ri].tool} was in ${rows[ri].compartment}.` });
    const ri2 = randint(rng, 0, rows.length - 1);
    pool.push({ subskill: 'equipment', prompt: `How many ${rows[ri2].tool} were stocked?`,
      ...assemble(rows[ri2].qty, [rows[ri2].qty + 1, rows[ri2].qty + 2, Math.max(1, rows[ri2].qty - 1)]),
      explanation: `${rows[ri2].qty} × ${rows[ri2].tool} were stocked.` });
    pool.push({ subskill: 'observation', prompt: 'How many tool types were on the inventory?',
      ...assemble(rows.length, [rows.length + 1, rows.length - 1, rows.length + 2]),
      explanation: `${rows.length} tool types were listed.` });
    // a "not listed" distractor-style question
    const notListed = TOOLS.filter(t => !rows.some(r => r.tool === t));
    if (notListed.length) {
      pool.push({ subskill: 'equipment', prompt: 'Which tool was NOT on the inventory?',
        ...assemble(pick(rng, notListed), shuffle(rng, rows.map(r => r.tool)).slice(0, 3)),
        explanation: `That tool did not appear on the inventory board.` });
    }
  }

  if (board.kind === 'floorplan') {
    const d = board.diagram;
    pool.push({ subskill: 'directional', prompt: 'Which room contained the victim?',
      ...assemble(d.victimRoom, d.rooms.filter(r => r !== d.victimRoom)),
      explanation: `The victim was in the ${d.victimRoom}.` });
    pool.push({ subskill: 'directional', prompt: 'Which side of the building had the hazard?',
      ...assemble(d.hazardSide, SIDES.filter(s => s !== d.hazardSide)),
      explanation: `The hazard was on the ${d.hazardSide} side.` });
    pool.push({ subskill: 'dispatch', prompt: 'What hazard was marked on the plan?',
      ...assemble(d.hazard, HAZARDS.filter(h => h !== d.hazard)),
      explanation: `The marked hazard was a ${d.hazard}.` });
    pool.push({ subskill: 'directional', prompt: 'Which side was the entry point?',
      ...assemble(d.entry, SIDES.filter(s => s !== d.entry)),
      explanation: `Entry was on the ${d.entry} side.` });
    pool.push({ subskill: 'observation', prompt: 'How many rooms were on the floor plan?',
      ...assemble(d.rooms.length, [d.rooms.length + 1, d.rooms.length - 1, d.rooms.length + 2]),
      explanation: `${d.rooms.length} rooms were shown.` });
    pool.push({ subskill: 'observation', prompt: 'How many stories was the building?',
      ...assemble(d.stories, [d.stories + 1, d.stories + 2, Math.max(1, d.stories - 1) === d.stories ? d.stories + 3 : d.stories - 1]),
      explanation: `The building was ${d.stories}-story.` });
  }

  // finalize: shuffle, slice to count, attach ids + domain
  return shuffle(rng, pool).slice(0, count).map(q => ({
    id: uid(),
    domain: 'recall',
    subskill: q.subskill,
    difficulty: board.difficulty,
    prompt: q.prompt,
    passage: null,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation,
    meta: { fromBoard: board.id, boardKind: board.kind },
  }));
}
