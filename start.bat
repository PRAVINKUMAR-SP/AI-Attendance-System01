@echo off
echo ==========================================
echo    AI ATTENDANCE SYSTEM - AUTO START
echo ==========================================

echo [1/4] Stopping existing processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im python.exe >nul 2>&1

echo [2/4] Starting Backend (API)...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo [3/4] Starting Frontend (Vite)...
start "Frontend App" cmd /k "cd frontend && npm run dev"

echo [4/4] Starting AI Camera Engine...
start "AI Engine" cmd /k "cd ai-engine && python face_detect_fallback.py"

echo Waiting for servers to initialize...
timeout /t 5 >nul

echo Opening Dashboard in browser...
start http://localhost:5173

echo ==========================================
echo    System is now running! 
echo    Keep the other windows open.
echo ==========================================
pause
