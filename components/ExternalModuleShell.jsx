'use client';

// ExternalModuleShell — ONE shared chrome for every UALE external module so that a
// module launched from UALE (FCTC / CFA / SIE / Time Management) clearly stays part
// of UALE and always offers a way back. No per-module copy-paste of navigation.
// ----------------------------------------------------------------------------
// Exports:
//   • ExternalModuleShell (default) — the full hero header used by /cfa /sie /time.
//   • BackToUale — the shared return control (also dropped into FCTC's own header,
//     whose light-paper layout differs). Renders NOTHING unless launchedFromUale,
//     so a genuine direct visitor never sees a misleading control.
//   • SaveBadge — the shared "Progress saved on this device" indicator.
// The return target comes from ualeSession (bare canonical root, no PII).
import React from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw, AlertTriangle, LogOut } from 'lucide-react';
import { ualeReturnUrl } from '../lib/ualeSession.mjs';

// Shared return control. Gated: only shown for UALE-launched sessions.
export function BackToUale({ launchedFromUale, tone = 'dark', label = 'Back to UALE' }) {
  if (!launchedFromUale) return null;
  const cls = tone === 'light'
    ? 'inline-flex items-center gap-1.5 text-[13px] font-semibold text-uale-sec hover:text-uale-ink-2'
    : 'inline-flex items-center gap-1.5 text-[13px] font-semibold text-uale-cream-dim hover:text-uale-cream';
  // A full navigation (not history.back) to the canonical UALE app; no token/PII.
  return (
    <a href={ualeReturnUrl()} className={cls} data-testid="back-to-uale">
      <ArrowLeft className="w-4 h-4" /> {label}
    </a>
  );
}

export function SaveBadge({ saveState, tone = 'dark' }) {
  const base = 'flex items-center gap-1.5 text-xs ';
  if (tone === 'light') {
    const color = saveState === 'error' ? 'text-rose-600' : saveState === 'saving' ? 'text-uale-faint' : 'text-uale-sec';
    return (
      <span className={base + color}>
        {saveState === 'saving' ? <><RotateCcw className="w-3.5 h-3.5 animate-spin" /> Saving…</>
          : saveState === 'error' ? <><AlertTriangle className="w-3.5 h-3.5" /> Unable to save</>
          : <><CheckCircle2 className="w-3.5 h-3.5 text-uale-sage" /> Progress saved on this device</>}
      </span>
    );
  }
  const color = saveState === 'error' ? 'text-rose-200' : 'text-uale-cream-dim';
  return (
    <span className={base + color}>
      {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Unable to save'
        : <><CheckCircle2 className="w-3.5 h-3.5" /> Progress saved on this device</>}
    </span>
  );
}

// The full hero header (bg-uale-hero-3) — used by /cfa /sie /time. Keeps each
// module's identity (UALE · <category> / <title> / <subtitle>) while making the
// UALE membership and the return path consistent.
export default function ExternalModuleShell({ category, title, subtitle, saveState, launchedFromUale, onSwitchProfile }) {
  return (
    <header className="bg-uale-hero-3 text-uale-cream">
      <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between gap-3">
        {/* Left: return control (empty, layout-stable, when not launched from UALE). */}
        <div className="min-w-0">
          <BackToUale launchedFromUale={launchedFromUale} />
        </div>
        <div className="flex items-center gap-4">
          <SaveBadge saveState={saveState} />
          {onSwitchProfile && (
            <button onClick={onSwitchProfile} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-uale-cream-dim hover:text-uale-cream">
              <LogOut className="w-3.5 h-3.5" /> Switch profile
            </button>
          )}
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 pb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-uale-champagne">UALE{category ? ` · ${category}` : ''}</p>
        <h1 className="mt-1 text-3xl font-semibold font-uale-serif">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-uale-cream-dim">{subtitle}</p>}
      </div>
    </header>
  );
}
