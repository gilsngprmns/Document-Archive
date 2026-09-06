@echo off
setlocal
cd /d "%~dp0.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0test-api.ps1" %*
if errorlevel 1 (
    echo.
    echo Testing gagal. Pastikan backend berjalan dengan: npm run dev
    exit /b 1
)
endlocal