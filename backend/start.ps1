$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$pythonExe = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonExe)) { throw 'Cài backend theo README.md trước khi chạy.' }
& $pythonExe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
exit $LASTEXITCODE
