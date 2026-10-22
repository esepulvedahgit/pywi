# start.ps1 — Levanta PyWI con docker compose.
# Uso: .\start.ps1 [-Down]
#   -Down : ejecuta 'docker compose down' antes de levantar
#
# Requisitos previos:
#   1. Imagen cargada: docker load < python-web-ide-arm64.tar.gz
#   2. Archivo .env.local con JWT_SECRET, ENCRYPTION_KEY y APP_URL

param(
    [switch]$Down
)

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

if ($Down) {
    Write-Host "  → Bajando contenedores anteriores..." -ForegroundColor Yellow
    docker compose down
}

Write-Host "  → Levantando PyWI..." -ForegroundColor Green
docker compose up -d

Write-Host ""
Write-Host "  Comandos útiles:" -ForegroundColor Gray
Write-Host "    Ver logs : docker compose logs -f"
Write-Host "    Bajar    : docker compose down"
Write-Host ""
Write-Host "  ✓ PyWI disponible en http://localhost:3000" -ForegroundColor Green
Write-Host ""
