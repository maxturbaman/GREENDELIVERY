import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../lib/db';
import { requireAuth } from '../../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = requireAuth(req, res, { roles: ['admin'] });
  if (!user) return;

  try {
    const userId = Number(req.query.id);
    const { roleId } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({ error: 'Missing user id or role id' });
    }

    const parsedRoleId = Number(roleId);
    if (![1, 2, 3].includes(parsedRoleId)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    db.prepare('UPDATE users SET role_id = ? WHERE id = ?').run(parsedRoleId, userId);
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}
