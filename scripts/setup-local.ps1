$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"

function Ensure-EnvFile([string]$template, [string]$target) {
  if (-not (Test-Path $target)) {
    Copy-Item $template $target
    Write-Host "Creado: $target"
  } else {
    Write-Host "Conservado: $target"
  }
}

Write-Host "Instalando dependencias del frontend..."
Push-Location $root
try {
  npm install
} finally {
  Pop-Location
}

Write-Host "Instalando dependencias del backend..."
Push-Location $backend
try {
  npm install
} finally {
  Pop-Location
}

Ensure-EnvFile (Join-Path $root ".env.example") (Join-Path $root ".env")
Ensure-EnvFile (Join-Path $backend ".env.example") (Join-Path $backend ".env")

Write-Host "Preparando la base de datos..."
Push-Location $backend
try {
  npm run db:prepare
  npm run db:migrate
  npm run db:seed
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Instalacion local terminada."
Write-Host "Backend:  cd backend; npm start"
Write-Host "Frontend: npm run dev"
Write-Host "Abrir:    http://localhost:5173/"
