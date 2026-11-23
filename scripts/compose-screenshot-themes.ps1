param(
  [Parameter(Mandatory=$true)][string]$InputPathsJson,
  [Parameter(Mandatory=$true)][string]$OutputPath
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# Receive the input paths as one JSON value so PowerShell's -File argument binder
# cannot mistake the second and third paths for unexpected positional parameters.
$Inputs = @(ConvertFrom-Json -InputObject $InputPathsJson)
if ($Inputs.Count -ne 3) {
  throw "Expected exactly three theme screenshot paths, received $($Inputs.Count)."
}
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
  $canvas = New-Object System.Drawing.Bitmap(($images.Count * $cardWidth) + (($images.Count + 1) * $gap), $height)
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
    $canvas.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally { $g.Dispose(); $canvas.Dispose() }
} finally { $images | ForEach-Object { $_.Dispose() } }
