@echo off
REM Stop any dev server running on http://localhost:5173/

powershell -NoProfile -ExecutionPolicy Bypass -Command "$listeners = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($listeners) { $listeners | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; Write-Host 'Stopped the dev server on port 5173.' } else { Write-Host 'No dev server was running on port 5173.' }; Start-Sleep -Seconds 3"
