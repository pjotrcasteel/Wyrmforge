param([string]$Root = 'C:/Wyrmforge/ashfang-zagmatorah')
Add-Type -AssemblyName System.Drawing
$destination = Join-Path $Root 'art/source/bosses/ashfang/review'
New-Item -ItemType Directory -Force $destination | Out-Null
$sheet = [System.Drawing.Bitmap]::new(1200, 1380)
$g = [System.Drawing.Graphics]::FromImage($sheet)
$g.Clear([System.Drawing.Color]::FromArgb(26,28,31))
$font = [System.Drawing.Font]::new('Arial',16)
$g.DrawString('Zagmatorah original | Ashfang candidate 002 — unapproved surface study',$font,[System.Drawing.Brushes]::White,15,12)
$views = @('three-quarter','side','front')
for ($row=0;$row -lt 3;$row++) {
  for ($col=0;$col -lt 2;$col++) {
    $folder = if($col -eq 0){'M0-001/review-original-r02'}else{'M1-candidate-002/review'}
    $img = [System.Drawing.Image]::FromFile((Join-Path $Root "artifacts/ashfang/$folder/$($views[$row]).png"))
    $g.DrawImage($img,($col*600),($row*440+60),600,433)
    $img.Dispose()
    $g.DrawString($views[$row],$font,[System.Drawing.Brushes]::White,($col*600+12),($row*440+48))
  }
}
$sheet.Save((Join-Path $destination 'original-vs-candidate002.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$font.Dispose();$g.Dispose();$sheet.Dispose()
