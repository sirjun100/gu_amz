@echo off
setlocal

cd /d "%~dp0"
title Build yzm_monitor

echo.
echo ==========================================
echo   Build yzm_monitor (one click)
echo ==========================================
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python was not found in PATH.
  echo Please install Python 3.10+ and retry.
  pause
  exit /b 1
)

echo [1/5] Check PyInstaller...
python -m PyInstaller --version >nul 2>nul
if errorlevel 1 (
  echo [INFO] PyInstaller not found, installing...
  python -m pip install --user pyinstaller
  if errorlevel 1 (
    echo [ERROR] Failed to install PyInstaller.
    pause
    exit /b 1
  )
)

echo [2/5] Validate syntax: tools\yzm.py
python -m py_compile tools\yzm.py
if errorlevel 1 (
  echo [ERROR] Syntax check failed.
  pause
  exit /b 1
)

echo [3/5] Build EXE...
python -m PyInstaller --noconfirm --clean --onefile --windowed --name yzm_monitor tools\yzm.py
if errorlevel 1 (
  echo [ERROR] Build failed.
  pause
  exit /b 1
)

echo [4/5] Write launcher script...
if not exist dist mkdir dist
(
  echo @echo off
  echo setlocal
  echo cd /d "%%~dp0"
  echo if not exist "yzm_monitor.exe" ^(
  echo   echo [ERROR] yzm_monitor.exe not found.
  echo   pause
  echo   exit /b 1
  echo ^)
  echo start "" "yzm_monitor.exe"
  echo exit /b 0
) > dist\start_yzm_monitor.bat

echo [5/5] Write README...
(
  echo yzm_monitor usage
  echo.
  echo 1. Run start_yzm_monitor.bat or yzm_monitor.exe.
  echo 2. Set AMZ_API_BASE in UI and click Start.
  echo 3. API setting is saved to yzm_config.json automatically.
  echo 4. Copy full dist folder to machines without Python.
) > dist\README_yzm_monitor.txt

echo.
echo [SUCCESS] Build completed.
echo EXE: dist\yzm_monitor.exe
echo Launcher: dist\start_yzm_monitor.bat
echo README: dist\README_yzm_monitor.txt
echo.
pause
exit /b 0

