# start.ps1 — Levanta PyWI con la configuración correcta en Windows.
# Uso: .\start.ps1 [-Down] [-NoBuild]
#   -Down    : ejecuta 'docker compose down' antes de levantar
#   -NoBuild : omite --build (usa la imagen en caché)
#
# amd64 (x64) → docker compose up (GPU NVIDIA ya incluida en el base)
# arm64        → override docker-compose.arm64.yml (anula GPU, activa NPU)

param(
    [switch]$Down,
    [switch]$NoBuild
)

$ARCH = (Get-CimInstance Win32_Processor | Select-Object -First 1).Architecture
# Architecture values: 0=x86, 5=ARM, 9=x64, 12=ARM64
$BASE = "docker-compose.yml"

Write-Host ""
Write-Host "  ██████╗ ██╗   ██╗██╗    ██╗██╗" -ForegroundColor Cyan
Write-Host "  ██╔══██╗╚██╗ ██╔╝██║    ██║██║" -ForegroundColor Cyan
Write-Host "  ██████╔╝ ╚████╔╝ ██║ █╗ ██║██║" -ForegroundColor Cyan
Write-Host "  ██╔═══╝   ╚██╔╝  ██║███╗██║██║" -ForegroundColor Cyan
Write-Host "  ██║        ██║   ╚███╔███╔╝██║" -ForegroundColor Cyan
Write-Host "  ╚═╝        ╚═╝    ╚══╝╚══╝ ╚═╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Python Web IDE — start.ps1" -ForegroundColor White
Write-Host ""

if ($ARCH -eq 12) {
    # ARM64 — usar override que anula GPU y activa NPU
    $ACCEL    = "NPU Rockchip / ARM64"
    $OVERRIDE = "docker-compose.arm64.yml"
    Write-Host "  Arquitectura : ARM64" -ForegroundColor Gray
    Write-Host "  Acelerador   : $ACCEL" -ForegroundColor Yellow
    Write-Host "  Override     : $OVERRIDE" -ForegroundColor Green
    Write-Host ""

    if ($Down) {
        Write-Host "  → Bajando contenedores anteriores..." -ForegroundColor Yellow
        docker compose -f $BASE -f $OVERRIDE down
    }

    Write-Host "  → Levantando PyWI (arm64 + NPU)..." -ForegroundColor Green
    if ($NoBuild) {
        docker compose -f $BASE -f $OVERRIDE up -d
    } else {
        docker compose -f $BASE -f $OVERRIDE up -d --build
    }

    Write-Host ""
    Write-Host "  Comandos útiles:" -ForegroundColor Gray
    Write-Host "    Ver logs : docker compose -f $BASE -f $OVERRIDE logs -f"
    Write-Host "    Bajar    : docker compose -f $BASE -f $OVERRIDE down"
} else {
    # amd64/x64 — el base ya incluye la GPU NVIDIA, no se necesita override
    $ACCEL = "GPU NVIDIA (vía docker-compose.yml base)"
    Write-Host "  Arquitectura : x64 / amd64" -ForegroundColor Gray
    Write-Host "  Acelerador   : $ACCEL" -ForegroundColor Yellow
    Write-Host ""

    if ($Down) {
        Write-Host "  → Bajando contenedores anteriores..." -ForegroundColor Yellow
        docker compose down
    }

    Write-Host "  → Levantando PyWI (amd64 + GPU NVIDIA)..." -ForegroundColor Green
    if ($NoBuild) {
        docker compose up -d
    } else {
        docker compose up -d --build
    }

    Write-Host ""
    Write-Host "  Verificar GPU dentro del contenedor:" -ForegroundColor Gray
    Write-Host "    docker compose exec web-ide nvidia-smi"
    Write-Host "  Ver logs:"
    Write-Host "    docker compose logs -f"
    Write-Host "  Bajar:"
    Write-Host "    docker compose down"
}

Write-Host ""
Write-Host "  ✓ PyWI disponible en http://localhost:3000" -ForegroundColor Green
Write-Host ""
