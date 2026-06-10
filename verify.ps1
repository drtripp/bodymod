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
  }
  finally {
    Pop-Location
  }

  Push-Location "frontend"
  try {
    Invoke-Checked { npm run test:corpus }
    Invoke-Checked { npm run test:diet }
    Invoke-Checked { npm run test:ratios }
    Invoke-Checked { npm run test:sizes }
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
