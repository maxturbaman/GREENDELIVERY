import { useState } from 'react';

interface LoginProps {
  setUser: (user: any) => void;
}

export default function Login({ setUser }: LoginProps) {
  const [step, setStep] = useState<'credentials' | 'twofa'>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Llamar a la API route para verificar credenciales
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error en la autenticación');
        setLoading(false);
        return;
      }

      const userData = data.user;

      // Generar código 2FA y enviarlo por Telegram
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const newSessionId = Math.random().toString(36).substring(7);

      // Guardar código en localStorage temporalmente
      localStorage.setItem(`2fa_${newSessionId}`, JSON.stringify({
        code,
        username,
        userId: userData.id,
        timestamp: Date.now(),
        telegramId: userData.telegram_id,
        userData: userData
      }));

      // Enviar código por Telegram
      const fetchResponse = await fetch('/api/send-2fa-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: userData.telegram_id,
          code
        })
      });

      if (!fetchResponse.ok) {
        const errorData = await fetchResponse.json();
        setError(`Error enviando código: ${errorData.error}`);
        setLoading(false);
        return;
      }

      setSessionId(newSessionId);
      setStep('twofa');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    }
    setLoading(false);
  };

  const handleTwoFaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const sessionData = localStorage.getItem(`2fa_${sessionId}`);
      if (!sessionData) {
        setError('Sesión expirada. Intenta de nuevo');
        setLoading(false);
        return;
      }

      const { code, timestamp, userData } = JSON.parse(sessionData);

      // Verificar código (5 minutos de expiración)
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        localStorage.removeItem(`2fa_${sessionId}`);
        setError('Código expirado. Intenta de nuevo');
        setLoading(false);
        return;
      }

      if (twoFaCode !== code) {
        setError('Código incorrecto');
        setLoading(false);
        return;
      }

      localStorage.setItem('admin_user', JSON.stringify(userData));
      localStorage.removeItem(`2fa_${sessionId}`);
      setUser(userData);
    } catch (err: any) {
      setError(err.message || 'Error en verificación 2FA');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8 w-full max-w-md border border-white/30">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">GreenDelivery Admin</h1>
        <p className="text-center text-gray-600 text-sm mb-8">
          {step === 'credentials' ? 'Ingresa tus credenciales' : 'Verifica con código 2FA'}
        </p>

        {step === 'credentials' ? (
          <form onSubmit={handleCredentialsSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                autoComplete="username"
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-xl transition"
            >
              {loading ? 'Verificando...' : 'Siguiente'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTwoFaSubmit}>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700 text-center">
                Se envió un código de 6 dígitos a tu Telegram
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Código 2FA
              </label>
              <input
                type="text"
                maxLength={6}
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoComplete="one-time-code"
                inputMode="numeric"
                className="w-full px-3 py-3 border border-gray-300 rounded-xl text-center text-2xl font-mono tracking-[0.25em] focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

            <button
              type="submit"
              disabled={loading || twoFaCode.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-xl transition"
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('credentials');
                setUsername('');
                setPassword('');
                setTwoFaCode('');
                setSessionId('');
              }}
              className="w-full mt-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-xl transition"
            >
              Volver
            </button>
          </form>
        )}

        <p className="text-center text-gray-600 text-xs mt-6">
          Contacta al administrador para obtener acceso
        </p>
      </div>
    </div>
  );
}
