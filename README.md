# GreenDelivery Admin Panel

Panel de administración para gestionar el bot de Telegram de GreenDelivery.

## 🚀 Características

- ✅ Dashboard con estadísticas de ventas y órdenes
- ✅ Gestión de usuarios (aprobar, cambiar rol)
- ✅ Gestión de órdenes (actualizar estado, notificar clientes)
- ✅ Gestión de productos (crear, editar, activar/desactivar)
- ✅ Sistema de roles (Admin, Courier, Customer)
- ✅ Notificaciones automáticas a clientes por Telegram

## 📋 Instalación

```bash
npm install
```

## 🔧 Configuración

Actualiza `.env.local` con tus credenciales de Supabase y Telegram:

```
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
NEXT_PUBLIC_BOT_TOKEN=tu_bot_token
NEXT_PUBLIC_WORKER_URL=https://telegram-bot.blck.my
```

## 🏃 Ejecutar en desarrollo

```bash
npm run dev
```

Abre http://localhost:3000

## 📦 Build para producción

```bash
npm run build
npm start
```

## 👥 Roles

- **Admin**: Control total (usuarios, productos, órdenes)
- **Courier**: Ver y actualizar estado de órdenes
- **Customer**: Ver sus propias órdenes

## 🔐 Seguridad

- Login por Telegram ID
- Solo usuarios aprobados pueden acceder
- Roles basados en permisos
- RLS habilitado en Supabase
