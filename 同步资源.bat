@echo off
setlocal EnableExtensions

cd /d "%~dp0"

echo.
echo [1/4] git add -A
git add -A
if errorlevel 1 goto :ERR_ADD

echo.
echo [2/4] git commit -m "update"
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "update"
  if errorlevel 1 goto :ERR_COMMIT
) else (
  echo [INFO] no staged changes, skip commit.
)

echo.
echo [3/4] git pull --rebase
git pull --rebase
if errorlevel 1 goto :ERR_PULL

echo.
echo [4/4] git push
git push
if errorlevel 1 goto :ERR_PUSH

echo.
echo [DONE] sync complete.
pause
exit /b 0

:ERR_ADD
echo [ERROR] git add -A failed.
pause
exit /b 1

:ERR_COMMIT
echo [ERROR] git commit failed.
pause
exit /b 1

:ERR_PULL
echo [ERROR] git pull failed.
pause
exit /b 1

:ERR_PUSH
echo [ERROR] git push failed.
pause
exit /b 1