param(
    [Parameter(Mandatory = $false)]
    [string]$ApiKey = $env:NOTIFICORE_API_KEY,

    [Parameter(Mandatory = $false)]
    [string]$TemplateId = $env:NOTIFICORE_TEMPLATE_ID,

    [Parameter(Mandatory = $false)]
    [string]$Sender = $env:NOTIFICORE_SENDER,

    [Parameter(Mandatory = $false)]
    [string]$Channel = "SMS",

    [Parameter(Mandatory = $false)]
    [string]$OneApiUrl = "http://one-api.notificore.ru",

    [Parameter(Mandatory = $false)]
    [int]$CodeDigits = 6,

    [Parameter(Mandatory = $false)]
    [int]$CodeLifetimeSec = 300,

    [Parameter(Mandatory = $false)]
    [int]$CodeMaxTries = 3
)

if (-not $ApiKey) {
    throw "NOTIFICORE_API_KEY is required. Pass -ApiKey or set env NOTIFICORE_API_KEY."
}
if (-not $TemplateId) {
    throw "NOTIFICORE_TEMPLATE_ID is required. Pass -TemplateId or set env NOTIFICORE_TEMPLATE_ID."
}
if (-not $Sender) {
    throw "NOTIFICORE_SENDER is required. Pass -Sender or set env NOTIFICORE_SENDER."
}

$env:TEST_MODE = "false"
$env:NOTIFICORE_OTP_ENABLED = "true"
$env:NOTIFICORE_API_KEY = $ApiKey
$env:NOTIFICORE_TEMPLATE_ID = $TemplateId
$env:NOTIFICORE_SENDER = $Sender
$env:NOTIFICORE_CHANNEL = $Channel
$env:NOTIFICORE_ONE_API_URL = $OneApiUrl
$env:NOTIFICORE_CODE_DIGITS = "$CodeDigits"
$env:NOTIFICORE_CODE_LIFETIME_SEC = "$CodeLifetimeSec"
$env:NOTIFICORE_CODE_MAX_TRIES = "$CodeMaxTries"

Write-Host "Starting backend with Notificore OTP enabled..." -ForegroundColor Green
Write-Host "Channel: $Channel, TemplateId: $TemplateId, Sender: $Sender"
Write-Host "OneAPI: $OneApiUrl"

uvicorn main:app --reload --host 0.0.0.0 --port 8000
