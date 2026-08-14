@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "PORT=3000"
set "LOG=%TEMP%\party-treasure-tunel.log"
set "URL="

echo.
echo === Party Treasure - mesa na internet ===
echo.

where cloudflared >nul 2>nul
if errorlevel 1 (
  echo [erro] cloudflared nao encontrado.
  echo.
  echo Instale com um destes comandos e rode este arquivo de novo:
  echo     winget install --id Cloudflare.cloudflared
  echo     choco install cloudflared
  echo.
  pause
  exit /b 1
)

echo [1/3] Compilando e subindo o servidor na porta %PORT% ...
start "PT_SERVER" /min cmd /c "npm start"

powershell -NoProfile -Command "for($i=0;$i -lt 180;$i++){try{$null=Invoke-WebRequest -Uri 'http://localhost:%PORT%' -UseBasicParsing -TimeoutSec 2;exit 0}catch{Start-Sleep -Seconds 1}};exit 1"
if errorlevel 1 (
  echo [erro] o servidor nao respondeu na porta %PORT%. Veja a janela PT_SERVER.
  pause
  goto :fim
)
echo       servidor no ar: http://localhost:%PORT%
echo.

echo [2/3] Abrindo o tunel no Cloudflare ...
if exist "%LOG%" del "%LOG%" >nul 2>nul
start "PT_TUNEL" /min cmd /c "cloudflared tunnel --url http://localhost:%PORT% --logfile ""%LOG%"""

for /f "usebackq delims=" %%u in (`powershell -NoProfile -Command "for($i=0;$i -lt 60;$i++){if(Test-Path $env:LOG){$m=[regex]::Match((Get-Content -Raw $env:LOG),'https://[a-z0-9-]+\.trycloudflare\.com'); if($m.Success){$m.Value; exit 0}}; Start-Sleep -Seconds 1}; exit 1"`) do set "URL=%%u"

if defined URL goto :achou

echo [erro] o tunel nao devolveu um link. Log: %LOG%
pause
goto :fim

:achou
echo.
echo [3/3] Link da mesa (mande para o pessoal):
echo.
echo     !URL!
echo.
node -e "require('qrcode-terminal').generate(process.argv[1],{small:true})" "!URL!" 2>nul
echo.
echo O link vale enquanto esta janela ficar aberta.
echo Pressione qualquer tecla para encerrar a mesa e o tunel.
pause >nul

:fim
echo.
echo Encerrando ...
taskkill /IM cloudflared.exe /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq PT_SERVER*" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq PT_TUNEL*" /T /F >nul 2>nul
endlocal
