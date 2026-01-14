import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Order, Product, User } from '../lib/supabase';
import UsersSection from './sections/UsersSection';
import OrdersSection from './sections/OrdersSection';
import ProductsSection from './sections/ProductsSection';
import StatsSection from './sections/StatsSection';

interface DashboardProps {
  user: User;
  setUser: (user: any) => void;
}

export default function Dashboard({ user, setUser }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Total de órdenes
      const { data: orders } = await supabase.from('orders').select('*');
      // Órdenes completadas
      const { data: completed } = await supabase
        .from('orders')
        .select('*')
        .eq('completed', true);
      // Órdenes por enviar
      const { data: pending } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending');
      // Total de usuarios
      const { data: users } = await supabase.from('users').select('*');
      // Total de ventas
      const { data: orderItems } = await supabase.from('orders').select('total');

      const totalSales = orderItems?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;

      setStats({
        totalOrders: orders?.length || 0,
        completedOrders: completed?.length || 0,
        pendingOrders: pending?.length || 0,
        totalUsers: users?.length || 0,
        totalSales,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_user');
    setUser(null);
  };

  const isAdmin = user.role?.name === 'admin';

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-6">
        <h2 className="text-2xl font-bold mb-8">GreenDelivery</h2>

        <nav className="space-y-4">
          <button
            onClick={() => setActiveTab('stats')}
            className={`w-full text-left px-4 py-2 rounded ${
              activeTab === 'stats' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            📊 Estadísticas
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full text-left px-4 py-2 rounded ${
              activeTab === 'orders' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            📦 Órdenes
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('products')}
                className={`w-full text-left px-4 py-2 rounded ${
                  activeTab === 'products' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                🛍️ Productos
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`w-full text-left px-4 py-2 rounded ${
                  activeTab === 'users' ? 'bg-blue-600' : 'hover:bg-gray-700'
                }`}
              >
                👥 Usuarios
              </button>
            </>
          )}
        </nav>

        <div className="mt-12 pt-6 border-t border-gray-700">
          <p className="text-sm text-gray-400 mb-4">
            {user.first_name} ({user.role?.name})
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {activeTab === 'stats' && stats && <StatsSection stats={stats} />}
          {activeTab === 'orders' && <OrdersSection isAdmin={isAdmin} />}
          {activeTab === 'products' && isAdmin && <ProductsSection />}
          {activeTab === 'users' && isAdmin && <UsersSection />}
        </div>
      </div>
    </div>
  );
}
