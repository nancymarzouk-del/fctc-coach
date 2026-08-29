// ============================================================================
// MechanicalDiagram.jsx — deterministic, precise SVG diagrams for mechanical
// reasoning questions. Renders from a structured `visual` spec produced by
// lib/mechanicalVisuals.mjs (NO raster imagery, NO decorative art). One
// consistent visual grammar across every diagram type:
//
//   structure = slate    load = amber    effort/input = blue    reveal = orange
//
// Predict vs. reveal: with `revealed={false}` the diagram shows only the
// configuration (never the answer). With `revealed={true}` it adds the teaching
// cues — highlighted supporting strands, arm dimensions, rotation directions,
// moment comparison — plus the rule caption. This keeps the learner committing
// to a prediction before any cue appears.
//
// Responsive: every SVG uses a viewBox + width:100% so it scales cleanly on
// mobile; text stays legible via minimum sizes and high-contrast strokes.
// ============================================================================
import React from 'react';

const C = {
  structure: '#334155', // slate-700
  hatch: '#cbd5e1',      // slate-300
  load: '#d97706',       // amber-600
  effort: '#2563eb',     // blue-600
  reveal: '#ea580c',     // orange-600
  fluid: '#bae6fd',      // sky-200
  fluidEdge: '#38bdf8',  // sky-400
  muted: '#64748b',      // slate-500
  faint: '#e2e8f0',      // slate-200
  good: '#059669',       // emerald-600
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wordDir = (d) => (d === 'cw' ? 'clockwise' : 'counter-clockwise');

// Shared arrowhead marker set (one per semantic color).
function Defs() {
  const mk = (id, color) => (
    <marker id={id} key={id} markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L6,3 L0,6 Z" fill={color} />
    </marker>
  );
  return <defs>{[mk('ah-load', C.load), mk('ah-effort', C.effort), mk('ah-reveal', C.reveal), mk('ah-muted', C.muted)]}</defs>;
}

function Label({ x, y, children, color = C.muted, size = 12, anchor = 'middle', weight = 500 }) {
  return (
    <text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor} fontWeight={weight}
      style={{ fontFamily: 'inherit' }}>{children}</text>
  );
}

// ---------------------------------------------------------------- PULLEY ------
function Pulley({ config, answerKey, revealed }) {
  const { system, strands, load } = config;
  const { ma, effort } = answerKey;
  const ceilY = 24;

  if (system === 'fixed') {
    // Single fixed wheel: redirects force, MA 1. Supporting strand = the load side.
    const cx = 170, cy = 66, r = 24;
    const sColor = revealed ? C.reveal : C.structure;
    return (
      <svg viewBox="0 0 340 260" width="100%" role="img" aria-label="Fixed pulley">
        <Defs />
        <rect x={70} y={ceilY - 8} width={200} height={8} fill={C.hatch} />
        <line x1={70} y1={ceilY} x2={270} y2={ceilY} stroke={C.structure} strokeWidth={2} />
        <line x1={cx} y1={ceilY} x2={cx} y2={cy - r} stroke={C.structure} strokeWidth={2} />
        <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={C.structure} strokeWidth={3} />
        <circle cx={cx} cy={cy} r={3} fill={C.structure} />
        {/* load side (supporting strand) */}
        <line x1={cx - r} y1={cy} x2={cx - r} y2={196} stroke={sColor} strokeWidth={revealed ? 4 : 3} />
        <rect x={cx - r - 27} y={196} width={54} height={40} rx={4} fill="#fff7ed" stroke={C.load} strokeWidth={2} />
        <Label x={cx - r} y={220} color={C.load} weight={700}>Load</Label>
        <Label x={cx - r} y={250} color={C.load}>{load} lbs</Label>
        {/* effort side */}
        <line x1={cx + r} y1={cy} x2={cx + r} y2={206} stroke={C.effort} strokeWidth={3} markerEnd="url(#ah-effort)" />
        <Label x={cx + r + 4} y={150} color={C.effort} anchor="start" weight={700}>Effort ↓</Label>
        {revealed && <Label x={cx + r + 4} y={168} color={C.effort} anchor="start">{effort} lbs</Label>}
        {revealed && <Label x={cx - r} y={186} color={C.reveal} weight={700}>1 strand</Label>}
      </svg>
    );
  }

  // Movable / compound block-and-tackle: N strands support the movable block.
  const topY = 44, barY = 188, loadY = 210;
  const spacing = clamp(200 / strands, 22, 40);
  const startX = 170 - ((strands - 1) * spacing) / 2;
  const xs = Array.from({ length: strands }, (_, i) => startX + i * spacing);
  const minX = xs[0], maxX = xs[xs.length - 1];
  const effortX = maxX + spacing;
  const sColor = revealed ? C.reveal : C.structure;
  return (
    <svg viewBox="0 0 340 268" width="100%" role="img" aria-label={`${system} pulley system`}>
      <Defs />
      {/* ceiling anchor */}
      <rect x={60} y={ceilY - 8} width={220} height={8} fill={C.hatch} />
      <line x1={60} y1={ceilY} x2={280} y2={ceilY} stroke={C.structure} strokeWidth={2} />
      {/* top fixed block */}
      <rect x={minX - 12} y={topY - 10} width={(maxX - minX) + 24} height={10} rx={3} fill="#f1f5f9" stroke={C.structure} strokeWidth={2} />
      <line x1={170} y1={ceilY} x2={170} y2={topY - 10} stroke={C.structure} strokeWidth={2} />
      {/* supporting strands */}
      {xs.map((x, i) => (
        <g key={i}>
          <line x1={x} y1={topY} x2={x} y2={barY} stroke={sColor} strokeWidth={revealed ? 4 : 2.5} />
          <circle cx={x} cy={topY} r={4} fill="#fff" stroke={C.structure} strokeWidth={1.5} />
          <circle cx={x} cy={barY} r={4} fill="#fff" stroke={C.structure} strokeWidth={1.5} />
          {revealed && <Label x={x} y={topY - 6} color={C.reveal} size={11} weight={700}>{i + 1}</Label>}
        </g>
      ))}
      {/* movable block + load */}
      <rect x={minX - 12} y={barY} width={(maxX - minX) + 24} height={10} rx={3} fill="#f1f5f9" stroke={C.structure} strokeWidth={2} />
      <line x1={170} y1={barY + 10} x2={170} y2={loadY} stroke={C.structure} strokeWidth={2} />
      <rect x={170 - 30} y={loadY} width={60} height={40} rx={4} fill="#fff7ed" stroke={C.load} strokeWidth={2} />
      <Label x={170} y={loadY + 18} color={C.load} weight={700}>Load</Label>
      <Label x={170} y={loadY + 34} color={C.load}>{load} lbs</Label>
      {/* effort free end */}
      <line x1={maxX} y1={topY} x2={effortX} y2={topY} stroke={C.effort} strokeWidth={2.5} />
      <circle cx={effortX} cy={topY} r={4} fill="#fff" stroke={C.structure} strokeWidth={1.5} />
      <line x1={effortX} y1={topY} x2={effortX} y2={225} stroke={C.effort} strokeWidth={2.5} markerEnd="url(#ah-effort)" />
      <Label x={effortX + 4} y={150} color={C.effort} anchor="start" weight={700}>Effort</Label>
      {revealed && <Label x={effortX + 4} y={167} color={C.effort} anchor="start">{effort} lbs</Label>}
      {revealed && <Label x={170} y={loadY + 54} color={C.reveal} size={11} weight={700}>{ma} supporting strands (MA = {ma})</Label>}
    </svg>
  );
}

// ----------------------------------------------------------------- LEVER ------
function Lever({ config, answerKey, revealed }) {
  const { klass, effortArm, loadArm } = config;
  const { effort, ma, load } = answerKey;
  const beamY = 118;
  const unit = 190 / (effortArm + loadArm);
  let fulcrumX, effortX, loadX;
  if (klass === 1) {
    fulcrumX = 60 + effortArm * unit; effortX = 60; loadX = fulcrumX + loadArm * unit;
  } else if (klass === 2) {
    fulcrumX = 60; loadX = 60 + loadArm * unit; effortX = 60 + effortArm * unit;
  } else {
    fulcrumX = 60; effortX = 60 + effortArm * unit; loadX = 60 + loadArm * unit;
  }
  const beamL = Math.min(fulcrumX, effortX, loadX) - 14;
  const beamR = Math.max(fulcrumX, effortX, loadX) + 14;
  return (
    <svg viewBox="0 0 340 240" width="100%" role="img" aria-label={`Class ${klass} lever`}>
      <Defs />
      {/* beam */}
      <rect x={beamL} y={beamY - 5} width={beamR - beamL} height={10} rx={3} fill="#f1f5f9" stroke={C.structure} strokeWidth={2} />
      {/* fulcrum */}
      <path d={`M ${fulcrumX} ${beamY + 5} L ${fulcrumX - 16} ${beamY + 40} L ${fulcrumX + 16} ${beamY + 40} Z`} fill={C.structure} />
      <Label x={fulcrumX} y={beamY + 56} color={C.structure} weight={700}>Fulcrum</Label>
      {/* load (hanging weight) */}
      <line x1={loadX} y1={beamY + 5} x2={loadX} y2={beamY + 34} stroke={C.load} strokeWidth={2} />
      <rect x={loadX - 20} y={beamY + 34} width={40} height={30} rx={3} fill="#fff7ed" stroke={C.load} strokeWidth={2} />
      <Label x={loadX} y={beamY + 53} color={C.load} weight={700}>{load}lb</Label>
      <Label x={loadX} y={beamY - 14} color={C.load}>Load</Label>
      {/* effort (press arrow) */}
      <line x1={effortX} y1={beamY - 40} x2={effortX} y2={beamY - 8} stroke={C.effort} strokeWidth={3} markerEnd="url(#ah-effort)" />
      <Label x={effortX} y={beamY - 46} color={C.effort} weight={700}>Effort</Label>
      {revealed && <Label x={effortX} y={beamY + 78} color={C.effort}>{effort} lbs</Label>}
      {/* reveal: arm dimensions */}
      {revealed && (
        <g>
          <line x1={effortX} y1={beamY + 92} x2={fulcrumX} y2={beamY + 92} stroke={C.reveal} strokeWidth={1.5} markerStart="url(#ah-reveal)" markerEnd="url(#ah-reveal)" />
          <Label x={(effortX + fulcrumX) / 2} y={beamY + 88} color={C.reveal} size={11} weight={700}>effort arm {effortArm}</Label>
          <line x1={fulcrumX} y1={beamY + 108} x2={loadX} y2={beamY + 108} stroke={C.reveal} strokeWidth={1.5} markerStart="url(#ah-reveal)" markerEnd="url(#ah-reveal)" />
          <Label x={(fulcrumX + loadX) / 2} y={beamY + 104} color={C.reveal} size={11} weight={700}>load arm {loadArm}</Label>
        </g>
      )}
    </svg>
  );
}

// ----------------------------------------------------------------- GEARS ------
function circlePath(cx, cy, r) { return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`; }
function Gears({ config, answerKey, revealed }) {
  const { teeth, inputDirection } = config;
  const { directions, ratio } = answerKey;
  const radii = teeth.map((t) => clamp(t * 1.5, 20, 52));
  const cy = 100;
  const centers = [];
  let x = radii[0] + 14;
  for (let i = 0; i < radii.length; i++) {
    if (i > 0) x += radii[i - 1] + radii[i] - 6; // slight overlap = mesh
    centers.push(x);
  }
  const content = centers[centers.length - 1] + radii[radii.length - 1] + 14;
  // Pad to a landscape viewBox and center the train, so a big output gear never
  // blows the diagram up to portrait height at width:100%.
  const width = Math.max(content, 300);
  const offsetX = (width - content) / 2;
  return (
    <svg viewBox={`0 0 ${Math.round(width)} 200`} width="100%" role="img" aria-label="Meshed gears"
      preserveAspectRatio="xMidYMid meet" style={{ maxHeight: 260, margin: '0 auto', display: 'block' }}>
      <Defs />
      {teeth.map((t, i) => {
        const cx = centers[i] + offsetX, r = radii[i];
        const teethMarks = Array.from({ length: t }, (_, k) => {
          const a = (k / t) * Math.PI * 2;
          const x1 = cx + Math.cos(a) * r, y1 = cy + Math.sin(a) * r;
          const x2 = cx + Math.cos(a) * (r + 5), y2 = cy + Math.sin(a) * (r + 5);
          return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.structure} strokeWidth={1.5} />;
        });
        const isIO = i === 0 || i === teeth.length - 1;
        return (
          <g key={i}>
            {teethMarks}
            <circle cx={cx} cy={cy} r={r} fill={isIO ? '#f8fafc' : '#fff'} stroke={C.structure} strokeWidth={2.5} />
            <circle cx={cx} cy={cy} r={5} fill={C.structure} />
            <Label x={cx} y={cy + r + 22} color={C.muted} size={11}>{t} teeth</Label>
            {(i === 0) && <Label x={cx} y={cy - r - 10} color={C.structure} weight={700}>Input</Label>}
            {(i === teeth.length - 1) && <Label x={cx} y={cy - r - 10} color={C.structure} weight={700}>Output</Label>}
            {revealed && (
              <g>
                {/* rotation direction arc */}
                <path d={`M ${cx} ${cy - r * 0.55} A ${r * 0.55} ${r * 0.55} 0 ${directions[i] === 'cw' ? '1 1' : '1 0'} ${cx + (directions[i] === 'cw' ? r * 0.55 : -r * 0.55)} ${cy}`}
                  fill="none" stroke={C.reveal} strokeWidth={2.5} markerEnd="url(#ah-reveal)" />
              </g>
            )}
          </g>
        );
      })}
      {revealed && <Label x={width / 2} y={190} color={C.reveal} weight={700}>ratio {ratio}:1 · output turns {wordDir(directions[directions.length - 1])}</Label>}
    </svg>
  );
}

// ------------------------------------------------------------------ BELT ------
function Belt({ config, answerKey, revealed }) {
  const { arrangement, driverR, drivenR, driverDirection } = config;
  const { drivenDirection } = answerKey;
  const Lx = 96, Rx = 250, y = 96;
  const rL = clamp(driverR * 0.7, 22, 50), rR = clamp(drivenR * 0.7, 22, 50);
  const dirArc = (cx, cy, r, dir, key) => (
    <path key={key} d={`M ${cx} ${cy - r * 0.5} A ${r * 0.5} ${r * 0.5} 0 ${dir === 'cw' ? '1 1' : '1 0'} ${cx + (dir === 'cw' ? r * 0.5 : -r * 0.5)} ${cy}`}
      fill="none" stroke={C.reveal} strokeWidth={2.5} markerEnd="url(#ah-reveal)" />
  );
  return (
    <svg viewBox="0 0 340 200" width="100%" role="img" aria-label={`${arrangement} belt drive`}>
      <Defs />
      {/* belt */}
      {arrangement === 'open' ? (
        <g stroke={C.structure} strokeWidth={3} fill="none">
          <line x1={Lx} y1={y - rL} x2={Rx} y2={y - rR} />
          <line x1={Lx} y1={y + rL} x2={Rx} y2={y + rR} />
        </g>
      ) : (
        <g stroke={C.structure} strokeWidth={3} fill="none">
          <line x1={Lx} y1={y - rL} x2={Rx} y2={y + rR} />
          <line x1={Lx} y1={y + rL} x2={Rx} y2={y - rR} />
        </g>
      )}
      {/* pulleys */}
      <circle cx={Lx} cy={y} r={rL} fill="#fff" stroke={C.structure} strokeWidth={2.5} />
      <circle cx={Lx} cy={y} r={4} fill={C.structure} />
      <circle cx={Rx} cy={y} r={rR} fill="#fff" stroke={C.structure} strokeWidth={2.5} />
      <circle cx={Rx} cy={y} r={4} fill={C.structure} />
      <Label x={Lx} y={y + rL + 20} color={C.structure} weight={700}>Driver</Label>
      <Label x={Rx} y={y + rR + 20} color={C.structure} weight={700}>Driven</Label>
      <Label x={170} y={186} color={C.muted} size={11}>{arrangement} belt</Label>
      {revealed && dirArc(Lx, y, rL, driverDirection, 'l')}
      {revealed && dirArc(Rx, y, rR, drivenDirection, 'r')}
      {revealed && <Label x={Rx} y={y - rR - 8} color={C.reveal} size={11} weight={700}>{wordDir(drivenDirection)}</Label>}
    </svg>
  );
}

// ------------------------------------------------------------- HYDRAULIC ------
function Hydraulic({ config, answerKey, revealed }) {
  const { inputArea, outputArea, inputForce } = config;
  const { ma, outputForce } = answerKey;
  const wIn = clamp(inputArea * 6, 26, 46);
  const wOut = clamp(outputArea * 5, 54, 120);
  const baseY = 200, topInY = 90, topOutY = 60;
  const inX = 70, outX = 250;
  return (
    <svg viewBox="0 0 340 240" width="100%" role="img" aria-label="Connected hydraulic pistons">
      <Defs />
      {/* fluid: two cylinders + connecting pipe */}
      <path d={`M ${inX - wIn / 2} ${topInY} L ${inX - wIn / 2} ${baseY} L ${outX - wOut / 2} ${baseY} L ${outX - wOut / 2} ${topOutY} L ${outX + wOut / 2} ${topOutY} L ${outX + wOut / 2} ${baseY} L ${inX + wIn / 2} ${baseY} L ${inX + wIn / 2} ${topInY} Z`}
        fill={C.fluid} stroke={C.fluidEdge} strokeWidth={2} />
      {/* input piston */}
      <rect x={inX - wIn / 2} y={topInY - 12} width={wIn} height={12} fill={C.structure} />
      <line x1={inX} y1={topInY - 46} x2={inX} y2={topInY - 14} stroke={C.effort} strokeWidth={3} markerEnd="url(#ah-effort)" />
      <Label x={inX} y={topInY - 52} color={C.effort} weight={700}>F in</Label>
      <Label x={inX} y={baseY + 18} color={C.muted} size={11}>{inputArea} cm²</Label>
      {/* output piston */}
      <rect x={outX - wOut / 2} y={topOutY - 12} width={wOut} height={12} fill={C.structure} />
      <line x1={outX} y1={topOutY - 14} x2={outX} y2={topOutY - 46} stroke={C.load} strokeWidth={3} markerEnd="url(#ah-load)" />
      <Label x={outX} y={topOutY - 52} color={C.load} weight={700}>F out</Label>
      <Label x={outX} y={baseY + 18} color={C.muted} size={11}>{outputArea} cm²</Label>
      {revealed && <Label x={inX} y={topInY - 34} color={C.effort} size={11}>{inputForce} N</Label>}
      {revealed && outputForce != null && <Label x={outX} y={topOutY - 34} color={C.load} size={11}>{outputForce} N</Label>}
      {revealed && <Label x={170} y={232} color={C.reveal} size={12} weight={700}>MA = {outputArea} ÷ {inputArea} = {ma}</Label>}
    </svg>
  );
}

// -------------------------------------------------------------- BALANCE -------
function Balance({ config, answerKey, revealed }) {
  const { left, right } = config;
  const { tip, momentLeft, momentRight } = answerKey;
  const pivotX = 170, pivotY = 150, beamY = 104;
  const maxD = Math.max(left.distance, right.distance);
  const scale = 96 / maxD;
  const xL = pivotX - left.distance * scale;
  const xR = pivotX + right.distance * scale;
  const boxL = clamp(left.weight / 4, 16, 40);
  const boxR = clamp(right.weight / 4, 16, 40);
  const angle = !revealed || tip === 'balanced' ? 0 : (tip === 'left' ? -8 : 8);
  return (
    <svg viewBox="0 0 340 210" width="100%" role="img" aria-label="Load balance on a pivot">
      <Defs />
      {/* pivot */}
      <path d={`M ${pivotX} ${pivotY - 8} L ${pivotX - 20} ${pivotY + 24} L ${pivotX + 20} ${pivotY + 24} Z`} fill={C.structure} />
      <line x1={pivotX - 40} y1={pivotY + 24} x2={pivotX + 40} y2={pivotY + 24} stroke={C.structure} strokeWidth={3} />
      <g transform={`rotate(${angle} ${pivotX} ${beamY})`}>
        <rect x={pivotX - 116} y={beamY - 5} width={232} height={10} rx={3} fill="#f1f5f9" stroke={C.structure} strokeWidth={2} />
        {/* left weight */}
        <rect x={xL - boxL / 2} y={beamY - 5 - boxL} width={boxL} height={boxL} rx={3} fill="#fff7ed" stroke={C.load} strokeWidth={2} />
        <Label x={xL} y={beamY - 10 - boxL} color={C.load} size={11} weight={700}>{left.weight}lb</Label>
        {/* right weight */}
        <rect x={xR - boxR / 2} y={beamY - 5 - boxR} width={boxR} height={boxR} rx={3} fill="#fff7ed" stroke={C.load} strokeWidth={2} />
        <Label x={xR} y={beamY - 10 - boxR} color={C.load} size={11} weight={700}>{right.weight}lb</Label>
        {revealed && <Label x={xL} y={beamY + 20} color={C.reveal} size={11}>{momentLeft}</Label>}
        {revealed && <Label x={xR} y={beamY + 20} color={C.reveal} size={11}>{momentRight}</Label>}
      </g>
      <Label x={xL} y={pivotY + 44} color={C.muted} size={11}>{left.distance} left</Label>
      <Label x={xR} y={pivotY + 44} color={C.muted} size={11}>{right.distance} right</Label>
      {revealed && <Label x={pivotX} y={196} color={C.reveal} size={12} weight={700}>{tip === 'balanced' ? 'balanced' : `tips ${tip}`}</Label>}
    </svg>
  );
}

const RENDERERS = { pulley: Pulley, lever: Lever, gear: Gears, belt: Belt, hydraulic: Hydraulic, balance: Balance };

// Public component. `visual` is q.visual; `revealed` gates the teaching cues.
export default function MechanicalDiagram({ visual, revealed = false }) {
  if (!visual || !RENDERERS[visual.type]) return null;
  const Renderer = RENDERERS[visual.type];
  return (
    <figure className="my-5 rounded-2xl bg-white ring-1 ring-neutral-200 p-4 sm:p-5">
      <Renderer config={visual.config} answerKey={visual.answerKey} revealed={revealed} />
      {revealed && visual.reveal?.caption && (
        <figcaption className="mt-3 pt-3 border-t border-neutral-100 text-sm text-neutral-700 leading-snug">
          <span className="font-semibold text-orange-600">Why: </span>{visual.reveal.caption}
        </figcaption>
      )}
      {!revealed && (
        <figcaption className="mt-2 text-center text-xs text-neutral-400">
          Predict your answer, then reveal to see how it works.
        </figcaption>
      )}
    </figure>
  );
}
