import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const productId = Number(req.query.id);
    const { active } = req.body;

    if (!productId || typeof active !== 'boolean') {
      return res.status(400).json({ error: 'Missing product id or active status' });
    }

    db.prepare('UPDATE products SET active = ? WHERE id = ?').run(active ? 1 : 0, productId);
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}
