import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    console.log('[LOGIN] Intentando login con usuario:', username);

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing username or password' });
    }

    const userData = db
      .prepare('SELECT * FROM users WHERE username = ? LIMIT 1')
      .get(username) as any;

    if (!userData) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    console.log('[LOGIN] Usuario encontrado:', userData.username);
    console.log('[LOGIN] Aprobado (raw):', userData.approved, 'tipo:', typeof userData.approved);

    // Verificar password
    if (userData.password !== password) {
      console.log('[LOGIN] Contraseña incorrecta');
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Convertir approved a boolean (puede ser string 'true' o boolean true)
    const isApproved = Boolean(userData.approved);
    console.log('[LOGIN] Is approved:', isApproved);

    if (!isApproved) {
      return res.status(401).json({ error: 'Usuario no aprobado' });
    }

    const role = db
      .prepare('SELECT * FROM roles WHERE id = ? LIMIT 1')
      .get(userData.role_id) as any;
    const roleName = role?.name || 'customer';

    console.log('[LOGIN] Rol encontrado:', roleName);

    if (roleName !== 'admin' && roleName !== 'courier') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

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
    console.error('[LOGIN] Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
