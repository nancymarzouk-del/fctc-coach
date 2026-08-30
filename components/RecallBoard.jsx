// ============================================================================
// RecallBoard.jsx — renders a visual-recall operational board from the board
// data object (lib/recallScenario.js). Shared by the timed study screen and the
// answer reveal (so the learner can see the scene again and locate the detail
// they missed). `compact` shrinks it for the reveal; `highlight` (a predicate on
// a row/field) draws attention to the correct detail where practical.
// ============================================================================
import React from 'react';
import { ClipboardList, Truck, Wrench, Heart, AlertTriangle } from 'lucide-react';

const colorHex = (c) => (c === 'lime-green' ? '#84cc16' : c === 'white' ? '#e5e5e5' : c);

export default function RecallBoard({ board: b, compact = false, animate = true }) {
  if (!b) return null;
  const enterStyle = (i) => (animate && !compact
    ? { animation: 'recIn 0.45s cubic-bezier(.2,.8,.2,1) both', animationDelay: i * 0.07 + 's' }
    : undefined);
  const pad = compact ? 'p-3' : 'p-5';

  const Header = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-300 grid place-items-center">
          <ClipboardList className="w-4 h-4" />
        </span>
        <div>
          <p className="font-semibold text-neutral-100 leading-tight">{b.title}</p>
          <p className="text-[11px] text-neutral-500">{b.header && Object.values(b.header).join(' · ')}</p>
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-neutral-500 ring-1 ring-neutral-700 rounded px-2 py-0.5">
        {b.detailCount} details · D{b.difficulty}
      </span>
    </div>
  );

  const renderRows = (rows, render) => (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} style={enterStyle(i)} className="rounded-lg bg-neutral-800/70 ring-1 ring-neutral-700 px-3 py-2.5">
          {render(r, i)}
        </div>
      ))}
    </div>
  );

  let body = null;
  if (b.kind === 'command') {
    body = (
      <>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[['Incident', b.header.incident], ['Address', b.header.address], ['Command', b.header.command]].map(([k, v], i) => (
            <div key={i} style={enterStyle(i)} className="rounded-lg bg-neutral-800/70 ring-1 ring-neutral-700 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-neutral-500">{k}</p>
              <p className="text-sm font-medium text-neutral-100">{v}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1.5">Units (in arrival order)</p>
        {renderRows(b.rows, (r) => (
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-md bg-rose-600/20 text-rose-300 grid place-items-center text-xs font-bold">{r.arrival}</span>
            <Truck className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-100">{r.unit}</span>
            <span className="ml-auto text-xs text-neutral-400">{r.assignment}</span>
          </div>
        ))}
      </>
    );
  } else if (b.kind === 'roster') {
    body = (
      <>{renderRows(b.rows, (r) => (
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full ring-1 ring-neutral-600" style={{ background: colorHex(r.helmet) }} />
          <span className="text-sm font-semibold text-neutral-100 w-24">{r.name}</span>
          <span className="text-xs text-neutral-400 w-24">{r.rank}</span>
          <span className="ml-auto text-xs text-neutral-300">{r.assignment}</span>
        </div>
      ))}</>
    );
  } else if (b.kind === 'apparatus') {
    body = (
      <>{renderRows(b.rows, (r) => (
        <div className="flex items-center gap-3">
          <Truck className="w-5 h-5" style={{ color: colorHex(r.color) }} />
          <span className="text-sm font-semibold text-neutral-100 w-24">{r.unit}</span>
          <span className="text-xs text-neutral-500 w-16">{r.color}</span>
          <span className="text-xs text-neutral-400">{r.crew} crew</span>
          <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-200">{r.status}</span>
        </div>
      ))}</>
    );
  } else if (b.kind === 'dispatch') {
    body = (
      <div className="grid grid-cols-2 gap-2">
        {b.fields.map((f, i) => (
          <div key={i} style={enterStyle(i)} className="rounded-lg bg-neutral-800/70 ring-1 ring-neutral-700 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-neutral-500">{f.label}</p>
            <p className="text-sm font-medium text-neutral-100">{f.value}</p>
          </div>
        ))}
      </div>
    );
  } else if (b.kind === 'equipment') {
    body = (
      <>{renderRows(b.rows, (r) => (
        <div className="flex items-center gap-3">
          <Wrench className="w-4 h-4 text-neutral-400" />
          <span className="text-sm font-medium text-neutral-100">{r.tool}</span>
          <span className="ml-auto text-xs text-neutral-500">{r.compartment}</span>
          <span className="text-xs text-neutral-400 w-8 text-right">×{r.qty}</span>
        </div>
      ))}</>
    );
  } else if (b.kind === 'floorplan') {
    const d = b.diagram;
    body = (
      <>
        <p className="text-[10px] uppercase tracking-wide text-neutral-500 mb-2">{d.stories}-story · entry {d.entry}</p>
        <div className="grid grid-cols-2 gap-2">
          {d.rooms.map((room, i) => {
            const isVictim = room === d.victimRoom;
            return (
              <div key={i} style={enterStyle(i)}
                className={'rounded-lg px-3 py-3 ring-1 text-sm font-medium ' +
                  (isVictim ? 'bg-rose-600/20 ring-rose-500/50 text-rose-200' : 'bg-neutral-800/70 ring-neutral-700 text-neutral-200')}>
                <div className="flex items-center justify-between">
                  <span>{room}</span>
                  {isVictim && <Heart className="w-4 h-4 text-rose-400" />}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 ring-1 ring-amber-500/30 rounded-md px-2.5 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> {d.hazard} — {d.hazardSide} side
        </div>
      </>
    );
  }

  return (
    <div className={'rounded-2xl ring-1 ring-neutral-800 bg-neutral-900 ' + pad}>
      <Header />
      {body}
    </div>
  );
}
