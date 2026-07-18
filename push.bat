@echo off
title Ohio Trade Lab Publisher
color 0A

cd /d "%~dp0"

echo.
echo ===============================
echo    Ohio Trade Lab Publisher
echo ===============================
echo.

git add .

set /p msg=Commit message:

if "%msg%"=="" set msg=Website Update

git commit -m "%msg%"

git push

echo.
echo Done!
pause