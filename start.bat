@echo off
:: WhisperShannon — Windows launcher
:: Double-click this file, or run from Command Prompt / PowerShell

python start.py %*
if errorlevel 1 (
    echo.
    echo Press any key to close...
    pause >nul
)
