param(
  [Parameter(Mandatory=$true)][string]$ClassicPath,
  [Parameter(Mandatory=$true)][string]$LiquidGlassPath,
  [Parameter(Mandatory=$true)][string]$FrostedGlassPath,
  [Parameter(Mandatory=$true)][string]$OutputPath
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# Keep the three theme inputs explicit. This avoids array binding and JSON parsing
# differences when this script is invoked through Node's spawnSync on Windows.
$Inputs = @($ClassicPath, $LiquidGlassPath, $FrostedGlassPath)
foreach ($inputPath in $Inputs) {
  if (-not (Test-Path -LiteralPath $inputPath -PathType Leaf)) {
    throw "Theme screenshot does not exist: $inputPath"
  }
}

$images = @($Inputs | ForEach-Object { [System.Drawing.Image]::FromFile($_) })
try {
  $gap = 24; $labelHeight = 42; $cardWidth = 420
  $cardHeight = [int]([Math]::Max(1, ($images | ForEach-Object { $_.Height } | Measure-Object -Maximum).Maximum) * ($cardWidth / [Math]::Max(1, ($images | ForEach-Object { $_.Width } | Measure-Object -Maximum).Maximum)))
  $height = $cardHeight + $labelHeight + 2 * $gap
  # Width first: inside New-Object's parentheses the comma binds tighter than +, which turned this
  # sum into an int plus an array (op_Addition error).
  $canvasWidth = ($images.Count * $cardWidth) + (($images.Count + 1) * $gap)
  $canvas = New-Object System.Drawing.Bitmap -ArgumentList $canvasWidth, $height
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  try {
    $g.Clear([System.Drawing.Color]::FromArgb(15,23,42))
    $font = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(226,232,240))
    $labels = @('Classic', 'Liquid Glass', 'Frosted Glass')
    for ($i = 0; $i -lt $images.Count; $i++) {
      $x = $gap + $i * ($cardWidth + $gap)
      $ratio = [Math]::Min($cardWidth / $images[$i].Width, $cardHeight / $images[$i].Height)
      $w = [int]($images[$i].Width * $ratio); $h = [int]($images[$i].Height * $ratio)
      $g.DrawImage($images[$i], $x, $gap, $w, $h)
      $g.DrawString($labels[$i], $font, $brush, [single]$x, [single]($gap + $cardHeight + 8))
    }
    $folder = Split-Path -Parent $OutputPath
    if ($folder) { New-Item -ItemType Directory -Force -Path $folder | Out-Null }
    $canvas.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally { $g.Dispose(); $canvas.Dispose(); $font.Dispose(); $brush.Dispose() }
} finally { $images | ForEach-Object { $_.Dispose() } }
