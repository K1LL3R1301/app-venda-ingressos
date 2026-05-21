param(
  [string] $BaseUrl = "http://localhost:3001/v1",
  [string] $EventId = "cb3d0e43-5866-4d0c-b892-860f8d53d02d",
  [string] $EventName = "Infantil Seed 487",
  [string] $TicketTypeId = "",
  [string] $AdminCpf = "11111111111",
  [string] $AdminPassword = "123456",
  [string] $SuperCpf = "44444444444",
  [string] $SuperPassword = "123456"
)
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$JsPath = Join-Path $ProjectRoot "run-financial-dashboard-real-api-tests.js"
if (!(Test-Path -LiteralPath $JsPath)) { throw "Nao encontrei o runner Node: $JsPath" }
$argsList = @($JsPath, "--baseUrl", $BaseUrl, "--eventId", $EventId, "--eventName", $EventName, "--adminCpf", $AdminCpf, "--adminPassword", $AdminPassword, "--superCpf", $SuperCpf, "--superPassword", $SuperPassword)
if (![string]::IsNullOrWhiteSpace($TicketTypeId)) { $argsList += @("--ticketTypeId", $TicketTypeId) }
node @argsList
if ($LASTEXITCODE -ne 0) { throw "Teste Node do dashboard financeiro terminou com erro." }