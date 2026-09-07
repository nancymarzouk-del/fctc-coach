// uale-handoff.test.mjs — the UALE → FCTC launch handoff parsing + multi-user keying.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseUaleHandoff, UALE_PROFILE_PREFIX } from '../lib/ualeHandoff.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

test('a UALE launch yields a learner-specific profile id (skips the name screen)', () => {
  const h = parseUaleHandoff('?src=uale&lid=abc123def456&name=Alex');
  assert.ok(h);
  assert.equal(h.profileId, UALE_PROFILE_PREFIX + 'abc123def456');
  assert.equal(h.displayName, 'Alex');
});

test('direct standalone visitors get no handoff (normal profile-name screen)', () => {
  assert.equal(parseUaleHandoff(''), null);
  assert.equal(parseUaleHandoff('?foo=bar'), null);
  assert.equal(parseUaleHandoff('?src=uale'), null);           // src but no key → normal flow
  assert.equal(parseUaleHandoff('?src=other&lid=abc123def'), null);
});

test('different UALE learners never share one local profile', () => {
  const a = parseUaleHandoff('?src=uale&lid=aaaa1111bbbb');
  const b = parseUaleHandoff('?src=uale&lid=cccc2222dddd');
  assert.notEqual(a.profileId, b.profileId);
  assert.ok(a.profileId.startsWith(UALE_PROFILE_PREFIX) && b.profileId.startsWith(UALE_PROFILE_PREFIX));
});

test('a crafted/junk key is rejected (no weird value becomes a profile id)', () => {
  assert.equal(parseUaleHandoff('?src=uale&lid=' + encodeURIComponent('../../evil')), null);
  assert.equal(parseUaleHandoff('?src=uale&lid=' + encodeURIComponent('a b c')), null);
  assert.equal(parseUaleHandoff('?src=uale&lid=xx'), null);     // too short
  assert.equal(parseUaleHandoff('?src=uale&lid=' + encodeURIComponent('nancy@x.com')), null);
});

test('display name is length-capped', () => {
  const h = parseUaleHandoff('?src=uale&lid=abcdef123456&name=' + encodeURIComponent('x'.repeat(200)));
  assert.ok(h.displayName.length <= 60);
});

// The app boots the UALE handoff (skips login) but keeps the standalone name screen.
test('app wires the handoff on boot and preserves the standalone flow', () => {
  const page = readFileSync(resolve(ROOT, 'app/page.js'), 'utf8');
  assert.match(page, /parseUaleHandoff\(window\.location\.search\)/);
  assert.match(page, /enterAsUale\(/);
  assert.match(page, /replaceState/);                         // strips the key from the URL
  assert.match(page, /setUsers\(storage\.listUsers\(\)\)/);   // direct visitors still get the profile list/screen
  assert.match(page, /Enter a profile name to begin/);        // standalone name screen retained
});
