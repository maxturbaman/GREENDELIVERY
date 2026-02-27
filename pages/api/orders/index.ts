import type { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const orders = db.prepare(`
      SELECT
        o.id,
        o.user_id,
        o.status,
        o.total,
        o.completed,
        o.notes,
        o.created_at,
        o.updated_at,
        u.telegram_id,
        u.first_name,
        u.username
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
    `).all() as any[];

    const itemsByOrder = db.prepare(`
      SELECT
        oi.id,
        oi.order_id,
        oi.product_id,
        oi.quantity,
        oi.price,
        p.name as product_name
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
    `).all() as any[];

    const groupedItems = itemsByOrder.reduce((acc: Record<number, any[]>, item) => {
      if (!acc[item.order_id]) acc[item.order_id] = [];
      acc[item.order_id].push({
        id: item.id,
        order_id: item.order_id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        product: { name: item.product_name },
      });
      return acc;
    }, {});

    const response = orders.map((order) => ({
      id: order.id,
      user_id: order.user_id,
      status: order.status,
      total: Number(order.total || 0),
      completed: Boolean(order.completed),
      notes: order.notes,
      created_at: order.created_at,
      updated_at: order.updated_at,
      user: {
        telegram_id: order.telegram_id,
        first_name: order.first_name,
        username: order.username,
      },
      items: groupedItems[order.id] || [],
    }));

    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}
