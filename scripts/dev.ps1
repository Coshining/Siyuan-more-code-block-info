# 开发热构建（Windows PowerShell）
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

npm run clean
New-Item -ItemType Directory -Force dev | Out-Null
Copy-Item -Force plugin.json dev\
Copy-Item -Force icon.png dev\
Copy-Item -Force preview.png dev\
Get-ChildItem README*.md | Copy-Item -Destination dev\
if (Test-Path dev\i18n) { Remove-Item -Recurse -Force dev\i18n }
Copy-Item -Recurse -Force i18n dev\i18n

npm run dev
