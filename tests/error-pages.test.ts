import assert from 'node:assert/strict';
import test from 'node:test';
import { authErrorMessage, errorMessage, errorPage } from '../server/error-pages';

test('404 and 500 pages are localized and contain a safe navigation path', () => {
  for (const code of [404, 500]) {
    const es = errorPage(code, 'es-CL');
    const en = errorPage(code, 'en-US');
    assert.match(es, new RegExp(`<title>${code}`));
    assert.match(en, new RegExp(`<title>${code}`));
    assert.match(es, /href="\/"/);
    assert.match(en, /href="\/"/);
    assert.notEqual(es, en);
    assert.doesNotMatch(es, /stack|trace|internal path/i);
  }
});

test('API fallback and authentication messages follow Accept-Language', () => {
  assert.equal(errorMessage(404, 'en-US'), 'Route not found');
  assert.equal(errorMessage(500, 'en-US'), 'Internal server error');
  assert.equal(errorMessage(404, 'es-CL'), 'Ruta no encontrada');
  assert.equal(authErrorMessage('SESSION_LOCKED', 'en-US'), 'Session locked');
});
