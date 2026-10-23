param([switch]$CheckOnly)

$ErrorActionPreference = 'Stop'
$repoRoot = $PSScriptRoot
$backend = Join-Path $repoRoot 'backend'
$frontend = Join-Path $repoRoot 'frontend'
$pythonExe = Join-Path $backend '.venv\Scripts\python.exe'
$envPath = Join-Path $backend '.env'

if (-not (Test-Path -LiteralPath $pythonExe)) {
    if ($CheckOnly) { throw 'Chưa có backend/.venv. Chạy .\setup.ps1 để cài.' }
    $pythonLauncher = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($pythonLauncher) {
        & py -3 -m venv (Join-Path $backend '.venv')
    } elseif (Get-Command python.exe -ErrorAction SilentlyContinue) {
        & python -m venv (Join-Path $backend '.venv')
    } else {
        throw 'Cần cài Python 3.11 trở lên trước khi chạy.'
    }
    if ($LASTEXITCODE -ne 0) { throw 'Không tạo được Python virtual environment.' }
}

$pythonVersion = & $pythonExe -c 'import sys; print(sys.version_info.major * 100 + sys.version_info.minor)'
if ([int]$pythonVersion -lt 311) { throw 'Cần Python 3.11 trở lên.' }

$portableNode = Join-Path $frontend '.tools\node-v22.16.0-win-x64'
if (Test-Path -LiteralPath (Join-Path $portableNode 'node.exe')) {
    $env:PATH = $portableNode + ';' + $env:PATH
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'Cần cài Node.js 22 và npm trước khi chạy.'
}
$nodeMajor = [int]((& node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 22) { throw 'Cần Node.js 22 trở lên.' }

if (-not $CheckOnly) {
    & $pythonExe -m pip install -r (Join-Path $backend 'requirements.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Không cài được thư viện backend.' }
    Push-Location $frontend
    try {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'Không cài được thư viện frontend.' }
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path -LiteralPath $envPath)) {
    if ($CheckOnly) { throw 'Chưa có backend/.env. Chạy .\setup.ps1 để tạo.' }
    Copy-Item -LiteralPath (Join-Path $backend '.env.example') -Destination $envPath
}
$envText = [System.IO.File]::ReadAllText($envPath)
if ($envText -match '(?m)^DATABASE_URL=mssql\+pymssql://USER:PASSWORD@') {
    if ($CheckOnly) { throw 'Cần nhập DATABASE_URL thật vào backend/.env.' }
    Write-Host 'Nhập DATABASE_URL kết nối tới SQL Server của máy này (nội dung sẽ không hiện trên màn hình).'
    $secureUrl = Read-Host 'DATABASE_URL' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)
    try { $databaseUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    if ($databaseUrl -notmatch '^mssql\+') { throw 'DATABASE_URL phải là URL SQL Server dạng mssql+...' }
    $envText = [regex]::Replace($envText, '(?m)^DATABASE_URL=.*$', 'DATABASE_URL=' + $databaseUrl)
    [System.IO.File]::WriteAllText($envPath, $envText, [System.Text.UTF8Encoding]::new($false))
}

if (-not (Test-Path -LiteralPath (Join-Path $backend 'app\cloudinary_images.json')) -or
    -not (Test-Path -LiteralPath (Join-Path $frontend 'src\cloudinary-images.json'))) {
    throw 'Thiếu manifest ảnh Cloudinary. Cần commit cả hai file JSON khi đưa project lên Git.'
}

Push-Location $backend
try {
    & $pythonExe scripts\check_setup.py
    if ($LASTEXITCODE -ne 0) {
        throw 'Không kết nối được schema CookHub. Tạo QuanLyThucDon từ QuanLyThucDon.sql, rồi chạy Bo-sung.sql bằng SSMS/SQLCMD; kiểm tra DATABASE_URL trong backend/.env.'
    }
} finally {
    Pop-Location
}

Write-Host 'CookHub đã sẵn sàng. Mở hai terminal: .\backend\start.ps1 và .\frontend\start.ps1' -ForegroundColor Green
if (-not $envText.Contains('CLOUDINARY_URL=cloudinary://')) {
    Write-Host 'Ảnh cũ xem được. Upload ảnh mới cần cấu hình CLOUDINARY_URL riêng trong backend/.env.'
}
