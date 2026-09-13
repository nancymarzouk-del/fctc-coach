'use client';

// SieExperience — FINRA SIE learner shell (Sprint 1 seam).
// ----------------------------------------------------------------------------
// The certification SHELL, not the content module: honest baseline states, the four
// official sections, save badge + Welcome-back/Continue, per-learner (UALE handoff)
// state with NO cross-learner merge, and a state-driven Alyce placeholder. ZERO fake
// data — a fresh learner sees "Not yet assessed" everywhere and no readiness %.
// Deep adaptive content (generators, teaching-on-miss, transfer-gated mastery,
// trend chips, mock) lands in Sprint 2 on top of this seam.
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, Lightbulb, Target } from 'lucide-react';
import { analyzeSkills, EVIDENCE } from '../../lib/metrics.mjs';
import { metricsRegistryFor } from '../../lib/certRegistry.mjs';
import { CERT_ID, CERT_NAME, TOPICS, TOPIC_ORDER, EXAM, SUBSKILL_BLUEPRINT, PRACTICE_LABEL } from '../../lib/certifications/sie/sieBlueprint.mjs';
import { loadSieState, saveSieState } from '../../lib/certifications/sie/sieStore.mjs';

// UALE is the authority for which modules a learner may access; "Back to UALE"
// returns to the Front Door (never a self-managed catalog).
const UALE_HOME = 'https://florence-sand-phi.vercel.app/';

export default function SieExperience() {
  const [state, setState] = useState(() => loadSieState(null));
  const [view, setView] = useState('home'); // home | section
  const [activeTopic, setActiveTopic] = useState(null);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const saveTimer = useRef(null);
  const learnerKeyRef = useRef(null); // per-learner storage key (UALE handoff lid) — no cross-learner merge

  // On mount: read the UALE handoff (lid + name), load THIS learner's state, then
  // strip the handoff from the URL so it isn't shared/bookmarked.
  useEffect(() => {
    let lid = null, nm = null;
    try {
      const p = new URLSearchParams(window.location.search);
      lid = p.get('lid'); nm = p.get('name');
      if (/[?&](src|lid|name)=/.test(window.location.search)) window.history.replaceState({}, '', window.location.pathname);
    } catch { /* SSR / no window */ }
    learnerKeyRef.current = lid || null;
    let s = loadSieState(learnerKeyRef.current);
    if (nm) s = { ...s, learnerName: nm.slice(0, 60) };
    setState(s);
    if (s.learnerName) saveSieState(s, learnerKeyRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist with a visible save-state flash (device-local, per-learner).
  function persist(next) {
    setState(next);
    setSaveState('saving');
    try {
      saveSieState(next, learnerKeyRef.current);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaveState('saved'), 450);
    } catch { setSaveState('error'); }
  }

  const registry = useMemo(() => metricsRegistryFor(CERT_ID), []);
  const analysis = useMemo(() => analyzeSkills(state.domains || {}, registry), [state.domains, registry]);

  // Section evidence state, aggregated from the shared metrics engine — honest and
  // evidence-gated. Fresh learner → every section "Not yet assessed" (no fake data).
  function sectionEvidence(topic) {
    const rows = analysis.filter((c) => c.domain === topic);
    const evaluated = rows.filter((r) => r.evidenceState === EVIDENCE.EVALUATED);
    const building = rows.filter((r) => r.evidenceState === EVIDENCE.INSUFFICIENT);
    if (!evaluated.length && !building.length) return { key: 'not-assessed', label: 'Not yet assessed', tone: 'stone' };
    if (!evaluated.length) return { key: 'building', label: 'Building evidence', tone: 'sand' };
    const m = evaluated.reduce((a, b) => a + (b.mastery || 0), 0) / evaluated.length;
    if (m >= 0.85) return { key: 'strong', label: 'Strong', tone: 'sage' };   // transfer-gated in Sprint 2
    if (m < 0.6) return { key: 'focus', label: 'Developing', tone: 'amber' };
    return { key: 'developing', label: 'Developing', tone: 'stone' };
  }

  const anyEvidence = (state.totalAnswered || 0) > 0;
  const greetName = state.learnerName ? `, ${state.learnerName}` : '';

  // Open a section (records last activity so Welcome-back/Continue work; no fake evidence).
  function openSection(topic) {
    setActiveTopic(topic);
    const next = { ...state, lastActivity: { kind: 'section', topic, label: TOPICS[topic].label } };
    persist(next);
    setView('section');
  }
  function continueLast() {
    const la = state.lastActivity;
    if (la && la.kind === 'section' && TOPICS[la.topic]) openSection(la.topic);
  }

  const SaveBadge = () => (
    <span className="inline-flex items-center gap-1.5 text-[12px]">
      {saveState === 'saving' && <span className="text-uale-faint">Saving…</span>}
      {saveState === 'error' && <span className="text-amber-700">Unable to save</span>}
      {(saveState === 'saved' || saveState === 'idle') && (
        <span className="inline-flex items-center gap-1 text-uale-faint"><CheckCircle2 className="w-3.5 h-3.5" /> Progress saved on this device</span>
      )}
    </span>
  );

  // ---- section detail (honest: structure now, guided practice in the next update) ----
  if (view === 'section' && activeTopic) {
    const t = TOPICS[activeTopic];
    const subs = SUBSKILL_BLUEPRINT[activeTopic] || {};
    const objectives = Object.entries(subs).filter(([k]) => !k.startsWith('_')).map(([, v]) => v.objective);
    return (
      <div className="min-h-screen bg-uale-ivory text-uale-ink">
        <Header onSave={<SaveBadge />} />
        <main className="mx-auto max-w-3xl px-5 py-6">
          <button onClick={() => setView('home')} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-uale-sec hover:text-uale-ink">
            <ArrowLeft className="w-4 h-4" /> All sections
          </button>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-uale-brass-2">Section · {t.pct}% · {t.items} scored items</p>
          <h1 className="mt-1 text-2xl font-semibold font-uale-serif text-uale-ink">{t.label}</h1>
          <div className="mt-5 rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
            <p className="text-[13px] font-semibold text-uale-ink">In this section you'll be able to:</p>
            <ul className="mt-3 space-y-2">
              {objectives.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-[13.5px] text-uale-text"><Target className="mt-0.5 h-4 w-4 shrink-0 text-uale-sage" /> {o}</li>
              ))}
            </ul>
          </div>
          <div className="mt-4 rounded-2xl border border-dashed border-uale-stone-300 bg-uale-stone-50 p-5 text-[13.5px] text-uale-sec">
            <p className="font-medium text-uale-ink">Guided adaptive practice for this section arrives in the next update.</p>
            <p className="mt-1">When it does, Alyce will teach each concept, give you different-style questions, diagnose misconceptions, and only mark a topic mastered once you can apply it across question types. Your progress here is saved on this device.</p>
          </div>
        </main>
      </div>
    );
  }

  // ---- home ----
  return (
    <div className="min-h-screen bg-uale-ivory text-uale-ink">
      <Header onSave={<SaveBadge />} />
      <main className="mx-auto max-w-3xl px-5 py-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-uale-brass-2">UALE · Professional Certification</p>
        <h1 className="mt-1 text-3xl font-semibold font-uale-serif text-uale-ink">{CERT_NAME}</h1>
        <p className="mt-1 text-[13.5px] text-uale-sec">{PRACTICE_LABEL} — {EXAM.scoredQuestions} scored questions ({EXAM.totalPresented} presented, {EXAM.pretestQuestions} unscored), {EXAM.minutes} minutes, four answer choices. Original practice; not actual FINRA exam questions.</p>

        {(state.learnerName || state.lastActivity) && (
          <section className="mt-5 rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
            <p className="text-[15px] font-semibold text-uale-ink">Welcome back{greetName} — pick up where you left off.</p>
            {state.lastActivity ? (
              <button onClick={continueLast} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-uale-ink px-3.5 py-2 text-[13px] font-semibold text-uale-cream hover:opacity-90">
                Continue {state.lastActivity.label} <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <p className="mt-1 text-[13px] text-uale-sec">Choose a section below to start building your SIE baseline.</p>
            )}
          </section>
        )}

        {/* Alyce recommendation — state-driven, never fabricated weakness. */}
        <section className="mt-5 rounded-2xl border border-uale-stone-200 bg-uale-card p-5">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-uale-brass-2"><Lightbulb className="h-4 w-4" /> Alyce recommends</p>
          {anyEvidence ? (
            <p className="mt-2 text-[13.5px] text-uale-text">Keep building evidence across the sections. Once there's enough, I'll point you to the exact topics that will move your readiness most.</p>
          ) : (
            <p className="mt-2 text-[13.5px] text-uale-text">Start building your SIE baseline. Answer questions across the four sections and I'll recommend what to work on once there's enough evidence — I won't guess before then.</p>
          )}
        </section>

        {/* The four official sections — evidence-aware, no fake readiness %. */}
        <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-uale-sec">The four SIE sections</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {TOPIC_ORDER.map((topic) => {
            const t = TOPICS[topic];
            const ev = sectionEvidence(topic);
            return (
              <button key={topic} onClick={() => openSection(topic)} className="text-left bg-uale-card border border-uale-stone-200 rounded-xl p-4 hover:border-uale-brass-lite transition">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-uale-ink">{t.label}</span>
                  <span className="shrink-0 text-[11px] text-uale-faint">{t.pct}% · {t.items}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-uale-stone-100 text-uale-sec">{ev.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-uale-faint">Your progress is saved on this device (no account needed for the beta). Signing in on another device starts fresh.</p>
        <p className="mt-2 text-xs text-uale-faint">{PRACTICE_LABEL}. "FINRA" and "SIE" are marks of FINRA; UALE practice is original and is not affiliated with or endorsed by FINRA.</p>
      </main>
    </div>
  );
}

function Header({ onSave }) {
  return (
    <header className="border-b border-uale-stone-200 bg-uale-card">
      <div className="mx-auto max-w-3xl px-5 py-3 flex items-center justify-between gap-3">
        <a href={UALE_HOME} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-uale-sec hover:text-uale-ink">
          <ArrowLeft className="w-4 h-4" /> Back to UALE
        </a>
        <span className="inline-flex items-center gap-2 text-uale-sec">
          <ClipboardCheck className="w-4 h-4 text-uale-brass-2" />
          {onSave}
        </span>
      </div>
    </header>
  );
}
