// Tuneliza PUT/DELETE/PATCH sobre POST para llamadas mismo-origen a /api/*,
// porque un WAF delante puede bloquear esos métodos. El backend restaura el
// método real vía X-HTTP-Method-Override antes de enrutar, de modo que
// requireAuth y los checks de propiedad siguen aplicando normalmente.
// Solo afecta a llamadas de nuestra propia API (/api/*).
const orig = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const m = init?.method?.toUpperCase();
  const url =
    typeof input === 'string' ? input
    : input instanceof URL ? input.pathname + input.search
    : (input as Request).url;
  if (
    m && /^(PUT|DELETE|PATCH)$/.test(m) &&
    (url.startsWith('/api/') || /\/api\//.test(url))
  ) {
    const headers = new Headers(init?.headers as HeadersInit);
    headers.set('X-HTTP-Method-Override', m);
    init = { ...init, method: 'POST', headers };
  }
  return orig(input as RequestInfo, init);
};
