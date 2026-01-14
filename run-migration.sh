#!/bin/bash

# Script para ejecutar migraciones en Supabase
# Este script lee el archivo SQL y lo muestra para que lo pegues en Supabase

clear
echo ""
echo "================================"
echo "GreenDelivery - Migration Script"
echo "================================"
echo ""
echo "Este script te ayudará a ejecutar la migración en Supabase"
echo ""
echo "Pasos:"
echo "1. Copia el siguiente código SQL"
echo "2. Ve a https://supabase.com - Tu proyecto - SQL Editor"
echo "3. Pega el código en una nueva query"
echo "4. Ejecuta con Ctrl+Enter o el botón Run"
echo ""
echo "================================"
echo ""
echo "Mostrando archivo SQL:"
echo ""
echo "================================"
cat migrations/001_add_roles.sql
echo "================================"
echo ""
read -p "Presiona Enter después de ejecutar la migración..."
