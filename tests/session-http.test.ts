import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clearSessionCookie, createSessionCookie, readSessionCookie, sameOrigin, validCsrf } from '../server/session-http.ts';

test('session cookie hides its value from JavaScript and is secure behind HTTPS', () => {
  const cookie = createSessionCookie('secret-token', true);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Max-Age=604800/);
  assert.equal(readSessionCookie(`other=1; pywi_session=secret-token`), 'secret-token');
  assert.match(clearSessionCookie(true), /Max-Age=0/);
});

test('cross-origin requests and missing CSRF token are rejected', () => {
  assert.equal(sameOrigin('https://evil.example', 'https://pywi.example'), false);
  assert.equal(sameOrigin('https://pywi.example', 'https://pywi.example'), true);
  assert.equal(validCsrf(undefined, 'expected'), false);
  assert.equal(validCsrf('expected', 'expected'), true);
  assert.equal(validCsrf('different', 'expected'), false);
});
