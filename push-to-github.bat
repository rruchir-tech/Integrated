@echo off
echo ========================================
echo  Lab Copilot — Push to GitHub
echo ========================================
echo.

cd /d "C:\Users\rruch_out371z\Workspace\Integrated"

echo Removing git lock if present...
if exist .git\index.lock del /f .git\index.lock

echo.
echo Fixing remote URL to correct repo...
git remote set-url origin https://github.com/rruchir-tech/Integrated.git

echo.
echo Staging all changes...
git add -A

echo.
echo Committing...
git commit -m "feat: demo mode, onboarding, seed templates, unified schema, deploy config" --allow-empty

echo.
echo Pushing to GitHub (sign in with rruchir-tech account if prompted)...
git push origin main --force

echo.
echo ========================================
echo  Done! Check github.com/rruchir-tech/Integrated
echo ========================================
pause
