import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Dashboard from '../components/Dashboard';
import Login from '../components/Login';

// Admin Panel Home Page
export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay usuario logeado
    const checkAuth = async () => {
      const stored = localStorage.getItem('admin_user');
      if (stored) {
        try {
          const userData = JSON.parse(stored);
          setUser(userData);
        } catch (error) {
          localStorage.removeItem('admin_user');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  return user ? <Dashboard user={user} setUser={setUser} /> : <Login setUser={setUser} />;
}
