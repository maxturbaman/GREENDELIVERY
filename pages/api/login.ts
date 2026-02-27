import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../lib/db';
import { createLoginChallenge, cleanupExpiredSecurityArtifacts, enforceSameOrigin } from '../../lib/auth';
import { send2FACode } from '../../lib/telegram';
import { hashPassword, isHashedPassword, verifyPassword } from '../../lib/password';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!enforceSameOrigin(req, res)) {
    return;
  }

  try {
    cleanupExpiredSecurityArtifacts();

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing username or password' });
    }

    const userData = db
      .prepare('SELECT * FROM users WHERE username = ? LIMIT 1')
      .get(username) as any;

    if (!userData) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const storedPassword = String(userData.password || '');
    const isHash = isHashedPassword(storedPassword);
    const passwordOk = verifyPassword(String(password), storedPassword);

    if (!passwordOk) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    if (!isHash) {
      const newHash = hashPassword(String(password));
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, userData.id);
    }

    const isApproved = Boolean(userData.approved);

    if (!isApproved) {
      return res.status(401).json({ error: 'Usuario no aprobado' });
    }

    const role = db
      .prepare('SELECT * FROM roles WHERE id = ? LIMIT 1')
      .get(userData.role_id) as any;
    const roleName = role?.name || 'customer';

    if (roleName !== 'admin' && roleName !== 'courier') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    if (!userData.telegram_id) {
      return res.status(400).json({ error: 'Usuario sin Telegram ID configurado' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const challengeId = createLoginChallenge(Number(userData.id), code);
    await send2FACode(Number(userData.telegram_id), code);

    return res.status(200).json({
      ok: true,
      requires2fa: true,
      challengeId,
    });
  } catch (error: any) {
    console.error('[LOGIN] Error:', error?.message || error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
