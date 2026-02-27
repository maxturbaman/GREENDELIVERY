import { useState, useEffect } from 'react';
import { User } from '../../lib/types';

const ROLE_OPTIONS = [
  { value: 1, label: 'Admin' },
  { value: 2, label: 'Courier' },
  { value: 3, label: 'Customer' },
];

function RoleSelect({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (roleId: number) => void;
  className: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className={className}
    >
      {ROLE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function UserTypeBadge({ roleId, telegramId }: { roleId: number; telegramId?: number | null }) {
  const isCustomer = roleId === 3;

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-bold ${
        isCustomer ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
      }`}
    >
      {isCustomer ? `🤖 Bot + Telegram: ${telegramId || 'N/A'}` : '📱 Panel solo'}
    </span>
  );
}

function UserStatusBadge({ approved }: { approved: boolean }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
      }`}
    >
      {approved ? '✓ Aprobado' : '⏳ Pendiente'}
    </span>
  );
}

export default function UsersSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [customerTelegramId, setCustomerTelegramId] = useState('');
  const [staffData, setStaffData] = useState({
    role: 'courier', // admin, courier
    username: '',
    password: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Error loading users');
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setLoading(false);
  };

  const createCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCustomer(true);

    try {
      if (!customerTelegramId) {
        alert('Debes ingresar el ID de Telegram del customer');
        setCreatingCustomer(false);
        return;
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'customer',
          telegramId: customerTelegramId,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo crear el usuario');

      alert('Customer creado exitosamente');
      setCustomerTelegramId('');
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'No se pudo crear el usuario'}`);
    } finally {
      setCreatingCustomer(false);
    }
  };

  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingStaff(true);

    try {
      if (!staffData.username || !staffData.password) {
        alert('Debes ingresar username y contraseña');
        setCreatingStaff(false);
        return;
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo crear el usuario');

      alert(`${staffData.role === 'admin' ? 'Admin' : 'Courier'} creado exitosamente`);
      setStaffData({
        role: 'courier',
        username: '',
        password: '',
      });
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'No se pudo crear el usuario'}`);
    } finally {
      setCreatingStaff(false);
    }
  };

  const approveUser = async (userId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: 'PATCH',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo aprobar usuario');
      loadUsers();
      alert('Usuario aprobado');
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const updateUserRole = async (userId: number, roleId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar rol');
      loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const deleteUser = async (userId: number, username: string) => {
    if (!confirm(`¿Eliminar usuario ${username}?`)) return;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo eliminar usuario');
      alert('Usuario eliminado');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (loading) return <div className="text-center py-8">Cargando usuarios...</div>;

  const customers = users.filter((user) => user.role_id === 3);
  const staff = users.filter((user) => user.role_id === 1 || user.role_id === 2);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">👥 Gestión de Usuarios</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold"
        >
          {showCreateForm ? 'Cancelar' : '+ Crear Usuario'}
        </button>
      </div>

      {showCreateForm && (
        <div className="panel-card p-4 sm:p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Crear Usuarios</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <h3 className="text-lg font-bold mb-3">Crear Customer</h3>
              <form onSubmit={createCustomer}>
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2">ID de Telegram *</label>
                  <input
                    type="number"
                    value={customerTelegramId}
                    onChange={(e) => setCustomerTelegramId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <p className="text-xs text-blue-800 bg-blue-50 p-2 rounded mb-4">
                  La dirección del customer se solicita cuando crea su orden en el bot.
                </p>

                <button
                  type="submit"
                  disabled={creatingCustomer}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2.5 rounded-lg"
                >
                  {creatingCustomer ? 'Creando...' : 'Crear Customer'}
                </button>
              </form>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <h3 className="text-lg font-bold mb-3">Crear Admin / Courier</h3>
              <form onSubmit={createStaff}>
                <div className="mb-3">
                  <label className="block text-sm font-bold mb-2">Rol *</label>
                  <select
                    value={staffData.role}
                    onChange={(e) => setStaffData({ ...staffData, role: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="courier">Courier</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-bold mb-2">Username *</label>
                  <input
                    type="text"
                    value={staffData.username}
                    onChange={(e) => setStaffData({ ...staffData, username: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2">Contraseña *</label>
                  <input
                    type="password"
                    value={staffData.password}
                    onChange={(e) => setStaffData({ ...staffData, password: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingStaff}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2.5 rounded-lg"
                >
                  {creatingStaff ? 'Creando...' : 'Crear Usuario de Panel'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold mb-3">Customers</h2>
      <div className="lg:hidden space-y-3 mb-8">
        {customers.map((user) => {
          const roleId = user.role_id;
          const isCustomer = roleId === 3;

          return (
            <div key={user.id} className="panel-card p-4">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Usuario</p>
                  <p className="font-mono text-base text-slate-900">{user.username || '-'}</p>
                </div>
                <UserStatusBadge approved={user.approved} />
              </div>

              <div className="mb-3">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Tipo</p>
                <p className="text-sm text-slate-700">
                  {isCustomer ? `🤖 Bot + Telegram: ${user.telegram_id || 'N/A'}` : '📱 Panel solo'}
                </p>
              </div>

              <RoleSelect
                value={roleId}
                onChange={(nextRoleId) => updateUserRole(user.id, nextRoleId)}
                className="w-full border rounded-xl px-3 py-2.5 text-[15px] mb-3"
              />

              <div className="flex gap-2">
                {!user.approved && isCustomer && (
                  <button
                    onClick={() => approveUser(user.id)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2.5 rounded-xl text-sm font-semibold"
                  >
                    ✓ Aprobar
                  </button>
                )}
                <button
                  onClick={() => deleteUser(user.id, user.username || `telegram-${user.telegram_id || user.id}`)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-2.5 rounded-xl text-sm font-semibold"
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden lg:block panel-card overflow-hidden mb-8">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-bold">Username</th>
              <th className="px-6 py-3 text-left text-sm font-bold">Rol</th>
              <th className="px-6 py-3 text-left text-sm font-bold">Tipo</th>
              <th className="px-6 py-3 text-left text-sm font-bold">Estado</th>
              <th className="px-6 py-3 text-left text-sm font-bold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((user) => {
              const roleId = user.role_id;
              const isCustomer = roleId === 3;

              return (
                <tr key={user.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm">{user.username || '-'}</td>
                  <td className="px-6 py-4">
                    <RoleSelect
                      value={roleId}
                      onChange={(nextRoleId) => updateUserRole(user.id, nextRoleId)}
                      className="border rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <UserTypeBadge roleId={roleId} telegramId={user.telegram_id} />
                  </td>
                  <td className="px-6 py-4"><UserStatusBadge approved={user.approved} /></td>
                  <td className="px-6 py-4 space-x-2">
                    {!user.approved && isCustomer && (
                      <button
                        onClick={() => approveUser(user.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                      >
                        ✓ Aprobar
                      </button>
                    )}
                    <button
                      onClick={() => deleteUser(user.id, user.username || `telegram-${user.telegram_id || user.id}`)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
            {customers.length === 0 && (
              <tr>
                <td className="px-6 py-4 text-sm text-gray-500" colSpan={5}>
                  No hay customers registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-bold mb-3">Staff (Admin / Courier)</h2>
      <div className="lg:hidden space-y-3 mb-8">
        {staff.map((user) => {
          const roleId = user.role_id;

          return (
            <div key={user.id} className="panel-card p-4">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Usuario</p>
                  <p className="font-mono text-base text-slate-900">{user.username || '-'}</p>
                </div>
                <UserStatusBadge approved={user.approved} />
              </div>

              <div className="mb-3">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Tipo</p>
                <div>
                  <UserTypeBadge roleId={roleId} telegramId={user.telegram_id} />
                </div>
              </div>

              <RoleSelect
                value={roleId}
                onChange={(nextRoleId) => updateUserRole(user.id, nextRoleId)}
                className="w-full border rounded-xl px-3 py-2.5 text-[15px] mb-3"
              />

              <button
                onClick={() => deleteUser(user.id, user.username || `telegram-${user.telegram_id || user.id}`)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2.5 rounded-xl text-sm font-semibold"
              >
                🗑️ Eliminar
              </button>
            </div>
          );
        })}
      </div>

      <div className="hidden lg:block panel-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-bold">Username</th>
              <th className="px-6 py-3 text-left text-sm font-bold">Rol</th>
              <th className="px-6 py-3 text-left text-sm font-bold">Tipo</th>
              <th className="px-6 py-3 text-left text-sm font-bold">Estado</th>
              <th className="px-6 py-3 text-left text-sm font-bold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((user) => {
              const roleId = user.role_id;

              return (
                <tr key={user.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm">{user.username || '-'}</td>
                  <td className="px-6 py-4">
                    <RoleSelect
                      value={roleId}
                      onChange={(nextRoleId) => updateUserRole(user.id, nextRoleId)}
                      className="border rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <UserTypeBadge roleId={roleId} telegramId={user.telegram_id} />
                  </td>
                  <td className="px-6 py-4"><UserStatusBadge approved={user.approved} /></td>
                  <td className="px-6 py-4 space-x-2">
                    <button
                      onClick={() => deleteUser(user.id, user.username || `telegram-${user.telegram_id || user.id}`)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
            {staff.length === 0 && (
              <tr>
                <td className="px-6 py-4 text-sm text-gray-500" colSpan={5}>
                  No hay usuarios de staff registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded">
          <p className="text-gray-600">No hay usuarios. ¡Crea el primero!</p>
        </div>
      )}
    </div>
  );
}
