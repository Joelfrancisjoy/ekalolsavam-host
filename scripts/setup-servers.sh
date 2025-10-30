#!/bin/bash

echo "Setting up servers for Playwright tests..."

echo "Starting Backend Server..."
cd backend
python manage.py runserver &
BACKEND_PID=$!

echo "Starting Frontend Server..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "Servers are starting up..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Wait for both servers to be ready, then run: npm test"
echo ""
echo "Press Ctrl+C to stop servers"

# Function to cleanup on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait


