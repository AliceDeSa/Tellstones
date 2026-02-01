// =========================
// MatchManager - Gerenciador Central de Partida
// =========================
// Responsável pelo controle de turnos, validação de jogadas
// e transições de estado da partida.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Logger, LogCategory } from "../utils/Logger.js";
// ========================================
// ENUMS E TIPOS
// ========================================
/**
 * Estados possíveis da partida
 */
export var MatchState;
(function (MatchState) {
    /** Aguardando início (alinhamento da pedra central) */
    MatchState["WAITING_START"] = "WAITING_START";
    /** Turno do jogador atual - pode escolher uma das 6 ações */
    MatchState["PLAYER_TURN"] = "PLAYER_TURN";
    /** Ação em execução (animação em andamento) */
    MatchState["EXECUTING_ACTION"] = "EXECUTING_ACTION";
    /** Modo de desafio ativo - aguardando resposta */
    MatchState["CHALLENGE_MODE"] = "CHALLENGE_MODE";
    /** Modo de segabar ativo - aguardando resposta */
    MatchState["BOAST_MODE"] = "BOAST_MODE";
    /** Resolvendo resultado de desafio/segabar */
    MatchState["RESOLVING"] = "RESOLVING";
    /** Jogo finalizado */
    MatchState["GAME_OVER"] = "GAME_OVER";
})(MatchState || (MatchState = {}));
/**
 * Tipos de jogadas disponíveis
 */
export var ActionType;
(function (ActionType) {
    ActionType["PLACE"] = "place";
    ActionType["FLIP"] = "flip";
    ActionType["SWAP"] = "swap";
    ActionType["PEEK"] = "peek";
    ActionType["CHALLENGE"] = "challenge";
    ActionType["BOAST"] = "boast";
})(ActionType || (ActionType = {}));
// ========================================
// CLASSE PRINCIPAL
// ========================================
export class MatchManager {
    constructor() {
        // Estado atual da máquina de estados
        this.state = MatchState.WAITING_START;
        // Índice do jogador atual (0 = Jogador, 1 = Bot)
        this.currentPlayerIndex = 0;
        // Nomes dos jogadores
        this.players = ['Jogador', 'Bot'];
        // Histórico de ações para debug
        this.actionHistory = [];
        // Mutex para prevenir transições simultâneas
        this.transitionLock = false;
        // Timeout para ações travadas
        this.actionTimeout = null;
        this.ACTION_TIMEOUT_MS = 10000;
        // Callbacks
        this.onStateChange = null;
        this.onTurnStart = null;
        this.onActionComplete = null;
        // Referência ao ChallengeResolver
        this.challengeResolver = null;
        // Flag de ativo
        this.active = false;
        Logger.sys("[MatchManager] Inicializado");
    }
    // ========================================
    // GETTERS PÚBLICOS
    // ========================================
    /** Retorna o estado atual da partida */
    getState() {
        return this.state;
    }
    /** Retorna o índice do jogador atual */
    getCurrentPlayerIndex() {
        return this.currentPlayerIndex;
    }
    /** Retorna o nome do jogador atual */
    getCurrentPlayerName() {
        return this.players[this.currentPlayerIndex];
    }
    /** Verifica se é turno do jogador humano */
    isPlayerTurn() {
        return this.currentPlayerIndex === 0 && this.state === MatchState.PLAYER_TURN;
    }
    /** Verifica se é turno do bot */
    isBotTurn() {
        return this.currentPlayerIndex === 1 && this.state === MatchState.PLAYER_TURN;
    }
    /** Verifica se a partida está ativa */
    isActive() {
        return this.active && this.state !== MatchState.GAME_OVER;
    }
    /** Verifica se está em modo de resolução (desafio/segabar) */
    isInResolutionMode() {
        return this.state === MatchState.CHALLENGE_MODE ||
            this.state === MatchState.BOAST_MODE ||
            this.state === MatchState.RESOLVING;
    }
    // ========================================
    // CONFIGURAÇÃO
    // ========================================
    /** Define callback para mudança de estado */
    setOnStateChange(callback) {
        this.onStateChange = callback;
    }
    /** Define callback para início de turno */
    setOnTurnStart(callback) {
        this.onTurnStart = callback;
    }
    /** Define callback para ação completa */
    setOnActionComplete(callback) {
        this.onActionComplete = callback;
    }
    /** Define o ChallengeResolver */
    setChallengeResolver(resolver) {
        this.challengeResolver = resolver;
    }
    // ========================================
    // CONTROLE DE PARTIDA
    // ========================================
    /**
     * Inicia a partida
     * @param startingPlayer Índice do jogador que começa (0 ou 1)
     */
    start(startingPlayer = 0) {
        Logger.sys(`[MatchManager] Iniciando partida. Jogador inicial: ${this.players[startingPlayer]}`);
        this.active = true;
        this.currentPlayerIndex = startingPlayer;
        this.actionHistory = [];
        this.transitionTo(MatchState.PLAYER_TURN);
    }
    /**
     * Reseta a partida para estado inicial
     */
    reset() {
        Logger.sys("[MatchManager] Resetando partida");
        this.state = MatchState.WAITING_START;
        this.currentPlayerIndex = 0;
        this.actionHistory = [];
        this.transitionLock = false;
        this.active = false;
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
            this.actionTimeout = null;
        }
    }
    /**
     * Notifica que o alinhamento foi concluído
     * @param winnerIndex Índice do jogador que ganhou a moeda
     */
    onAlignmentComplete(winnerIndex) {
        if (this.state !== MatchState.WAITING_START) {
            Logger.warn(LogCategory.GAME, "[MatchManager] Alinhamento chamado fora do estado WAITING_START");
            return;
        }
        Logger.game(`[MatchManager] Alinhamento completo. Vencedor da moeda: ${this.players[winnerIndex]}`);
        this.currentPlayerIndex = winnerIndex;
        this.transitionTo(MatchState.PLAYER_TURN);
    }
    // ========================================
    // SUBMISSÃO DE AÇÕES
    // ========================================
    /**
     * Submete uma ação para execução
     * @param action A ação a ser executada
     * @returns Resultado da validação
     */
    submitAction(action) {
        return __awaiter(this, void 0, void 0, function* () {
            // Adiciona timestamp se não existir
            if (!action.timestamp) {
                action.timestamp = Date.now();
            }
            // Log da ação
            Logger.game(`[MatchManager] Ação submetida:`, action);
            // Validação 1: Partida ativa?
            if (!this.active) {
                return { valid: false, reason: "Partida não está ativa" };
            }
            // Validação 2: Estado permite ações?
            if (this.state !== MatchState.PLAYER_TURN) {
                return { valid: false, reason: `Estado atual (${this.state}) não permite ações` };
            }
            // Validação 3: É o turno do jogador que está jogando?
            const expectedPlayer = this.players[this.currentPlayerIndex];
            if (action.player !== expectedPlayer) {
                return { valid: false, reason: `Não é turno de ${action.player}. É turno de ${expectedPlayer}` };
            }
            // Validação 4: Transição em andamento?
            if (this.transitionLock) {
                return { valid: false, reason: "Transição de estado em andamento" };
            }
            // Validação 5: Ação específica é válida?
            const actionValidation = this.validateAction(action);
            if (!actionValidation.valid) {
                return actionValidation;
            }
            // Ação válida - executar
            return yield this.executeAction(action);
        });
    }
    /**
     * Valida uma ação específica baseado no estado do jogo
     */
    validateAction(action) {
        const estado = window.estadoJogo;
        if (!estado || !estado.mesa) {
            return { valid: false, reason: "Estado do jogo não disponível" };
        }
        const mesa = estado.mesa;
        switch (action.type) {
            case ActionType.PLACE:
                return this.validatePlace(action.target, mesa);
            case ActionType.FLIP:
                return this.validateFlip(action.target, mesa);
            case ActionType.SWAP:
                return this.validateSwap(action.targets, mesa);
            case ActionType.PEEK:
                return this.validatePeek(action.target, mesa);
            case ActionType.CHALLENGE:
                return this.validateChallenge(action.target, mesa);
            case ActionType.BOAST:
                return this.validateBoast(mesa);
            default:
                return { valid: false, reason: `Tipo de ação desconhecido: ${action.type}` };
        }
    }
    // ========================================
    // VALIDAÇÕES ESPECÍFICAS
    // ========================================
    validatePlace(target, mesa) {
        if (target === undefined) {
            return { valid: false, reason: "Slot alvo não especificado" };
        }
        if (target < 0 || target > 6) {
            return { valid: false, reason: `Slot inválido: ${target}` };
        }
        if (mesa[target] !== null) {
            return { valid: false, reason: `Slot ${target} já está ocupado` };
        }
        // Verificar adjacência
        const pedrasNaMesa = mesa.filter((p) => p !== null).length;
        if (pedrasNaMesa > 0) {
            const adjacentes = this.getAdjacentSlots(mesa);
            if (!adjacentes.includes(target)) {
                return { valid: false, reason: `Slot ${target} não é adjacente a nenhuma pedra` };
            }
        }
        else {
            // Primeira pedra deve ir no slot central (3)
            if (target !== 3) {
                return { valid: false, reason: "Primeira pedra deve ser colocada no slot central (3)" };
            }
        }
        return { valid: true };
    }
    validateFlip(target, mesa) {
        if (target === undefined) {
            return { valid: false, reason: "Slot alvo não especificado" };
        }
        if (!mesa[target]) {
            return { valid: false, reason: `Slot ${target} está vazio` };
        }
        return { valid: true };
    }
    validateSwap(targets, mesa) {
        if (!targets) {
            return { valid: false, reason: "Slots de troca não especificados" };
        }
        if (!mesa[targets.from]) {
            return { valid: false, reason: `Slot ${targets.from} está vazio` };
        }
        if (!mesa[targets.to]) {
            return { valid: false, reason: `Slot ${targets.to} está vazio` };
        }
        return { valid: true };
    }
    validatePeek(target, mesa) {
        if (target === undefined) {
            return { valid: false, reason: "Slot alvo não especificado" };
        }
        if (!mesa[target]) {
            return { valid: false, reason: `Slot ${target} está vazio` };
        }
        if (!mesa[target].virada) {
            return { valid: false, reason: `Pedra no slot ${target} já está revelada` };
        }
        return { valid: true };
    }
    validateChallenge(target, mesa) {
        if (target === undefined) {
            return { valid: false, reason: "Slot alvo não especificado" };
        }
        if (!mesa[target]) {
            return { valid: false, reason: `Slot ${target} está vazio` };
        }
        if (!mesa[target].virada) {
            return { valid: false, reason: `Pedra no slot ${target} já está revelada` };
        }
        return { valid: true };
    }
    validateBoast(mesa) {
        const pedrasViradas = mesa.filter((p) => p && p.virada).length;
        if (pedrasViradas < 2) {
            return { valid: false, reason: `Necessário ao menos 2 pedras viradas para segabar (atual: ${pedrasViradas})` };
        }
        return { valid: true };
    }
    getAdjacentSlots(mesa) {
        const adjacentes = [];
        for (let i = 0; i < 7; i++) {
            if (mesa[i] !== null) {
                // Adiciona slots adjacentes vazios
                if (i > 0 && mesa[i - 1] === null && !adjacentes.includes(i - 1)) {
                    adjacentes.push(i - 1);
                }
                if (i < 6 && mesa[i + 1] === null && !adjacentes.includes(i + 1)) {
                    adjacentes.push(i + 1);
                }
            }
        }
        return adjacentes;
    }
    // ========================================
    // EXECUÇÃO DE AÇÕES
    // ========================================
    executeAction(action) {
        return __awaiter(this, void 0, void 0, function* () {
            // Transição para EXECUTING_ACTION
            this.transitionTo(MatchState.EXECUTING_ACTION);
            // Iniciar timeout de segurança
            this.startActionTimeout(action);
            // Registrar no histórico
            this.actionHistory.push(action);
            try {
                // Executar baseado no tipo
                switch (action.type) {
                    case ActionType.CHALLENGE:
                        return yield this.handleChallenge(action);
                    case ActionType.BOAST:
                        return yield this.handleBoast(action);
                    default:
                        // Ações simples - executar e avançar turno
                        yield this.executeSimpleAction(action);
                        this.advanceTurn();
                        return { valid: true };
                }
            }
            catch (error) {
                Logger.error(LogCategory.GAME, "[MatchManager] Erro ao executar ação:", error);
                this.transitionTo(MatchState.PLAYER_TURN);
                return { valid: false, reason: `Erro ao executar ação: ${error}` };
            }
            finally {
                this.clearActionTimeout();
            }
        });
    }
    executeSimpleAction(action) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const estado = window.estadoJogo;
            Logger.game(`[MatchManager] Executando ação simples: ${action.type}`);
            switch (action.type) {
                case ActionType.PLACE:
                    // Delegar para lógica existente
                    // TODO: Implementar internamente
                    break;
                case ActionType.FLIP:
                    if (action.target !== undefined && estado.mesa[action.target]) {
                        estado.mesa[action.target].virada = !estado.mesa[action.target].virada;
                    }
                    break;
                case ActionType.SWAP:
                    if (action.targets) {
                        const temp = estado.mesa[action.targets.from];
                        estado.mesa[action.targets.from] = estado.mesa[action.targets.to];
                        estado.mesa[action.targets.to] = temp;
                    }
                    break;
                case ActionType.PEEK:
                    // Peek é apenas visualização, não muda estado permanente
                    break;
            }
            // Persistir estado
            if ((_a = window.GameController) === null || _a === void 0 ? void 0 : _a.persistirEstado) {
                window.GameController.persistirEstado();
            }
            // Callback de ação completa
            if (this.onActionComplete) {
                this.onActionComplete(action);
            }
        });
    }
    handleChallenge(action) {
        return __awaiter(this, void 0, void 0, function* () {
            Logger.game(`[MatchManager] Iniciando modo CHALLENGE`);
            // Transição para modo de desafio
            this.transitionTo(MatchState.CHALLENGE_MODE);
            // Delegar para ChallengeResolver
            if (this.challengeResolver) {
                yield this.challengeResolver.startChallenge(action, this.currentPlayerIndex);
            }
            return { valid: true };
        });
    }
    handleBoast(action) {
        return __awaiter(this, void 0, void 0, function* () {
            Logger.game(`[MatchManager] Iniciando modo BOAST`);
            // Transição para modo de segabar
            this.transitionTo(MatchState.BOAST_MODE);
            // Delegar para ChallengeResolver
            if (this.challengeResolver) {
                yield this.challengeResolver.startBoast(action, this.currentPlayerIndex);
            }
            return { valid: true };
        });
    }
    // ========================================
    // CONTROLE DE TURNO
    // ========================================
    /**
     * Avança para o próximo turno
     */
    advanceTurn() {
        if (this.state === MatchState.GAME_OVER) {
            Logger.warn(LogCategory.GAME, "[MatchManager] Tentativa de avançar turno após fim de jogo");
            return;
        }
        // Alternar jogador
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 2;
        Logger.game(`[MatchManager] Avançando turno. Agora é vez de: ${this.players[this.currentPlayerIndex]}`);
        // Transição para PLAYER_TURN
        this.transitionTo(MatchState.PLAYER_TURN);
        // Callback de início de turno
        if (this.onTurnStart) {
            this.onTurnStart(this.currentPlayerIndex, this.players[this.currentPlayerIndex]);
        }
    }
    /**
     * Chamado pelo ChallengeResolver após resolver desafio/segabar
     */
    onResolutionComplete(points) {
        var _a;
        Logger.game("[MatchManager] Resolução completa. Pontos:", points);
        // Aplicar pontos
        const estado = window.estadoJogo;
        if (estado === null || estado === void 0 ? void 0 : estado.jogadores) {
            points.forEach(p => {
                if (estado.jogadores[p.playerIndex]) {
                    estado.jogadores[p.playerIndex].pontos += p.amount;
                    // Verificar vitória
                    if (estado.jogadores[p.playerIndex].pontos >= 3) {
                        this.handleGameOver(p.playerIndex);
                        return;
                    }
                }
            });
        }
        // Persistir
        if ((_a = window.GameController) === null || _a === void 0 ? void 0 : _a.persistirEstado) {
            window.GameController.persistirEstado();
        }
        // Avançar turno
        this.advanceTurn();
    }
    handleGameOver(winnerIndex) {
        var _a;
        Logger.game(`[MatchManager] FIM DE JOGO! Vencedor: ${this.players[winnerIndex]}`);
        this.transitionTo(MatchState.GAME_OVER);
        // Declarar vencedor
        if ((_a = window.GameController) === null || _a === void 0 ? void 0 : _a.declararVencedor) {
            window.GameController.declararVencedor(this.players[winnerIndex]);
        }
    }
    // ========================================
    // MÁQUINA DE ESTADOS
    // ========================================
    transitionTo(newState) {
        if (this.transitionLock) {
            Logger.warn(LogCategory.GAME, `[MatchManager] Transição bloqueada: ${this.state} -> ${newState}`);
            return;
        }
        this.transitionLock = true;
        const oldState = this.state;
        Logger.sys(`[MatchManager] Transição: ${oldState} -> ${newState}`);
        this.state = newState;
        // Callback de mudança de estado
        if (this.onStateChange) {
            this.onStateChange(oldState, newState);
        }
        this.transitionLock = false;
    }
    // ========================================
    // TIMEOUT DE SEGURANÇA
    // ========================================
    startActionTimeout(action) {
        this.actionTimeout = setTimeout(() => {
            Logger.error(LogCategory.GAME, `[MatchManager] TIMEOUT: Ação ${action.type} não completou em ${this.ACTION_TIMEOUT_MS}ms`);
            // Forçar retorno ao estado normal
            this.transitionTo(MatchState.PLAYER_TURN);
        }, this.ACTION_TIMEOUT_MS);
    }
    clearActionTimeout() {
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
            this.actionTimeout = null;
        }
    }
    // ========================================
    // DEBUG
    // ========================================
    /** Retorna histórico de ações para debug */
    getActionHistory() {
        return [...this.actionHistory];
    }
    /** Retorna status atual para debug */
    getDebugStatus() {
        return {
            state: this.state,
            currentPlayer: this.players[this.currentPlayerIndex],
            currentPlayerIndex: this.currentPlayerIndex,
            active: this.active,
            transitionLock: this.transitionLock,
            actionsCount: this.actionHistory.length
        };
    }
}
// Exportar instância global para compatibilidade
window.MatchManager = MatchManager;
