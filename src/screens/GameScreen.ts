import { Screen } from './ScreenManager.js';
import { Logger, LogCategory } from '../utils/Logger.js';

export class GameScreen implements Screen {
    private container: HTMLElement | null = null;

    constructor() {
        this.container = document.getElementById('game');
        if (!this.container) {
            Logger.error(LogCategory.UI, '[GameScreen] Container #game não encontrado!');
        }
    }

    show(): void {
        if (this.container) {
            this.container.style.display = 'block';
            this.container.style.visibility = 'visible';
            this.container.style.opacity = '1';
            Logger.info(LogCategory.UI, '[GameScreen] Tela exibida');
        }
    }

    hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
            Logger.info(LogCategory.UI, '[GameScreen] Tela escondida');
        }
    }
}
