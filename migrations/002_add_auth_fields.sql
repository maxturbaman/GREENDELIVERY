-- ============================================
-- MIGRACION: Agregar campos de autenticación
-- ============================================

-- 1. Agregar columnas username y password a tabla users
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- 2. Crear índice en username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 3. Agregar comentarios
COMMENT ON COLUMN users.username IS 'Usuario para login en panel admin';
COMMENT ON COLUMN users.password IS 'Contraseña del panel admin (en producción usar bcrypt)';

-- 4. Insertar usuario admin de ejemplo (cambiar credenciales después)
INSERT INTO users (telegram_id, first_name, username, password, approved, role_id)
SELECT 
  123456789,  -- Reemplazar con tu Telegram ID
  'Admin',
  'admin',    -- Cambiar usuario
  'admin123', -- ⚠️ CAMBIAR CONTRASEÑA INMEDIATAMENTE
  true,
  (SELECT id FROM roles WHERE name = 'admin')
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = 'admin'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- IMPORTANTE: 
-- 1. Después de ejecutar, CAMBIAR las credenciales del usuario admin
-- 2. En producción, usar bcrypt para las contraseñas
-- 3. Este es solo un ejemplo para desarrollo local
-- ============================================
