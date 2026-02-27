import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthUser, cleanupExpiredSecurityArtifacts } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    cleanupExpiredSecurityArtifacts();

    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!user.approved || (user.role.name !== 'admin' && user.role.name !== 'courier')) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    return res.status(200).json({
      ok: true,
      user,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}
