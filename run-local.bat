@echo off
setlocal

:: Load environment variables from .env if it exists
if exist .env (
    echo Loading .env...
    for /f "eol=# tokens=*" %%i in (.env) do set %%i
)

:: Ensure MAIL_CONFIG defaults to CLOUDFLARE if not set, as per user context
if "%MAIL_CONFIG%"=="" set MAIL_CONFIG=CLOUDFLARE

:: Create local apiconfig for UI to point to local backend
echo Creating local apiconfig...
(
echo export default {
echo     apiUrl: 'http://localhost:8080/api/v1/mail',
echo     domain: 'localhost'
echo }
) > ui\config\apiconfig.local.js

echo Copying local config to active config...
copy /Y ui\config\apiconfig.local.js ui\config\apiconfig.js

:: Install root dependencies if missing
if not exist node_modules (
    echo Installing root dependencies...
    call npm install
)

:: Install UI dependencies if missing
if not exist ui\node_modules (
    echo Installing UI dependencies...
    cd ui
    call npm install
    cd ..
)

echo.
echo ===================================================
echo Starting InboxKitten Locally
echo Mode: %MAIL_CONFIG%
echo ===================================================
echo.

:: Start Backend
echo Starting Backend...
set PORT=8080
start "InboxKitten Backend" cmd /k "title Backend && echo Starting Node Server on 8080... && node backend/app.js"

:: Start Frontend
echo Starting Frontend...
cd ui
start "InboxKitten Frontend" cmd /k "title Frontend && echo Starting Vite... && npm run dev"
cd ..

echo.
echo Services started in new windows.
echo - Backend running on http://localhost:8080
echo - Frontend running on http://localhost:5173 (check window)
