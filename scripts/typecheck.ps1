# 类型检查（Windows PowerShell）
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
npm run typecheck
