// =========================
// LobbyScreen - Tela de Lobby Online
// =========================

import { Screen } from './ScreenManager.js';
import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';
import { Logger, LogCategory } from '../utils/Logger.js';

export class LobbyScreen implements Screen {
    private container: HTMLElement | null = null;
    private isVisible: boolean = false;

    constructor() {
        this.container = document.getElementById('lobby');

        if (!this.container) {
            Logger.error(LogCategory.UI, '[LobbyScreen] Container #lobby não encontrado!');
        }

        Logger.info(LogCategory.UI, '[LobbyScreen] Tela de lobby inicializada');
    }

    show(): void {
        if (this.container) {
            this.container.style.display = 'flex';
            this.isVisible = true;
            Logger.info(LogCategory.UI, '[LobbyScreen] Tela exibida');
        }
    }

    hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
            this.isVisible = false;
            Logger.info(LogCategory.UI, '[LobbyScreen] Tela escondida');
        }
    }

    update(): void {
        // O RoomManager já gerencia o conteúdo dinâmico do lobby
        // (lista de jogadores, espectadores, código da sala)
        // Esta tela apenas controla visibilidade
    }

    destroy(): void {
        // Container é parte do HTML fixo, não deve ser removido
        this.hide();
    }

    isActive(): boolean {
        return this.isVisible;
    }
}
