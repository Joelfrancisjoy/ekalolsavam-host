@echo off
echo Starting Both Servers...
echo.
echo Starting Backend on port 8000...
start "Backend Server" cmd /k "cd backend && call kalenv\Scripts\activate && python manage.py runserver"
timeout /t 3 /nobreak >nul
echo.
echo Starting Frontend on port 3000...
start "Frontend Server" cmd /k "cd frontend && npm start"
echo.
echo Both servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
pause


