@echo off
echo Starting Backend Server...
cd backend
call kalenv\Scripts\activate
python manage.py runserver
pause


