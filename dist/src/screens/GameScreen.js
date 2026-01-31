import { Logger, LogCategory } from '../utils/Logger.js';
export class GameScreen {
    constructor() {
        this.container = null;
        this.container = document.getElementById('game');
        if (!this.container) {
            Logger.error(LogCategory.UI, '[GameScreen] Container #game não encontrado!');
        }
    }
    show() {
        if (this.container) {
            this.container.style.display = 'block';
            this.container.style.visibility = 'visible';
            this.container.style.opacity = '1';
            Logger.info(LogCategory.UI, '[GameScreen] Tela exibida');
        }
    }
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            Logger.info(LogCategory.UI, '[GameScreen] Tela escondida');
        }
    }
}
