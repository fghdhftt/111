# PowerShell скрипт генерации WireGuard конфига для Windows
# Запускать: .\generate-config.ps1 -ServerIP "123.456.789.0" -ServerPubKey "..." -Country "nl"

param(
  [Parameter(Mandatory)][string]$ServerIP,
  [Parameter(Mandatory)][string]$ServerPubKey,
  [string]$Country = "unknown",
  [string]$OutputDir = "$PSScriptRoot\..\configs"
)

# Проверка WireGuard
$wgPath = "$env:ProgramFiles\WireGuard\wg.exe"
if (!(Test-Path $wgPath)) {
  Write-Error "WireGuard не найден. Установите: https://www.wireguard.com/install/"
  exit 1
}

# Генерация ключей
$privKey = & $wgPath genkey
$pubKey = echo $privKey | & $wgPath pubkey

# Имя конфига
$name = "$Country-$(Get-Random -Maximum 999)"
$outputPath = Join-Path $OutputDir "$name.conf"

# Создание конфига
@"
# Name: $name
# Country: $Country
[Interface]
PrivateKey = $privKey
Address = 10.0.0.2/32
DNS = 1.1.1.1

[Peer]
PublicKey = $ServerPubKey
Endpoint = $ServerIP:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
"@ | Out-File -FilePath $outputPath -Encoding ASCII

Write-Host "Конфиг сохранён: $outputPath"
Write-Host "Публичный ключ клиента (добавьте на сервер): $pubKey"
