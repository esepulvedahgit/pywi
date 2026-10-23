import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

interface Failure { count: number; firstAt: number; blockedUntil: number }

export class LoginBackoff {
  constructor(private readonly file: string, private readonly now: () => number = Date.now) {}

  private key(email: string): string {
    return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  }

  private read(): Record<string, Failure> {
    if (!fs.existsSync(this.file)) return {};
    const entries: unknown = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    if (!entries || Array.isArray(entries) || typeof entries !== 'object') throw new Error('Invalid login backoff store');
    return entries as Record<string, Failure>;
  }

  private write(entries: Record<string, Failure>): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const temp = `${this.file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    try {
      fs.writeFileSync(temp, JSON.stringify(entries), { mode: 0o600 });
      fs.renameSync(temp, this.file);
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  }

  retryAfter(email: string): number {
    const entry = this.read()[this.key(email)];
    if (!entry || this.now() - entry.firstAt > 15 * 60_000) return 0;
    return Math.max(0, Math.ceil((entry.blockedUntil - this.now()) / 1000));
  }

  failure(email: string): void {
    const entries = this.read();
    const key = this.key(email);
    const now = this.now();
    for (const [entryKey, entry] of Object.entries(entries)) {
      if (now - entry.firstAt > 15 * 60_000) delete entries[entryKey];
    }
    const previous = entries[key];
    const count = previous && now - previous.firstAt <= 15 * 60_000 ? previous.count + 1 : 1;
    const firstAt = count === 1 ? now : previous.firstAt;
    const delaySeconds = count >= 5 ? Math.min(900, 30 * 2 ** (count - 5)) : 0;
    entries[key] = { count, firstAt, blockedUntil: now + delaySeconds * 1000 };
    this.write(entries);
  }

  success(email: string): void {
    const entries = this.read();
    delete entries[this.key(email)];
    this.write(entries);
  }
}
