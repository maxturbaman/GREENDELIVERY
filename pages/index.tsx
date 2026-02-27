import { useEffect, useState } from 'react';
import Dashboard from '../components/Dashboard';
import Login from '../components/Login';

// Admin Panel Home Page
export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          setUser(null);
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (_error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  return user ? <Dashboard user={user} setUser={setUser} /> : <Login setUser={setUser} />;
}
