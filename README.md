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

Actualiza `.env.local` con tus credenciales del bot local de Telegram:

```
TELEGRAM_BOT_TOKEN=tu_bot_token
TELEGRAM_BOT_LOCAL_URL=http://localhost:4000
TELEGRAM_BOT_PORT=4000
```

La base de datos ahora es local (SQLite) y se crea automáticamente en `data/greendelivery.db` al iniciar la app.

## 🏃 Ejecutar en desarrollo

```bash
npm run dev
```

Bot local (en otra terminal):

```bash
npm run bot
```

O ambos juntos:

```bash
npm run dev:full
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
- Base de datos local SQLite

## 🗄️ Base de datos local

- Archivo: `data/greendelivery.db`
- Usuario inicial: `admin`
- Contraseña inicial: `gdalambritoprieto420`
- Cambiar credenciales al primer inicio
