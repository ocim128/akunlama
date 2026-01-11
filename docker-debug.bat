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

REM Check if .env file exists
if not exist .env (
    echo Error: .env file not found!
    echo Please create a .env file with your environment variables
    pause
    exit /b 1
)

echo.
echo Configuration loaded from .env file (secrets hidden)
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
docker-compose -f docker-compose.local.yml up -d

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
echo   docker-compose -f docker-compose.local.yml logs -f
echo.
echo To check container status:
echo   docker ps
echo.
echo To stop the container:
echo   docker-compose -f docker-compose.local.yml down
echo.
echo To stop and remove container:
echo   docker-compose -f docker-compose.local.yml down
echo.
echo To rebuild and restart:
echo   docker-compose -f docker-compose.local.yml down ^&^& docker build -t akunlama-prod . --no-cache ^&^& docker-compose -f docker-compose.local.yml up -d
echo.

REM Keep this window open
echo Press any key to close this window...
pause > nul