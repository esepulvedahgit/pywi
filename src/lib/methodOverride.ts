// Tuneliza PUT/DELETE/PATCH sobre POST para llamadas mismo-origen a /api/*,
// porque un WAF delante puede bloquear esos métodos. El backend restaura el
// método real vía X-HTTP-Method-Override antes de enrutar, de modo que
// requireAuth y los checks de propiedad siguen aplicando normalmente.
// Solo afecta a llamadas de nuestra propia API (/api/*).
import { getCsrfToken } from './sessionClient';

const orig = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const sessionAtStart = getCsrfToken();
  const m = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const url =
    typeof input === 'string' ? input
    : input instanceof URL ? input.href
    : (input as Request).url;
  const apiUrl = new URL(url, window.location.origin);
  if (apiUrl.origin === window.location.origin && apiUrl.pathname.startsWith('/api/') && !/^(GET|HEAD|OPTIONS)$/.test(m)) {
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (getCsrfToken()) headers.set('X-CSRF-Token', getCsrfToken());
    if (/^(PUT|DELETE|PATCH)$/.test(m)) {
      headers.set('X-HTTP-Method-Override', m);
      init = { ...init, method: 'POST', headers };
    } else {
      init = { ...init, headers };
    }
  }
  return orig(input as RequestInfo, init).then(async response => {
    if (response.ok && getCsrfToken() === sessionAtStart && /\/api\/users\/[^/]+\/password$/.test(apiUrl.pathname) && m === 'PUT') {
      window.dispatchEvent(new CustomEvent('pywi:session-failure', { detail: { code: 'AUTH_REQUIRED' } }));
    }
    if (response.status === 401 && getCsrfToken() === sessionAtStart && apiUrl.origin === window.location.origin &&
        apiUrl.pathname.startsWith('/api/') && !apiUrl.pathname.startsWith('/api/auth/login') &&
        !apiUrl.pathname.startsWith('/api/auth/session')) {
      const body = await response.clone().json().catch(() => ({}));
      if (body.code === 'SESSION_LOCKED' || body.code === 'AUTH_REQUIRED') {
        window.dispatchEvent(new CustomEvent('pywi:session-failure', { detail: { code: body.code } }));
      }
    }
    return response;
  });
};
