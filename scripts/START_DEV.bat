@echo off
echo ==========================================
echo   Iniciando Ambiente de Desenvolvimento
echo   Tellstones (JS + TS)
echo ==========================================
echo.
echo 1. Iniciando Ambiente Vite (React + Three.js)...
cd /d "%~dp0.."
start "Tellstones Vite Server" npm run dev
echo.
echo ==========================================
echo   Tudo pronto! 
echo   - O servidor Vite esta rodando.
echo   - Acesse: http://localhost:3000
echo ==========================================
pause
