$ErrorActionPreference = "Stop"

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)]
    [scriptblock]$Command
  )

  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code $LASTEXITCODE"
  }
}

Push-Location $PSScriptRoot
try {
  Push-Location "backend"
  try {
    Invoke-Checked { .\.venv\Scripts\python.exe -m pytest }
    Invoke-Checked { .\.venv\Scripts\python.exe scripts\validate_curation.py }
    Invoke-Checked { .\.venv\Scripts\python.exe scripts\launch_preflight.py }
  }
  finally {
    Pop-Location
  }

  Push-Location "frontend"
  try {
    Invoke-Checked { npm run test:corpus }
    Invoke-Checked { npm run test:corpus-moderation }
    Invoke-Checked { npm run test:diet }
    Invoke-Checked { npm run test:diet-import }
    Invoke-Checked { npm run test:barcode-scanner }
    Invoke-Checked { npm run test:adaptive-tdee }
    Invoke-Checked { npm run test:attractiveness-evidence }
    Invoke-Checked { npm run test:accessibility }
    Invoke-Checked { npm run test:ratios }
    Invoke-Checked { npm run test:body-composition }
    Invoke-Checked { npm run test:comparison }
    Invoke-Checked { npm run test:silhouette }
    Invoke-Checked { npm run test:sizes }
    Invoke-Checked { npm run test:workouts }
    Invoke-Checked { npm run test:photos }
    Invoke-Checked { npm run test:onboarding }
    Invoke-Checked { npm run test:notifications }
    Invoke-Checked { npm run test:haptics }
    Invoke-Checked { npm run test:native-shell }
    Invoke-Checked { npm run test:health-sync }
    Invoke-Checked { npm run test:live-updates }
    Invoke-Checked { npm run test:launch-readiness }
    Invoke-Checked { npm run test:provider-decisions }
    Invoke-Checked { npm run test:native-release }
    Invoke-Checked { npm run test:case-log-submissions }
    Invoke-Checked { npm run test:widget-snapshot }
    Invoke-Checked { npm run test:native-backup }
    Invoke-Checked { npm run test:share-dashboard }
    Invoke-Checked { npm run test:share-snapshots }
    Invoke-Checked { npm run test:storage }
    Invoke-Checked { npm run test:theme }
    Invoke-Checked { npm run test:i18n }
    Invoke-Checked { npm run test:data-explainer }
    Invoke-Checked { npm run test:tone }
    Invoke-Checked { npm run test:magic-account }
    Invoke-Checked { npm run test:snapshot-trends }
    Invoke-Checked { npm run test:history-import }
    Invoke-Checked { npm run test:local-backup }
    Invoke-Checked { npm run test:encrypted-sync }
    Invoke-Checked { npm run test:personal-data-api }
    Invoke-Checked { npm run test:tracking }
    Invoke-Checked { npm run test:protocols }
    Invoke-Checked { npm run test:procedures }
    Invoke-Checked { npm run test:bloodwork }
    Invoke-Checked { npm run test:local-targets }
    Invoke-Checked { npm run test:goal-targets }
    Invoke-Checked { npm run test:measurement-guides }
    Invoke-Checked { npm run test:measurement-schema }
    Invoke-Checked { npm run test:entitlements }
    Invoke-Checked { npm run test:error-monitoring }
    Invoke-Checked { npm run test:analytics }
    Invoke-Checked { npm run test:face-measurements }
    Invoke-Checked { npm run test:face-model-candidates }
    Invoke-Checked { npm run test:result-card }
    Invoke-Checked { npm run test:progress-report }
    Invoke-Checked { npm run test:population }
    Invoke-Checked { npm run build }
    Invoke-Checked { npm run test:e2e }
    Invoke-Checked { npm run capture:screenshots }
  }
  finally {
    Pop-Location
  }

  Remove-Item -LiteralPath "frontend\test-results" -Recurse -Force -ErrorAction SilentlyContinue
}
finally {
  Pop-Location
}
