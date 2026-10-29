param([string]$Output='art/source/bosses/ashfang/reviews/tier-I-skin-010/comparison.jpg')
Add-Type -AssemblyName System.Drawing
$canvas=New-Object System.Drawing.Bitmap 2000,1390
$g=[System.Drawing.Graphics]::FromImage($canvas);$g.Clear([System.Drawing.Color]::FromArgb(21,24,29));$font=New-Object System.Drawing.Font 'Arial',21
$items=@(@('Approved anatomical baseline','artifacts/ashfang/source-fidelity-001/presentation/portrait.png'),@('Ashfang Tier I - volcanic skin','art/source/bosses/ashfang/reviews/tier-I-skin-010/presentation/portrait.png'),@('Original skin - same camera and light','artifacts/ashfang/source-fidelity-001/presentation/hero.png'),@('Current skin - tail fan removed','art/source/bosses/ashfang/reviews/tier-I-skin-010/presentation/hero.png'))
for($i=0;$i -lt $items.Count;$i++){$x=($i%2)*1000;$y=[math]::Floor($i/2)*680;$g.DrawString($items[$i][0],$font,[System.Drawing.Brushes]::White,$x+22,$y+15);$im=[System.Drawing.Image]::FromFile((Join-Path (Get-Location) $items[$i][1]));$g.DrawImage($im,$x,$y+55,1000,625);$im.Dispose()}
$g.DrawString('Skin proposal - anatomy preserved - fire and smoke reserved for game VFX',$font,[System.Drawing.Brushes]::LightGray,22,1350)
$canvas.Save((Join-Path (Get-Location) $Output),[System.Drawing.Imaging.ImageFormat]::Jpeg);$font.Dispose();$g.Dispose();$canvas.Dispose()
