# Re-runnable cleanup of the explicitly named legacy files only; never connects to MySQL.
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'backend\app\main.py')) -or
    -not (Test-Path -LiteralPath (Join-Path $projectRoot 'frontend\package.json'))) {
    throw 'Không tìm thấy đúng thư mục dự án FastAPI + React.'
}
$legacy = @('application','assets','index.php','application.php','smoke.php','compat.py','build_assets.py','refine_assets.py')
foreach ($name in $legacy) {
    $target = [IO.Path]::GetFullPath((Join-Path $projectRoot $name))
    if (-not $target.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Đường dẫn nằm ngoài dự án: $target"
    }
    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
        Write-Output "Deleted: $name"
    }
}
Write-Output 'Legacy cleanup complete. Database and backend/frontend preserved.'

