import { Logger, LogCategory } from "../utils/Logger.js";

/**
 * Representa uma ação que pode ser executada durante um turno.
 */
export interface TurnAction {
    type: 'place' | 'flip' | 'swap' | 'challenge' | 'boast' | 'peek';
    target?: number;
    targets?: { from: number; to: number };
    metadata?: any;
    // Flag para indicar se é uma ação reativa (não consome turno)
    isReactive?: boolean;
}

/**
 * Resultado de validação de uma ação.
 */
export interface TurnValidator {
    isValid: boolean;
    reason?: string;
}

/**
 * Gerenciador de Turnos para o modo PvE.
 * Responsável por isolar toda a lógica de execução e validação de turnos,
 * separando-a da lógica de decisão do bot.
 */
export class PvETurnManager {
    private botBrain: any | null = null;
    private asyncActionInProgress: boolean = false;
    private botThinking: boolean = false;
    private thinkingWatchdog: any = null;

    constructor() {
        Logger.sys("PvETurnManager inicializado");
    }

    /**
     * Configura a referência ao BotBrain.
     */
    public setBotBrain(brain: any): void {
        this.botBrain = brain;
    }

    /**
     * Valida se uma ação pode ser executada no estado atual.
     */
    public validateAction(action: TurnAction, state: any): TurnValidator {
        if (!state) {
            return { isValid: false, reason: "Estado inválido" };
        }

        switch (action.type) {
            case 'place':
                return this.validatePlace(action, state);
            case 'flip':
                return this.validateFlip(action, state);
            case 'swap':
                return this.validateSwap(action, state);
            case 'challenge':
                return this.validateChallenge(action, state);
            case 'boast':
                return this.validateBoast(action, state);
            case 'peek':
                return this.validatePeek(action, state);
            default:
                return { isValid: false, reason: `Tipo de ação desconhecido: ${action.type}` };
        }
    }

    /**
     * Executa uma ação de forma segura.
     */
    public async executeAction(action: TurnAction, actor: 'player' | 'bot'): Promise<void> {
        const estado = (window as any).estadoJogo;

        const validation = this.validateAction(action, estado);
        if (!validation.isValid) {
            Logger.warn(LogCategory.GAME, `Ação inválida: ${validation.reason}`);
            return;
        }

        Logger.game(`Executando ação: ${action.type} por ${actor}`);

        try {
            switch (action.type) {
                case 'place':
                    await this.executePlace(action, estado, actor);
                    break;
                case 'flip':
                    await this.executeFlip(action, estado, actor);
                    break;
                case 'swap':
                    await this.executeSwap(action, estado, actor);
                    break;
                case 'challenge':
                    await this.executeChallenge(action, estado, actor);
                    break;
                case 'boast':
                    await this.executeBoast(action, estado, actor);
                    break;
                case 'peek':
                    await this.executePeek(action, estado, actor);
                    break;
            }
        } catch (err) {
            Logger.error(LogCategory.GAME, `Erro ao executar ação ${action.type}:`, err);
            throw err;
        }
    }

    /**
     * Verifica se um ator (jogador ou bot) pode tomar seu turno.
     */
    public canTakeTurn(actor: 'player' | 'bot'): boolean {
        const estado = (window as any).estadoJogo;

        if (!estado || !estado.centralAlinhada) return false;

        // Verificar flags de bloqueio
        if ((window as any).animacaoTrocaEmAndamento) return false;
        if ((window as any).animacaoAlinhamentoEmAndamento) return false;
        if (this.asyncActionInProgress) return false;

        // Se bot está pensando, não pode tomar turno
        if (actor === 'bot' && this.botThinking) return false;

        // Verificar se há ação pendente (mas não bloqueia ações reativas)
        if (estado.desafio && !this.isPendingReactiveAction(estado)) {
            return false;
        }

        return true;
    }

    /**
     * Verifica se há uma ação pendente.
     */
    public isPendingAction(): boolean {
        const estado = (window as any).estadoJogo;
        return estado && estado.desafio && estado.desafio.status !== 'resolvido';
    }

    /**
     * Verifica se a ação pendente é uma resposta reativa.
     */
    private isPendingReactiveAction(estado: any): boolean {
        if (!estado.desafio) return false;

        // Desafios e segabares que aguardam resposta são reativos
        return estado.desafio.status === 'aguardando_resposta' ||
            estado.desafio.status === 'responder_pecas';
    }

    /**
     * Solicita uma decisão do bot (isolado - bot apenas decide, não executa).
     */
    public requestBotDecision(): TurnAction | null {
        if (!this.botBrain) {
            Logger.warn(LogCategory.AI, "BotBrain não configurado");
            return null;
        }

        const estado = (window as any).estadoJogo;

        try {
            const decision = this.botBrain.decideMove(estado);

            if (!decision) {
                Logger.warn(LogCategory.AI, "Bot não retornou decisão");
                return null;
            }

            Logger.ai(`Bot decidiu: ${decision.type}`, decision);
            return decision;
        } catch (err) {
            Logger.error(LogCategory.AI, "Erro ao solicitar decisão do bot:", err);
            return null;
        }
    }

    /**
     * NOVO: Trata respostas reativas (desafios/segabares) sem consumir turno.
     */
    public async handleReactiveResponse(challengeType: 'desafio' | 'segabar', state: any): Promise<void> {
        Logger.ai(`Tratando resposta reativa: ${challengeType}`);

        // Respostas reativas NÃO devem avançar o turno
        // O bot apenas responde e o jogo continua

        if (challengeType === 'desafio') {
            // Bot está respondendo a desafio do jogador
            await this.handleChallengeResponse(state);
        } else if (challengeType === 'segabar') {
            // Bot está respondendo a segabar do jogador
            await this.handleBoastResponse(state);
        }
    }

    /**
     * Responde a um desafio (ação reativa).
     * CRÍTICO: Esta é uma RESPOSTA REATIVA - NÃO avança turno!
     */
    private async handleChallengeResponse(state: any): Promise<void> {
        if (!state.desafio || state.desafio.tipo !== 'desafio') return;

        const targetIdx = state.desafio.alvo;
        if (!state.mesa[targetIdx]) {
            Logger.warn(LogCategory.AI, "Desafio em slot vazio - limpando");
            state.desafio = null;
            (window as any).GameController.persistirEstado();
            return;
        }

        Logger.ai("Bot respondendo a desafio do jogador (AÇÃO REATIVA)...");

        if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) {
            (window as any).Renderer.mostrarFalaBot("Um momento...");
        }

        // Aguardar antes de responder (simula pensamento)
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            if (!this.botBrain) {
                Logger.error(LogCategory.AI, "BotBrain ausente ao responder desafio");
                return;
            }

            const palpite = this.botBrain.predictStone(targetIdx);
            const correta = state.mesa[targetIdx].nome;

            if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) {
                (window as any).Renderer.mostrarFalaBot(`Eu acho que é... ${palpite}!`);
            }

            // Aguardar antes de revelar
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Revelar pedra
            state.mesa[targetIdx].virada = false;
            (window as any).GameController.persistirEstado();

            const success = (palpite === correta);

            // Analytics
            if ((window as any).AnalyticsManager) {
                (window as any).AnalyticsManager.logAction('challenge', {
                    target_stone: correta,
                    bot_guess: palpite,
                    success: success,
                    player_won: !success
                });
                (window as any).AnalyticsManager.logPvEChallenge("Player", !success, "challenge", correta);
            }

            // Atualizar pontos
            const playersList = Array.isArray(state.jogadores) ? state.jogadores : Object.values(state.jogadores);
            const bot = playersList.find((j: any) => j.id === 'p2' || j.nome === 'Bot');
            const player = playersList.find((j: any) => j.id === 'p1' || j.nome !== 'Bot');

            if (palpite === correta) {
                // Bot acertou
                if ((window as any).notificationManager) {
                    (window as any).notificationManager.showInternal("Bot acertou! Ponto para o Bot.");
                }
                if ((window as any).audioManager) (window as any).audioManager.playFailure();
                bot.pontos = (bot.pontos || 0) + 1;

                const chat = this.botBrain.getChatter('winning');
                if (chat) {
                    setTimeout(() => {
                        if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) {
                            (window as any).Renderer.mostrarFalaBot(chat);
                        }
                    }, 2000);
                }
            } else {
                // Bot errou
                if ((window as any).notificationManager) {
                    (window as any).notificationManager.showInternal("Bot errou! Ponto para você.");
                }
                if ((window as any).audioManager) (window as any).audioManager.playSuccess();
                player.pontos = (player.pontos || 0) + 1;

                const chat = this.botBrain.getChatter('losing');
                if (chat) {
                    setTimeout(() => {
                        if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) {
                            (window as any).Renderer.mostrarFalaBot(chat);
                        }
                    }, 2000);
                }
            }

            // Limpar desafio
            state.desafio = null;
            (window as any).GameController.persistirEstado();

            // Verificar fim de jogo
            if ((window as any).GameController) {
                (window as any).GameController.verificarFimDeJogo();
            }

            // ✅ CORREÇÃO CRÍTICA: NÃO chamar avancarTurno() aqui!
            // Esta é uma RESPOSTA REATIVA - o turno já está correto
            Logger.ai("✅ Resposta reativa completa - turno NÃO avançado");

        } catch (err) {
            Logger.error(LogCategory.AI, "Erro ao responder desafio:", err);
            state.desafio = null;
            (window as any).GameController.persistirEstado();
        }
    }

    /**
     * Responde a um segabar (ação reativa).
     * CRÍTICO: Esta é uma RESPOSTA REATIVA - NÃO avança turno!
     */
    private async handleBoastResponse(state: any): Promise<void> {
        if (!state.desafio || state.desafio.tipo !== 'segabar') return;

        Logger.ai("Bot respondendo a segabar do jogador (AÇÃO REATIVA)...");

        try {
            if (!this.botBrain) {
                Logger.warn(LogCategory.AI, "BotBrain ausente ao responder segabar");
                return;
            }

            // Analytics
            if ((window as any).AnalyticsManager) {
                (window as any).AnalyticsManager.logPvEBoast("Player");
            }

            // Normalizar jogadores
            const playersList = Array.isArray(state.jogadores)
                ? state.jogadores
                : Object.values(state.jogadores);

            const player = playersList.find((j: any) => j.id === 'p1' || j.nome !== 'Bot');
            const playerScore = player ? (player.pontos || 0) : 0;

            let decision = "acreditar";

            // Se jogador está no match point, bot sempre duvida
            if (playerScore >= 2) {
                Logger.ai("Jogador no Match Point (2). Bot recusa aceitar Segabar.");
                decision = "duvidar";
            } else {
                decision = this.botBrain.decideBoastResponse(state);
            }

            // Executar decisão
            if (decision === "duvidar") {
                if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) {
                    (window as any).Renderer.mostrarFalaBot("Não acredito. Duvido!");
                }
                if ((window as any).GameController) {
                    (window as any).GameController.responderSegabar("duvidar");
                }
            } else if (decision === "segabar_tambem") {
                if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) {
                    (window as any).Renderer.mostrarFalaBot("Ah é? Pois EU sei todas!");
                }
                if ((window as any).GameController) {
                    (window as any).GameController.responderSegabar("segabar_tambem");
                }
            } else {
                // Acreditar
                if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) {
                    (window as any).Renderer.mostrarFalaBot("Tudo bem, acredito.");
                }

                if ((window as any).GameController && (window as any).GameController.responderSegabar) {
                    (window as any).GameController.responderSegabar("acreditar");
                } else {
                    // Fallback manual
                    state.desafio = null;
                    (window as any).GameController.persistirEstado();
                }
            }

            // ✅ CORREÇÃO CRÍTICA: NÃO chamar avancarTurno() aqui!
            // Esta é uma RESPOSTA REATIVA - o GameController já gerencia o fluxo
            Logger.ai("✅ Resposta reativa completa - turno gerenciado pelo GameController");

        } catch (err) {
            Logger.error(LogCategory.AI, "Erro ao responder segabar:", err);
            state.desafio = null;
            (window as any).GameController.persistirEstado();
        }
    }

    // ========== Métodos de Validação ==========

    private validatePlace(action: TurnAction, state: any): TurnValidator {
        const slotsValidos = (window as any).GameRules?.calcularSlotsValidos(state.mesa) || [];

        Logger.ai(`[validatePlace] Slots válidos: ${JSON.stringify(slotsValidos)}, Target: ${action.target}`);

        if (slotsValidos.length === 0) {
            return { isValid: false, reason: "Nenhum slot válido disponível" };
        }

        if (action.target !== undefined && !slotsValidos.includes(action.target)) {
            Logger.warn(LogCategory.AI, `[validatePlace] Slot ${action.target} NÃO está em slotsValidos: ${JSON.stringify(slotsValidos)}`);
            return { isValid: false, reason: `Slot ${action.target} não é válido` };
        }

        const hasStone = state.reserva && state.reserva.some((p: any) => p !== null);
        if (!hasStone) {
            return { isValid: false, reason: "Sem pedras na reserva" };
        }

        return { isValid: true };
    }

    private validateFlip(action: TurnAction, state: any): TurnValidator {
        if (action.target === undefined) {
            return { isValid: false, reason: "Target não especificado" };
        }

        const pedra = state.mesa[action.target];
        if (!pedra) {
            return { isValid: false, reason: "Slot vazio" };
        }

        if (pedra.virada) {
            return { isValid: false, reason: "Pedra já está virada" };
        }

        return { isValid: true };
    }

    private validateSwap(action: TurnAction, state: any): TurnValidator {
        if (!action.targets || action.targets.from === undefined || action.targets.to === undefined) {
            return { isValid: false, reason: "Targets de troca não especificados" };
        }

        const { from, to } = action.targets;

        if (from === to) {
            return { isValid: false, reason: "Não pode trocar uma pedra com ela mesma" };
        }

        if (!state.mesa[from] || !state.mesa[to]) {
            return { isValid: false, reason: "Um dos slots está vazio" };
        }

        return { isValid: true };
    }

    private validateChallenge(action: TurnAction, state: any): TurnValidator {
        if (action.target === undefined) {
            return { isValid: false, reason: "Target não especificado" };
        }

        const pedra = state.mesa[action.target];
        if (!pedra) {
            return { isValid: false, reason: "Slot vazio" };
        }

        if (!pedra.virada) {
            return { isValid: false, reason: "Não pode desafiar pedra visível" };
        }

        return { isValid: true };
    }

    private validateBoast(action: TurnAction, state: any): TurnValidator {
        const hiddenStones = state.mesa.filter((p: any) => p && p.virada).length;

        if (hiddenStones < 2) {
            return { isValid: false, reason: "Precisa de pelo menos 2 pedras viradas para segabar" };
        }

        return { isValid: true };
    }

    private validatePeek(action: TurnAction, state: any): TurnValidator {
        if (action.target === undefined) {
            return { isValid: false, reason: "Target não especificado" };
        }

        const pedra = state.mesa[action.target];
        if (!pedra) {
            return { isValid: false, reason: "Slot vazio" };
        }

        if (!pedra.virada) {
            return { isValid: false, reason: "Não pode espiar pedra visível" };
        }

        return { isValid: true };
    }

    // ========== Métodos de Execução ==========

    private async executePlace(action: TurnAction, estado: any, actor: string): Promise<void> {
        const slotsValidos = (window as any).GameRules.calcularSlotsValidos(estado.mesa);
        let slotVazio = action.target !== undefined && slotsValidos.includes(action.target)
            ? action.target
            : slotsValidos[Math.floor(Math.random() * slotsValidos.length)];

        const pedraIdx = estado.reserva.findIndex((p: any) => p !== null);
        if (pedraIdx === -1) return;

        const pedra = estado.reserva[pedraIdx];

        if ((window as any).Renderer && (window as any).Renderer.animarBotColocar && actor === 'bot') {
            this.asyncActionInProgress = true;
            return new Promise((resolve) => {
                (window as any).Renderer.animarBotColocar(pedra, -1, slotVazio, () => {
                    estado.mesa[slotVazio] = pedra;
                    estado.mesa[slotVazio].virada = false;
                    estado.reserva[pedraIdx] = null;

                    if (this.botBrain && actor === 'bot') {
                        this.botBrain.observe({ tipo: 'colocar', origem: slotVazio, pedra: pedra }, estado);
                    }

                    (window as any).GameController.persistirEstado();
                    (window as any).avancarTurno();

                    this.asyncActionInProgress = false;
                    resolve();
                });
            });
        } else {
            estado.mesa[slotVazio] = pedra;
            estado.mesa[slotVazio].virada = false;
            estado.reserva[pedraIdx] = null;

            if (this.botBrain && actor === 'bot') {
                this.botBrain.observe({ tipo: 'colocar', origem: slotVazio, pedra: pedra }, estado);
            }

            (window as any).GameController.persistirEstado();
            (window as any).avancarTurno();
        }
    }

    private async executeFlip(action: TurnAction, estado: any, actor: string): Promise<void> {
        if (action.target === undefined) return;

        estado.mesa[action.target].virada = true;

        if (this.botBrain && actor === 'bot') {
            this.botBrain.observe({ tipo: 'virar', origem: action.target, pedra: estado.mesa[action.target] }, estado);
        }

        (window as any).GameController.persistirEstado();
        (window as any).avancarTurno();
    }

    private async executeSwap(action: TurnAction, estado: any, actor: string): Promise<void> {
        if (!action.targets) return;

        const { from, to } = action.targets;

        if (this.botBrain && actor === 'bot') {
            this.botBrain.observe({ tipo: 'trocar', origem: from, destino: to }, estado);
        }

        Logger.ai(`Animação de Troca Acionada: ${from} <-> ${to}`);
        estado.trocaAnimacao = { from, to, timestamp: Date.now(), jogador: actor === 'bot' ? 'Bot' : 'Player' };

        (window as any).GameController.persistirEstado();
    }

    private async executeChallenge(action: TurnAction, estado: any, actor: string): Promise<void> {
        if (action.target === undefined) return;

        if ((window as any).AnalyticsManager) {
            (window as any).AnalyticsManager.logAction('bot_challenge_init', { target: action.target });
        }

        estado.desafio = {
            tipo: "desafio",
            jogador: actor === 'bot' ? "Bot" : (window as any).nomeAtual,
            alvo: action.target,
            resolvido: false,
            status: "aguardando_resposta"
        };

        if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot && actor === 'bot') {
            (window as any).Renderer.mostrarFalaBot(`Eu desafio! O que é a pedra na posição ${action.target + 1}?`);
        } else if ((window as any).notificationManager) {
            (window as any).notificationManager.showInternal(`${actor === 'bot' ? 'Bot' : 'Jogador'} desafiou a pedra ${action.target + 1}!`);
        }

        if ((window as any).audioManager) (window as any).audioManager.playChallenge();

        (window as any).GameController.persistirEstado();
        if ((window as any).GameController.notificarAtualizacao) {
            (window as any).GameController.notificarAtualizacao();
        }
    }

    private async executeBoast(action: TurnAction, estado: any, actor: string): Promise<void> {
        if ((window as any).AnalyticsManager) {
            (window as any).AnalyticsManager.logPvEBoast(actor === 'bot' ? "Bot" : "Player");
        }

        estado.desafio = {
            tipo: "segabar",
            jogador: actor === 'bot' ? "Bot" : (window as any).nomeAtual,
            resolvido: false,
            status: "aguardando_resposta"
        };

        (window as any).GameController.persistirEstado();
        (window as any).GameController.notificarAtualizacao();

        if (this.botBrain && actor === 'bot') {
            const msg = this.botBrain.getChatter('boast_start');
            if (msg) {
                if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) {
                    (window as any).Renderer.mostrarFalaBot(msg);
                } else if ((window as any).notificationManager) {
                    (window as any).notificationManager.showInternal(`Bot: ${msg}`);
                }
            } else {
                if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) {
                    (window as any).Renderer.mostrarFalaBot("Estou confiante. Eu sei todas!");
                }
            }
        }

        if ((window as any).audioManager) (window as any).audioManager.playChallenge();
    }

    private async executePeek(action: TurnAction, estado: any, actor: string): Promise<void> {
        if (action.target === undefined) return;

        const pedra = estado.mesa[action.target];

        if (this.botBrain && actor === 'bot') {
            this.botBrain.updateMemory(action.target, pedra.nome, 1.0);

            if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) {
                (window as any).Renderer.mostrarFalaBot("Hm... deixe-me ver.");
            } else if ((window as any).notificationManager) {
                (window as any).notificationManager.showInternal(`Bot espiou a pedra na posição ${action.target + 1}`);
            }

            if ((window as any).adicionarSilhuetaEspiada) {
                (window as any).adicionarSilhuetaEspiada(action.target);
            }
        }

        this.asyncActionInProgress = true;
        return new Promise((resolve) => {
            setTimeout(() => {
                (window as any).avancarTurno();
                this.asyncActionInProgress = false;
                resolve();
            }, 1500);
        });
    }

    // ========== Controle de Estado do Bot ==========

    public setBotThinking(thinking: boolean): void {
        this.botThinking = thinking;

        // WATCHDOG: Forçar reset se travado pensando por > 8 segundos
        if (this.thinkingWatchdog) {
            clearTimeout(this.thinkingWatchdog);
            this.thinkingWatchdog = null;
        }

        if (thinking) {
            this.thinkingWatchdog = setTimeout(() => {
                if (this.botThinking) {
                    Logger.warn(LogCategory.AI, "[WATCHDOG] Bot travado pensando por 8s. Forçando reset.");
                    this.setBotThinking(false);
                    if ((window as any).avancarTurno) (window as any).avancarTurno();
                }
            }, 8000);
        }

        if ((window as any).Renderer && (window as any).Renderer.setBotThinking) {
            (window as any).Renderer.setBotThinking(thinking);
        }
    }

    public isBotThinking(): boolean {
        return this.botThinking;
    }

    public reset(): void {
        Logger.sys("PvETurnManager resetando estado...");
        this.asyncActionInProgress = false;
        this.setBotThinking(false);

        if (this.thinkingWatchdog) {
            clearTimeout(this.thinkingWatchdog);
            this.thinkingWatchdog = null;
        }
    }
}

// Exportar globalmente para compatibilidade
(window as any).PvETurnManager = PvETurnManager;
