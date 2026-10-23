import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { LoginBackoff } from '../server/login-backoff';

test('progressive account delay persists and clears after success', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pywi-backoff-'));
  let now = 1_000_000;
  try {
    const file = path.join(dir, 'backoff.json');
    const backoff = new LoginBackoff(file, () => now);
    for (let i = 0; i < 4; i++) backoff.failure('User@Example.com');
    assert.equal(backoff.retryAfter('user@example.com'), 0);
    backoff.failure('user@example.com');
    assert.equal(new LoginBackoff(file, () => now).retryAfter('USER@example.com'), 30);
    if (process.platform !== 'win32') assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    now += 30_000;
    backoff.failure('user@example.com');
    assert.equal(backoff.retryAfter('user@example.com'), 60);
    backoff.success('user@example.com');
    assert.equal(backoff.retryAfter('user@example.com'), 0);
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /user@example.com/i);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('failure window resets after fifteen minutes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pywi-backoff-'));
  let now = 1_000_000;
  try {
    const backoff = new LoginBackoff(path.join(dir, 'backoff.json'), () => now);
    for (let i = 0; i < 5; i++) backoff.failure('u@example.com');
    now += 15 * 60_000 + 1;
    assert.equal(backoff.retryAfter('u@example.com'), 0);
    backoff.failure('u@example.com');
    assert.equal(backoff.retryAfter('u@example.com'), 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('expired account entries are pruned on the next failure', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pywi-backoff-'));
  let now = 1_000_000;
  try {
    const file = path.join(dir, 'backoff.json');
    const backoff = new LoginBackoff(file, () => now);
    backoff.failure('old@example.com');
    now += 15 * 60_000 + 1;
    backoff.failure('new@example.com');
    assert.equal(Object.keys(JSON.parse(fs.readFileSync(file, 'utf8'))).length, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
