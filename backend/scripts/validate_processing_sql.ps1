param(
    [string]$ScriptDomPath = 'C:\Program Files (x86)\Microsoft SQL Server Management Studio 20\Common7\IDE\Extensions\Application\Microsoft.SqlServer.TransactSql.ScriptDom.dll'
)
$ErrorActionPreference = 'Stop'
Add-Type -Path $ScriptDomPath
$parser = New-Object Microsoft.SqlServer.TransactSql.ScriptDom.TSql160Parser($true)
$checked = 0
foreach ($name in @('fix_verified_kcal_profiles.sql', 'fix_processing_nutrition.sql', 'rollback_processing_nutrition.sql', 'verify_nutrition_after_processing_fix.sql', 'fix_sodium_preparation_rules.sql', 'audit_sodium.sql')) {
    $sqlPath = Join-Path $PSScriptRoot $name
    $sqlText = [System.IO.File]::ReadAllText($sqlPath)
    $batches = @($sqlText)
    # EXEC(N'...') bodies must also parse; parsing the outer string is not enough.
    foreach ($match in [regex]::Matches($sqlText, "EXEC\(N'((?:''|[^'])*)'\);", 'Singleline')) {
        $batches += $match.Groups[1].Value.Replace("''", "'")
    }
    foreach ($batch in $batches) {
        $parseErrors = $null
        $reader = New-Object System.IO.StringReader($batch)
        $null = $parser.Parse($reader, [ref]$parseErrors)
        $reader.Dispose()
        if ($parseErrors.Count -gt 0) {
            $parseErrors | ForEach-Object { Write-Output "$name line $($_.Line), column $($_.Column): $($_.Message)" }
            throw "SQL syntax validation failed: $name"
        }
        $checked++
    }
}
Write-Output "Parsed $checked SQL scripts/bodies with Microsoft ScriptDom. No DB connection or execution."
