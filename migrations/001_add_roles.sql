-- ============================================
-- MIGRACION: Agregar tabla de roles
-- ============================================

-- 1. Crear tabla roles si no existe
CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Agregar columna role_id a tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id BIGINT REFERENCES roles(id);

-- 3. Insertar roles
INSERT INTO roles (name, description) 
VALUES 
  ('admin', 'Administrador - Control total'),
  ('courier', 'Mensajero - Gestión de entregas'),
  ('customer', 'Cliente - Solo ver sus órdenes')
ON CONFLICT (name) DO NOTHING;

-- 4. Establecer role_id por defecto para usuarios existentes
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'customer') 
WHERE role_id IS NULL;

-- 5. Crear índice
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- 6. Actualizar RLS para roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_public_read" ON roles FOR SELECT USING (TRUE);
