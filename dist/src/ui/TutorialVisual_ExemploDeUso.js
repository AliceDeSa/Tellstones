"use strict";
/**
 * EXEMPLO DE USO: Tutorial Visual v6.1
 *
 * Este arquivo demonstra como usar os novos componentes visuais
 * para criar uma experiência de tutorial intuitiva.
 */
// Dentro do TellstonesTutorial ou TutorialMode:
function exemploPassoVisual() {
    // Instanciar TutorialUI (já existe no código)
    const tutorialUI = new window.TutorialUI();
    tutorialUI.create();
    // ========== PASSO 1: Colocar Pedra ==========
    // Atualizar progresso
    tutorialUI.updateProgress(1);
    // Destacar primeira pedra da reserva com brilho dourado
    tutorialUI.highlightElement('.stone-reserve-0', 'glow');
    // Tooltip curto apontando para a pedra
    tutorialUI.showTooltip('.stone-reserve-0', 'Arraste aqui', 'top');
    // Mascote aguardando
    tutorialUI.setMascotState('idle');
    // Quando jogador colocar a pedra:
    tutorialUI.removeHighlights();
    tutorialUI.hideTooltip();
    tutorialUI.mascotReact('happy', 2000); // Comemora e volta ao idle
    // ========== PASSO 2: Virar Pedra ==========
    tutorialUI.updateProgress(2);
    // Destaque pulsante na pedra que foi colocada
    tutorialUI.highlightElement('.stone-slot-0', 'pulse');
    tutorialUI.showTooltip('.stone-slot-0', 'Clique para virar', 'bottom');
    // Quando jogador virar:
    tutorialUI.removeHighlights();
    tutorialUI.hideTooltip();
    tutorialUI.mascotReact('happy', 2000);
    // ========== PASSO 3: Desafio (Botão) ==========
    tutorialUI.updateProgress(5);
    // Destaque no botão de desafiar
    tutorialUI.highlightElement('#btn-desafiar', 'pulse');
    tutorialUI.showTooltip('#btn-desafiar', 'Clique aqui', 'left');
    // Se jogador demorar:
    setTimeout(() => {
        tutorialUI.setMascotState('thinking'); // Mascote fica pensativo
    }, 5000);
    // Quando clicar:
    tutorialUI.removeHighlights();
    tutorialUI.hideTooltip();
    tutorialUI.mascotReact('excited', 2000);
    // ========== CONCLUSÃO ==========
    tutorialUI.updateProgress(9); // Todos os passos completos
    tutorialUI.setMascotState('excited');
}
/**
 * INTEGRAÇÃO RECOMENDADA
 *
 * Integrar no arquivo existente TellstonesTutorial.js:
 */
// No método `avancarPasso(novoIdx: number)`:
window.tellstonesTutorial.avancarPasso = function (novoIdx) {
    // ... lógica existente ...
    // Adicionar feedback visual:
    if (this.ui) {
        this.ui.updateProgress(novoIdx + 1); // +1 porque índice começa em 0
        this.ui.removeHighlights(); // Limpa highlights anteriores
        this.ui.hideTooltip();
        // Aplicar novo highlight baseado no passo
        switch (novoIdx) {
            case 1: // Colocar pedra
                this.ui.highlightElement('.stone-reserve-0', 'glow');
                this.ui.showTooltip('.stone-reserve-0', 'Arraste', 'top');
                break;
            case 2: // Virar pedra
                this.ui.highlightElement('.stone-slot-0', 'pulse');
                this.ui.showTooltip('.stone-slot-0', 'Vire', 'bottom');
                break;
            case 5: // Desafiar
                this.ui.highlightElement('#btn-desafiar', 'pulse');
                this.ui.showTooltip('#btn-desafiar', 'Desafie!', 'left');
                break;
            // ... outros passos
        }
    }
};
// No método `registrarAcaoConcluida()`:
window.tellstonesTutorial.registrarAcaoConcluida = function () {
    // ... lógica existente ...
    // Feedback visual positivo:
    if (this.ui) {
        this.ui.mascotReact('happy', 1500);
    }
};
