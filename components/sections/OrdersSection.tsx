import { useState, useEffect } from 'react';
import { supabase, Order } from '../../lib/supabase';

const statuses = ['pending', 'confirmed', 'in_transit', 'delivered'];

export default function OrdersSection({ isAdmin }: { isAdmin: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, user:users(telegram_id, first_name, username), items:order_items(*, product:products(name))')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Obtener datos de la orden para notificar al usuario
      const order = orders.find((o) => o.id === orderId);
      if (order?.user) {
        // Notificar al usuario sobre el cambio de estado
        await notifyUserOrderStatus(order.user.telegram_id, orderId, newStatus);
      }

      loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Error al actualizar la orden');
    }
  };

  const notifyUserOrderStatus = async (telegramId: number, orderId: number, status: string) => {
    try {
      const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
      const response = await fetch(`${workerUrl}/notify-order-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_id: telegramId,
          order_id: orderId,
          status: status,
        }),
      });

      if (!response.ok) {
        console.error('Error notifying user:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  if (loading) return <div>Cargando órdenes...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Gestión de Órdenes</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-6 py-3 text-left">ID</th>
              <th className="px-6 py-3 text-left">Cliente</th>
              <th className="px-6 py-3 text-left">Items</th>
              <th className="px-6 py-3 text-left">Total</th>
              <th className="px-6 py-3 text-left">Estado</th>
              <th className="px-6 py-3 text-left">Fecha</th>
              {isAdmin && <th className="px-6 py-3 text-left">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4">#{order.id}</td>
                <td className="px-6 py-4">{order.user?.first_name}</td>
                <td className="px-6 py-4">{order.items?.length || 0} productos</td>
                <td className="px-6 py-4">${order.total?.toFixed(2) || '0.00'}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      order.status === 'delivered'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
                {isAdmin && (
                  <td className="px-6 py-4">
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
