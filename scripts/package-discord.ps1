$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$sourceDirectory = Join-Path $projectRoot 'crm_discord_js'
$temporaryRoot = Join-Path $projectRoot 'tmp'
$stagingDirectory = Join-Path $temporaryRoot ('discord-package-' + [Guid]::NewGuid().ToString('N'))
$artifactDirectory = Join-Path $projectRoot 'dist'
$archive = Join-Path $artifactDirectory 'crm-discord-backend-canais.zip'

if (-not (Test-Path -LiteralPath (Join-Path $sourceDirectory 'backend.cjs'))) { throw 'Execute npm run build:discord antes de empacotar.' }
New-Item -ItemType Directory -Path $stagingDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
try {
  foreach ($file in @('bot.js', 'server.js', 'backend.cjs', 'migrate.js', 'check-deploy.js', 'db.js', 'package.json', '.env.example', 'README-HOSPEDAGEM.md')) {
    Copy-Item -LiteralPath (Join-Path $sourceDirectory $file) -Destination (Join-Path $stagingDirectory $file)
  }
  foreach ($folder in @('commands', 'certs')) {
    Copy-Item -LiteralPath (Join-Path $sourceDirectory $folder) -Destination (Join-Path $stagingDirectory $folder) -Recurse
  }
  New-Item -ItemType Directory -Path (Join-Path $stagingDirectory 'docs') | Out-Null
  Copy-Item -LiteralPath (Join-Path $projectRoot 'docs/CANAIS-META.md') -Destination (Join-Path $stagingDirectory 'docs/CANAIS-META.md')
  # ZIP paths must use forward slashes, including when built on Windows for Linux.
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archiveStream = [IO.File]::Open($archive, [IO.FileMode]::Create)
  try {
    $archiveWriter = [IO.Compression.ZipArchive]::new($archiveStream, [IO.Compression.ZipArchiveMode]::Create, $true)
    try {
      foreach ($file in Get-ChildItem -LiteralPath $stagingDirectory -File -Recurse -Force) {
        $entryName = $file.FullName.Substring($stagingDirectory.Length + 1).Replace('\', '/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archiveWriter, $file.FullName, $entryName, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
      }
    } finally { $archiveWriter.Dispose() }
  } finally { $archiveStream.Dispose() }
  $archiveReader = [IO.Compression.ZipFile]::OpenRead($archive)
  try {
    if ($archiveReader.Entries | Where-Object { $_.FullName -match '(^|/|\\)\.env$|node_modules' }) { throw 'O pacote contem arquivos que devem ficar fora da distribuicao.' }
    if ($archiveReader.Entries | Where-Object { $_.FullName -match '\\|^/|(^|/)\.\.(/|$)' }) { throw 'O pacote contem caminhos incompativeis com a hospedagem Linux.' }
    foreach ($requiredEntry in @('bot.js', 'server.js', 'backend.cjs', 'db.js', 'package.json', 'migrate.js', 'check-deploy.js', '.env.example', 'commands/crm.js', 'certs/cert.pem', 'certs/key.pem', 'docs/CANAIS-META.md')) {
      if (-not $archiveReader.GetEntry($requiredEntry)) { throw ('Arquivo obrigatorio ausente no pacote: ' + $requiredEntry) }
    }
  } finally { $archiveReader.Dispose() }
  Write-Output ('Pacote gerado, sem .env e sem node_modules: ' + $archive)
  Write-Output 'O pacote contem a chave TLS privada para uso exclusivo na sua hospedagem.'
} finally {
  $resolvedStaging = [IO.Path]::GetFullPath($stagingDirectory)
  $expectedRoot = [IO.Path]::GetFullPath($temporaryRoot) + [IO.Path]::DirectorySeparatorChar
  if (-not $resolvedStaging.StartsWith($expectedRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Diretorio temporario fora do projeto; limpeza cancelada.' }
  Remove-Item -LiteralPath $resolvedStaging -Recurse -Force
}
