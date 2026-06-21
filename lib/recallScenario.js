// ============================================================================
// recallScenario.js
// ----------------------------------------------------------------------------
// Builds "Video Recall Drill" scenarios WITHOUT video files. A scenario is a
// structured data object describing a staged fireground scene (apparatus,
// personnel, building, hazards, a timed sequence of events, colors, time, and
// location cues). The UI animates this data as timed cards; after the viewing
// window closes, we generate recall questions whose answers come straight from
// the same structured object — so questions and "footage" can never disagree.
//
// This sits behind the same idea as the question engine: a generator function
// returns a stable shape the UI depends on. An AI scene generator could later
// produce the same shape.
//
// Scenario shape:
//   {
//     id, durationMs,                 // how long the scene shows
//     apparatus: { unit, color },
//     location: { address, street, occupancy },
//     time: 'HH:MM',
//     personnel: [{ name, role, helmet }],
//     building: { stories, windows, doors, roofFeature },
//     hazards: [string],
//     events: [{ t: seconds, text, icon }],   // ordered timeline
//     conditions: { smoke, weather }
//   }
//
// generateRecallQuestions(scenario, rng, count) -> Question[] (same shape as the
// main question engine: prompt, options, correct, explanation, domain 'recall').
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
const uid = () => `rq_${Date.now().toString(36)}_${(_c++).toString(36)}`;

const NAMES = ['Alvarez', 'Chen', 'Okafor', 'Murphy', 'Reyes', 'Nguyen', 'Brooks', 'Santos', 'Patel', 'Walsh', 'Diaz', 'Kim'];
const STREETS = ['Oak Street', 'Maple Avenue', 'Cedar Lane', 'Pine Road', 'Birch Court', 'Elm Drive'];
const OCCUPANCIES = ['single-family residence', 'two-story apartment', 'commercial warehouse', 'retail storefront', 'restaurant'];
const UNITS = ['Engine 12', 'Engine 21', 'Truck 7', 'Ladder 3', 'Rescue 9', 'Squad 5', 'Engine 34'];
const APP_COLORS = ['red', 'yellow', 'lime-green'];
const HELMETS = ['black', 'red', 'yellow', 'white'];
const ROLES = ['Officer', 'Nozzle', 'Backup', 'Search', 'Vent', 'Pump Operator'];
const ROOF = ['a chimney', 'solar panels', 'an HVAC unit', 'a skylight', 'a satellite dish'];
const HAZARDS_POOL = ['downed power line', 'propane tank near the structure', 'blocked driveway', 'parked vehicle in the fire lane', 'overhead wires', 'icy front steps'];
const SMOKE = ['light gray smoke', 'heavy black smoke', 'brown smoke under pressure', 'white smoke'];
const WEATHER = ['clear', 'light rain', 'overcast', 'windy'];
const EVENT_ICONS = {
  arrive: 'truck', size: 'eye', supply: 'droplet', attack: 'flame',
  search: 'users', vent: 'wind', rescue: 'heart', control: 'check',
};

export function generateScenario(seed = Date.now(), difficulty = 2) {
  const rng = makeRng(seed);
  const crew = randint(rng, 3, difficulty >= 3 ? 5 : 4);
  const personnel = shuffle(rng, NAMES).slice(0, crew).map((name, i) => ({
    name,
    role: ROLES[i % ROLES.length],
    helmet: i === 0 ? 'white' : pick(rng, HELMETS),
  }));

  const hh = randint(rng, 0, 23);
  const mm = randint(rng, 0, 59);
  const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

  const eventList = [
    { key: 'arrive', text: `${pick(rng, UNITS)} arrives on scene`, },
    { key: 'size', text: 'Officer completes a 360° size-up' },
    { key: 'supply', text: 'Crew establishes water supply from the hydrant' },
    { key: 'attack', text: 'Attack line advanced through the front door' },
    { key: 'search', text: 'Primary search begins on the first floor' },
    { key: 'vent', text: 'Roof team begins vertical ventilation' },
    { key: 'control', text: 'Fire declared under control' },
  ];
  const eventCount = difficulty >= 3 ? 6 : 5;
  const chosen = eventList.slice(0, eventCount);
  const events = chosen.map((e, i) => ({ t: i, text: e.text, icon: EVENT_ICONS[e.key] || 'flame', key: e.key }));

  const hazards = shuffle(rng, HAZARDS_POOL).slice(0, difficulty >= 3 ? 2 : 1);

  return {
    id: uid(),
    seed,
    difficulty,
    durationMs: (difficulty >= 3 ? 16000 : 12000),
    apparatus: { unit: events[0].text.split(' arrives')[0], color: pick(rng, APP_COLORS) },
    location: {
      address: randint(rng, 100, 9999),
      street: pick(rng, STREETS),
      occupancy: pick(rng, OCCUPANCIES),
    },
    time,
    personnel,
    building: {
      stories: randint(rng, 1, 4),
      windows: randint(rng, 2, 8),
      doors: randint(rng, 1, 3),
      roofFeature: pick(rng, ROOF),
    },
    hazards,
    events,
    conditions: { smoke: pick(rng, SMOKE), weather: pick(rng, WEATHER) },
  };
}

// Build recall questions whose answers are guaranteed to match the scenario.
export function generateRecallQuestions(scenario, seed = Date.now(), count = 6) {
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
      const n = typeof correct === 'number' ? correct + randint(rng, 1, 9) : `${correct} ${chosen.length}`;
      const f = format(n);
      if (!set.has(f)) { set.add(f); chosen.push(n); }
    }
    const opts = shuffle(rng, [correct, ...chosen]).map(format);
    return { options: opts, correct: opts.indexOf(wanted) };
  };

  const p0 = scenario.personnel[0];
  const randMember = scenario.personnel[randint(rng, 0, scenario.personnel.length - 1)];
  const evIdx = randint(rng, 0, scenario.events.length - 1);
  const evOrd = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][evIdx];

  const bank = [
    {
      prompt: 'What was the apparatus on scene?',
      ...assemble(scenario.apparatus.unit, UNITS.filter(u => u !== scenario.apparatus.unit)),
      explanation: `The responding apparatus was ${scenario.apparatus.unit}.`,
    },
    {
      prompt: 'What color was the apparatus?',
      ...assemble(scenario.apparatus.color, APP_COLORS.filter(c => c !== scenario.apparatus.color).concat(['white', 'blue'])),
      explanation: `The apparatus was ${scenario.apparatus.color}.`,
    },
    {
      prompt: 'How many firefighters were on the crew?',
      ...assemble(scenario.personnel.length, [scenario.personnel.length + 1, scenario.personnel.length - 1, scenario.personnel.length + 2]),
      explanation: `There were ${scenario.personnel.length} firefighters on scene.`,
    },
    {
      prompt: 'How many stories was the building?',
      ...assemble(scenario.building.stories, [scenario.building.stories + 1, scenario.building.stories + 2, scenario.building.stories + 3]),
      explanation: `The building was ${scenario.building.stories} stories.`,
    },
    {
      prompt: 'How many windows were visible on the structure?',
      ...assemble(scenario.building.windows, [scenario.building.windows + 1, scenario.building.windows - 1, scenario.building.windows + 2]),
      explanation: `${scenario.building.windows} windows were visible.`,
    },
    {
      prompt: 'What feature was on the roof?',
      ...assemble(scenario.building.roofFeature, ROOF.filter(r => r !== scenario.building.roofFeature)),
      explanation: `The roof had ${scenario.building.roofFeature}.`,
    },
    {
      prompt: 'What was the street location?',
      ...assemble(scenario.location.street, STREETS.filter(s => s !== scenario.location.street)),
      explanation: `The incident was on ${scenario.location.street}.`,
    },
    {
      prompt: 'What was the address number?',
      ...assemble(scenario.location.address, [scenario.location.address + 10, scenario.location.address - 100, scenario.location.address + 1]),
      explanation: `The address was ${scenario.location.address} ${scenario.location.street}.`,
    },
    {
      prompt: 'What time was the incident?',
      ...assemble(scenario.time, [
        `${String((parseInt(scenario.time) + 1) % 24).padStart(2, '0')}:${scenario.time.split(':')[1]}`,
        `${scenario.time.split(':')[0]}:${String((parseInt(scenario.time.split(':')[1]) + 5) % 60).padStart(2, '0')}`,
        `${String((parseInt(scenario.time) + 2) % 24).padStart(2, '0')}:${scenario.time.split(':')[1]}`,
      ]),
      explanation: `The incident time was ${scenario.time}.`,
    },
    {
      prompt: 'What were the smoke conditions?',
      ...assemble(scenario.conditions.smoke, SMOKE.filter(s => s !== scenario.conditions.smoke)),
      explanation: `Conditions showed ${scenario.conditions.smoke}.`,
    },
    {
      prompt: 'What was the weather?',
      ...assemble(scenario.conditions.weather, WEATHER.filter(w => w !== scenario.conditions.weather)),
      explanation: `The weather was ${scenario.conditions.weather}.`,
    },
    {
      prompt: `What helmet color did the officer (${p0.name}) wear?`,
      ...assemble(p0.helmet, HELMETS.filter(h => h !== p0.helmet)),
      explanation: `The officer wore a ${p0.helmet} helmet (officers typically wear white).`,
    },
    {
      prompt: `What was ${randMember.name}'s assignment?`,
      ...assemble(randMember.role, ROLES.filter(r => r !== randMember.role)),
      explanation: `${randMember.name} was assigned ${randMember.role}.`,
    },
    {
      prompt: `What was the ${evOrd} event in the sequence?`,
      ...assemble(scenario.events[evIdx].text, scenario.events.filter((_, i) => i !== evIdx).map(e => e.text)),
      explanation: `The ${evOrd} event was: ${scenario.events[evIdx].text}.`,
    },
    {
      prompt: 'Which hazard was present on scene?',
      ...assemble(scenario.hazards[0], HAZARDS_POOL.filter(h => !scenario.hazards.includes(h))),
      explanation: `A noted hazard was: ${scenario.hazards[0]}.`,
    },
    {
      prompt: 'What was the occupancy type?',
      ...assemble(scenario.location.occupancy, OCCUPANCIES.filter(o => o !== scenario.location.occupancy)),
      explanation: `The structure was a ${scenario.location.occupancy}.`,
    },
  ];

  // Map each question to a recall subskill for per-subskill tracking.
  const subskillOf = (prompt) => {
    if (/event in the sequence/.test(prompt)) return 'sequence';
    if (/assignment|helmet|firefighters/.test(prompt)) return 'tracking';
    if (/street|address|time|location/.test(prompt)) return 'directional';
    return 'observation';
  };

  return shuffle(rng, bank).slice(0, count).map(q => ({
    id: uid(),
    domain: 'recall',
    subskill: subskillOf(q.prompt),
    difficulty: scenario.difficulty,
    prompt: q.prompt,
    passage: null,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation,
    meta: { fromScenario: scenario.id },
  }));
}
