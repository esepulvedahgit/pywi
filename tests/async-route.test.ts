import assert from 'node:assert/strict';
import test from 'node:test';
import { asyncRoute } from '../server/async-route';

test('forwards a rejected async request to the Express error handler', async () => {
  const failure = new Error('malformed request');
  const result = await new Promise<unknown>((resolve) => {
    const handler = asyncRoute(async () => { throw failure; });
    handler({} as never, {} as never, resolve as never);
  });
  assert.equal(result, failure);
});
