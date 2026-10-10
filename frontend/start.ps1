$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$portableNode = Join-Path $PSScriptRoot '.tools\node-v22.16.0-win-x64'
if (Test-Path -LiteralPath (Join-Path $portableNode 'node.exe')) { $env:PATH = $portableNode + ';' + $env:PATH }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Cần cài Node.js 22 LTS. Xem README.md.' }
& npm.cmd run dev -- --port 5173 --strictPort
exit $LASTEXITCODE
