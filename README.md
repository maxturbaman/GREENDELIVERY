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
ADMIN_INITIAL_PASSWORD=una_clave_fuerte_para_primer_admin
TELEGRAM_INTERNAL_TOKEN=token_largo_compartido_frontend_y_bot
TELEGRAM_WEBHOOK_SECRET=secreto_para_validar_webhook_telegram
SESSION_TTL_HOURS=12
LOGIN_CHALLENGE_TTL_MINUTES=5
LOGIN_CHALLENGE_MAX_ATTEMPTS=5
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

- Sesiones de servidor con cookie `HttpOnly` (no en `localStorage`)
- 2FA generado y validado en backend (no en cliente)
- Autorización por rol en endpoints API (`admin` / `courier`)
- Hash de contraseñas con `scrypt`
- Validación de origen en requests mutables (mitigación CSRF)
- Token interno para llamadas Frontend → Bot

## 🗄️ Base de datos local

- Archivo: `data/greendelivery.db`
- Usuario inicial: `admin` (solo se crea si defines `ADMIN_INITIAL_PASSWORD`)
- Cambiar credenciales al primer inicio
