@echo off
setlocal EnableExtensions
title Ohio Trade Lab - Push to GitHub
color 0A
cd /d "%~dp0"

echo ============================================================
echo                 OHIO TRADE LAB PUBLISHER
echo ============================================================
echo.

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  color 0C
  echo ERROR: This folder is not connected to Git.
  echo Put this file inside your OhioTradeLab repository folder.
  pause
  exit /b 1
)

git add -A

git diff --cached --quiet
if not errorlevel 1 (
  echo No website changes were found.
  pause
  exit /b 0
)

set "MSG=Update Ohio Trade Lab website"
set /p "CUSTOM=Commit message [%MSG%]: "
if not "%CUSTOM%"=="" set "MSG=%CUSTOM%"

git commit -m "%MSG%"
if errorlevel 1 goto :failed

git push origin main
if errorlevel 1 goto :failed

echo.
echo SUCCESS: The website files and folders were pushed to GitHub.
pause
exit /b 0

:failed
color 0C
echo.
echo PUSH FAILED. Read the Git error above.
pause
exit /b 1
