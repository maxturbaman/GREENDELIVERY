import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    console.log('[LOGIN] Intentando login con usuario:', username);

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing username or password' });
    }

    // Usar REST API directamente en lugar de SDK
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('[LOGIN] URL disponible:', !!supabaseUrl);
    console.log('[LOGIN] Service Role Key disponible:', !!serviceRoleKey);

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[LOGIN] Missing env variables');
      return res.status(500).json({ 
        error: 'Error de configuración del servidor' 
      });
    }

    // Consultar REST API directamente (schema public)
    const response = await fetch(
      `${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(username)}`,
      {
        method: 'GET',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[LOGIN] REST API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LOGIN] REST API error:', errorText);
      return res.status(401).json({ error: 'Error consultando base de datos' });
    }

    const users = await response.json();
    console.log('[LOGIN] Users encontrados:', users.length);

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const userData = users[0];

    console.log('[LOGIN] Usuario encontrado:', userData.username);
    console.log('[LOGIN] Aprobado (raw):', userData.approved, 'tipo:', typeof userData.approved);

    // Verificar password
    if (userData.password !== password) {
      console.log('[LOGIN] Contraseña incorrecta');
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Convertir approved a boolean (puede ser string 'true' o boolean true)
    const isApproved = userData.approved === true || userData.approved === 'true';
    console.log('[LOGIN] Is approved:', isApproved);

    if (!isApproved) {
      return res.status(401).json({ error: 'Usuario no aprobado' });
    }

    // Obtener rol
    const roleResponse = await fetch(
      `${supabaseUrl}/rest/v1/roles?id=eq.${userData.role_id}&select=*`,
      {
        method: 'GET',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const roles = await roleResponse.json();
    const roleName = roles && roles.length > 0 ? roles[0].name : 'customer';

    console.log('[LOGIN] Rol encontrado:', roleName);

    if (roleName !== 'admin' && roleName !== 'courier') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    return res.status(200).json({
      ok: true,
      user: {
        id: userData.id,
        username: userData.username,
        first_name: userData.first_name,
        telegram_id: userData.telegram_id,
        role_id: userData.role_id,
        approved: userData.approved,
        role: { name: roleName },
      },
    });
  } catch (error: any) {
    console.error('[LOGIN] Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
