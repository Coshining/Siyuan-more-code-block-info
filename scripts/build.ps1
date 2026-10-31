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

# 注意：PowerShell 的 Compress-Archive 在 Windows 上会把 zip 条目名写成反斜杠，
# 思源内核用 Go 按 "/" 校验路径，含反斜杠会被判为非法路径并报
# "invalid marketplace package path"。这里用 .NET ZipArchive 手动写入，强制正斜杠。
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$distFull = (Resolve-Path (Join-Path $root "dist")).Path
$zipPath = Join-Path $root "package.zip"
$zipStream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::CreateNew)
$archive = New-Object System.IO.Compression.ZipArchive($zipStream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    Get-ChildItem -Path (Join-Path $root "dist") -Recurse -File | ForEach-Object {
        $relative = $_.FullName.Substring($distFull.Length + 1).Replace('\', '/')
        $entry = $archive.CreateEntry($relative, [System.IO.Compression.CompressionLevel]::Optimal)
        $entryStream = $entry.Open()
        $fileStream = [System.IO.File]::OpenRead($_.FullName)
        try { $fileStream.CopyTo($entryStream) }
        finally { $fileStream.Dispose(); $entryStream.Dispose() }
    }
} finally {
    $archive.Dispose()
    $zipStream.Dispose()
}

Write-Host "Built package.zip"
