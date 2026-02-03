// =========================
// LobbyScreen - Tela de Lobby Online
// =========================
import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';
import { Logger, LogCategory } from '../utils/Logger.js';
import LocaleManager from '../data/LocaleManager.js';
export class LobbyScreen {
    constructor() {
        this.container = null;
        this.isVisible = false;
        this.roomCode = '';
        this.isCreator = false;
        // Elementos DOM
        this.codeElement = null;
        this.playersListElement = null;
        this.spectatorsListElement = null;
        this.startButton = null;
        this.backButton = null;
        this.titleElement = null;
        this.container = document.getElementById('lobby');
        if (!this.container) {
            Logger.error(LogCategory.UI, '[LobbyScreen] Container #lobby não encontrado!');
            return;
        }
        // Capturar elementos DOM
        this.codeElement = document.getElementById('lobby-codigo');
        this.playersListElement = document.getElementById('lobby-jogadores');
        this.spectatorsListElement = document.getElementById('lobby-espectadores');
        this.startButton = document.getElementById('lobby-iniciar');
        this.backButton = document.getElementById('back-from-lobby-btn');
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
    registerEventListeners() {
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
    show() {
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
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            this.isVisible = false;
            Logger.info(LogCategory.UI, '[LobbyScreen] Tela escondida');
        }
    }
    /**
     * Atualiza a tela (não usado)
     */
    update() {
        // O RoomManager já gerencia o conteúdo dinâmico do lobby
        // Esta tela apenas controla visibilidade e UI
    }
    /**
     * Destrói a tela
     */
    destroy() {
        // Container é parte do HTML fixo, não deve ser removido
        this.hide();
    }
    /**
     * Define informações da sala
     */
    setRoomInfo(code, isCreator) {
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
    updatePlayersList(players) {
        if (!this.playersListElement)
            return;
        this.playersListElement.innerHTML = players
            .map((player) => `<li>${player.nome || player.name || 'Jogador'}</li>`)
            .join('');
        Logger.info(LogCategory.UI, `[LobbyScreen] Lista de jogadores atualizada: ${players.length}`);
    }
    /**
     * Atualiza lista de espectadores
     */
    updateSpectatorsList(spectators) {
        if (!this.spectatorsListElement)
            return;
        this.spectatorsListElement.innerHTML = spectators
            .map((spectator) => `<li>${spectator.nome || spectator.name || 'Espectador'}</li>`)
            .join('');
        Logger.info(LogCategory.UI, `[LobbyScreen] Lista de espectadores atualizada: ${spectators.length}`);
    }
    /**
     * Handler para botão de voltar
     */
    handleBackClick() {
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
    handleStartClick() {
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
    updateTranslations() {
        var _a, _b;
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
        const playersLabel = (_a = this.container) === null || _a === void 0 ? void 0 : _a.querySelector('div:has(#lobby-jogadores) strong');
        if (playersLabel) {
            playersLabel.textContent = LocaleManager.t('lobby.players') + ':';
        }
        const spectatorsLabel = (_b = this.container) === null || _b === void 0 ? void 0 : _b.querySelector('div:has(#lobby-espectadores) strong');
        if (spectatorsLabel) {
            spectatorsLabel.textContent = LocaleManager.t('lobby.spectators') + ':';
        }
        Logger.info(LogCategory.UI, '[LobbyScreen] Traduções atualizadas');
    }
    /**
     * Verifica se a tela está ativa
     */
    isActive() {
        return this.isVisible;
    }
}
