# Despliegue en Docker - Frontend Admin Panel

## Requisitos
- Docker instalado en el servidor
- Docker Compose (opcional, pero recomendado)

## Construcción de la imagen Docker

### Opción 1: Con Docker Compose (Recomendado)

```bash
# Navegar al directorio del proyecto
cd admin-panel

# Construir la imagen y ejecutar el contenedor
docker-compose up -d

# Verificar que el contenedor está ejecutándose
docker-compose ps

# Ver logs
docker-compose logs -f
```

### Opción 2: Con comandos de Docker

```bash
# Navegar al directorio del proyecto
cd admin-panel

# Construir la imagen
docker build -t greendelivery-admin .

# Ejecutar el contenedor
docker run -d -p 3000:3000 --name greendelivery-admin greendelivery-admin

# Verificar que el contenedor está ejecutándose
docker ps

# Ver logs
docker logs -f greendelivery-admin
```

## Acceder a la aplicación

Una vez que el contenedor esté ejecutándose, accede a la aplicación en:

```
http://localhost:3000
```

Si estás en un servidor remoto, reemplaza `localhost` con la dirección IP del servidor.

## Detener el contenedor

### Con Docker Compose:
```bash
docker-compose down
```

### Con Docker:
```bash
docker stop greendelivery-admin
docker rm greendelivery-admin
```

## Actualizar la aplicación

1. Pull de los últimos cambios del repositorio:
   ```bash
   git pull origin main
   ```

2. Reconstruir la imagen:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

## Notas

- El Dockerfile utiliza un enfoque de multi-stage build para minimizar el tamaño de la imagen final.
- La aplicación se sirve usando `serve`, un servidor HTTP simple optimizado para aplicaciones estáticas.
- El puerto 3000 está expuesto por defecto. Puedes cambiar el puerto en `docker-compose.yml` si es necesario.

## Troubleshooting

### El contenedor no se inicia
```bash
docker logs greendelivery-admin
```

### Cambiar el puerto
En `docker-compose.yml`, modifica:
```yaml
ports:
  - "8080:3000"  # Acceso en puerto 8080
```

### Variables de entorno
Si necesitas establecer variables de entorno, añádelas en `docker-compose.yml`:
```yaml
environment:
  - NODE_ENV=production
  - NEXT_PUBLIC_API_URL=https://api.example.com
```
