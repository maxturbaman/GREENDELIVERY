interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

interface Stats {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalUsers: number;
  totalSales: number;
}

export default function StatsSection({ stats }: { stats: Stats }) {
  const cards: StatCard[] = [
    {
      title: 'Total de Órdenes',
      value: stats.totalOrders,
      icon: '📦',
      color: 'bg-blue-500',
    },
    {
      title: 'Órdenes Completadas',
      value: stats.completedOrders,
      icon: '✅',
      color: 'bg-green-500',
    },
    {
      title: 'Órdenes Pendientes',
      value: stats.pendingOrders,
      icon: '⏳',
      color: 'bg-yellow-500',
    },
    {
      title: 'Total de Usuarios',
      value: stats.totalUsers,
      icon: '👥',
      color: 'bg-purple-500',
    },
    {
      title: 'Total de Ventas',
      value: `$${stats.totalSales.toFixed(2)}`,
      icon: '💰',
      color: 'bg-pink-500',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Estadísticas</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{card.title}</p>
                <p className="text-2xl font-bold mt-2">{card.value}</p>
              </div>
              <div className={`${card.color} text-white text-3xl p-3 rounded`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
