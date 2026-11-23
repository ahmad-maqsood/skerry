param(
  [Parameter(Mandatory=$true)][string]$WindowTitle,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [int]$ReadyDelaySeconds = 10
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class NativeShot {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
'@
$deadline = (Get-Date).AddMinutes(2)
$target = $null
while ((Get-Date) -lt $deadline -and $null -eq $target) {
  $target = Get-Process | Where-Object { $_.MainWindowTitle -eq $WindowTitle -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if ($null -eq $target) { Start-Sleep -Milliseconds 500 }
}
if ($null -eq $target) { throw "Could not find the visible '$WindowTitle' desktop window within two minutes." }
[NativeShot]::SetForegroundWindow($target.MainWindowHandle) | Out-Null
Start-Sleep -Seconds $ReadyDelaySeconds
$rect = New-Object NativeShot+RECT
if (-not [NativeShot]::GetWindowRect($target.MainWindowHandle, [ref]$rect)) { throw 'Could not read the Skerry window bounds.' }
$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top
if ($width -lt 300 -or $height -lt 200) { throw "Unexpected Skerry window size: ${width}x${height}." }
$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
  $folder = Split-Path -Parent $OutputPath
  if ($folder) { New-Item -ItemType Directory -Force -Path $folder | Out-Null }
  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
} finally { $graphics.Dispose(); $bitmap.Dispose() }
Write-Output "Captured native window '$WindowTitle' ($width x $height) to $OutputPath"
