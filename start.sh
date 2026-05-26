#!/bin/bash
set -e

echo "Starting Semantic Media Search System..."

if [ "$1" = "docker" ]; then
    echo "Starting with Docker..."
    docker-compose up --build
    exit 0
fi

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "ERROR: ffmpeg is not installed. Please install ffmpeg first."
    echo "  macOS: brew install ffmpeg"
    echo "  Ubuntu: sudo apt-get install ffmpeg"
    exit 1
fi

# Setup Python backend
cd backend
python3 -m venv venv 2>/dev/null || true
source venv/bin/activate

pip install -q -r requirements.txt

echo "Starting backend server on http://localhost:8000"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

cd ..

# Setup frontend
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

echo "Starting frontend dev server on http://localhost:5173"
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "============================================"
echo "Semantic Media Search is running!"
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "API Docs: http://localhost:8000/docs"
echo "============================================"
echo ""
echo "For Docker deployment: ./start.sh docker"
echo "Press Ctrl+C to stop both servers"

# Trap SIGINT to kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

wait
