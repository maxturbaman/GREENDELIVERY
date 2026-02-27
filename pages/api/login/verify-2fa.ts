import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import {
  consumeLoginChallenge,
  createSessionForUser,
  cleanupExpiredSecurityArtifacts,
  enforceSameOrigin,
} from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!enforceSameOrigin(req, res)) {
    return;
  }

  try {
    cleanupExpiredSecurityArtifacts();

    const { challengeId, code } = req.body;
    if (!challengeId || !code) {
      return res.status(400).json({ error: 'Missing challengeId or code' });
    }

    const verification = consumeLoginChallenge(String(challengeId), String(code));
    if (!verification.ok) {
      return res.status(401).json({ error: verification.error });
    }

    const userData = db
      .prepare('SELECT * FROM users WHERE id = ? LIMIT 1')
      .get(verification.userId) as any;

    if (!userData) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const role = db
      .prepare('SELECT * FROM roles WHERE id = ? LIMIT 1')
      .get(userData.role_id) as any;
    const roleName = role?.name || 'customer';

    if (!Boolean(userData.approved)) {
      return res.status(401).json({ error: 'Usuario no aprobado' });
    }

    if (roleName !== 'admin' && roleName !== 'courier') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    createSessionForUser(Number(userData.id), req, res);

    return res.status(200).json({
      ok: true,
      user: {
        id: userData.id,
        username: userData.username,
        first_name: userData.first_name,
        telegram_id: userData.telegram_id,
        role_id: userData.role_id,
        approved: Boolean(userData.approved),
        role: { name: roleName },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}
