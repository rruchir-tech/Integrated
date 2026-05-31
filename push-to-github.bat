@echo off
echo ========================================
echo  Lab Copilot — Push to GitHub
echo ========================================
echo.

cd /d "C:\Users\rruch_out371z\Workspace\Integrated"

echo Removing git lock if present...
if exist .git\index.lock del /f .git\index.lock

echo.
echo Staging all changes...
git add -A

echo.
echo Committing...
git commit -m "feat: demo mode, onboarding, seed templates, unified schema, deploy config"

echo.
echo Pushing to GitHub (sign in with rruchir28@gmail.com if prompted)...
git push origin main

echo.
echo ========================================
echo  Done! Check github.com/Rupkumar/Integrated
echo ========================================
pause
