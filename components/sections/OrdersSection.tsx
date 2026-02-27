import { useState, useEffect } from 'react';
import { Order } from '../../lib/types';

const statuses = ['pending', 'confirmed', 'in_transit', 'im_here', 'delivered'];

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  in_transit: 'En camino',
  im_here: 'Estoy aquí',
  delivered: 'Entregada',
};

function extractCourierComment(notes?: string) {
  if (!notes) return '';
  const line = notes
    .split('\n')
    .find((part) => part.toLowerCase().startsWith('comentario courier:'));

  if (!line) return '';
  return line.replace(/comentario courier:/i, '').trim();
}

function extractDeliveryAddress(notes?: string) {
  if (!notes) return '';
  const line = notes
    .split('\n')
    .find((part) => part.toLowerCase().startsWith('dirección de entrega:'));

  if (!line) return '';
  return line.replace(/dirección de entrega:/i, '').trim();
}

function statusBadge(status: string) {
  if (status === 'delivered') return 'bg-green-100 text-green-800';
  if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
  if (status === 'im_here') return 'bg-purple-100 text-purple-800';
  return 'bg-blue-100 text-blue-800';
}

function getTelegramChatLink(telegramId?: number | null, username?: string) {
  if (username) return `https://t.me/${username}`;
  if (!telegramId) return '';
  return `tg://user?id=${telegramId}`;
}

function getTelegramAccountLabel(firstName?: string, username?: string, telegramId?: number | null) {
  if (username) return `@${username}`;
  if (firstName) return firstName;
  if (telegramId) return 'Cuenta de Telegram';
  return 'N/A';
}

export default function OrdersSection({ isAdmin }: { isAdmin: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error loading orders');
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar estado');
      }

      loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Error al actualizar la orden');
    }
  };

  if (loading) return <div>Cargando órdenes...</div>;

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-8">Gestión de Órdenes</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="panel-card p-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Orden</p>
                <p className="text-xl font-bold text-slate-900">#{order.id}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(order.status)}`}>
                {statusLabels[order.status] || order.status}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[15px] leading-5 text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Cliente:</span>{' '}
                {order.user?.telegram_id || order.user?.username ? (
                  <a
                    href={getTelegramChatLink(order.user?.telegram_id, order.user?.username)}
                    className="text-blue-600 hover:text-blue-700 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {getTelegramAccountLabel(order.user?.first_name, order.user?.username, order.user?.telegram_id)}
                  </a>
                ) : (
                  getTelegramAccountLabel(order.user?.first_name, order.user?.username, order.user?.telegram_id)
                )}
              </p>
              <p><span className="font-semibold text-slate-900">Fecha:</span> {new Date(order.created_at).toLocaleDateString()}</p>
              <p><span className="font-semibold text-slate-900">Items:</span> {order.items?.length || 0} productos</p>
              <p><span className="font-semibold text-slate-900">Total:</span> ${order.total?.toFixed(2) || '0.00'}</p>
            </div>

            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Dirección de entrega</p>
              <p className="text-sm text-slate-800">{extractDeliveryAddress(order.notes) || '—'}</p>
            </div>

            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Comentario para courier</p>
              <p className="text-sm text-slate-800">{extractCourierComment(order.notes) || '—'}</p>
            </div>

            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Detalle de productos</p>
              <div className="space-y-1.5">
                {(order.items || []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                    <span>{item.product?.name || `Producto #${item.product_id}`}</span>
                    <span className="font-semibold">x{item.quantity} · ${Number(item.price).toFixed(2)}</span>
                  </div>
                ))}
                {(!order.items || order.items.length === 0) && (
                  <p className="text-sm text-slate-500">Sin productos registrados.</p>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="mt-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Actualizar estado</label>
                <select
                  value={order.status}
                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                  className="mt-1.5 w-full border border-slate-300 rounded-xl px-3 py-2.5 text-[15px] bg-white"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status] || status}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
