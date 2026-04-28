# Concatenate source into CLAUDE_CODE_EXPORT.txt at repo root (for pasting into Claude).
$root = (Resolve-Path "$PSScriptRoot\..").Path
$out = Join-Path $root "CLAUDE_CODE_EXPORT.txt"
$excludeDirs = @(
  "node_modules", ".git", "frontend\build", ".next", "dist",
  "backend\__pycache__", "backend\generated", "backend\uploads", "backend\logs"
)
$extensions = @(".ts", ".tsx", ".js", ".jsx", ".sql", ".py", ".md")

$files = Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
  $p = $_.FullName
  foreach ($d in $excludeDirs) {
    if ($p -like "*${d}*") { return $false }
  }
  $extensions -contains $_.Extension.ToLower()
} | Sort-Object FullName

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("# Denial Appeal Pro - code export")
[void]$sb.AppendLine("# Files: $($files.Count)")
[void]$sb.AppendLine("")

foreach ($f in $files) {
  $rel = $f.FullName.Substring($root.Length).TrimStart("\")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("======== FILE: $rel ========")
  [void]$sb.AppendLine("")
  try {
    [void]$sb.AppendLine([IO.File]::ReadAllText($f.FullName))
  } catch {
    [void]$sb.AppendLine("<< read error >>")
  }
}

[IO.File]::WriteAllText($out, $sb.ToString())
$item = Get-Item $out
Write-Host "Wrote: $out"
Write-Host ("Size: {0:N0} bytes" -f $item.Length)
