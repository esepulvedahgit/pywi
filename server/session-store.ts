import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ABSOLUTE_LIFETIME_MS = 7 * 24 * 60 * 60_000;
const IDLE_LIFETIME_MS = 10 * 60_000;

export interface StoredSession {
  tokenHash: string;
  userId: string;
  authVersion: number;
  csrfToken: string;
  createdAt: number;
  expiresAt: number;
  lastActivityAt: number;
  lockedAt?: number;
  revokedAt?: number;
}

export type SessionResult =
  | { kind: 'ok' | 'locked'; session: StoredSession }
  | { kind: 'invalid' };

export class SessionStore {
  constructor(private readonly file: string, private readonly now: () => number = Date.now) {}

  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private read(): StoredSession[] {
    if (!fs.existsSync(this.file)) return [];
    const value: unknown = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    if (!Array.isArray(value)) throw new Error('Invalid session store');
    return value as StoredSession[];
  }

  private write(sessions: StoredSession[]): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const temp = `${this.file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    try {
      fs.writeFileSync(temp, JSON.stringify(sessions), { mode: 0o600 });
      fs.renameSync(temp, this.file);
    } finally {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    }
  }

  issue(userId: string, authVersion: number): { token: string; csrfToken: string } {
    const token = crypto.randomBytes(32).toString('base64url');
    const csrfToken = crypto.randomBytes(32).toString('base64url');
    const now = this.now();
    const sessions = this.read().filter(session => session.expiresAt > now);
    sessions.push({
      tokenHash: this.hash(token), userId, authVersion, csrfToken,
      createdAt: now, expiresAt: now + ABSOLUTE_LIFETIME_MS, lastActivityAt: now,
    });
    this.write(sessions);
    return { token, csrfToken };
  }

  get(token: string): StoredSession | null {
    return this.read().find(item => item.tokenHash === this.hash(token)) ?? null;
  }

  authenticate(token: string, currentAuthVersion: number): SessionResult {
    const sessions = this.read();
    const session = sessions.find(item => item.tokenHash === this.hash(token));
    const now = this.now();
    if (!session || session.revokedAt != null || session.expiresAt <= now || session.authVersion !== currentAuthVersion) {
      return { kind: 'invalid' };
    }
    if (session.lockedAt == null && now - session.lastActivityAt >= IDLE_LIFETIME_MS) {
      session.lockedAt = now;
      this.write(sessions);
    }
    return session.lockedAt != null ? { kind: 'locked', session } : { kind: 'ok', session };
  }

  activity(token: string, currentAuthVersion: number): boolean {
    if (this.authenticate(token, currentAuthVersion).kind !== 'ok') return false;
    const sessions = this.read();
    const session = sessions.find(item => item.tokenHash === this.hash(token));
    if (!session) return false;
    session.lastActivityAt = this.now();
    this.write(sessions);
    return true;
  }

  lock(token: string): boolean {
    return this.update(token, session => { session.lockedAt = this.now(); });
  }

  revoke(token: string): boolean {
    return this.update(token, session => { session.revokedAt = this.now(); });
  }

  private update(token: string, mutate: (session: StoredSession) => void): boolean {
    const sessions = this.read();
    const session = sessions.find(item => item.tokenHash === this.hash(token));
    if (!session) return false;
    mutate(session);
    this.write(sessions);
    return true;
  }
}
