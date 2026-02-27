import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import db from './db';

const SESSION_COOKIE_NAME = 'gd_session';
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 12);
const LOGIN_CHALLENGE_TTL_MINUTES = Number(process.env.LOGIN_CHALLENGE_TTL_MINUTES || 5);
const LOGIN_CHALLENGE_MAX_ATTEMPTS = Number(process.env.LOGIN_CHALLENGE_MAX_ATTEMPTS || 5);

type RoleName = 'admin' | 'courier' | 'customer';

export type AuthUser = {
  id: number;
  telegram_id: number | null;
  username: string | null;
  first_name: string | null;
  approved: boolean;
  role_id: number;
  role: { name: RoleName | string };
};

function toUtcIso(date: Date) {
  return date.toISOString();
}

function nowUtc() {
  return new Date();
}

function sessionExpiryDate() {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + SESSION_TTL_HOURS);
  return expiry;
}

function challengeExpiryDate() {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + LOGIN_CHALLENGE_TTL_MINUTES);
  return expiry;
}

function hashValue(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function parseCookies(req: NextApiRequest): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(';').reduce((acc: Record<string, string>, part: string) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rawValue.join('='));
    return acc;
  }, {});
}

function getSessionTokenFromReq(req: NextApiRequest) {
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE_NAME] || null;
}

function appendSetCookie(res: NextApiResponse, cookieValue: string) {
  const current = res.getHeader('Set-Cookie');
  if (!current) {
    res.setHeader('Set-Cookie', cookieValue);
    return;
  }

  if (Array.isArray(current)) {
    res.setHeader('Set-Cookie', [...current, cookieValue]);
    return;
  }

  res.setHeader('Set-Cookie', [String(current), cookieValue]);
}

function buildCookie(token: string, expiresAt: Date) {
  const secure = process.env.NODE_ENV === 'production';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}; ${secure ? 'Secure;' : ''}`;
}

function buildClearCookie() {
  const secure = process.env.NODE_ENV === 'production';
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT; ${secure ? 'Secure;' : ''}`;
}

function getHeaderString(value: string | string[] | undefined) {
  if (!value) return '';
  return Array.isArray(value) ? value[0] : value;
}

export function enforceSameOrigin(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return true;
  }

  const origin = getHeaderString(req.headers.origin);
  if (!origin) return true;

  const forwardedProto = getHeaderString(req.headers['x-forwarded-proto']);
  const host = getHeaderString(req.headers.host);
  if (!host) {
    res.status(400).json({ error: 'Missing host header' });
    return false;
  }

  const protocol = forwardedProto || (process.env.NODE_ENV === 'production' ? 'https' : 'http');

  let originHost = '';
  try {
    originHost = new URL(origin).host;
  } catch (_error) {
    res.status(400).json({ error: 'Invalid origin header' });
    return false;
  }

  if (originHost !== host) {
    res.status(403).json({ error: 'Invalid request origin' });
    return false;
  }

  if (!origin.startsWith(`${protocol}://`)) {
    res.status(403).json({ error: 'Invalid request protocol' });
    return false;
  }

  return true;
}

export function createSessionForUser(userId: number, req: NextApiRequest, res: NextApiResponse) {
  const token = randomToken(32);
  const tokenHash = hashValue(token);
  const expiresAt = sessionExpiryDate();

  const ipAddress = getHeaderString(req.headers['x-forwarded-for']) || req.socket.remoteAddress || null;
  const userAgent = getHeaderString(req.headers['user-agent']) || null;

  db.prepare(
    `INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?)`
  ).run(userId, tokenHash, toUtcIso(expiresAt), ipAddress, userAgent);

  appendSetCookie(res, buildCookie(token, expiresAt));
}

export function clearSession(req: NextApiRequest, res: NextApiResponse) {
  const token = getSessionTokenFromReq(req);
  if (token) {
    const tokenHash = hashValue(token);
    db.prepare('UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?').run(tokenHash);
  }

  appendSetCookie(res, buildClearCookie());
}

export function getAuthUser(req: NextApiRequest): AuthUser | null {
  const token = getSessionTokenFromReq(req);
  if (!token) return null;

  const tokenHash = hashValue(token);
  const row = db
    .prepare(
      `SELECT
         s.id as session_id,
         s.expires_at,
         u.id,
         u.telegram_id,
         u.username,
         u.first_name,
         u.approved,
         u.role_id,
         r.name as role_name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE s.token_hash = ? AND s.revoked_at IS NULL
       LIMIT 1`
    )
    .get(tokenHash) as any;

  if (!row) return null;

  const expired = new Date(String(row.expires_at)).getTime() <= nowUtc().getTime();
  if (expired) {
    db.prepare('UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?').run(Number(row.session_id));
    return null;
  }

  return {
    id: Number(row.id),
    telegram_id: row.telegram_id == null ? null : Number(row.telegram_id),
    username: row.username || null,
    first_name: row.first_name || null,
    approved: Boolean(row.approved),
    role_id: Number(row.role_id),
    role: { name: row.role_name || 'customer' },
  };
}

export function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  options?: { roles?: string[] }
): AuthUser | null {
  if (!enforceSameOrigin(req, res)) return null;

  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'No autenticado' });
    return null;
  }

  if (!user.approved) {
    res.status(403).json({ error: 'Usuario no aprobado' });
    return null;
  }

  if (options?.roles?.length && !options.roles.includes(user.role.name)) {
    res.status(403).json({ error: 'Acceso denegado' });
    return null;
  }

  return user;
}

export function createLoginChallenge(userId: number, code: string) {
  const challengeId = randomToken(16);
  const codeHash = hashValue(code);
  const expiresAt = challengeExpiryDate();

  db.prepare(
    `INSERT INTO login_challenges (id, user_id, code_hash, attempts, expires_at)
     VALUES (?, ?, ?, 0, ?)`
  ).run(challengeId, userId, codeHash, toUtcIso(expiresAt));

  return challengeId;
}

export function consumeLoginChallenge(challengeId: string, code: string) {
  const challenge = db
    .prepare(
      `SELECT id, user_id, code_hash, attempts, expires_at, consumed_at
       FROM login_challenges
       WHERE id = ?
       LIMIT 1`
    )
    .get(challengeId) as any;

  if (!challenge || challenge.consumed_at) {
    return { ok: false as const, error: 'Desafío inválido o ya usado' };
  }

  const isExpired = new Date(String(challenge.expires_at)).getTime() <= nowUtc().getTime();
  if (isExpired) {
    return { ok: false as const, error: 'Código expirado' };
  }

  if (Number(challenge.attempts) >= LOGIN_CHALLENGE_MAX_ATTEMPTS) {
    return { ok: false as const, error: 'Máximo de intentos excedido' };
  }

  const expectedHash = String(challenge.code_hash);
  const receivedHash = hashValue(code);
  if (expectedHash !== receivedHash) {
    db.prepare('UPDATE login_challenges SET attempts = attempts + 1 WHERE id = ?').run(challengeId);
    return { ok: false as const, error: 'Código incorrecto' };
  }

  db.prepare('UPDATE login_challenges SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?').run(challengeId);
  return { ok: true as const, userId: Number(challenge.user_id) };
}

export function cleanupExpiredSecurityArtifacts() {
  const now = toUtcIso(nowUtc());
  db.prepare('DELETE FROM sessions WHERE expires_at <= ? OR revoked_at IS NOT NULL').run(now);
  db.prepare('DELETE FROM login_challenges WHERE expires_at <= ? OR consumed_at IS NOT NULL').run(now);
}
