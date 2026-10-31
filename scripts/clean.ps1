# 清理构建产物（Windows PowerShell）
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
npm run clean
