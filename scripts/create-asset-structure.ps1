# =============================================================================
# Script de Criacao da Estrutura de Assets - Tellstones
# =============================================================================

$baseDir = "C:\Users\Alice\Desktop\Tellstones\assets"

Write-Host "Criando estrutura de assets organizada..." -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# PARTE 1: Assets Base (Fixos)
# =============================================================================

Write-Host "Criando pastas BASE..." -ForegroundColor Yellow

# Audio
New-Item -Path "$baseDir\base\audio\sfx" -ItemType Directory -Force | Out-Null
New-Item -Path "$baseDir\base\audio\music" -ItemType Directory -Force | Out-Null
Write-Host "  OK base/audio/sfx/" -ForegroundColor Green
Write-Host "  OK base/audio/music/" -ForegroundColor Green

# Fonts
New-Item -Path "$baseDir\base\fonts" -ItemType Directory -Force | Out-Null
Write-Host "  OK base/fonts/" -ForegroundColor Green

# UI
New-Item -Path "$baseDir\base\ui\icons" -ItemType Directory -Force | Out-Null
New-Item -Path "$baseDir\base\ui\buttons" -ItemType Directory -Force | Out-Null
New-Item -Path "$baseDir\base\ui\overlays" -ItemType Directory -Force | Out-Null
Write-Host "  OK base/ui/icons/" -ForegroundColor Green
Write-Host "  OK base/ui/buttons/" -ForegroundColor Green
Write-Host "  OK base/ui/overlays/" -ForegroundColor Green

# Coins
New-Item -Path "$baseDir\base\coins" -ItemType Directory -Force | Out-Null
Write-Host "  OK base/coins/" -ForegroundColor Green

Write-Host ""

# =============================================================================
# PARTE 2: Assets de Temas (Personalizados)
# =============================================================================

Write-Host "Criando pastas de TEMAS..." -ForegroundColor Yellow

$themes = @(
    @{id = 'tellstones'; name = 'Tellstones (Padrao)' },
    @{id = 'tavern'; name = 'Taberna Medieval' },
    @{id = 'cyberpunk'; name = 'CyberPunk' },
    @{id = 'coliseum'; name = 'Coliseu' },
    @{id = 'arcane'; name = 'Arcane' }
)

foreach ($theme in $themes) {
    $themeId = $theme.id
    $themeName = $theme.name
    
    # Criar pasta do tema
    New-Item -Path "$baseDir\themes\$themeId" -ItemType Directory -Force | Out-Null
    
    # Criar subpasta de stones
    New-Item -Path "$baseDir\themes\$themeId\stones" -ItemType Directory -Force | Out-Null
    
    Write-Host "  OK themes/$themeId/ - $themeName" -ForegroundColor Green
}

Write-Host ""

# =============================================================================
# PARTE 3: Criar arquivos README em cada pasta
# =============================================================================

Write-Host "Criando arquivos README..." -ForegroundColor Yellow

# README para base/audio/sfx
$readmeSfx = @"
# Sound Effects (SFX)

Esta pasta contem efeitos sonoros fixos usados em todos os temas.

## Arquivos Esperados:
- click.wav - Som de click em botoes
- press.wav - Som de press em botoes
- stone-place.wav - Som ao colocar pedra
- stone-flip.wav - Som ao virar pedra
- challenge.wav - Som de desafio
- victory.wav - Som de vitoria
- swap.wav - Som de troca de pedras
- peek.wav - Som de espiar pedra
"@
Set-Content -Path "$baseDir\base\audio\sfx\README.md" -Value $readmeSfx

# README para base/audio/music
$readmeMusic = @"
# Background Music

Esta pasta contem musicas de fundo fixas.

## Arquivos Esperados:
- menu-theme.mp3 - Musica do menu principal
- game-theme.mp3 - Musica durante o jogo
"@
Set-Content -Path "$baseDir\base\audio\music\README.md" -Value $readmeMusic

# README para cada tema
foreach ($theme in $themes) {
    $themeId = $theme.id
    $themeName = $theme.name
    
    $readmeTheme = @"
# Tema: $themeName

## Estrutura de Assets

### Arquivos Principais:
- **preview.jpg** (400x300px) - Preview do tema para UI de selecao
- **background.jpg** - Fundo do jogo (1920x1080px recomendado)
- **table.png** - Tabuleiro/mesa (com transparencia)

### Pasta stones/:
- stone-1.png ate stone-7.png - Pedras numeradas do tema

## Notas de Design:
- Manter consistencia visual entre todos os assets
- Usar paleta de cores coerente com o tema
- Assets com transparencia devem usar PNG
- Backgrounds podem usar JPG para menor tamanho

## Status:
- [ ] Preview criado
- [ ] Background criado
- [ ] Table criado
- [ ] Stones criadas (7 pedras)
"@
    Set-Content -Path "$baseDir\themes\$themeId\README.md" -Value $readmeTheme
}

Write-Host "  OK READMEs criados em todas as pastas" -ForegroundColor Green
Write-Host ""

# =============================================================================
# RESUMO FINAL
# =============================================================================

$separator = "=" * 70
Write-Host $separator -ForegroundColor Cyan
Write-Host "ESTRUTURA DE ASSETS CRIADA COM SUCESSO!" -ForegroundColor Green
Write-Host $separator -ForegroundColor Cyan
Write-Host ""
Write-Host "Estrutura criada em: $baseDir" -ForegroundColor White
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "  1. Mover assets existentes para as novas pastas" -ForegroundColor White
Write-Host "  2. Criar/adicionar assets para novos temas" -ForegroundColor White
Write-Host "  3. Atualizar ThemeManager.ts com novos caminhos" -ForegroundColor White
Write-Host "  4. Testar carregamento de assets" -ForegroundColor White
Write-Host ""
