@echo off
title MilVerse Deliverable Viewer
echo ============================================
echo   Hermetic Labs - MilVerse Deliverable Viewer
echo ============================================
echo.
echo Starting local server on port 3333...
echo.

:: Open browser after a short delay
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3333"

:: Start the static file server (blocks until closed)
npx -y serve -l 3333 .
