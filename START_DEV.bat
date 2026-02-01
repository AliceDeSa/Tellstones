@echo off
echo ==========================================
echo   Iniciando Ambiente de Desenvolvimento
echo   Tellstones (JS + TS)
echo ==========================================
echo.
echo 1. Iniciando Compilador TypeScript (Watch Mode)...
start "Tellstones TypeScript Compiler" npm run watch
echo.
echo 2. Abrindo o Jogo no Servidor Local (http://localhost:8080)...
start "Tellstones Server" npm start
echo.
echo ==========================================
echo   Tudo pronto! 
echo   - O compilador esta rodando em outra janela.
echo   - O jogo foi aberto no seu navegador padrao.
echo ==========================================
pause
