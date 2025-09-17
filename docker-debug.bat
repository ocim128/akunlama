@echo off
echo Setting up Docker environment...

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed or not in PATH
    echo Please install Docker Desktop first
    pause
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not running
    echo Please start Docker Desktop first
    pause
    exit /b 1
)

echo.
echo Production configuration loaded:
echo   MAILGUN_EMAIL_DOMAIN: akunlama.com
echo   WEBSITE_DOMAIN: localhost:8000
echo   MAILGUN_API_KEY: [REDACTED]
echo   ADMIN_ACCESS_KEY: [REDACTED]
echo   BANNED_USERNAMES: [SET]
echo.

echo Stopping and removing existing container (if any)...
docker stop akunlama-prod >nul 2>&1
docker rm akunlama-prod >nul 2>&1

echo.
echo Building Docker container...
echo This may take a few minutes for the first build...
docker build -t akunlama-prod . --no-cache

if errorlevel 1 (
    echo Error: Failed to build Docker container
    pause
    exit /b 1
)

echo.
echo Starting Docker container...
docker run -d ^
    --name akunlama-prod ^
    -p 8000:8000 ^
    -e MAILGUN_API_KEY=${MAILGUN_API_KEY} ^
    -e MAILGUN_EMAIL_DOMAIN=${MAILGUN_EMAIL_DOMAIN} ^
    -e ADMIN_ACCESS_KEY=${ADMIN_ACCESS_KEY} ^
    -e WEBSITE_DOMAIN=localhost:8000 ^
    -e BANNED_USERNAMES=faturrasyidmuhammad07,diani38071,pazaleegre,cemiloktay2,theboybil,diandikaara,hawkman7609,autenticview,yogiceper25,green14fly,najman8522,faradina6986,wyizrjo2g86kclm,research-population-76,endangpurwanti0511,melanyp_andini,obeidblicke,aspakpahtan21,ardiclops,sevvalkapci ^
    --restart unless-stopped ^
    akunlama-prod

if errorlevel 1 (
    echo Error: Failed to start Docker container
    pause
    exit /b 1
)

echo.
echo Docker container started successfully!
echo.
echo Service is running:
echo   Web Application: http://localhost:8000
echo.
echo To view container logs:
echo   docker logs akunlama-prod -f
echo.
echo To check container status:
echo   docker ps
echo.
echo To stop the container:
echo   docker stop akunlama-prod
echo.
echo To remove the container:
echo   docker rm akunlama-prod
echo.
echo To stop and remove container:
echo   docker stop akunlama-prod ^&^& docker rm akunlama-prod
echo.
echo To rebuild and restart:
echo   docker stop akunlama-prod ^&^& docker rm akunlama-prod ^&^& docker build -t akunlama-prod . ^&^& docker run -d --name akunlama-prod -p 8000:8000 -e MAILGUN_API_KEY=%%MAILGUN_API_KEY%% -e MAILGUN_EMAIL_DOMAIN=%%MAILGUN_EMAIL_DOMAIN%% -e ADMIN_ACCESS_KEY=%%ADMIN_ACCESS_KEY%% -e WEBSITE_DOMAIN=localhost:8000 -e BANNED_USERNAMES=faturrasyidmuhammad07,diani38071,pazaleegre,cemiloktay2,theboybil,diandikaara,hawkman7609,autenticview,yogiceper25,green14fly,najman8522,faradina6986,wyizrjo2g86kclm,research-population-76,endangpurwanti0511,melanyp_andini,obeidblicke,aspakpahtan21,ardiclops,sevvalkapci --restart unless-stopped akunlama-prod
echo.

REM Keep this window open
echo Press any key to close this window...
pause > nul