$ErrorActionPreference = "Stop"

Push-Location $PSScriptRoot
try {
  Push-Location "backend"
  try {
    .\.venv\Scripts\python.exe -m pytest
  }
  finally {
    Pop-Location
  }

  Push-Location "frontend"
  try {
    npm run test:corpus
    npm run test:population
    npm run build
    npm run test:e2e
    npm run capture:screenshots
  }
  finally {
    Pop-Location
  }

  Remove-Item -LiteralPath "frontend\test-results" -Recurse -Force -ErrorAction SilentlyContinue
}
finally {
  Pop-Location
}
