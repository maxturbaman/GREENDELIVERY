@echo off
REM Script para ejecutar migraciones en Supabase
REM Este script lee el archivo SQL y lo copia al portapapeles para que lo pegues en Supabase

cls
echo.
echo ================================
echo GreenDelivery - Migration Script
echo ================================
echo.
echo Este script te ayudara a ejecutar la migracion en Supabase
echo.
echo Pasos:
echo 1. Copia el siguiente codigo SQL
echo 2. Ve a https://supabase.com - Tu proyecto - SQL Editor
echo 3. Pega el codigo en una nueva query
echo 4. Ejecuta con Ctrl+Enter o el boton Run
echo.
echo ================================
echo.
echo Mostrando archivo SQL:
echo.
echo ================================
type migrations\001_add_roles.sql
echo ================================
echo.
pause
