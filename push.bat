@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Ohio Trade Lab V65.1 - Push to GitHub
color 0A
cd /d "%~dp0"

echo ============================================================
echo            OHIO TRADE LAB V65.1 PUBLISHER
echo ============================================================
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  color 0C
  echo ERROR: This folder is not connected to Git.
  echo.
  echo Extract/copy EVERY file from this ZIP into your existing
  echo OhioTradeLab GitHub repository folder, replacing old files.
  echo Then run push.bat from inside that repository folder.
  pause
  exit /b 1
)

echo Repository:
for /f "delims=" %%R in ('git rev-parse --show-toplevel') do echo   %%R
echo.

echo Current website build marker:
findstr /C:"OHIO TRADE LAB BUILD: V65.1" index.html >nul 2>&1
if errorlevel 1 (
  color 0C
  echo ERROR: index.html is not the V65.1 file.
  echo You probably ran the old push.bat or did not replace the files.
  pause
  exit /b 1
)
echo   V65.1 detected correctly.
echo.

git add -A

echo Files Git detected:
git diff --cached --name-status
if errorlevel 1 goto :failed

git diff --cached --quiet
if not errorlevel 1 (
  color 0E
  echo.
  echo Git still sees no changed files.
  echo This means V65.1 is already committed in this repository,
  echo or the ZIP was extracted into a different folder.
  echo.
  echo Latest local commit:
  git log -1 --oneline
  pause
  exit /b 0
)

set "MSG=Ohio Trade Lab V65.1 live offers and publisher fix"
set /p "CUSTOM=Commit message [%MSG%]: "
if not "%CUSTOM%"=="" set "MSG=%CUSTOM%"

git commit -m "%MSG%"
if errorlevel 1 goto :failed

git push origin main
if errorlevel 1 goto :failed

echo.
echo SUCCESS: V65.1 was committed and pushed to GitHub.
pause
exit /b 0

:failed
color 0C
echo.
echo PUSH FAILED. Read the Git error above.
pause
exit /b 1
