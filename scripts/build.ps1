# 构建插件（Windows PowerShell）
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

npm run clean
npm run build
if ($LASTEXITCODE -ne 0) { throw "vite build failed" }

Copy-Item -Force plugin.json dist\
Copy-Item -Force icon.png dist\
Copy-Item -Force preview.png dist\
Get-ChildItem README*.md | Copy-Item -Destination dist\
if (Test-Path dist\i18n) { Remove-Item -Recurse -Force dist\i18n }
Copy-Item -Recurse -Force i18n dist\i18n

if (Test-Path package.zip) { Remove-Item -Force package.zip }
Compress-Archive -Path (Join-Path $root "dist\*") -DestinationPath (Join-Path $root "package.zip")
Write-Host "Built package.zip"
