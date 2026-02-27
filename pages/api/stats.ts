import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../lib/db';
import { requireAuth } from '../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = requireAuth(req, res, { roles: ['admin', 'courier'] });
  if (!user) return;

  try {
    const totalOrders = (db.prepare('SELECT COUNT(*) as count FROM orders').get() as any).count || 0;
    const completedOrders = (db.prepare('SELECT COUNT(*) as count FROM orders WHERE completed = 1').get() as any).count || 0;
    const pendingOrders = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get() as any).count || 0;
    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count || 0;
    const totalSales = (db.prepare('SELECT COALESCE(SUM(total), 0) as sum FROM orders').get() as any).sum || 0;

    return res.status(200).json({
      totalOrders,
      completedOrders,
      pendingOrders,
      totalUsers,
      totalSales,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}
