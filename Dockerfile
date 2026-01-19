# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* yarn.lock* bun.lock* ./

# Instalar dependencias
RUN npm install

# Copiar el código fuente
COPY . .

# Compilar la aplicación Next.js
RUN npm run build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

# Copiar solo los archivos necesarios del stage anterior
COPY --from=builder /app/out ./out
COPY --from=builder /app/public ./public

# Instalar un servidor HTTP simple para servir los archivos estáticos
RUN npm install -g serve

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["serve", "-s", "out", "-l", "3000"]
