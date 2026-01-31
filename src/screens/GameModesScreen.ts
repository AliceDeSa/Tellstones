import { Screen } from './ScreenManager.js';
import { Logger, LogCategory } from '../utils/Logger.js';

/**
 * GameModesScreen - Tela de seleção de modo de jogo
 * Exibe opções: Tutorial, PvE, Online, Campanha
 */
export class GameModesScreen implements Screen {
    private container: HTMLElement | null = null;

    constructor() {
        this.container = document.getElementById('game-modes-screen');
        if (!this.container) {
            Logger.error(LogCategory.UI, '[GameModesScreen] Container #game-modes-screen não encontrado!');
        }
    }

    show(): void {
        if (this.container) {
            this.container.style.display = 'block';
            this.container.style.visibility = 'visible';
            this.container.style.opacity = '1';
            Logger.info(LogCategory.UI, '[GameModesScreen] Tela exibida');
        }
    }

    hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
            Logger.info(LogCategory.UI, '[GameModesScreen] Tela escondida');
        }
    }

    update(): void {
        // Atualizar conteúdo se necessário
    }

    destroy(): void {
        // Cleanup se necessário
    }
}
