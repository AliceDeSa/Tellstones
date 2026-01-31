// =========================
// ChallengeResolver - Módulo de Resolução de Desafios e Segabar
// =========================
// Gerencia o fluxo intermediário quando um jogador faz um desafio
// ou segabar, aguardando a resposta do oponente antes de retornar
// ao fluxo normal de turnos.

import { Logger, LogCategory } from "../utils/Logger.js";
import { MatchState, GameAction, ActionType } from "./MatchManager.js";
import LocaleManager from '../data/LocaleManager.js';

// ========================================
// ENUMS E TIPOS
// ========================================

/**
 * Tipos de resposta possíveis
 */
export enum ResponseType {
    // Respostas a Desafio
    GUESS = 'guess',           // Tentar adivinhar a pedra

    // Respostas a Segabar
    BELIEVE = 'acreditar',     // Acreditar no segabar
    DOUBT = 'duvidar',         // Duvidar e forçar prova
    COUNTER_BOAST = 'segabar_tambem'  // Contra-segabar
}

/**
 * Estado do resolver
 */
export enum ResolverState {
    IDLE = 'IDLE',
    AWAITING_RESPONSE = 'AWAITING_RESPONSE',
    PROVING = 'PROVING',       // Jogador provando segabar
    RESOLVING = 'RESOLVING'
}

/**
 * Dados do desafio/segabar ativo
 */
interface ActiveChallenge {
    type: 'challenge' | 'boast';
    initiator: number;         // Índice do jogador que iniciou
    target?: number;           // Slot alvo (para challenge)
    guess?: string;            // Palpite (para challenge)
    responses?: { slot: number; name: string }[];  // Respostas do segabar
    currentProofIndex?: number;  // Índice atual da prova do segabar
}

/**
 * Resultado da resolução
 */
export interface ResolutionResult {
    success: boolean;
    points: { playerIndex: number; amount: number }[];
    reveal: number[];          // Slots a serem revelados
}

// ========================================
// CLASSE PRINCIPAL
// ========================================

export class ChallengeResolver {
    private state: ResolverState = ResolverState.IDLE;
    private activeChallenge: ActiveChallenge | null = null;
    private matchManager: any = null;
    private botBrain: any = null;
    private turnManager: any = null; // ✅ NOVO: Referência ao TurnManager

    // Timeout para resposta
    private responseTimeout: ReturnType<typeof setTimeout> | null = null;
    private readonly RESPONSE_TIMEOUT_MS = 15000;

    constructor() {
        Logger.sys("[ChallengeResolver] Inicializado");
    }

    // ========================================
    // CONFIGURAÇÃO
    // ========================================

    setMatchManager(manager: any): void {
        this.matchManager = manager;
    }

    setBotBrain(brain: any): void {
        this.botBrain = brain;
    }

    // ✅ NOVO: Configurar TurnManager
    setTurnManager(manager: any): void {
        this.turnManager = manager;
    }

    reset(): void {
        this.state = ResolverState.IDLE;
        this.activeChallenge = null;
        this.clearResponseTimeout();
    }

    // ========================================
    // GETTERS
    // ========================================

    getState(): ResolverState {
        return this.state;
    }

    isActive(): boolean {
        return this.state !== ResolverState.IDLE;
    }

    getActiveChallenge(): ActiveChallenge | null {
        return this.activeChallenge;
    }

    // ========================================
    // INÍCIO DE DESAFIO
    // ========================================

    /**
     * Inicia um desafio
     */
    async startChallenge(action: GameAction, initiatorIndex: number): Promise<void> {
        Logger.game(`[ChallengeResolver] Iniciando desafio. Slot: ${action.target}, Iniciador: ${initiatorIndex}`);

        this.activeChallenge = {
            type: 'challenge',
            initiator: initiatorIndex,
            target: action.target
        };

        this.state = ResolverState.AWAITING_RESPONSE;

        // Atualizar estado do jogo
        const estado = (window as any).estadoJogo;
        if (estado) {
            estado.desafio = {
                tipo: 'desafio',
                jogador: initiatorIndex === 0 ? 'Jogador' : 'Bot',
                alvo: action.target,
                status: 'aguardando_resposta'
            };

            if ((window as any).GameController?.persistirEstado) {
                (window as any).GameController.persistirEstado();
            }
        }

        // Se foi o jogador que desafiou, bot precisa responder
        if (initiatorIndex === 0 && this.botBrain) {
            await this.requestBotChallengeResponse();
            // Não iniciar timeout - bot já respondeu
            return;
        }

        // Iniciar timeout apenas para respostas humanas
        this.startResponseTimeout();
    }

    /**
     * Inicia um segabar
     */
    async startBoast(action: GameAction, initiatorIndex: number): Promise<void> {
        Logger.game(`[ChallengeResolver] Iniciando segabar. Iniciador: ${initiatorIndex}`);

        this.activeChallenge = {
            type: 'boast',
            initiator: initiatorIndex,
            responses: [],
            currentProofIndex: 0
        };

        this.state = ResolverState.AWAITING_RESPONSE;

        // Atualizar estado do jogo
        const estado = (window as any).estadoJogo;
        if (estado) {
            estado.desafio = {
                tipo: 'segabar',
                jogador: initiatorIndex === 0 ? 'Jogador' : 'Bot',
                status: 'aguardando_resposta'
            };

            if ((window as any).GameController?.persistirEstado) {
                (window as any).GameController.persistirEstado();
            }
        }

        // Se foi o jogador que se gabou, bot precisa responder
        if (initiatorIndex === 0 && this.botBrain) {
            await this.requestBotBoastResponse();
            // Não iniciar timeout - bot já respondeu
            return;
        }

        // Iniciar timeout apenas para respostas humanas
        this.startResponseTimeout();
    }

    // ========================================
    // SUBMISSÃO DE RESPOSTAS
    // ========================================

    /**
     * Submete uma resposta ao desafio/segabar ativo
     */
    async submitResponse(responseType: ResponseType, data?: any): Promise<ResolutionResult> {
        if (!this.activeChallenge) {
            Logger.warn(LogCategory.GAME, "[ChallengeResolver] Nenhum desafio ativo para responder");
            return { success: false, points: [], reveal: [] };
        }

        this.clearResponseTimeout();
        Logger.game(`[ChallengeResolver] Resposta recebida: ${responseType}`, data);

        if (this.activeChallenge.type === 'challenge') {
            return await this.resolveChallengeResponse(responseType, data);
        } else {
            return await this.resolveBoastResponse(responseType, data);
        }
    }

    // ========================================
    // RESOLUÇÃO DE DESAFIO
    // ========================================

    private async resolveChallengeResponse(responseType: ResponseType, data: any): Promise<ResolutionResult> {
        if (!this.activeChallenge || this.activeChallenge.type !== 'challenge') {
            return { success: false, points: [], reveal: [] };
        }

        this.state = ResolverState.RESOLVING;

        const estado = (window as any).estadoJogo;
        const target = this.activeChallenge.target!;
        const pedraReal = estado.mesa[target];
        const palpite = data?.guess || data;

        Logger.game(`[ChallengeResolver] Resolvendo desafio. Palpite: ${palpite}, Real: ${pedraReal?.nome}`);

        const acertou = pedraReal && pedraReal.nome === palpite;
        const initiator = this.activeChallenge.initiator;
        const responder = (initiator + 1) % 2;

        let result: ResolutionResult;

        if (acertou) {
            // Quem respondeu acertou - ganha 1 ponto
            Logger.game(`[ChallengeResolver] ACERTOU! ${responder === 0 ? 'Jogador' : 'Bot'} ganha 1 ponto`);
            result = {
                success: true,
                points: [{ playerIndex: responder, amount: 1 }],
                reveal: [target]
            };

            if ((window as any).notificationManager) {
                (window as any).notificationManager.showGlobal(
                    `${responder === 0 ? 'Jogador' : 'Bot'} acertou e ganhou 1 ponto!`
                );
            }
        } else {
            // Quem respondeu errou - quem desafiou ganha 1 ponto
            Logger.game(`[ChallengeResolver] ERROU! ${initiator === 0 ? 'Jogador' : 'Bot'} ganha 1 ponto`);
            result = {
                success: true,
                points: [{ playerIndex: initiator, amount: 1 }],
                reveal: [target]
            };

            if ((window as any).notificationManager) {
                (window as any).notificationManager.showGlobal(
                    `${responder === 0 ? 'Jogador' : 'Bot'} errou! ${initiator === 0 ? 'Jogador' : 'Bot'} ganhou 1 ponto!`
                );
            }
        }

        // Revelar pedra
        if (pedraReal) {
            pedraReal.virada = false;
            // Persistir mudança
            if ((window as any).GameController?.persistirEstado) {
                (window as any).GameController.persistirEstado();
            }
        }

        // Limpar estado do desafio
        await this.cleanup();

        // ✅ NÃO chamar MatchManager - deixar PvEMode controlar turno
        // O turno será avançado pelo próprio fluxo do jogo

        return result;
    }

    // ========================================
    // RESOLUÇÃO DE SEGABAR
    // ========================================

    private async resolveBoastResponse(responseType: ResponseType, data: any): Promise<ResolutionResult> {
        if (!this.activeChallenge || this.activeChallenge.type !== 'boast') {
            return { success: false, points: [], reveal: [] };
        }

        const initiator = this.activeChallenge.initiator;
        const responder = (initiator + 1) % 2;

        switch (responseType) {
            case ResponseType.BELIEVE:
                return await this.handleBelieve(initiator);

            case ResponseType.DOUBT:
                return await this.handleDoubt(initiator);

            case ResponseType.COUNTER_BOAST:
                return await this.handleCounterBoast(responder);

            default:
                Logger.warn(LogCategory.GAME, `[ChallengeResolver] Resposta desconhecida: ${responseType}`);
                return { success: false, points: [], reveal: [] };
        }
    }

    private async handleBelieve(initiator: number): Promise<ResolutionResult> {
        Logger.game(`[ChallengeResolver] Oponente ACREDITOU. Iniciador ganha 1 ponto`);

        const result: ResolutionResult = {
            success: true,
            points: [{ playerIndex: initiator, amount: 1 }],
            reveal: []
        };

        if ((window as any).notificationManager) {
            (window as any).notificationManager.showGlobal(
                `${initiator === 0 ? 'Jogador' : 'Bot'} ganhou 1 ponto pelo segabar!`
            );
        }

        await this.cleanup();

        // ✅ NÃO chamar MatchManager - deixar PvEMode controlar turno

        return result;
    }

    private async handleDoubt(initiator: number): Promise<ResolutionResult> {
        Logger.game(`[ChallengeResolver] Oponente DUVIDOU. Iniciando prova...`);

        this.state = ResolverState.PROVING;

        // Atualizar estado para modo de prova
        const estado = (window as any).estadoJogo;
        if (estado?.desafio) {
            estado.desafio.status = 'responder_pecas';
            estado.desafio.idxAtual = 0;
            estado.desafio.respostas = [];

            if ((window as any).GameController?.persistirEstado) {
                (window as any).GameController.persistirEstado();
            }
        }

        // Se foi o bot que se gabou, ele precisa provar
        if (initiator === 1 && this.botBrain) {
            return await this.botProveBoast();
        }

        // Se foi o jogador, aguardar UI para provar
        return { success: true, points: [], reveal: [] };
    }

    private async handleCounterBoast(responder: number): Promise<ResolutionResult> {
        Logger.game(`[ChallengeResolver] CONTRA-SEGABAR! Responder assume e precisa provar`);

        // Trocar quem é o "dono" do segabar
        this.activeChallenge!.initiator = responder;
        this.state = ResolverState.PROVING;

        // Atualizar estado
        const estado = (window as any).estadoJogo;
        if (estado?.desafio) {
            estado.desafio.jogador = responder === 0 ? 'Jogador' : 'Bot';
            estado.desafio.status = 'responder_pecas';
            estado.desafio.idxAtual = 0;
            estado.desafio.respostas = [];

            if ((window as any).GameController?.persistirEstado) {
                (window as any).GameController.persistirEstado();
            }
        }

        // Se foi o bot que contra-gabou, ele precisa provar
        if (responder === 1 && this.botBrain) {
            return await this.botProveBoast();
        }

        return { success: true, points: [], reveal: [] };
    }

    /**
     * Submete uma prova de segabar (identificação de pedra)
     */
    async submitProof(slot: number, stoneName: string): Promise<ResolutionResult | null> {
        if (!this.activeChallenge || this.state !== ResolverState.PROVING) {
            return null;
        }

        const estado = (window as any).estadoJogo;
        if (!estado?.desafio) return null;

        // Registrar resposta
        if (!estado.desafio.respostas) estado.desafio.respostas = [];
        estado.desafio.respostas.push({ idxMesa: slot, nomeEscolhido: stoneName });
        estado.desafio.idxAtual = (estado.desafio.idxAtual || 0) + 1;

        // Verificar se terminou
        const pedrasViradas = estado.mesa.filter((p: any) => p && p.virada).length;

        if (estado.desafio.idxAtual >= pedrasViradas) {
            return await this.finishBoastProof();
        }

        // Ainda não terminou
        if ((window as any).GameController?.persistirEstado) {
            (window as any).GameController.persistirEstado();
        }

        return null;
    }

    private async finishBoastProof(): Promise<ResolutionResult> {
        const estado = (window as any).estadoJogo;
        const initiator = this.activeChallenge!.initiator;
        const responder = (initiator + 1) % 2;

        let errou = false;
        const slotsToReveal: number[] = [];

        // Validar todas as respostas
        estado.desafio.respostas.forEach((resp: any) => {
            const pedraReal = estado.mesa[resp.idxMesa];
            if (!pedraReal || pedraReal.nome !== resp.nomeEscolhido) {
                errou = true;
            }
            slotsToReveal.push(resp.idxMesa);
        });

        let result: ResolutionResult;

        if (errou) {
            // ERROU - Oponente ganha 3 pontos
            Logger.game(`[ChallengeResolver] ERROU a prova! Oponente ganha 3 pontos`);
            result = {
                success: true,
                points: [{ playerIndex: responder, amount: 3 }],
                reveal: slotsToReveal
            };

            if ((window as any).audioManager) {
                (window as any).audioManager.playFailure();
            }
            if ((window as any).notificationManager) {
                (window as any).notificationManager.showGlobal(
                    `${initiator === 0 ? 'Jogador' : 'Bot'} errou! ${responder === 0 ? 'Jogador' : 'Bot'} ganhou 3 pontos!`
                );
            }
        } else {
            // ACERTOU - Quem se gabou ganha 3 pontos
            Logger.game(`[ChallengeResolver] ACERTOU a prova! Iniciador ganha 3 pontos`);
            result = {
                success: true,
                points: [{ playerIndex: initiator, amount: 3 }],
                reveal: slotsToReveal
            };

            if ((window as any).audioManager) {
                (window as any).audioManager.playSuccess();
            }
            if ((window as any).notificationManager) {
                (window as any).notificationManager.showGlobal(
                    `${initiator === 0 ? 'Jogador' : 'Bot'} provou e ganhou 3 pontos!`
                );
            }
        }

        // Revelar pedras
        slotsToReveal.forEach(slot => {
            if (estado.mesa[slot]) {
                estado.mesa[slot].virada = false;
            }
        });

        await this.cleanup();

        // ✅ NÃO chamar MatchManager - deixar PvEMode controlar turno

        return result;
    }

    // ========================================
    // RESPOSTAS DO BOT
    // ========================================

    private async requestBotChallengeResponse(): Promise<void> {
        Logger.ai("[ChallengeResolver] Solicitando resposta do bot ao desafio...");

        // Aguardar um pouco para parecer natural
        await this.delay(1500);

        if (!this.activeChallenge) return;

        const estado = (window as any).estadoJogo;
        const target = this.activeChallenge.target!;

        // Bot decide qual pedra adivinhar
        let guess = "Espada"; // Default

        if (this.botBrain?.memory?.getSlotMemory) {
            const memory = this.botBrain.memory.getSlotMemory(target);
            if (memory?.knownName) {
                guess = memory.knownName;
                Logger.ai(`[ChallengeResolver] Bot usando memória: ${guess}`);
            } else {
                // Palpite aleatório
                const pedras = ['Espada', 'Escudo', 'Coroa', 'Martelo', 'Bandeira', 'Balança', 'Cavalo'];
                guess = pedras[Math.floor(Math.random() * pedras.length)];
                Logger.ai(`[ChallengeResolver] Bot palpite aleatório: ${guess}`);
            }
        }

        // Mostrar fala do bot
        if ((window as any).Renderer?.mostrarFalaBot) {
            const stoneName = LocaleManager.t('game.stones.' + guess);
            const speech = LocaleManager.t('bot.guess').replace('{stone}', stoneName);
            (window as any).Renderer.mostrarFalaBot(speech);
        }

        await this.delay(1000);

        // Submeter resposta
        await this.submitResponse(ResponseType.GUESS, { guess });
    }

    private async requestBotBoastResponse(): Promise<void> {
        Logger.ai("[ChallengeResolver] Solicitando resposta do bot ao segabar...");

        await this.delay(2000);

        if (!this.activeChallenge) return;

        // Bot decide: acreditar ou duvidar
        // Por enquanto, sempre acredita (pode ser melhorado com IA)
        const decision = Math.random() > 0.3 ? ResponseType.BELIEVE : ResponseType.DOUBT;

        Logger.ai(`[ChallengeResolver] Bot decidiu: ${decision}`);

        if ((window as any).Renderer?.mostrarFalaBot) {
            if (decision === ResponseType.BELIEVE) {
                (window as any).Renderer.mostrarFalaBot(LocaleManager.t('bot.believe'));
            } else {
                (window as any).Renderer.mostrarFalaBot(LocaleManager.t('bot.doubt'));
            }
        }

        await this.delay(1000);

        await this.submitResponse(decision);
    }

    private async botProveBoast(): Promise<ResolutionResult> {
        Logger.ai("[ChallengeResolver] Bot provando segabar...");

        const estado = (window as any).estadoJogo;
        const pedrasViradas = estado.mesa
            .map((p: any, i: number) => ({ pedra: p, slot: i }))
            .filter((item: any) => item.pedra && item.pedra.virada);

        for (const item of pedrasViradas) {
            await this.delay(1000);

            let guess = item.pedra.nome; // Bot "trapaceia" sabendo a resposta

            // Com 20% de chance, errar propositalmente
            if (Math.random() < 0.2) {
                const pedras = ['Espada', 'Escudo', 'Coroa', 'Martelo', 'Bandeira', 'Balança', 'Cavalo'];
                guess = pedras.filter(p => p !== item.pedra.nome)[Math.floor(Math.random() * 6)];
            }

            Logger.ai(`[ChallengeResolver] Bot prova slot ${item.slot}: ${guess}`);

            const result = await this.submitProof(item.slot, guess);
            if (result) return result;
        }

        return { success: false, points: [], reveal: [] };
    }

    // ========================================
    // UTILITÁRIOS
    // ========================================

    private async cleanup(): Promise<void> {
        Logger.game("[ChallengeResolver] Limpando estado...");

        // ✅ CRÍTICO: Limpar BotThinking ANTES de persistir estado
        if (this.turnManager) {
            this.turnManager.setBotThinking(false);
            Logger.game("[ChallengeResolver] BotThinking limpo");
        }

        // Limpar estado do jogo
        const estado = (window as any).estadoJogo;
        if (estado) {
            estado.desafio = null;
            if ((window as any).GameController?.persistirEstado) {
                (window as any).GameController.persistirEstado();
            }
        }

        // Reset interno
        this.state = ResolverState.IDLE;
        this.activeChallenge = null;
        this.clearResponseTimeout();
    }

    private startResponseTimeout(): void {
        this.responseTimeout = setTimeout(() => {
            Logger.warn(LogCategory.GAME, "[ChallengeResolver] TIMEOUT de resposta!");
            this.cleanup();

            if (this.matchManager) {
                this.matchManager.advanceTurn();
            }
        }, this.RESPONSE_TIMEOUT_MS);
    }

    private clearResponseTimeout(): void {
        if (this.responseTimeout) {
            clearTimeout(this.responseTimeout);
            this.responseTimeout = null;
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Exportar para uso global
(window as any).ChallengeResolver = ChallengeResolver;
