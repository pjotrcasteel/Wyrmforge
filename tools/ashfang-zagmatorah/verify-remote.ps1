param([string]$Cache = 'C:/Wyrmforge/ashfang-zagmatorah/artifacts/remote-lfs-verification')
$ErrorActionPreference='Stop'
$results = foreach ($line in (git lfs ls-files -l)) {
    if ($line -notmatch '^([a-f0-9]{64}) [*-] (.+)$') { throw "Unexpected LFS record: $line" }
    $oid=$Matches[1]; $name=$Matches[2]
    $object=Join-Path $Cache "objects/$($oid.Substring(0,2))/$($oid.Substring(2,2))/$oid"
    if (-not(Test-Path -LiteralPath $object)) { throw "Remote object absent: $name" }
    $hash=(Get-FileHash -LiteralPath $object -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($hash -ne $oid) { throw "Hash mismatch: $name" }
    [pscustomobject]@{path=$name;sha256=$hash;bytes=(Get-Item -LiteralPath $object).Length;verified=$true}
}
$results | ConvertTo-Json -Depth 3 | Set-Content art/source/bosses/ashfang/remote-lfs-verification.json
Write-Output "Verified $($results.Count) independently retrieved LFS objects"
