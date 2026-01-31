import { Logger, LogCategory } from '../utils/Logger.js';
/**
 * GameModesScreen - Tela de seleção de modo de jogo
 * Exibe opções: Tutorial, PvE, Online, Campanha
 */
export class GameModesScreen {
    constructor() {
        this.container = null;
        this.container = document.getElementById('game-modes-screen');
        if (!this.container) {
            Logger.error(LogCategory.UI, '[GameModesScreen] Container #game-modes-screen não encontrado!');
        }
    }
    show() {
        if (this.container) {
            this.container.style.display = 'block';
            this.container.style.visibility = 'visible';
            this.container.style.opacity = '1';
            Logger.info(LogCategory.UI, '[GameModesScreen] Tela exibida');
        }
    }
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            Logger.info(LogCategory.UI, '[GameModesScreen] Tela escondida');
        }
    }
    update() {
        // Atualizar conteúdo se necessário
    }
    destroy() {
        // Cleanup se necessário
    }
}
