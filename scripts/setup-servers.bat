@echo off
echo Setting up servers for Playwright tests...

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && python manage.py runserver"

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm start"

echo.
echo Servers are starting up...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Wait for both servers to be ready, then run: npm test
echo.
pause


