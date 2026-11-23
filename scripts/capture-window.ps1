param(
  [Parameter(Mandatory=$true)][string]$WindowTitle,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [int]$ReadyDelaySeconds = 10,
  [int]$TimeoutSeconds = 600,
  [int]$LauncherProcessId = 0
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
Write-Output "Waiting up to $TimeoutSeconds seconds for the native '$WindowTitle' window..."
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$target = $null
while ((Get-Date) -lt $deadline -and $null -eq $target) {
  if ($LauncherProcessId -gt 0 -and $null -eq (Get-Process -Id $LauncherProcessId -ErrorAction SilentlyContinue)) {
    throw "The Tauri launcher process (PID $LauncherProcessId) exited before the '$WindowTitle' window appeared. Check the Tauri/Cargo output above for the launch error."
  }
  $target = Get-Process | Where-Object { $_.MainWindowTitle -eq $WindowTitle -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if ($null -eq $target) { Start-Sleep -Milliseconds 500 }
}
if ($null -eq $target) {
  $visibleWindows = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object { "$($_.ProcessName): '$($_.MainWindowTitle)'" }
  if ($visibleWindows) { Write-Output ("Visible windows at timeout: " + ($visibleWindows -join "; ")) }
  throw "Could not find the visible '$WindowTitle' desktop window within $TimeoutSeconds seconds. Review the Tauri startup output above for the underlying launch or build error."
}
Write-Output "Found native window in process '$($target.ProcessName)' (PID $($target.Id))."
[NativeShot]::SetForegroundWindow($target.MainWindowHandle) | Out-Null
Start-Sleep -Seconds $ReadyDelaySeconds
$rect = New-Object NativeShot+RECT
if (-not [NativeShot]::GetWindowRect($target.MainWindowHandle, [ref]$rect)) { throw 'Could not read the Skerry window bounds.' }
$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top
if ($width -lt 300 -or $height -lt 200) { throw "Unexpected Skerry window size: ${width}x${height}." }
$cropX = 0; $cropY = 0; $cropWidth = $width; $cropHeight = $height
# Main island window is deliberately wider than the pill; trim desktop-like empty margins.
if ($width -ge 1200 -and $height -ge 750) {
  $cropWidth = 1000; $cropHeight = [Math]::Min(650, $height)
  $cropX = [int](($width - $cropWidth) / 2)
}
$bitmap = New-Object System.Drawing.Bitmap($cropWidth, $cropHeight)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
  $graphics.CopyFromScreen(($rect.Left + $cropX), ($rect.Top + $cropY), 0, 0, $bitmap.Size)
  $folder = Split-Path -Parent $OutputPath
  if ($folder) { New-Item -ItemType Directory -Force -Path $folder | Out-Null }
  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
} finally { $graphics.Dispose(); $bitmap.Dispose() }
Write-Output "Captured native window '$WindowTitle' ($cropWidth x $cropHeight) to $OutputPath"
