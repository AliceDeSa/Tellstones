# =============================================================================
# Script de Migracao de Assets - Tellstones
# =============================================================================
# Migra assets existentes para a nova estrutura organizada
# Baseado na situacao atual: Preview/Background = Tavern, Table/Stones = Tellstones
# =============================================================================

$baseDir = "C:\Users\Alice\Desktop\Tellstones\assets"

Write-Host "Iniciando migracao de assets..." -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# FASE 1: Migrar Tema TELLSTONES (Completo)
# =============================================================================

Write-Host "FASE 1: Migrando tema TELLSTONES..." -ForegroundColor Yellow
Write-Host ""

# Background - usar bg_genneral.png
if (Test-Path "$baseDir\img\backgrounds\bg_genneral.png") {
    Copy-Item "$baseDir\img\backgrounds\bg_genneral.png" "$baseDir\themes\tellstones\background.jpg" -Force
    Write-Host "  OK Background copiado (bg_genneral.png)" -ForegroundColor Green
}
else {
    Write-Host "  AVISO: bg_genneral.png nao encontrado" -ForegroundColor Yellow
}

# Table - usar Tabuleiro.jpg
if (Test-Path "$baseDir\img\tables\classic\Tabuleiro.jpg") {
    Copy-Item "$baseDir\img\tables\classic\Tabuleiro.jpg" "$baseDir\themes\tellstones\table.png" -Force
    Write-Host "  OK Table copiado (Tabuleiro.jpg)" -ForegroundColor Green
}
else {
    Write-Host "  AVISO: Tabuleiro.jpg nao encontrado" -ForegroundColor Yellow
}

# Stones - copiar todas as 7 pedras
$stoneMapping = @{
    'Stone_Alaude.png'   = 'stone-1.png'
    'Stone_armadura.png' = 'stone-2.png'
    'Stone_Banquete.png' = 'stone-3.png'
    'Stone_Caneca.png'   = 'stone-4.png'
    'Stone_Espada.png'   = 'stone-5.png'
    'Stone_Missao.png'   = 'stone-6.png'
    'Stone_Tesouro.png'  = 'stone-7.png'
}

$stoneCount = 0
foreach ($oldName in $stoneMapping.Keys) {
    $newName = $stoneMapping[$oldName]
    $sourcePath = "$baseDir\img\stones\new_set\$oldName"
    $destPath = "$baseDir\themes\tellstones\stones\$newName"
    
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $destPath -Force
        $stoneCount++
    }
    else {
        Write-Host "  AVISO: $oldName nao encontrado" -ForegroundColor Yellow
    }
}
Write-Host "  OK $stoneCount/7 Stones copiadas" -ForegroundColor Green

# Preview - copiar background como preview temporario (precisa redimensionar depois)
if (Test-Path "$baseDir\img\backgrounds\bg_genneral.png") {
    Copy-Item "$baseDir\img\backgrounds\bg_genneral.png" "$baseDir\themes\tellstones\preview.jpg" -Force
    Write-Host "  OK Preview criado (temporario - precisa redimensionar para 400x300)" -ForegroundColor Yellow
}

Write-Host ""

# =============================================================================
# FASE 2: Migrar Tema TAVERN (Parcial)
# =============================================================================

Write-Host "FASE 2: Migrando tema TAVERN..." -ForegroundColor Yellow
Write-Host ""

# Background - usar bg_taverna.png
if (Test-Path "$baseDir\img\backgrounds\bg_taverna.png") {
    Copy-Item "$baseDir\img\backgrounds\bg_taverna.png" "$baseDir\themes\tavern\background.jpg" -Force
    Write-Host "  OK Background copiado (bg_taverna.png)" -ForegroundColor Green
}
else {
    Write-Host "  AVISO: bg_taverna.png nao encontrado" -ForegroundColor Yellow
}

# Preview - copiar background como preview temporario
if (Test-Path "$baseDir\img\backgrounds\bg_taverna.png") {
    Copy-Item "$baseDir\img\backgrounds\bg_taverna.png" "$baseDir\themes\tavern\preview.jpg" -Force
    Write-Host "  OK Preview criado (temporario - precisa redimensionar para 400x300)" -ForegroundColor Yellow
}

# Table - usar bg_mesa.png como placeholder
if (Test-Path "$baseDir\img\tables\classic\bg_mesa.png") {
    Copy-Item "$baseDir\img\tables\classic\bg_mesa.png" "$baseDir\themes\tavern\table.png" -Force
    Write-Host "  OK Table copiado (bg_mesa.png - PLACEHOLDER)" -ForegroundColor Yellow
}
else {
    Write-Host "  AVISO: bg_mesa.png nao encontrado - Table nao criado" -ForegroundColor Red
}

# Stones - copiar do Tellstones como placeholder
Write-Host "  Copiando stones do Tellstones como PLACEHOLDER..." -ForegroundColor Yellow
foreach ($newName in $stoneMapping.Values) {
    $sourcePath = "$baseDir\themes\tellstones\stones\$newName"
    $destPath = "$baseDir\themes\tavern\stones\$newName"
    
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $destPath -Force
    }
}
Write-Host "  OK 7/7 Stones copiadas (PLACEHOLDERS - criar stones medievais depois)" -ForegroundColor Yellow

Write-Host ""

# =============================================================================
# FASE 3: Migrar Assets BASE (Fixos)
# =============================================================================

Write-Host "FASE 3: Migrando assets BASE..." -ForegroundColor Yellow
Write-Host ""

# Audio
if (Test-Path "$baseDir\audio") {
    $audioFiles = Get-ChildItem "$baseDir\audio" -File
    foreach ($file in $audioFiles) {
        $ext = $file.Extension.ToLower()
        if ($ext -eq '.wav') {
            Copy-Item $file.FullName "$baseDir\base\audio\sfx\" -Force
        }
        elseif ($ext -eq '.mp3') {
            Copy-Item $file.FullName "$baseDir\base\audio\music\" -Force
        }
    }
    Write-Host "  OK Audio files migrados" -ForegroundColor Green
}

# Fonts
if (Test-Path "$baseDir\fonts") {
    $fontFiles = Get-ChildItem "$baseDir\fonts" -File
    foreach ($file in $fontFiles) {
        Copy-Item $file.FullName "$baseDir\base\fonts\" -Force
    }
    Write-Host "  OK Fonts migrados" -ForegroundColor Green
}

# Coins
if (Test-Path "$baseDir\img\coins") {
    $coinFiles = Get-ChildItem "$baseDir\img\coins" -File
    foreach ($file in $coinFiles) {
        Copy-Item $file.FullName "$baseDir\base\coins\" -Force
    }
    Write-Host "  OK Coins migrados" -ForegroundColor Green
}

# UI Icons
if (Test-Path "$baseDir\img\ui") {
    $uiFiles = Get-ChildItem "$baseDir\img\ui" -File
    foreach ($file in $uiFiles) {
        Copy-Item $file.FullName "$baseDir\base\ui\icons\" -Force
    }
    Write-Host "  OK UI icons migrados" -ForegroundColor Green
}

Write-Host ""

# =============================================================================
# RESUMO FINAL
# =============================================================================

$separator = "=" * 70
Write-Host $separator -ForegroundColor Cyan
Write-Host "MIGRACAO CONCLUIDA!" -ForegroundColor Green
Write-Host $separator -ForegroundColor Cyan
Write-Host ""

Write-Host "Temas criados:" -ForegroundColor White
Write-Host "  1. Tellstones - COMPLETO (precisa redimensionar preview)" -ForegroundColor Green
Write-Host "  2. Tavern - PARCIAL (precisa assets customizados)" -ForegroundColor Yellow
Write-Host ""

Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "  1. Redimensionar previews para 400x300px" -ForegroundColor White
Write-Host "  2. Criar mesa de taverna customizada" -ForegroundColor White
Write-Host "  3. Criar pedras medievais para tema Tavern" -ForegroundColor White
Write-Host "  4. Atualizar ThemeManager.ts com novos caminhos" -ForegroundColor White
Write-Host "  5. Testar carregamento dos temas" -ForegroundColor White
Write-Host ""

Write-Host "Assets migrados para:" -ForegroundColor Cyan
Write-Host "  - assets/themes/tellstones/" -ForegroundColor White
Write-Host "  - assets/themes/tavern/" -ForegroundColor White
Write-Host "  - assets/base/" -ForegroundColor White
Write-Host ""
