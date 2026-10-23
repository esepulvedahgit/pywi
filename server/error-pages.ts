const messages: Record<number, { es: [string, string]; en: [string, string] }> = {
  400: { es: ['Solicitud inválida', 'Revisa la dirección o los datos e inténtalo de nuevo.'], en: ['Bad request', 'Check the address or the information and try again.'] },
  413: { es: ['Archivo demasiado grande', 'Reduce el tamaño e inténtalo de nuevo.'], en: ['File too large', 'Reduce its size and try again.'] },
  401: { es: ['Inicia sesión', 'Tu sesión no está disponible. Inicia sesión para continuar.'], en: ['Sign in', 'Your session is unavailable. Sign in to continue.'] },
  403: { es: ['Acceso denegado', 'No tienes permisos para ver esta página.'], en: ['Access denied', 'You do not have permission to view this page.'] },
  404: { es: ['Página no encontrada', 'La dirección solicitada no existe.'], en: ['Page not found', 'The requested address does not exist.'] },
  429: { es: ['Demasiadas solicitudes', 'Espera un momento e inténtalo de nuevo.'], en: ['Too many requests', 'Wait a moment and try again.'] },
  500: { es: ['Error del servidor', 'No pudimos completar la solicitud. Inténtalo de nuevo.'], en: ['Server error', 'We could not complete the request. Please try again.'] },
  503: { es: ['Servicio no disponible', 'Vuelve a intentarlo en unos minutos.'], en: ['Service unavailable', 'Try again in a few minutes.'] },
};

export function errorMessage(status: number, acceptLanguage = 'es'): string {
  const language = /^en\b/i.test(acceptLanguage) ? 'en' : 'es';
  if (status === 404) return language === 'en' ? 'Route not found' : 'Ruta no encontrada';
  if (status === 500) return language === 'en' ? 'Internal server error' : 'Error interno del servidor';
  return (messages[status] ?? messages[400])[language][0];
}

export function authErrorMessage(code: 'SESSION_LOCKED' | 'AUTH_REQUIRED' | 'ORIGIN_DENIED' | 'CSRF_INVALID', acceptLanguage = 'es'): string {
  const english = /^en\b/i.test(acceptLanguage);
  const labels = {
    SESSION_LOCKED: english ? 'Session locked' : 'Sesión bloqueada',
    AUTH_REQUIRED: english ? 'Sign in again' : 'Inicia sesión de nuevo',
    ORIGIN_DENIED: english ? 'Origin not allowed' : 'Origen no permitido',
    CSRF_INVALID: english ? 'Unauthorized request' : 'Solicitud no autorizada',
  };
  return labels[code];
}

export function errorPage(status: number, acceptLanguage = 'es'): string {
  const language = /^en\b/i.test(acceptLanguage) ? 'en' : 'es';
  const [title, description] = (messages[status] ?? messages[500])[language];
  const home = language === 'en' ? 'Return home' : 'Volver al inicio';
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${status} · ${title} · PyWI</title><style>body{font-family:system-ui,sans-serif;background:#0b1020;color:#f8fafc;min-height:100vh;display:grid;place-items:center;margin:0}main{max-width:28rem;padding:2rem;text-align:center}strong{font-size:4rem;color:#a5b4fc}h1{font-size:1.6rem}p{color:#cbd5e1;line-height:1.5}a{display:inline-block;margin-top:1rem;padding:.8rem 1.2rem;border-radius:.6rem;background:#4f46e5;color:white;text-decoration:none}</style></head><body><main><strong>${status}</strong><h1>${title}</h1><p>${description}</p><a href="/">${home}</a></main></body></html>`;
}
