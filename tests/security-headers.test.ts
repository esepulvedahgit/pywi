import assert from 'node:assert/strict';
import test from 'node:test';
import { securityHeaders } from '../server/security-headers';

test('HTTPS responses prohibit framing and active mixed content', () => {
  const headers = securityHeaders(true);
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.match(headers['Content-Security-Policy'], /object-src 'none'/);
  assert.match(headers['Content-Security-Policy'], /upgrade-insecure-requests/);
  assert.match(headers['Strict-Transport-Security'], /max-age=31536000/);
  assert.equal(headers['Referrer-Policy'], 'no-referrer');
});

test('local HTTP does not advertise HSTS', () => {
  assert.equal(securityHeaders(false)['Strict-Transport-Security'], undefined);
});

test('WebSocket connections are limited to the public origin', () => {
  const policy = securityHeaders(true, 'https://pywi.example.com')['Content-Security-Policy'];
  assert.match(policy, /connect-src 'self' wss:\/\/pywi\.example\.com/);
  assert.doesNotMatch(policy, /connect-src 'self' ws: wss:/);
});
