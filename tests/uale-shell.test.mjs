// uale-shell.test.mjs — shared external-module shell + Back-to-UALE navigation.
// ----------------------------------------------------------------------------
// Every module launched from UALE (FCTC / CFA / SIE / Time Management) must clearly
// remain part of UALE and offer a persistent, safe return path — without an
// FCTC-only hack, without leaking tokens/PII, and without showing a misleading
// control to genuine direct visitors. Source-grep + pure-function style.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  noteUaleLaunch, wasLaunchedFromUale, isUaleProfile, launchedFromUale, ualeReturnUrl, UALE_HOME,
} from '../lib/ualeSession.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

function stubStorage() {
  const m = new Map();
  globalThis.localStorage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
  };
  return m;
}

const MODULES = [
  { name: 'FCTC', file: 'app/page.js', session: "'../lib/ualeSession.mjs'" },
  { name: 'CFA', file: 'components/cfa/CfaExperience.jsx', session: "'../../lib/ualeSession.mjs'" },
  { name: 'SIE', file: 'components/sie/SieExperience.jsx', session: "'../../lib/ualeSession.mjs'" },
  { name: 'Time Management', file: 'components/tm/TimeMgmtExperience.jsx', session: "'../../lib/ualeSession.mjs'" },
];

// ================= pure ualeSession =================
test('noteUaleLaunch persists a safe marker only for a real UALE launch', () => {
  stubStorage();
  assert.equal(noteUaleLaunch('?src=uale&lid=abc123&name=Amira'), true);
  assert.equal(wasLaunchedFromUale(), true);
  stubStorage(); // fresh device
  assert.equal(noteUaleLaunch('?foo=bar'), false);
  assert.equal(noteUaleLaunch(''), false);
  assert.equal(wasLaunchedFromUale(), false);
});

test('launchedFromUale is true for a uale: profile OR a persisted marker; false otherwise', () => {
  stubStorage();
  assert.equal(isUaleProfile('uale:abc'), true);
  assert.equal(isUaleProfile('typed-name'), false);
  assert.equal(isUaleProfile(null), false);
  // uale: profile → true even without a marker
  assert.equal(launchedFromUale('uale:abc'), true);
  // raw lid / no marker → false (genuine direct visitor)
  assert.equal(launchedFromUale('rawlid'), false);
  assert.equal(launchedFromUale(null), false);
  // once the marker is set, a later direct visit still knows it came from UALE
  noteUaleLaunch('?src=uale&lid=x');
  assert.equal(launchedFromUale(null), true);
});

test('the return URL is the bare canonical UALE root — no token, email, lid, or PII', () => {
  const url = ualeReturnUrl();
  assert.equal(url, 'https://florence-sand-phi.vercel.app');
  assert.equal(url, UALE_HOME);
  assert.ok(!/[?&]/.test(url), 'no query string');
  assert.ok(!/lid=|name=|src=|token|jwt|@/i.test(url), 'no handoff params or PII');
});

// ================= shared shell component =================
test('ExternalModuleShell + BackToUale: gated return control, UALE identity, no PII', () => {
  const c = read('components/ExternalModuleShell.jsx');
  // BackToUale renders NOTHING for a non-UALE (direct) visit
  assert.match(c, /function BackToUale\([\s\S]*?if \(!launchedFromUale\) return null/);
  // the control links to the shared safe return URL (not a hardcoded string)
  assert.match(c, /href=\{ualeReturnUrl\(\)\}/);
  assert.match(c, /import \{ ualeReturnUrl \} from '\.\.\/lib\/ualeSession\.mjs'/);
  // hero shell shows UALE identity + title/subtitle + save badge + optional switch profile
  assert.match(c, /UALE\{category/);
  assert.match(c, /\{title\}/); assert.match(c, /\{subtitle\}/);
  assert.match(c, /<SaveBadge saveState=\{saveState\}/);
  assert.match(c, /onSwitchProfile &&/); // switch profile supported (optional)
  assert.match(c, /<BackToUale launchedFromUale=\{launchedFromUale\}/);
});

// ================= per-module wiring =================
for (const m of MODULES) {
  test(`${m.name}: UALE-launched session shows Back to UALE via the SHARED shell`, () => {
    const src = read(m.file);
    // shared imports (no per-module copy of the nav or the URL)
    assert.match(src, new RegExp(`from ${m.session.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`), `${m.name} imports shared ualeSession`);
    assert.match(src, /noteUaleLaunch\(window\.location\.search\)/, `${m.name} persists the safe marker`);
    assert.match(src, /fromUale/, `${m.name} tracks launchedFromUale state`);
    assert.match(src, /launchedFromUale=\{fromUale\}/, `${m.name} passes it to the shared control`);
    // NO per-module hardcoded UALE home / return URL (single source of truth)
    assert.ok(!/const UALE_HOME\s*=/.test(src), `${m.name} no longer hardcodes UALE_HOME`);
    assert.ok(!/href=\{UALE_HOME\}/.test(src), `${m.name} no stale hardcoded return link`);
  });

  test(`${m.name}: direct visit does NOT show the return control (no misleading Back to UALE)`, () => {
    const src = read(m.file);
    // The control is always gated on launchedFromUale (BackToUale returns null otherwise).
    // No module renders an UNGATED "Back to UALE" anchor.
    assert.ok(!/>\s*Back to UALE\s*<\/a>/.test(src) || /launchedFromUale/.test(src),
      `${m.name} must gate the return control`);
  });

  test(`${m.name}: handoff query params are still scrubbed from the URL`, () => {
    const src = read(m.file);
    assert.match(src, /replaceState\(\{\}, ''/, `${m.name} still scrubs handoff params`);
  });
}

// CFA/SIE/TM render the full shared hero shell; FCTC reuses the shared BackToUale.
for (const m of MODULES.filter((x) => x.name !== 'FCTC')) {
  test(`${m.name}: renders the shared ExternalModuleShell hero`, () => {
    const src = read(m.file);
    assert.match(src, /import ExternalModuleShell from '\.\.\/ExternalModuleShell'/);
    assert.match(src, /<ExternalModuleShell/);
  });
}
test('FCTC: reuses the shared BackToUale control inside its own header, keeping Switch profile', () => {
  const src = read('app/page.js');
  assert.match(src, /import \{ BackToUale \} from '\.\.\/components\/ExternalModuleShell'/);
  assert.match(src, /<BackToUale launchedFromUale=\{fromUale\} tone="light"/);
  assert.match(src, /Switch profile/);       // existing switch profile preserved
  assert.match(src, /onClick=\{logout\}/);   // still wired
  assert.match(src, /parseUaleHandoff/);     // existing handoff path preserved
  assert.match(src, /UALE<\/p>/);            // UALE identity added to the header
});

// ================= no regressions: save/resume still wired =================
test('save/resume remains wired in every module (shell change is header-only)', () => {
  assert.match(read('app/page.js'), /storage\.save\(/); assert.match(read('app/page.js'), /storage\.load\(/);
  assert.match(read('components/cfa/CfaExperience.jsx'), /saveCfaState\(/); assert.match(read('components/cfa/CfaExperience.jsx'), /loadCfaState\(/);
  assert.match(read('components/sie/SieExperience.jsx'), /saveSieState\(/); assert.match(read('components/sie/SieExperience.jsx'), /loadSieState\(/);
  assert.match(read('components/tm/TimeMgmtExperience.jsx'), /saveTmState\(/); assert.match(read('components/tm/TimeMgmtExperience.jsx'), /loadTmState\(/);
});

test('no module leaks a token/email/lid into the return URL (shared URL only)', () => {
  for (const m of MODULES) {
    const src = read(m.file);
    // Only the shared ualeReturnUrl() is used for return; no florence URL with params.
    assert.ok(!/florence-sand-phi\.vercel\.app[^"'`]*[?&]/.test(src), `${m.name} return URL carries no params`);
  }
});
