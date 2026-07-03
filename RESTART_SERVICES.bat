@echo off
echo ========================================
echo AI Marketing Platform - Service Restart
echo ========================================
echo.

echo [1/4] Stopping any existing processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Starting Backend Server (Port 5000)...
cd backend
start "Backend Server" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul

echo [3/4] Starting Frontend Server (Port 8080)...
cd ..\frontend
start "Frontend Server" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

echo [4/4] Opening Browser...
timeout /t 3 /nobreak >nul
start http://localhost:8080

echo.
echo ========================================
echo Services Started Successfully!
echo ========================================
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:8080
echo.
echo Press Ctrl+C in each terminal to stop
echo ========================================
pause
