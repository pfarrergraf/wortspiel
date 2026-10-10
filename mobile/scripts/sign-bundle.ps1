param(
  [Parameter(Mandatory=$true)][string]$Bundle,
  [Parameter(Mandatory=$true)][string]$SigningConfig,
  [Parameter(Mandatory=$true)][string]$Output
)
$ErrorActionPreference='Stop'
$source=(Resolve-Path -LiteralPath $Bundle).Path
$config=Get-Content -LiteralPath $SigningConfig -Raw | ConvertFrom-Json
$target=[System.IO.Path]::GetFullPath($Output)
if ($source -eq $target -or (Test-Path -LiteralPath $target)) { throw 'Choose a new output file; never overwrite an existing bundle.' }
if (-not $target.EndsWith('.aab')) { throw 'Output must be an Android App Bundle.' }
$env:LUDEVERBIS_STORE_PASSWORD=$config.storePassword
$env:LUDEVERBIS_KEY_PASSWORD=$config.keyPassword
try {
  Copy-Item -LiteralPath $source -Destination $target
  & (Join-Path $config.javaHome 'bin/jarsigner.exe') -keystore $config.keystore -storepass:env LUDEVERBIS_STORE_PASSWORD -keypass:env LUDEVERBIS_KEY_PASSWORD -sigalg SHA256withRSA -digestalg SHA-256 $target $config.alias
  if ($LASTEXITCODE -ne 0) { throw 'Bundle signing failed.' }
  & (Join-Path $config.javaHome 'bin/jarsigner.exe') -verify $target
  if ($LASTEXITCODE -ne 0) { throw 'Bundle signature verification failed.' }
  Get-FileHash -LiteralPath $target -Algorithm SHA256 | Select-Object Path,Hash
} finally {
  Remove-Item Env:LUDEVERBIS_STORE_PASSWORD,Env:LUDEVERBIS_KEY_PASSWORD -ErrorAction SilentlyContinue
  $config=$null
}
