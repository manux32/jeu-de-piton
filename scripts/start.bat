@echo off
REM Start the Jeu de piton dev server on http://localhost:5173/
REM Frees port 5173 first (evicting any other game's server), then launches Vite
REM (it does not open a browser -- open or refresh http://localhost:5173/
REM yourself). Close this window (or Ctrl+C) to stop the server.
REM
REM NODE_OPTIONS=--use-system-ca: this network does corporate TLS interception, so
REM Node must trust the system cert store (see the project's this-machine note).

echo Freeing port 5173...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

cd /d "%~dp0.."

REM Corporate TLS interception on this network: Node must trust the system cert
REM store or npm's registry TLS calls fail. Harmless when interception is absent.
set NODE_OPTIONS=--use-system-ca

if not exist node_modules ( echo Installing dependencies... & call npm install )

echo Starting dev server...
call npm run dev
