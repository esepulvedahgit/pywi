import net from 'node:net';

export function clientIp(socketIp: string, forwardedFor: string | string[] | undefined, trustedCsv: string): string {
  const normalize = (ip: string) => ip.replace(/^::ffff:/, '');
  const trusted = new Set(trustedCsv.split(',').map(ip => normalize(ip.trim())).filter(Boolean));
  if (trusted.has(normalize(socketIp))) {
    const value = typeof forwardedFor === 'string' ? forwardedFor : Array.isArray(forwardedFor) ? forwardedFor.join(',') : '';
    const chain = value.split(',').map(ip => ip.trim()).filter(Boolean);
    if (chain.length && chain.every(ip => net.isIP(ip))) {
      for (let i = chain.length - 1; i >= 0; i--) {
        if (!trusted.has(normalize(chain[i]))) return chain[i];
      }
    }
  }
  return socketIp || 'unknown';
}
