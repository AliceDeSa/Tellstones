// =========================
// LobbyScreen - Tela de Lobby Online
// =========================

import { Screen } from './ScreenManager.js';
import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';
import { Logger, LogCategory } from '../utils/Logger.js';
import LocaleManager from '../data/LocaleManager.js';

export class LobbyScreen implements Screen {
    private container: HTMLElement | null = null;
    private isVisible: boolean = false;
    private roomCode: string = '';
    private isCreator: boolean = false;

    // Elementos DOM
    private codeElement: HTMLElement | null = null;
    private playersListElement: HTMLElement | null = null;
    private spectatorsListElement: HTMLElement | null = null;
    private startButton: HTMLButtonElement | null = null;
    private backButton: HTMLButtonElement | null = null;
    private titleElement: HTMLElement | null = null;

    constructor() {
        this.container = document.getElementById('lobby');

        if (!this.container) {
            Logger.error(LogCategory.UI, '[LobbyScreen] Container #lobby não encontrado!');
            return;
        }

        // Capturar elementos DOM
        this.codeElement = document.getElementById('lobby-codigo');
        this.playersListElement = document.getElementById('lobby-jogadores');
        this.spectatorsListElement = document.getElementById('lobby-espectadores');
        this.startButton = document.getElementById('lobby-iniciar') as HTMLButtonElement;
        this.backButton = document.getElementById('back-from-lobby-btn') as HTMLButtonElement;

        // Criar título se não existir
        this.titleElement = this.container.querySelector('h2');

        // Registrar listeners do EventBus
        this.registerEventListeners();

        // Configurar botão de voltar
        if (this.backButton) {
            this.backButton.onclick = () => this.handleBackClick();
        }

        // Configurar botão de iniciar
        if (this.startButton) {
            this.startButton.onclick = () => this.handleStartClick();
        }

        Logger.info(LogCategory.UI, '[LobbyScreen] Tela de lobby inicializada');
    }

    /**
     * Registra listeners do EventBus
     */
    private registerEventListeners(): void {
        // Atualizar lista de jogadores
        EventBus.on(EventType.ROOM_PLAYERS_UPDATE, (data) => {
            this.updatePlayersList(data.players);
        });

        // Atualizar lista de espectadores
        EventBus.on(EventType.ROOM_SPECTATORS_UPDATE, (data) => {
            this.updateSpectatorsList(data.spectators);
        });

        // Iniciar jogo
        EventBus.on(EventType.ROOM_START, (data) => {
            this.roomCode = data.roomCode;
        });

        // Atualizar traduções quando idioma mudar
        EventBus.on(EventType.LANGUAGE_CHANGE, () => {
            this.updateTranslations();
        });

        Logger.info(LogCategory.UI, '[LobbyScreen] EventBus listeners registrados');
    }

    /**
     * Exibe a tela de lobby
     */
    show(): void {
        if (this.container) {
            this.container.style.display = 'flex';
            this.isVisible = true;
            this.updateTranslations();
            Logger.info(LogCategory.UI, '[LobbyScreen] Tela exibida');
        }
    }

    /**
     * Esconde a tela de lobby
     */
    hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
            this.isVisible = false;
            Logger.info(LogCategory.UI, '[LobbyScreen] Tela escondida');
        }
    }

    /**
     * Atualiza a tela (não usado)
     */
    update(): void {
        // O RoomManager já gerencia o conteúdo dinâmico do lobby
        // Esta tela apenas controla visibilidade e UI
    }

    /**
     * Destrói a tela
     */
    destroy(): void {
        // Container é parte do HTML fixo, não deve ser removido
        this.hide();
    }

    /**
     * Define informações da sala
     */
    setRoomInfo(code: string, isCreator: boolean): void {
        this.roomCode = code;
        this.isCreator = isCreator;

        // Atualizar código da sala
        if (this.codeElement) {
            this.codeElement.textContent = `${LocaleManager.t('lobby.roomCode')}: ${code}`;
        }

        // Mostrar/esconder botão de iniciar
        if (this.startButton) {
            this.startButton.style.display = isCreator ? 'inline-block' : 'none';
        }

        Logger.info(LogCategory.UI, `[LobbyScreen] Sala configurada: ${code}, Criador: ${isCreator}`);
    }

    /**
     * Atualiza lista de jogadores
     */
    private updatePlayersList(players: any[]): void {
        if (!this.playersListElement) return;

        this.playersListElement.innerHTML = players
            .map((player: any) => `<li>${player.nome || player.name || 'Jogador'}</li>`)
            .join('');

        Logger.info(LogCategory.UI, `[LobbyScreen] Lista de jogadores atualizada: ${players.length}`);
    }

    /**
     * Atualiza lista de espectadores
     */
    private updateSpectatorsList(spectators: any[]): void {
        if (!this.spectatorsListElement) return;

        this.spectatorsListElement.innerHTML = spectators
            .map((spectator: any) => `<li>${spectator.nome || spectator.name || 'Espectador'}</li>`)
            .join('');

        Logger.info(LogCategory.UI, `[LobbyScreen] Lista de espectadores atualizada: ${spectators.length}`);
    }

    /**
     * Handler para botão de voltar
     */
    private handleBackClick(): void {
        // Som de click via EventBus
        EventBus.emit(EventType.AUDIO_PLAY_CLICK, {});

        // Sair da sala
        EventBus.emit(EventType.ROOM_LEAVE, {});

        // Voltar ao menu principal
        EventBus.emit(EventType.SCREEN_CHANGE, { from: 'lobby', to: 'main-menu' });

        Logger.info(LogCategory.UI, '[LobbyScreen] Usuário saiu do lobby');
    }

    /**
     * Handler para botão de iniciar jogo
     */
    private handleStartClick(): void {
        if (!this.isCreator) {
            Logger.warn(LogCategory.UI, '[LobbyScreen] Apenas o criador pode iniciar o jogo');
            return;
        }

        // Som de press via EventBus
        EventBus.emit(EventType.AUDIO_PLAY_PRESS, {});

        // Emitir evento de início de jogo
        EventBus.emit(EventType.ROOM_START, { roomCode: this.roomCode });

        Logger.info(LogCategory.UI, '[LobbyScreen] Jogo iniciado pelo criador');
    }

    /**
     * Atualiza traduções de todos os elementos
     */
    private updateTranslations(): void {
        if (this.titleElement) {
            this.titleElement.textContent = LocaleManager.t('lobby.title');
        }

        if (this.codeElement && this.roomCode) {
            this.codeElement.textContent = `${LocaleManager.t('lobby.roomCode')}: ${this.roomCode}`;
        }

        if (this.startButton) {
            this.startButton.textContent = LocaleManager.t('lobby.startGame');
        }

        // Atualizar labels de listas
        const playersLabel = this.container?.querySelector('div:has(#lobby-jogadores) strong');
        if (playersLabel) {
            playersLabel.textContent = LocaleManager.t('lobby.players') + ':';
        }

        const spectatorsLabel = this.container?.querySelector('div:has(#lobby-espectadores) strong');
        if (spectatorsLabel) {
            spectatorsLabel.textContent = LocaleManager.t('lobby.spectators') + ':';
        }

        Logger.info(LogCategory.UI, '[LobbyScreen] Traduções atualizadas');
    }

    /**
     * Verifica se a tela está ativa
     */
    isActive(): boolean {
        return this.isVisible;
    }
}
