import { useState, useEffect } from 'react';
import { supabase, User } from '../../lib/supabase';

export default function UsersSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstName: '',
    phone: '',
    address: '',
    role: 'customer', // admin, courier, customer
    telegramId: '',
  });

  const roleMap: { [key: string]: number } = {
    admin: 1,
    courier: 2,
    customer: 3,
  };

  const roleNames: { [key: number]: string } = {
    1: 'Admin',
    2: 'Courier',
    3: 'Customer',
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setLoading(false);
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      if (!formData.username || !formData.password || !formData.firstName) {
        alert('Completa al menos: username, contraseña, y nombre');
        setCreating(false);
        return;
      }

      // Para customers: requiere Telegram ID
      if (formData.role === 'customer' && !formData.telegramId) {
        alert('Los usuarios Customer deben tener un ID de Telegram');
        setCreating(false);
        return;
      }

      // Crear usuario
      const { error } = await supabase.from('users').insert([
        {
          username: formData.username,
          password: formData.password,
          first_name: formData.firstName,
          phone: formData.phone || null,
          address: formData.address || null,
          telegram_id: formData.telegramId || null,
          role_id: roleMap[formData.role],
          approved: formData.role === 'customer' ? false : true, // Admin/Courier auto-approved
        },
      ]);

      if (error) throw error;

      alert(
        `Usuario ${formData.username} creado exitosamente como ${formData.role}`
      );
      setFormData({
        username: '',
        password: '',
        firstName: '',
        phone: '',
        address: '',
        role: 'customer',
        telegramId: '',
      });
      setShowCreateForm(false);
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'No se pudo crear el usuario'}`);
    } finally {
      setCreating(false);
    }
  };

  const approveUser = async (userId: number) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ approved: true })
        .eq('id', userId);

      if (error) throw error;
      loadUsers();
      alert('Usuario aprobado');
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const updateUserRole = async (userId: number, roleId: number) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role_id: roleId })
        .eq('id', userId);

      if (error) throw error;
      loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const deleteUser = async (userId: number, username: string) => {
    if (!confirm(`¿Eliminar usuario ${username}?`)) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);

      if (error) throw error;
      alert('Usuario eliminado');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (loading) return <div className="text-center py-8">Cargando usuarios...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">👥 Gestión de Usuarios</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          {showCreateForm ? 'Cancelar' : '+ Crear Usuario'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Crear Nuevo Usuario</h2>
          <form onSubmit={createUser}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-bold mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">
                  Contraseña *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-bold mb-2">Dirección</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Rol *</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="customer">Customer (Bot + Telegram ID)</option>
                  <option value="courier">Courier (Panel solamente)</option>
                  <option value="admin">Admin (Panel solamente)</option>
                </select>
              </div>
              {formData.role === 'customer' && (
                <div>
                  <label className="block text-sm font-bold mb-2">
                    ID de Telegram * (para Customer)
                  </label>
                  <input
                    type="number"
                    value={formData.telegramId}
                    onChange={(e) =>
                      setFormData({ ...formData, telegramId: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    required={formData.role === 'customer'}
                  />
                </div>
              )}
            </div>

            <div className="bg-blue-50 p-3 rounded mb-4 text-sm text-blue-800">
              <p>
                <strong>Nota:</strong> Admin y Courier se aprueban automáticamente
                y solo pueden acceder al panel. Los Customers requieren ID de
                Telegram para usar el bot.
              </p>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2 rounded"
            >
              {creating ? 'Creando...' : 'Crear Usuario'}
            </button>
          </form>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-bold">Username</th>
              <th className="px-6 py-3 text-left text-sm font-bold">Nombre</th>
              <th className="px-6 py-3 text-left text-sm font-bold">Teléfono</th>
              <th className="px-6 py-3 text-left text-sm font-bold">Rol</th>
              <th className="px-6 py-3 text-left text-sm font-bold">Tipo</th>
              <th className="px-6 py-3 text-left text-sm font-bold">Estado</th>
              <th className="px-6 py-3 text-left text-sm font-bold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const roleId = user.role_id;
              const isAdmin = roleId === 1;
              const isCourier = roleId === 2;
              const isCustomer = roleId === 3;

              return (
                <tr key={user.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm">{user.username}</td>
                  <td className="px-6 py-4">{user.first_name}</td>
                  <td className="px-6 py-4">{user.phone || '-'}</td>
                  <td className="px-6 py-4">
                    <select
                      value={roleId}
                      onChange={(e) =>
                        updateUserRole(user.id, parseInt(e.target.value))
                      }
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value={1}>Admin</option>
                      <option value={2}>Courier</option>
                      <option value={3}>Customer</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        isCustomer
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {isCustomer
                        ? `🤖 Bot + Telegram: ${user.telegram_id || 'N/A'}`
                        : `📱 Panel solo`}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.approved
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {user.approved ? '✓ Aprobado' : '⏳ Pendiente'}
                    </span>
                  </td>
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
                      onClick={() => deleteUser(user.id, user.username || '')}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
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
