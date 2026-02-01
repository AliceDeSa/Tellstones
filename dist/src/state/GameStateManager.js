// =========================
// GameStateManager - Gerenciador de Estado do Jogo
// =========================
import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';
import { Logger, LogCategory } from '../utils/Logger.js';
import { DEFAULT_GAME_STATE } from './GameState.js';
/**
 * Gerenciador centralizado do estado do jogo
 */
class GameStateManagerClass {
    constructor() {
        this.STORAGE_KEY = 'tellstones_game_state';
        // =====================
        // Configurações do Usuário
        // =====================
        this.SETTINGS_KEY = 'tellstones_settings';
        this.state = Object.assign({}, DEFAULT_GAME_STATE);
        this.init();
    }
    init() {
        // Escutar eventos relevantes
        EventBus.on(EventType.GAME_START, (data) => {
            this.resetState();
            this.state.modoJogo = data.mode;
            this.state.jogoIniciado = true;
            this.notifyStateChange('GAME_START');
        });
        EventBus.on(EventType.GAME_END, (data) => {
            this.state.jogoFinalizado = true;
            // Safely handle potentially null winner
            if (data.winner) {
                this.state.vencedor = this.state.jogadores.find(p => p.id === data.winner.id) || null;
            }
            else {
                this.state.vencedor = null;
            }
            this.notifyStateChange('GAME_END');
        });
        EventBus.on(EventType.TURN_START, (data) => {
            this.state.turnoAtual++;
            this.state.jogadorAtual = data.playerIndex;
            this.notifyStateChange('TURN_START');
        });
        Logger.sys('[GameStateManager] Inicializado');
    }
    /**
     * Obtém o estado atual (cópia imutável)
     */
    getState() {
        return Object.assign({}, this.state);
    }
    /**
     * Reseta o estado para valores padrão
     */
    resetState() {
        this.state = Object.assign({}, DEFAULT_GAME_STATE);
        this.clearStorage();
        Logger.info(LogCategory.GAME, '[GameStateManager] Estado resetado');
        this.notifyStateChange('RESET');
    }
    /**
     * Atualiza jogadores
     */
    setPlayers(players) {
        this.state.jogadores = [...players];
        this.notifyStateChange('PLAYERS_UPDATE');
    }
    /**
     * Atualiza o tabuleiro
     */
    updateBoard(mesa) {
        this.state.mesa = [...mesa];
        this.notifyStateChange('BOARD_UPDATE');
    }
    /**
     * Adiciona ação ao histórico
     */
    addAction(tipo, jogador, dados) {
        const acao = {
            turno: this.state.turnoAtual,
            jogador,
            acao: tipo,
            timestamp: Date.now()
        };
        this.state.historico.push(acao);
        this.state.ultimaAcao = {
            tipo,
            jogador,
            timestamp: Date.now(),
            dados
        };
        this.notifyStateChange('ACTION_ADDED');
    }
    /**
     * Atualiza pontos do jogador
     */
    updatePlayerScore(playerId, pontos) {
        const player = this.state.jogadores.find(p => p.id === playerId);
        if (player) {
            player.pontos = pontos;
            this.notifyStateChange('SCORE_UPDATE');
        }
    }
    /**
     * Define ação atual
     */
    setCurrentAction(acao) {
        this.state.acaoAtual = acao;
        this.notifyStateChange('ACTION_CHANGE');
    }
    /**
     * Salva estado no localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
            Logger.info(LogCategory.GAME, '[GameStateManager] Estado salvo');
        }
        catch (error) {
            Logger.error(LogCategory.GAME, '[GameStateManager] Erro ao salvar:', error);
        }
    }
    /**
     * Carrega estado do localStorage
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                this.state = JSON.parse(saved);
                this.notifyStateChange('LOADED');
                Logger.info(LogCategory.GAME, '[GameStateManager] Estado carregado');
                return true;
            }
        }
        catch (error) {
            Logger.error(LogCategory.GAME, '[GameStateManager] Erro ao carregar:', error);
        }
        return false;
    }
    /**
     * Limpa estado do storage
     */
    clearStorage() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
    /**
     * Obtém configurações do usuário
     */
    getSettings() {
        try {
            const saved = localStorage.getItem(this.SETTINGS_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        }
        catch (error) {
            Logger.error(LogCategory.GAME, '[GameStateManager] Erro ao carregar configurações:', error);
        }
        // Valores padrão
        return {
            musicVolume: 80,
            sfxVolume: 100,
            muted: false,
            animationsEnabled: true
        };
    }
    /**
     * Salva configurações do usuário
     */
    saveSettings(settings) {
        try {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
            Logger.info(LogCategory.GAME, '[GameStateManager] Configurações salvas');
        }
        catch (error) {
            Logger.error(LogCategory.GAME, '[GameStateManager] Erro ao salvar configurações:', error);
        }
    }
    /**
     * Emite evento de mudança de estado
     */
    notifyStateChange(reason) {
        EventBus.emit(EventType.STATE_UPDATE, {
            state: this.getState(),
            reason
        });
        Logger.info(LogCategory.GAME, `[GameStateManager] Estado atualizado: ${reason}`);
    }
    /**
     * Debug: retorna informações do estado
     */
    getDebugInfo() {
        var _a;
        return `
Mode: ${this.state.modoJogo || 'none'}
Players: ${this.state.jogadores.map(p => `${p.nome} (${p.pontos}pts)`).join(', ')}
Turn: ${this.state.turnoAtual}
Current Player: ${((_a = this.state.jogadores[this.state.jogadorAtual]) === null || _a === void 0 ? void 0 : _a.nome) || 'N/A'}
Board: ${this.state.mesa.filter(s => s !== null).length}/7 stones
Action: ${this.state.acaoAtual || 'none'}
Status: ${this.state.jogoIniciado ? (this.state.jogoFinalizado ? 'Finished' : 'Playing') : 'Not Started'}
        `.trim();
    }
}
// Exportar instância global (singleton)
export const GameStateManager = new GameStateManagerClass();
// Expor globalmente para debug
window.GameStateManager = GameStateManager;
