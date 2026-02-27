import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { requireAuth } from '../../../lib/auth';
import { hashPassword } from '../../../lib/password';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = requireAuth(req, res, { roles: ['admin'] });
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as any[];
      return res.status(200).json(users.map((user) => ({ ...user, approved: Boolean(user.approved) })));
    }

    if (req.method === 'POST') {
      const { username, password, role, telegramId } = req.body;

      const roleMap: Record<string, number> = { admin: 1, courier: 2, customer: 3 };
      const roleId = roleMap[role] || 3;

      if (![1, 2, 3].includes(roleId)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }

      const approved = roleId === 3 ? 0 : 1;

      if (roleId === 3 && !telegramId) {
        return res.status(400).json({ error: 'Customer requiere Telegram ID' });
      }

      if ((roleId === 1 || roleId === 2) && (!username || !password)) {
        return res.status(400).json({ error: 'Admin/Courier requieren username y contraseña' });
      }

      db.prepare(`
        INSERT INTO users (username, password, first_name, phone, address, telegram_id, role_id, approved)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        username ? String(username) : null,
        password ? hashPassword(String(password)) : null,
        null,
        null,
        null,
        telegramId ? Number(telegramId) : null,
        roleId,
        approved
      );

      return res.status(201).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}
