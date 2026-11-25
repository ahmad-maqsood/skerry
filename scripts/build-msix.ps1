#Requires -Version 7
<#
  Wraps the Tauri release build in an MSIX package for the Microsoft Store.
  Runs on the windows-latest runner after `pnpm tauri build --no-bundle`.
  Needs the env vars MSIX_IDENTITY_NAME, MSIX_PUBLISHER and
  MSIX_PUBLISHER_DISPLAY_NAME (GitHub repository variables or secrets, copied from
  Partner Center -> Product management -> Product identity).
#>
param(
  [string]$ReleaseDir = 'src-tauri/target/release',
  [string]$OutDir = 'build/msix'
)
$ErrorActionPreference = 'Stop'

foreach ($n in 'MSIX_IDENTITY_NAME', 'MSIX_PUBLISHER', 'MSIX_PUBLISHER_DISPLAY_NAME') {
  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($n))) {
    throw "$n is empty. Add it as a repository variable or secret. See docs/microsoft-store.md."
  }
}

# --- App name and version -------------------------------------------------
$conf = Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json
$productName = if ($conf.productName) { $conf.productName } else { 'Skerry' }
$version = $conf.version
if ($version -and $version.EndsWith('.json')) {
  $version = (Get-Content (Join-Path src-tauri $version) -Raw | ConvertFrom-Json).version
}
if (-not $version) { $version = (Get-Content package.json -Raw | ConvertFrom-Json).version }
if ($version -notmatch '^(\d+)\.(\d+)\.(\d+)') { throw "Cannot parse version '$version'." }
# The Store requires the 4th part to be 0.
$msixVersion = "$($Matches[1]).$($Matches[2]).$($Matches[3]).0"

# --- Find the executable ---------------------------------------------------
$exe = Get-ChildItem $ReleaseDir -Filter *.exe -File |
  Sort-Object Length -Descending | Select-Object -First 1
if (-not $exe) { throw "No .exe found in $ReleaseDir. Did the build step run?" }
Write-Host "Packaging $($exe.Name) as version $msixVersion"

# --- Stage package contents -------------------------------------------------
if (Test-Path $OutDir) { Remove-Item $OutDir -Recurse -Force }
$stage = Join-Path $OutDir 'package'
New-Item -ItemType Directory $stage | Out-Null

$skipNames = 'build', 'deps', 'examples', 'incremental', '.fingerprint', '.cargo-lock'
$skipExts = '.d', '.pdb', '.rlib', '.lib', '.exp'
Get-ChildItem $ReleaseDir -Force |
  Where-Object { $_.Name -notin $skipNames -and $_.Extension -notin $skipExts } |
  Copy-Item -Destination $stage -Recurse

# --- Logos (use Tauri-generated ones, else resize icon.png) ------------------
Add-Type -AssemblyName System.Drawing
$assets = Join-Path $stage 'Assets'
New-Item -ItemType Directory $assets | Out-Null
$iconDir = 'src-tauri/icons'

function New-Logo([string]$name, [int]$size) {
  $dest = Join-Path $assets $name
  $src = Join-Path $iconDir $name
  if (Test-Path $src) { Copy-Item $src $dest; return }
  $base = Join-Path $iconDir 'icon.png'
  if (-not (Test-Path $base)) { throw "Neither $src nor $base exists." }
  $img = [System.Drawing.Image]::FromFile((Resolve-Path $base).Path)
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img, 0, 0, $size, $size)
  $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}
New-Logo 'Square44x44Logo.png' 44
New-Logo 'Square150x150Logo.png' 150
New-Logo 'StoreLogo.png' 50

# --- Manifest ---------------------------------------------------------------
function Esc([string]$s) { [System.Security.SecurityElement]::Escape($s) }
$appId = $productName -replace '[^A-Za-z0-9]', ''
if ($appId -notmatch '^[A-Za-z]') { $appId = "App$appId" }

$manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<Package
  xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
  xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
  xmlns:uap3="http://schemas.microsoft.com/appx/manifest/uap/windows10/3"
  xmlns:desktop="http://schemas.microsoft.com/appx/manifest/desktop/windows10"
  xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
  IgnorableNamespaces="uap uap3 rescap">
  <Identity Name="$(Esc $env:MSIX_IDENTITY_NAME)" Publisher="$(Esc $env:MSIX_PUBLISHER)" Version="$msixVersion" ProcessorArchitecture="x64" />
  <Properties>
    <DisplayName>$(Esc $productName)</DisplayName>
    <PublisherDisplayName>$(Esc $env:MSIX_PUBLISHER_DISPLAY_NAME)</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.26100.0" />
  </Dependencies>
  <Resources>
    <Resource Language="en-us" />
  </Resources>
  <Applications>
    <Application Id="$appId" Executable="$($exe.Name)" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements
        DisplayName="$(Esc $productName)"
        Description="A modern, lightweight Dynamic Island for Windows."
        BackgroundColor="transparent"
        Square150x150Logo="Assets\Square150x150Logo.png"
        Square44x44Logo="Assets\Square44x44Logo.png" />
      <Extensions>
        <desktop:Extension Category="windows.startupTask" Executable="$($exe.Name)" EntryPoint="Windows.FullTrustApplication">
          <desktop:StartupTask TaskId="$($appId)Startup" Enabled="false" DisplayName="$(Esc $productName)" />
        </desktop:Extension>
      </Extensions>
    </Application>
  </Applications>
  <Capabilities>
    <rescap:Capability Name="runFullTrust" />
    <uap3:Capability Name="userNotificationListener" />
  </Capabilities>
</Package>
"@
Set-Content -Path (Join-Path $stage 'AppxManifest.xml') -Value $manifest -Encoding UTF8

# --- Pack -------------------------------------------------------------------
$makeappx = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\makeappx.exe" |
  Sort-Object FullName | Select-Object -Last 1
if (-not $makeappx) { throw 'makeappx.exe not found on this runner.' }

$out = Join-Path $OutDir "$($env:MSIX_IDENTITY_NAME)_${msixVersion}_x64.msix"
& $makeappx.FullName pack /d $stage /p $out /o
if ($LASTEXITCODE -ne 0) { throw "makeappx failed with exit code $LASTEXITCODE." }

$sizeMb = [math]::Round((Get-Item $out).Length / 1MB, 1)
Write-Host "Created $out ($sizeMb MB)"
if ($env:GITHUB_STEP_SUMMARY) {
  "### MSIX ready`n`n- File: ``$(Split-Path $out -Leaf)```n- Version: $msixVersion`n- Size: $sizeMb MB`n`nDownload it from the Artifacts section below, then upload it in Partner Center." |
    Add-Content $env:GITHUB_STEP_SUMMARY
}
