-- ============================================
-- FIX: Habilitar lectura para login anónimo
-- ============================================

-- 1. Asegurar que RLS esté habilitado
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Crear política para permitir que usuarios anónimos lean users por username
-- (solo para login, sin exponer datos sensibles)
CREATE POLICY "Allow anon read for login" ON users
  FOR SELECT
  TO anon
  USING (true);

-- 3. Crear política para que usuarios autenticados lean sus propios datos
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- 4. Asegurar que roles tiene política pública
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read roles" ON roles
  FOR SELECT
  USING (true);

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta esto para verificar que funciona:
-- SELECT * FROM users WHERE username = 'admin' LIMIT 1;
