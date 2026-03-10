param(
    [Parameter(Mandatory = $true)]
    [string]$AppName,

    [Parameter(Mandatory = $true)]
    [string]$PackageName,

    [Parameter(Mandatory = $true)]
    [string]$Identifier,

    [string]$AppShortName,
    [string]$Description = 'A reusable local-first desktop template built with Tauri, React, Rust, and SQLite',
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Convert-ToShortName {
    param([string]$Name)

    $parts = $Name -split '\s+' | Where-Object { $_ }
    if ($parts.Count -eq 0) {
        return 'APP'
    }

    return (($parts | ForEach-Object { $_.Substring(0, 1).ToUpperInvariant() }) -join '').Substring(0, [Math]::Min(4, (($parts | ForEach-Object { $_.Substring(0, 1).ToUpperInvariant() }) -join '').Length))
}

function Escape-SingleQuotedTsString {
    param([string]$Value)
    return $Value.Replace('\', '\\').Replace("'", "\\'")
}

$root = Split-Path -Parent $PSScriptRoot
if (-not $AppShortName) {
    $AppShortName = Convert-ToShortName -Name $AppName
}

$packageJsonPath = Join-Path $root 'package.json'
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$packageJson.name = $PackageName

$tauriConfigPath = Join-Path $root 'src-tauri\\tauri.conf.json'
$tauriConfig = Get-Content $tauriConfigPath -Raw | ConvertFrom-Json
$tauriConfig.productName = $AppName
$tauriConfig.identifier = $Identifier
$tauriConfig.app.windows[0].title = $AppName

$cargoTomlPath = Join-Path $root 'src-tauri\\Cargo.toml'
$cargoToml = Get-Content $cargoTomlPath -Raw
$cargoToml = [regex]::Replace($cargoToml, '(?m)^name = ".*"$', "name = `"$PackageName`"")
$cargoToml = [regex]::Replace($cargoToml, '(?m)^description = ".*"$', "description = `"$Description`"")

$preferencesPath = Join-Path $root 'src\\utils\\preferences.ts'
$preferences = Get-Content $preferencesPath -Raw
$preferences = [regex]::Replace($preferences, "appName: '.*'", "appName: '$(Escape-SingleQuotedTsString $AppName)'")
$preferences = [regex]::Replace($preferences, "appShortName: '.*'", "appShortName: '$(Escape-SingleQuotedTsString $AppShortName)'")

$readmePath = Join-Path $root 'README.md'
$readme = Get-Content $readmePath -Raw
$readme = [regex]::Replace($readme, '^# .*$',"# $AppName",'Multiline')

if (-not $DryRun) {
    $packageJson | ConvertTo-Json -Depth 100 | Set-Content $packageJsonPath
    $tauriConfig | ConvertTo-Json -Depth 100 | Set-Content $tauriConfigPath
    Set-Content $cargoTomlPath $cargoToml
    Set-Content $preferencesPath $preferences
    Set-Content $readmePath $readme
}

Write-Host "Renamed template metadata:"
Write-Host "  AppName: $AppName"
Write-Host "  AppShortName: $AppShortName"
Write-Host "  PackageName: $PackageName"
Write-Host "  Identifier: $Identifier"
Write-Host "  DryRun: $DryRun"
