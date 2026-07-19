@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Ohio Trade Lab Publisher
color 0A
cd /d "%~dp0"

set "DEFAULT_MSG=Update Ohio Trade Lab"

echo ============================================================
echo                OHIO TRADE LAB PUBLISHER
echo ============================================================
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  color 0C
  echo ERROR: This folder is not connected to Git.
  echo.
  echo Copy every project file into the root of your existing
  echo OhioTradeLab GitHub repository, replacing matching files.
  echo Then run push.bat from that repository folder.
  pause
  exit /b 1
)

for /f "delims=" %%R in ('git rev-parse --show-toplevel') do set "REPO_ROOT=%%R"
cd /d "%REPO_ROOT%"

echo Repository:
echo   %REPO_ROOT%
echo.

if not exist "index.html" (
  color 0C
  echo ERROR: index.html was not found in the repository root.
  echo Run this publisher from the OhioTradeLab repository root.
  pause
  exit /b 1
)

if not exist "package.json" (
  color 0C
  echo ERROR: package.json was not found in the repository root.
  pause
  exit /b 1
)

rem Read any valid package.json version. Node is preferred; PowerShell is fallback.
set "PROJECT_VERSION="
where node >nul 2>&1
if not errorlevel 1 (
  for /f "usebackq delims=" %%V in (`node -p "require('./package.json').version" 2^>nul`) do set "PROJECT_VERSION=%%V"
)

if not defined PROJECT_VERSION (
  for /f "usebackq delims=" %%V in (`powershell -NoProfile -Command "try { (Get-Content -Raw 'package.json' | ConvertFrom-Json).version } catch { exit 1 }" 2^>nul`) do set "PROJECT_VERSION=%%V"
)

if not defined PROJECT_VERSION (
  color 0C
  echo ERROR: Could not read a valid version from package.json.
  echo Make sure package.json contains a field such as:
  echo   "version": "66.3.0"
  pause
  exit /b 1
)

echo Detected project version:
echo   %PROJECT_VERSION%
echo.

findstr /L /C:"OHIO TRADE LAB BUILD" "index.html" >nul 2>&1
if errorlevel 1 (
  color 0E
  echo WARNING: No Ohio Trade Lab build marker was found in index.html.
  echo Publishing will continue because versions are no longer hard-coded.
  echo.
) else (
  echo Website build marker detected.
  echo.
)

where node >nul 2>&1
if errorlevel 1 (
  color 0E
  echo WARNING: Node.js was not found, so project checks and build were skipped.
  echo Git publishing will continue with the files currently present.
) else (
  echo Running project checks...
  call npm run check
  if errorlevel 1 goto :failed

  echo.
  echo Rebuilding Cloudflare Pages dist folder...
  call npm run build
  if errorlevel 1 goto :failed
)

echo.
echo Staging all project files...
git add -A
if errorlevel 1 goto :failed

echo.
echo Files Git detected:
git diff --cached --name-status
if errorlevel 1 goto :failed

git diff --cached --quiet
if not errorlevel 1 (
  color 0E
  echo.
  echo Git sees no changed files.
  echo The current version may already be committed.
  echo.
  echo Latest local commit:
  git log -1 --oneline
  pause
  exit /b 0
)

set "DEFAULT_MSG=Ohio Trade Lab v%PROJECT_VERSION%"
set "MSG=%DEFAULT_MSG%"
set "CUSTOM="
set /p "CUSTOM=Commit message [%DEFAULT_MSG%]: "
if defined CUSTOM set "MSG=%CUSTOM%"

echo.
git commit -m "%MSG%"
if errorlevel 1 goto :failed

echo.
rem Push the currently checked-out branch instead of assuming it is named main.
for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT_BRANCH=%%B"
if not defined CURRENT_BRANCH (
  color 0C
  echo ERROR: Could not determine the current Git branch.
  goto :failed
)

echo Pushing branch %CURRENT_BRANCH% to origin...
git push origin "%CURRENT_BRANCH%"
if errorlevel 1 goto :failed

echo.
color 0A
echo SUCCESS: Ohio Trade Lab v%PROJECT_VERSION% was checked, built, committed, and pushed.
pause
exit /b 0

:failed
color 0C
echo.
echo PUBLISH FAILED. Read the error shown above.
pause
exit /b 1
