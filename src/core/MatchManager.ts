// =========================
// MatchManager - Gerenciador Central de Partida
// =========================
// Responsável pelo controle de turnos, validação de jogadas
// e transições de estado da partida.

import { Logger, LogCategory } from "../utils/Logger.js";

// ========================================
// ENUMS E TIPOS
// ========================================

/**
 * Estados possíveis da partida
 */
export enum MatchState {
    /** Aguardando início (alinhamento da pedra central) */
    WAITING_START = 'WAITING_START',
    /** Turno do jogador atual - pode escolher uma das 6 ações */
    PLAYER_TURN = 'PLAYER_TURN',
    /** Ação em execução (animação em andamento) */
    EXECUTING_ACTION = 'EXECUTING_ACTION',
    /** Modo de desafio ativo - aguardando resposta */
    CHALLENGE_MODE = 'CHALLENGE_MODE',
    /** Modo de segabar ativo - aguardando resposta */
    BOAST_MODE = 'BOAST_MODE',
    /** Resolvendo resultado de desafio/segabar */
    RESOLVING = 'RESOLVING',
    /** Jogo finalizado */
    GAME_OVER = 'GAME_OVER'
}

/**
 * Tipos de jogadas disponíveis
 */
export enum ActionType {
    PLACE = 'place',
    FLIP = 'flip',
    SWAP = 'swap',
    PEEK = 'peek',
    CHALLENGE = 'challenge',
    BOAST = 'boast'
}

/**
 * Estrutura de uma jogada
 */
export interface GameAction {
    type: ActionType;
    player: 'Jogador' | 'Bot';
    target?: number;
    targets?: { from: number; to: number };
    guess?: string;
    timestamp?: number;
}

/**
 * Resultado de validação de jogada
 */
export interface ValidationResult {
    valid: boolean;
    reason?: string;
}

/**
 * Callback para quando o estado mudar
 */
export type StateChangeCallback = (oldState: MatchState, newState: MatchState) => void;

/**
 * Callback para quando for turno de um jogador
 */
export type TurnCallback = (playerIndex: number, playerName: string) => void;

// ========================================
// CLASSE PRINCIPAL
// ========================================

export class MatchManager {
    // Estado atual da máquina de estados
    private state: MatchState = MatchState.WAITING_START;

    // Índice do jogador atual (0 = Jogador, 1 = Bot)
    private currentPlayerIndex: number = 0;

    // Nomes dos jogadores
    private players: string[] = ['Jogador', 'Bot'];

    // Histórico de ações para debug
    private actionHistory: GameAction[] = [];

    // Mutex para prevenir transições simultâneas
    private transitionLock: boolean = false;

    // Timeout para ações travadas
    private actionTimeout: ReturnType<typeof setTimeout> | null = null;
    private readonly ACTION_TIMEOUT_MS = 10000;

    // Callbacks
    private onStateChange: StateChangeCallback | null = null;
    private onTurnStart: TurnCallback | null = null;
    private onActionComplete: ((action: GameAction) => void) | null = null;

    // Referência ao ChallengeResolver
    private challengeResolver: any = null;

    // Flag de ativo
    private active: boolean = false;

    constructor() {
        Logger.sys("[MatchManager] Inicializado");
    }

    // ========================================
    // GETTERS PÚBLICOS
    // ========================================

    /** Retorna o estado atual da partida */
    getState(): MatchState {
        return this.state;
    }

    /** Retorna o índice do jogador atual */
    getCurrentPlayerIndex(): number {
        return this.currentPlayerIndex;
    }

    /** Retorna o nome do jogador atual */
    getCurrentPlayerName(): string {
        return this.players[this.currentPlayerIndex];
    }

    /** Verifica se é turno do jogador humano */
    isPlayerTurn(): boolean {
        return this.currentPlayerIndex === 0 && this.state === MatchState.PLAYER_TURN;
    }

    /** Verifica se é turno do bot */
    isBotTurn(): boolean {
        return this.currentPlayerIndex === 1 && this.state === MatchState.PLAYER_TURN;
    }

    /** Verifica se a partida está ativa */
    isActive(): boolean {
        return this.active && this.state !== MatchState.GAME_OVER;
    }

    /** Verifica se está em modo de resolução (desafio/segabar) */
    isInResolutionMode(): boolean {
        return this.state === MatchState.CHALLENGE_MODE ||
            this.state === MatchState.BOAST_MODE ||
            this.state === MatchState.RESOLVING;
    }

    // ========================================
    // CONFIGURAÇÃO
    // ========================================

    /** Define callback para mudança de estado */
    setOnStateChange(callback: StateChangeCallback): void {
        this.onStateChange = callback;
    }

    /** Define callback para início de turno */
    setOnTurnStart(callback: TurnCallback): void {
        this.onTurnStart = callback;
    }

    /** Define callback para ação completa */
    setOnActionComplete(callback: (action: GameAction) => void): void {
        this.onActionComplete = callback;
    }

    /** Define o ChallengeResolver */
    setChallengeResolver(resolver: any): void {
        this.challengeResolver = resolver;
    }

    // ========================================
    // CONTROLE DE PARTIDA
    // ========================================

    /**
     * Inicia a partida
     * @param startingPlayer Índice do jogador que começa (0 ou 1)
     */
    start(startingPlayer: number = 0): void {
        Logger.sys(`[MatchManager] Iniciando partida. Jogador inicial: ${this.players[startingPlayer]}`);

        this.active = true;
        this.currentPlayerIndex = startingPlayer;
        this.actionHistory = [];

        this.transitionTo(MatchState.PLAYER_TURN);
    }

    /**
     * Reseta a partida para estado inicial
     */
    reset(): void {
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
    onAlignmentComplete(winnerIndex: number): void {
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
    async submitAction(action: GameAction): Promise<ValidationResult> {
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
        return await this.executeAction(action);
    }

    /**
     * Valida uma ação específica baseado no estado do jogo
     */
    private validateAction(action: GameAction): ValidationResult {
        const estado = (window as any).estadoJogo;
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

    private validatePlace(target: number | undefined, mesa: any[]): ValidationResult {
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
        const pedrasNaMesa = mesa.filter((p: any) => p !== null).length;
        if (pedrasNaMesa > 0) {
            const adjacentes = this.getAdjacentSlots(mesa);
            if (!adjacentes.includes(target)) {
                return { valid: false, reason: `Slot ${target} não é adjacente a nenhuma pedra` };
            }
        } else {
            // Primeira pedra deve ir no slot central (3)
            if (target !== 3) {
                return { valid: false, reason: "Primeira pedra deve ser colocada no slot central (3)" };
            }
        }

        return { valid: true };
    }

    private validateFlip(target: number | undefined, mesa: any[]): ValidationResult {
        if (target === undefined) {
            return { valid: false, reason: "Slot alvo não especificado" };
        }

        if (!mesa[target]) {
            return { valid: false, reason: `Slot ${target} está vazio` };
        }

        return { valid: true };
    }

    private validateSwap(targets: { from: number; to: number } | undefined, mesa: any[]): ValidationResult {
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

    private validatePeek(target: number | undefined, mesa: any[]): ValidationResult {
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

    private validateChallenge(target: number | undefined, mesa: any[]): ValidationResult {
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

    private validateBoast(mesa: any[]): ValidationResult {
        const pedrasViradas = mesa.filter((p: any) => p && p.virada).length;

        if (pedrasViradas < 2) {
            return { valid: false, reason: `Necessário ao menos 2 pedras viradas para segabar (atual: ${pedrasViradas})` };
        }

        return { valid: true };
    }

    private getAdjacentSlots(mesa: any[]): number[] {
        const adjacentes: number[] = [];

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

    private async executeAction(action: GameAction): Promise<ValidationResult> {
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
                    return await this.handleChallenge(action);

                case ActionType.BOAST:
                    return await this.handleBoast(action);

                default:
                    // Ações simples - executar e avançar turno
                    await this.executeSimpleAction(action);
                    this.advanceTurn();
                    return { valid: true };
            }
        } catch (error) {
            Logger.error(LogCategory.GAME, "[MatchManager] Erro ao executar ação:", error);
            this.transitionTo(MatchState.PLAYER_TURN);
            return { valid: false, reason: `Erro ao executar ação: ${error}` };
        } finally {
            this.clearActionTimeout();
        }
    }

    private async executeSimpleAction(action: GameAction): Promise<void> {
        const estado = (window as any).estadoJogo;

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
        if ((window as any).GameController?.persistirEstado) {
            (window as any).GameController.persistirEstado();
        }

        // Callback de ação completa
        if (this.onActionComplete) {
            this.onActionComplete(action);
        }
    }

    private async handleChallenge(action: GameAction): Promise<ValidationResult> {
        Logger.game(`[MatchManager] Iniciando modo CHALLENGE`);

        // Transição para modo de desafio
        this.transitionTo(MatchState.CHALLENGE_MODE);

        // Delegar para ChallengeResolver
        if (this.challengeResolver) {
            await this.challengeResolver.startChallenge(action, this.currentPlayerIndex);
        }

        return { valid: true };
    }

    private async handleBoast(action: GameAction): Promise<ValidationResult> {
        Logger.game(`[MatchManager] Iniciando modo BOAST`);

        // Transição para modo de segabar
        this.transitionTo(MatchState.BOAST_MODE);

        // Delegar para ChallengeResolver
        if (this.challengeResolver) {
            await this.challengeResolver.startBoast(action, this.currentPlayerIndex);
        }

        return { valid: true };
    }

    // ========================================
    // CONTROLE DE TURNO
    // ========================================

    /**
     * Avança para o próximo turno
     */
    advanceTurn(): void {
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
    onResolutionComplete(points: { playerIndex: number; amount: number }[]): void {
        Logger.game("[MatchManager] Resolução completa. Pontos:", points);

        // Aplicar pontos
        const estado = (window as any).estadoJogo;
        if (estado?.jogadores) {
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
        if ((window as any).GameController?.persistirEstado) {
            (window as any).GameController.persistirEstado();
        }

        // Avançar turno
        this.advanceTurn();
    }

    private handleGameOver(winnerIndex: number): void {
        Logger.game(`[MatchManager] FIM DE JOGO! Vencedor: ${this.players[winnerIndex]}`);

        this.transitionTo(MatchState.GAME_OVER);

        // Declarar vencedor
        if ((window as any).GameController?.declararVencedor) {
            (window as any).GameController.declararVencedor(this.players[winnerIndex]);
        }
    }

    // ========================================
    // MÁQUINA DE ESTADOS
    // ========================================

    private transitionTo(newState: MatchState): void {
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

    private startActionTimeout(action: GameAction): void {
        this.actionTimeout = setTimeout(() => {
            Logger.error(LogCategory.GAME, `[MatchManager] TIMEOUT: Ação ${action.type} não completou em ${this.ACTION_TIMEOUT_MS}ms`);

            // Forçar retorno ao estado normal
            this.transitionTo(MatchState.PLAYER_TURN);
        }, this.ACTION_TIMEOUT_MS);
    }

    private clearActionTimeout(): void {
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
            this.actionTimeout = null;
        }
    }

    // ========================================
    // DEBUG
    // ========================================

    /** Retorna histórico de ações para debug */
    getActionHistory(): GameAction[] {
        return [...this.actionHistory];
    }

    /** Retorna status atual para debug */
    getDebugStatus(): object {
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
(window as any).MatchManager = MatchManager;
