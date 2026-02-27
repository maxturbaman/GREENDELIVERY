import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../lib/db';
import { notifyOrderStatus } from '../../../../lib/telegram';
import { requireAuth } from '../../../../lib/auth';

const ALLOWED_STATUSES = ['pending', 'confirmed', 'in_transit', 'im_here', 'delivered'] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = requireAuth(req, res, { roles: ['admin', 'courier'] });
  if (!user) return;

  try {
    const orderId = Number(req.query.id);
    const { status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ error: 'Missing order id or status' });
    }

    if (!ALLOWED_STATUSES.includes(String(status) as (typeof ALLOWED_STATUSES)[number])) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.prepare(
      `UPDATE orders
       SET status = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(String(status), status === 'delivered' ? 1 : 0, orderId);

    const order = db.prepare(`
      SELECT o.id, u.telegram_id
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      WHERE o.id = ?
      LIMIT 1
    `).get(orderId) as any;

    if (order?.telegram_id) {
      try {
        await notifyOrderStatus(Number(order.telegram_id), orderId, String(status));
      } catch (error) {
        console.error('Error notifying order status:', error);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}
