# Despliegue en Docker - Frontend Admin Panel

## Arquitectura

```
Usuario (Internet)
    ↓
Nginx (Reverse Proxy en puerto 80/443)
    ↓
Next.js Frontend (puerto 3000, interno)
  ↓
SQLite local (archivo en volumen)

Telegram Local Bot (puerto 4000, interno)
```

## Requisitos

- Docker instalado en el servidor
- Docker Compose
- (Opcional) Certificados SSL para HTTPS

## Construcción y despliegue

### Con Docker Compose (Recomendado)

```bash
# Navegar al directorio del proyecto
cd admin-panel

# Construir las imágenes y ejecutar contenedores
docker-compose up -d

# Verificar que los contenedores están ejecutándose
docker-compose ps

# Ver logs
docker-compose logs -f

# Ver logs específicos de un servicio
docker-compose logs -f frontend
docker-compose logs -f nginx
```

## Acceder a la aplicación

La aplicación estará disponible en:

```
http://<IP_DEL_SERVIDOR>
```

No es necesario especificar el puerto 3000, ya que Nginx actúa como proxy en el puerto 80.

## Estructura de servicios

### Frontend (Next.js)

- **Container**: greendelivery-frontend
- **Puerto interno**: 3000
- **Acceso externo**: A través de Nginx
- **Build**: Multistage (optimizado)
- **DB**: SQLite local en volumen `./data:/app/data`

### Bot Telegram local

- **Container**: greendelivery-bot
- **Puerto interno**: 4000
- **Token**: `TELEGRAM_BOT_TOKEN`
- **Uso**: envía códigos 2FA y notificaciones de estados

### Nginx (Reverse Proxy)

- **Container**: greendelivery-nginx
- **Puerto externo**: 80 (HTTP), 443 (HTTPS)
- **Configuración**: `nginx/nginx.conf`
- **Features**:
  - Proxy inverso al frontend
  - Compresión Gzip
  - Cache de archivos estáticos
  - Health checks
  - WebSocket support (Upgrade headers)

## Configuración de Nginx

La configuración de Nginx está en `nginx/nginx.conf`. Características principales:

```nginx
# Upstream (servidor del frontend)
upstream frontend {
    server frontend:3000;
}

# Proxy inverso con headers correctos
location / {
    proxy_pass http://frontend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

# Cache de archivos estáticos
location ~* \.(js|css|png|jpg)$ {
    proxy_cache_valid 200 60d;
    expires 365d;
}
```

## Configuración HTTPS (SSL)

### 1. Obtener certificados SSL

Opciones:
- Let's Encrypt (gratuito)
- Cloudflare (si usas Cloudflare Proxy)
- Certificates autofirmados (desarrollo)

### 2. Colocar certificados

Crea una carpeta `certs/` en el directorio del proyecto:

```
admin-panel/
├── certs/
│   ├── cert.pem       (certificado)
│   └── key.pem        (clave privada)
├── nginx/
├── Dockerfile
├── docker-compose.yml
└── ...
```

### 3. Descomentar configuración en nginx.conf

En `nginx/nginx.conf`, descomenta la sección de HTTPS y actualiza los paths:

```nginx
server {
    listen 443 ssl http2;
    server_name tu-dominio.com;
    
    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
    
    # ... resto de la configuración
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$server_name$request_uri;
}
```

### 4. Descomenta el volumen en docker-compose.yml

```yaml
volumes:
  - ./certs:/etc/nginx/certs:ro
```

### 5. Reinicia los contenedores

```bash
docker-compose down
docker-compose up -d
```

## Detener los contenedores

```bash
# Detener sin eliminar
docker-compose stop

# Detener y eliminar contenedores
docker-compose down

# Detener, eliminar y eliminar imágenes
docker-compose down --rmi all
```

## Actualizar la aplicación

```bash
# 1. Obtener los últimos cambios
cd admin-panel
git pull origin main

# 2. Reconstruir y reiniciar
docker-compose down
docker-compose up -d --build

# 3. Verificar logs
docker-compose logs -f
```

## Gestión de datos y logs

### Acceder a logs

```bash
# Todos los servicios
docker-compose logs -f

# Servicio específico
docker-compose logs -f frontend
docker-compose logs -f nginx

# Con límite de líneas
docker-compose logs --tail=100 frontend

# Especificar rango de tiempo
docker-compose logs --since 5m frontend
```

### Limpiar logs

```bash
# En Docker, los logs se guardan automáticamente. Para limpiar:
docker system prune -a --volumes
```

## Monitoreo y Health Checks

Ambos servicios tienen health checks configurados:

```bash
# Ver estado de los health checks
docker-compose ps

# Verificar manualmente
curl http://localhost/health
curl http://localhost:3000
```

## Escalabilidad

### Ejecutar múltiples instancias del frontend

Modifica `docker-compose.yml`:

```yaml
frontend:
  deploy:
    replicas: 2
```

Nginx automáticamente balanceará carga entre las instancias.

## Troubleshooting

### Los contenedores no inician

```bash
# Ver logs detallados
docker-compose logs frontend nginx

# Reconstruir desde cero
docker-compose down
docker-compose up -d --build
```

### Nginx no puede conectar con el frontend

```bash
# Verificar que el frontend está corriendo
docker-compose ps

# Verificar la red
docker network ls
docker network inspect greendelivery_greendelivery-network
```

### Cambiar puertos

En `docker-compose.yml`, modifica:

```yaml
nginx:
  ports:
    - "8080:80"      # Acceso en puerto 8080 (HTTP)
    - "8443:443"     # Acceso en puerto 8443 (HTTPS)
```

### Revisar certificados SSL

```bash
# Verificar fecha de expiración
openssl x509 -enddate -noout -in certs/cert.pem

# Ver detalles completos
openssl x509 -text -noout -in certs/cert.pem
```

## Información Útil

- **Documentación Docker Compose**: https://docs.docker.com/compose/
- **Documentación Nginx**: https://nginx.org/en/docs/
- **Next.js Production**: https://nextjs.org/docs/deployment
