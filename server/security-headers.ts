export function securityHeaders(https: boolean, appUrl = 'http://localhost:3000'): Record<string, string> {
  const url = new URL(appUrl);
  const webSocketOrigin = `${https ? 'wss' : 'ws'}://${url.host}`;
  const headers: Record<string, string> = {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      `connect-src 'self' ${webSocketOrigin}`,
      "worker-src 'self' blob:",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      ...(https ? ['upgrade-insecure-requests'] : []),
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
  if (https) headers['Strict-Transport-Security'] = 'max-age=31536000';
  return headers;
}
