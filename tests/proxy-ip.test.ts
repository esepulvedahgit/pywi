import assert from 'node:assert/strict';
import test from 'node:test';
import { clientIp } from '../server/proxy-ip';

test('forged forwarding headers from untrusted private addresses are ignored', () => {
  assert.equal(clientIp('10.0.0.8', '203.0.113.7', ''), '10.0.0.8');
  assert.equal(clientIp('127.0.0.1', '203.0.113.7', ''), '127.0.0.1');
});

test('only an exact trusted proxy can supply a valid client address', () => {
  assert.equal(clientIp('::ffff:10.0.0.5', '203.0.113.7, 10.0.0.5', '10.0.0.5'), '203.0.113.7');
  assert.equal(clientIp('10.0.0.6', '203.0.113.7', '10.0.0.5'), '10.0.0.6');
  assert.equal(clientIp('10.0.0.5', 'bogus', '10.0.0.5'), '10.0.0.5');
  assert.equal(clientIp('10.0.0.5', '198.51.100.1, 203.0.113.7', '10.0.0.5'), '203.0.113.7');
});
