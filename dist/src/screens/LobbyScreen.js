// =========================
// LobbyScreen - Tela de Lobby Online
// =========================
import { Logger, LogCategory } from '../utils/Logger.js';
export class LobbyScreen {
    constructor() {
        this.container = null;
        this.isVisible = false;
        this.container = document.getElementById('lobby');
        if (!this.container) {
            Logger.error(LogCategory.UI, '[LobbyScreen] Container #lobby não encontrado!');
        }
        Logger.info(LogCategory.UI, '[LobbyScreen] Tela de lobby inicializada');
    }
    show() {
        if (this.container) {
            this.container.style.display = 'flex';
            this.isVisible = true;
            Logger.info(LogCategory.UI, '[LobbyScreen] Tela exibida');
        }
    }
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            this.isVisible = false;
            Logger.info(LogCategory.UI, '[LobbyScreen] Tela escondida');
        }
    }
    update() {
        // O RoomManager já gerencia o conteúdo dinâmico do lobby
        // (lista de jogadores, espectadores, código da sala)
        // Esta tela apenas controla visibilidade
    }
    destroy() {
        // Container é parte do HTML fixo, não deve ser removido
        this.hide();
    }
    isActive() {
        return this.isVisible;
    }
}
