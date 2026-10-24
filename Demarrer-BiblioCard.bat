@echo off
cd /d "%~dp0"
start "" http://localhost:5240
node .devserver.js
