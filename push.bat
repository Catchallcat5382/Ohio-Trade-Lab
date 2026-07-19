@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Ohio Trade Lab V66 - Push to GitHub
color 0A
cd /d "%~dp0"

set "EXPECTED_MARKER=OHIO TRADE LAB BUILD: V66 PRIVACY AND AUCTION RULES"
set "EXPECTED_VERSION=66.0.0"
set "DEFAULT_MSG=Ohio Trade Lab V66 privacy inventory auction and room fixes"

echo ============================================================
echo              OHIO TRADE LAB V66 PUBLISHER
echo ============================================================
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  color 0C
  echo ERROR: This folder is not connected to Git.
  echo.
  echo Copy EVERY file from this ZIP into the root of your existing
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

echo Current website build marker:
findstr /L /C:"%EXPECTED_MARKER%" "index.html" >nul 2>&1
if errorlevel 1 (
  color 0C
  echo ERROR: index.html is not the V66 file.
  echo Expected marker:
  echo   %EXPECTED_MARKER%
  echo.
  echo Replace the old repository files with every file from the V66 ZIP,
  echo then run this V66 push.bat again.
  pause
  exit /b 1
)
echo   V66 detected correctly.

echo.
echo Checking package version:
findstr /L /C:"\"version\": \"%EXPECTED_VERSION%\"" "package.json" >nul 2>&1
if errorlevel 1 (
  color 0C
  echo ERROR: package.json is not version %EXPECTED_VERSION%.
  echo The V66 files may not have fully replaced the old files.
  pause
  exit /b 1
)
echo   package.json %EXPECTED_VERSION% detected correctly.

echo.
where node >nul 2>&1
if errorlevel 1 (
  color 0E
  echo WARNING: Node.js was not found, so automatic project checks were skipped.
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
echo Staging all V66 files...
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
  echo V66 may already be committed, or the ZIP was copied into a different folder.
  echo.
  echo Latest local commit:
  git log -1 --oneline
  pause
  exit /b 0
)

set "MSG=%DEFAULT_MSG%"
set /p "CUSTOM=Commit message [%DEFAULT_MSG%]: "
if not "%CUSTOM%"=="" set "MSG=%CUSTOM%"

echo.
git commit -m "%MSG%"
if errorlevel 1 goto :failed

echo.
git push origin main
if errorlevel 1 goto :failed

echo.
color 0A
echo SUCCESS: Ohio Trade Lab V66 was checked, built, committed, and pushed.
pause
exit /b 0

:failed
color 0C
echo.
echo PUSH FAILED. Read the error shown above.
pause
exit /b 1
