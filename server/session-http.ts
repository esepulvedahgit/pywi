import crypto from 'node:crypto';

const COOKIE_NAME = 'pywi_session';
const COOKIE_COMMON = 'Path=/; HttpOnly; SameSite=Lax';

export function createSessionCookie(token: string, secure: boolean): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; ${COOKIE_COMMON}; Max-Age=604800${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie(secure: boolean): string {
  return `${COOKIE_NAME}=; ${COOKIE_COMMON}; Max-Age=0${secure ? '; Secure' : ''}`;
}

export function readSessionCookie(header: string | undefined): string | null {
  if (!header) return null;
  const matches = header.split(';').map(part => part.trim()).filter(part => part.startsWith(`${COOKIE_NAME}=`));
  if (matches.length !== 1) return null;
  try { return decodeURIComponent(matches[0].slice(COOKIE_NAME.length + 1)); }
  catch { return null; }
}

export function sameOrigin(origin: string | undefined, appUrl: string): boolean {
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(appUrl).origin; }
  catch { return false; }
}

export function validCsrf(actual: string | undefined, expected: string): boolean {
  if (!actual) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
