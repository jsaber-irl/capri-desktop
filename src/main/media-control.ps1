# Queries or controls Windows GSMTC sessions. The target is a system-provided app id, never user text.
param([string]$Action = 'list', [string]$Target = '', [int]$Value = 0)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  })[0]
  function Await($op, [Type]$type) {
    $task = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
    if (-not $task.Wait(5000)) { throw 'Windows media session timed out.' }
    return $task.Result
  }
  function ReadArtwork($reference) {
    if (-not $reference) { return $null }
    $stream = $null
    $reader = $null
    try {
      $streamType = [Windows.Storage.Streams.IRandomAccessStreamWithContentType]
      $stream = Await ($reference.OpenReadAsync()) $streamType
      if (-not $stream.Size -or $stream.Size -gt 786432) { return $null }
      $reader = [Windows.Storage.Streams.DataReader]::new($stream)
      $null = Await ($reader.LoadAsync([uint32]$stream.Size)) ([uint32])
      $bytes = New-Object byte[] ([int]$stream.Size)
      $reader.ReadBytes($bytes)
      $contentType = [string]$stream.ContentType
      if ($contentType -notmatch '^image/(png|jpeg|webp|gif)$') { return $null }
      return "data:$contentType;base64,$([Convert]::ToBase64String($bytes))"
    } catch {
      return $null
    } finally {
      if ($reader) { $reader.Dispose() }
      if ($stream) { $stream.Dispose() }
    }
  }
  $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
  $Manager = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]
  $Props = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]
  $mgr = Await ($Manager::RequestAsync()) $Manager
  $sessions = @($mgr.GetSessions())
  if ($Action -eq 'list') {
    $out = @()
    foreach ($s in $sessions) {
      $p = Await ($s.TryGetMediaPropertiesAsync()) $Props
      $timeline = $s.GetTimelineProperties()
      $state = [string]$s.GetPlaybackInfo().PlaybackStatus
      if (($state -eq 'Playing' -or $state -eq 'Paused') -and $p.Title) {
        $artwork = ReadArtwork $p.Thumbnail
        $out += [pscustomobject]@{
          id = [string]$s.SourceAppUserModelId
          app = [string]$s.SourceAppUserModelId
          title = [string]$p.Title
          artist = [string]$p.Artist
          album = [string]$p.AlbumTitle
          artwork = $artwork
          status = $state
          position = [math]::Max(0, $timeline.Position.TotalSeconds)
          duration = [math]::Max(0, $timeline.EndTime.TotalSeconds - $timeline.StartTime.TotalSeconds)
        }
      }
    }
    [pscustomobject]@{ ok = $true; sessions = @($out) } | ConvertTo-Json -Depth 5 -Compress
    exit 0
  }
  $session = $sessions | Where-Object { [string]$_.SourceAppUserModelId -eq $Target } | Select-Object -First 1
  if (-not $session) { [pscustomobject]@{ ok = $false; error = 'Windows media session is no longer available.' } | ConvertTo-Json -Compress; exit 0 }
  $bool = [bool]
  switch ($Action) {
    'play' { $null = Await ($session.TryPlayAsync()) $bool }
    'pause' { $null = Await ($session.TryPauseAsync()) $bool }
    'next' { $null = Await ($session.TrySkipNextAsync()) $bool }
    'previous' { $null = Await ($session.TrySkipPreviousAsync()) $bool }
    default { [pscustomobject]@{ ok = $false; error = "Action not supported: $Action" } | ConvertTo-Json -Compress; exit 0 }
  }
  [pscustomobject]@{ ok = $true } | ConvertTo-Json -Compress
} catch {
  [pscustomobject]@{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
}
