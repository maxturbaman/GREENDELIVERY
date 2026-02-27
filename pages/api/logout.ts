import type { NextApiRequest, NextApiResponse } from 'next';
import { clearSession, enforceSameOrigin } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!enforceSameOrigin(req, res)) {
    return;
  }

  try {
    clearSession(req, res);
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}
