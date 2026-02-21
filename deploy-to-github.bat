@echo off
echo ========================================
echo   TeamBuilder - GitHub Deployment
echo ========================================
echo.

REM Check if git is initialized
if not exist .git (
    echo [1/4] Initializing Git repository...
    git init
    echo.
) else (
    echo [1/4] Git repository already initialized
    echo.
)

REM Add all files
echo [2/4] Adding files to Git...
git add .
echo.

REM Commit
echo [3/4] Creating commit...
set /p commit_message="Enter commit message (or press Enter for default): "
if "%commit_message%"=="" set commit_message=Initial commit: TeamBuilder v2.0.0
git commit -m "%commit_message%"
echo.

REM Check if remote exists
git remote -v | findstr origin >nul
if errorlevel 1 (
    echo [4/4] Setting up GitHub remote...
    set /p github_url="Enter your GitHub repository URL: "
    git remote add origin %github_url%
    git branch -M main
    echo.
    echo Pushing to GitHub...
    git push -u origin main
) else (
    echo [4/4] Pushing to GitHub...
    git push
)

echo.
echo ========================================
echo   ✅ Successfully pushed to GitHub!
echo ========================================
echo.
echo Next steps:
echo 1. Deploy backend: cd backend ^&^& vercel
echo 2. Deploy frontend: cd frontend ^&^& vercel
echo 3. See QUICK_DEPLOY.md for detailed instructions
echo.
pause
