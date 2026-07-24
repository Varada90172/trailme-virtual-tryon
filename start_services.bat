@echo off
REM start_services.bat - Launch backend and frontend in new cmd windows
REM Prereqs: dependencies installed, GEMINI_API_KEY set in environment

REM Start backend (uvicorn)
if exist .venv\Scripts\activate.bat (
    start "backend" cmd /k "set PYTHONPATH=%CD% && call .venv\Scripts\activate.bat && uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"
) else (
    start "backend" cmd /k "set PYTHONPATH=%CD% && uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"
)

REM Start frontend (Vite React App)
start "frontend" cmd /k "cd frontend_part && npm run dev"

echo Launched backend and frontend windows. Close these windows to stop the services.
pause
