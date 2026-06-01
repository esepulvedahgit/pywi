# start.ps1 — Levanta PyWI con el override Docker Compose correcto en Windows.
# Uso: .\start.ps1 [-Down] [-NoBuild]
#   -Down    : ejecuta 'docker compose down' antes de levantar
#   -NoBuild : omite --build (usa la imagen en caché)
#
# En Windows amd64 siempre usa docker-compose.amd64.yml (GPU NVIDIA).
# Para arm64 (ej. Snapdragon X Elite) usa docker-compose.arm64.yml.

param(
    [switch]$Down,
    [switch]$NoBuild
)

$BASE     = "docker-compose.yml"
$ARCH     = (Get-CimInstance Win32_Processor | Select-Object -First 1).Architecture
# ARCH values: 0=x86, 5=ARM, 9=x64, 12=ARM64

if ($ARCH -eq 12) {
    $OVERRIDE = "docker-compose.arm64.yml"
    $ACCEL    = "NPU Rockchip / ARM64"
} else {
    $OVERRIDE = "docker-compose.amd64.yml"
    $ACCEL    = "GPU NVIDIA (amd64)"
}

$BUILD_FLAG = if ($NoBuild) { "" } else { "--build" }

Write-Host ""
Write-Host "  ██████╗ ██╗   ██╗██╗    ██╗██╗" -ForegroundColor Cyan
Write-Host "  ██╔══██╗╚██╗ ██╔╝██║    ██║██║" -ForegroundColor Cyan
Write-Host "  ██████╔╝ ╚████╔╝ ██║ █╗ ██║██║" -ForegroundColor Cyan
Write-Host "  ██╔═══╝   ╚██╔╝  ██║███╗██║██║" -ForegroundColor Cyan
Write-Host "  ██║        ██║   ╚███╔███╔╝██║" -ForegroundColor Cyan
Write-Host "  ╚═╝        ╚═╝    ╚══╝╚══╝ ╚═╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Python Web IDE — start.ps1" -ForegroundColor White
Write-Host "  Arquitectura detectada : $ARCH (9=x64, 12=ARM64)" -ForegroundColor Gray
Write-Host "  Acelerador             : $ACCEL" -ForegroundColor Yellow
Write-Host "  Override               : $OVERRIDE" -ForegroundColor Green
Write-Host ""

if ($Down) {
    Write-Host "  → Bajando contenedores anteriores..." -ForegroundColor Yellow
    docker compose -f $BASE -f $OVERRIDE down
}

Write-Host "  → Levantando PyWI con override $OVERRIDE..." -ForegroundColor Green
if ($BUILD_FLAG) {
    docker compose -f $BASE -f $OVERRIDE up -d --build
} else {
    docker compose -f $BASE -f $OVERRIDE up -d
}

Write-Host ""
Write-Host "  ✓ PyWI disponible en http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "  Comandos útiles:" -ForegroundColor Gray
Write-Host "    Ver logs    : docker compose -f $BASE -f $OVERRIDE logs -f"
Write-Host "    Verificar GPU: docker compose -f $BASE -f $OVERRIDE exec web-ide nvidia-smi"
Write-Host "    Bajar       : docker compose -f $BASE -f $OVERRIDE down"
Write-Host ""
