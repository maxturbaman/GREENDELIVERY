import { useState, useEffect } from 'react';
import { User } from '../lib/types';
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
      const response = await fetch('/api/stats');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar las estadísticas');
      }

      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_user');
    setUser(null);
  };

  const isAdmin = user.role?.name === 'admin';

  const tabs = [
    { key: 'stats', label: 'Estadísticas', icon: '📊' },
    { key: 'orders', label: 'Órdenes', icon: '📦' },
    ...(isAdmin
      ? [
          { key: 'products', label: 'Productos', icon: '🛍️' },
          { key: 'users', label: 'Usuarios', icon: '👥' },
        ]
      : []),
  ];

  const activeTabLabel = tabs.find((tab) => tab.key === activeTab)?.label || 'Panel';

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">GreenDelivery</p>
            <h1 className="text-lg font-semibold">{activeTabLabel}</h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="flex lg:min-h-screen">
        <aside className="hidden lg:block w-72 bg-slate-900 text-white p-5">
          <h2 className="text-2xl font-bold mb-6">GreenDelivery</h2>

          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleSelectTab(tab.key)}
                className={`w-full min-h-[48px] text-left px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-5 border-t border-slate-700">
            <p className="text-xs text-slate-300 mb-4">
              {user.first_name || user.username || 'Usuario'} ({user.role?.name})
            </p>
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 px-4 py-2.5 rounded-lg text-sm font-semibold"
            >
              Cerrar Sesión
            </button>
          </div>
        </aside>

        <main className="flex-1 w-full pb-24 lg:pb-0">
          <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {activeTab === 'stats' && stats && <StatsSection stats={stats} />}
            {activeTab === 'orders' && <OrdersSection isAdmin={isAdmin} />}
            {activeTab === 'products' && isAdmin && <ProductsSection />}
            {activeTab === 'users' && isAdmin && <UsersSection />}
          </div>
        </main>
      </div>

      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleSelectTab(tab.key)}
              className={`h-16 px-1 text-[11px] leading-tight font-semibold flex flex-col items-center justify-center gap-0.5 ${
                activeTab === tab.key ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <div className="text-base leading-none">{tab.icon}</div>
              <span className="truncate max-w-full">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
