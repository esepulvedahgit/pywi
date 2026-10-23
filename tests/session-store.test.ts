import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SessionStore } from '../server/session-store.ts';

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pywi-session-'));
  let now = 1_800_000_000_000;
  const file = path.join(dir, 'sessions.json');
  return {
    store: new SessionStore(file, () => now),
    file,
    advance(ms: number) { now += ms; },
    cleanup() { fs.rmSync(dir, { recursive: true, force: true }); },
  };
}

test('revoking one device leaves a second device active', () => {
  const f = fixture();
  try {
    const first = f.store.issue('user-1', 0);
    const second = f.store.issue('user-1', 0);
    assert.equal(f.store.revoke(first.token), true);
    assert.equal(f.store.authenticate(first.token, 0).kind, 'invalid');
    assert.equal(f.store.authenticate(second.token, 0).kind, 'ok');
    assert.equal(new SessionStore(f.file, () => 1_800_000_000_000).authenticate(second.token, 0).kind, 'ok');
  } finally { f.cleanup(); }
});

test('background requests do not extend the ten-minute idle deadline', () => {
  const f = fixture();
  try {
    const { token } = f.store.issue('user-1', 0);
    f.advance(9 * 60_000);
    assert.equal(f.store.authenticate(token, 0).kind, 'ok');
    f.advance(60_001);
    assert.equal(f.store.authenticate(token, 0).kind, 'locked');
  } finally { f.cleanup(); }
});

test('user activity extends idle time but never the seven-day absolute deadline', () => {
  const f = fixture();
  try {
    const { token } = f.store.issue('user-1', 0);
    f.advance(9 * 60_000);
    assert.equal(f.store.activity(token, 0), true);
    f.advance(9 * 60_000);
    assert.equal(f.store.authenticate(token, 0).kind, 'ok');
    f.advance(7 * 24 * 60 * 60_000);
    assert.equal(f.store.authenticate(token, 0).kind, 'invalid');
  } finally { f.cleanup(); }
});

test('password version change invalidates every device', () => {
  const f = fixture();
  try {
    const first = f.store.issue('user-1', 0);
    const second = f.store.issue('user-1', 0);
    assert.equal(f.store.authenticate(first.token, 1).kind, 'invalid');
    assert.equal(f.store.authenticate(second.token, 1).kind, 'invalid');
  } finally { f.cleanup(); }
});

test('store lookup identifies a session without persisting its bearer token', () => {
  const f = fixture();
  try {
    const { token } = f.store.issue('user-1', 0);
    assert.equal(f.store.get(token)?.userId, 'user-1');
    assert.equal(fs.readFileSync(f.file, 'utf8').includes(token), false);
    if (process.platform !== 'win32') assert.equal(fs.statSync(f.file).mode & 0o777, 0o600);
  } finally { f.cleanup(); }
});
