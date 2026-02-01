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
/**
 * Gerenciador de Turnos para o modo PvE.
 * Responsável por isolar toda a lógica de execução e validação de turnos,
 * separando-a da lógica de decisão do bot.
 */
export class PvETurnManager {
    constructor() {
        this.botBrain = null;
        this.asyncActionInProgress = false;
        this.botThinking = false;
        this.thinkingWatchdog = null;
        Logger.sys("PvETurnManager inicializado");
    }
    /**
     * Configura a referência ao BotBrain.
     */
    setBotBrain(brain) {
        this.botBrain = brain;
    }
    /**
     * Valida se uma ação pode ser executada no estado atual.
     */
    validateAction(action, state) {
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
    executeAction(action, actor) {
        return __awaiter(this, void 0, void 0, function* () {
            const estado = window.estadoJogo;
            const validation = this.validateAction(action, estado);
            if (!validation.isValid) {
                Logger.warn(LogCategory.GAME, `Ação inválida: ${validation.reason}`);
                return;
            }
            Logger.game(`Executando ação: ${action.type} por ${actor}`);
            try {
                switch (action.type) {
                    case 'place':
                        yield this.executePlace(action, estado, actor);
                        break;
                    case 'flip':
                        yield this.executeFlip(action, estado, actor);
                        break;
                    case 'swap':
                        yield this.executeSwap(action, estado, actor);
                        break;
                    case 'challenge':
                        yield this.executeChallenge(action, estado, actor);
                        break;
                    case 'boast':
                        yield this.executeBoast(action, estado, actor);
                        break;
                    case 'peek':
                        yield this.executePeek(action, estado, actor);
                        break;
                }
            }
            catch (err) {
                Logger.error(LogCategory.GAME, `Erro ao executar ação ${action.type}:`, err);
                throw err;
            }
        });
    }
    /**
     * Verifica se um ator (jogador ou bot) pode tomar seu turno.
     */
    canTakeTurn(actor) {
        const estado = window.estadoJogo;
        if (!estado || !estado.centralAlinhada)
            return false;
        // Verificar flags de bloqueio
        if (window.animacaoTrocaEmAndamento)
            return false;
        if (window.animacaoAlinhamentoEmAndamento)
            return false;
        if (this.asyncActionInProgress)
            return false;
        // Se bot está pensando, não pode tomar turno
        if (actor === 'bot' && this.botThinking)
            return false;
        // Verificar se há ação pendente (mas não bloqueia ações reativas)
        if (estado.desafio && !this.isPendingReactiveAction(estado)) {
            return false;
        }
        return true;
    }
    /**
     * Verifica se há uma ação pendente.
     */
    isPendingAction() {
        const estado = window.estadoJogo;
        return estado && estado.desafio && estado.desafio.status !== 'resolvido';
    }
    /**
     * Verifica se a ação pendente é uma resposta reativa.
     */
    isPendingReactiveAction(estado) {
        if (!estado.desafio)
            return false;
        // Desafios e segabares que aguardam resposta são reativos
        return estado.desafio.status === 'aguardando_resposta' ||
            estado.desafio.status === 'responder_pecas';
    }
    /**
     * Solicita uma decisão do bot (isolado - bot apenas decide, não executa).
     */
    requestBotDecision() {
        if (!this.botBrain) {
            Logger.warn(LogCategory.AI, "BotBrain não configurado");
            return null;
        }
        const estado = window.estadoJogo;
        try {
            const decision = this.botBrain.decideMove(estado);
            if (!decision) {
                Logger.warn(LogCategory.AI, "Bot não retornou decisão");
                return null;
            }
            Logger.ai(`Bot decidiu: ${decision.type}`, decision);
            return decision;
        }
        catch (err) {
            Logger.error(LogCategory.AI, "Erro ao solicitar decisão do bot:", err);
            return null;
        }
    }
    /**
     * NOVO: Trata respostas reativas (desafios/segabares) sem consumir turno.
     */
    handleReactiveResponse(challengeType, state) {
        return __awaiter(this, void 0, void 0, function* () {
            Logger.ai(`Tratando resposta reativa: ${challengeType}`);
            // Respostas reativas NÃO devem avançar o turno
            // O bot apenas responde e o jogo continua
            if (challengeType === 'desafio') {
                // Bot está respondendo a desafio do jogador
                yield this.handleChallengeResponse(state);
            }
            else if (challengeType === 'segabar') {
                // Bot está respondendo a segabar do jogador
                yield this.handleBoastResponse(state);
            }
        });
    }
    /**
     * Responde a um desafio (ação reativa).
     * CRÍTICO: Esta é uma RESPOSTA REATIVA - NÃO avança turno!
     */
    handleChallengeResponse(state) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!state.desafio || state.desafio.tipo !== 'desafio')
                return;
            const targetIdx = state.desafio.alvo;
            if (!state.mesa[targetIdx]) {
                Logger.warn(LogCategory.AI, "Desafio em slot vazio - limpando");
                state.desafio = null;
                window.GameController.persistirEstado();
                return;
            }
            Logger.ai("Bot respondendo a desafio do jogador (AÇÃO REATIVA)...");
            if (window.Renderer && window.Renderer.mostrarFalaBot) {
                window.Renderer.mostrarFalaBot("Um momento...");
            }
            // Aguardar antes de responder (simula pensamento)
            yield new Promise(resolve => setTimeout(resolve, 1500));
            try {
                if (!this.botBrain) {
                    Logger.error(LogCategory.AI, "BotBrain ausente ao responder desafio");
                    return;
                }
                const palpite = this.botBrain.predictStone(targetIdx);
                const correta = state.mesa[targetIdx].nome;
                if (window.Renderer && window.Renderer.mostrarFalaBot) {
                    window.Renderer.mostrarFalaBot(`Eu acho que é... ${palpite}!`);
                }
                // Aguardar antes de revelar
                yield new Promise(resolve => setTimeout(resolve, 1500));
                // Revelar pedra
                state.mesa[targetIdx].virada = false;
                window.GameController.persistirEstado();
                const success = (palpite === correta);
                // Analytics
                if (window.AnalyticsManager) {
                    window.AnalyticsManager.logAction('challenge', {
                        target_stone: correta,
                        bot_guess: palpite,
                        success: success,
                        player_won: !success
                    });
                    window.AnalyticsManager.logPvEChallenge("Player", !success, "challenge", correta);
                }
                // Atualizar pontos
                const playersList = Array.isArray(state.jogadores) ? state.jogadores : Object.values(state.jogadores);
                const bot = playersList.find((j) => j.id === 'p2' || j.nome === 'Bot');
                const player = playersList.find((j) => j.id === 'p1' || j.nome !== 'Bot');
                if (palpite === correta) {
                    // Bot acertou
                    if (window.notificationManager) {
                        window.notificationManager.showInternal("Bot acertou! Ponto para o Bot.");
                    }
                    if (window.audioManager)
                        window.audioManager.playFailure();
                    bot.pontos = (bot.pontos || 0) + 1;
                    const chat = this.botBrain.getChatter('winning');
                    if (chat) {
                        setTimeout(() => {
                            if (window.Renderer && window.Renderer.mostrarFalaBot) {
                                window.Renderer.mostrarFalaBot(chat);
                            }
                        }, 2000);
                    }
                }
                else {
                    // Bot errou
                    if (window.notificationManager) {
                        window.notificationManager.showInternal("Bot errou! Ponto para você.");
                    }
                    if (window.audioManager)
                        window.audioManager.playSuccess();
                    player.pontos = (player.pontos || 0) + 1;
                    const chat = this.botBrain.getChatter('losing');
                    if (chat) {
                        setTimeout(() => {
                            if (window.Renderer && window.Renderer.mostrarFalaBot) {
                                window.Renderer.mostrarFalaBot(chat);
                            }
                        }, 2000);
                    }
                }
                // Limpar desafio
                state.desafio = null;
                window.GameController.persistirEstado();
                // Verificar fim de jogo
                if (window.GameController) {
                    window.GameController.verificarFimDeJogo();
                }
                // ✅ CORREÇÃO CRÍTICA: NÃO chamar avancarTurno() aqui!
                // Esta é uma RESPOSTA REATIVA - o turno já está correto
                Logger.ai("✅ Resposta reativa completa - turno NÃO avançado");
            }
            catch (err) {
                Logger.error(LogCategory.AI, "Erro ao responder desafio:", err);
                state.desafio = null;
                window.GameController.persistirEstado();
            }
        });
    }
    /**
     * Responde a um segabar (ação reativa).
     * CRÍTICO: Esta é uma RESPOSTA REATIVA - NÃO avança turno!
     */
    handleBoastResponse(state) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!state.desafio || state.desafio.tipo !== 'segabar')
                return;
            Logger.ai("Bot respondendo a segabar do jogador (AÇÃO REATIVA)...");
            try {
                if (!this.botBrain) {
                    Logger.warn(LogCategory.AI, "BotBrain ausente ao responder segabar");
                    return;
                }
                // Analytics
                if (window.AnalyticsManager) {
                    window.AnalyticsManager.logPvEBoast("Player");
                }
                // Normalizar jogadores
                const playersList = Array.isArray(state.jogadores)
                    ? state.jogadores
                    : Object.values(state.jogadores);
                const player = playersList.find((j) => j.id === 'p1' || j.nome !== 'Bot');
                const playerScore = player ? (player.pontos || 0) : 0;
                let decision = "acreditar";
                // Se jogador está no match point, bot sempre duvida
                if (playerScore >= 2) {
                    Logger.ai("Jogador no Match Point (2). Bot recusa aceitar Segabar.");
                    decision = "duvidar";
                }
                else {
                    decision = this.botBrain.decideBoastResponse(state);
                }
                // Executar decisão
                if (decision === "duvidar") {
                    if (window.Renderer && window.Renderer.mostrarFalaBot) {
                        window.Renderer.mostrarFalaBot("Não acredito. Duvido!");
                    }
                    if (window.GameController) {
                        window.GameController.responderSegabar("duvidar");
                    }
                }
                else if (decision === "segabar_tambem") {
                    if (window.Renderer && window.Renderer.mostrarFalaBot) {
                        window.Renderer.mostrarFalaBot("Ah é? Pois EU sei todas!");
                    }
                    if (window.GameController) {
                        window.GameController.responderSegabar("segabar_tambem");
                    }
                }
                else {
                    // Acreditar
                    if (window.Renderer && window.Renderer.mostrarFalaBot) {
                        window.Renderer.mostrarFalaBot("Tudo bem, acredito.");
                    }
                    if (window.GameController && window.GameController.responderSegabar) {
                        window.GameController.responderSegabar("acreditar");
                    }
                    else {
                        // Fallback manual
                        state.desafio = null;
                        window.GameController.persistirEstado();
                    }
                }
                // ✅ CORREÇÃO CRÍTICA: NÃO chamar avancarTurno() aqui!
                // Esta é uma RESPOSTA REATIVA - o GameController já gerencia o fluxo
                Logger.ai("✅ Resposta reativa completa - turno gerenciado pelo GameController");
            }
            catch (err) {
                Logger.error(LogCategory.AI, "Erro ao responder segabar:", err);
                state.desafio = null;
                window.GameController.persistirEstado();
            }
        });
    }
    // ========== Métodos de Validação ==========
    validatePlace(action, state) {
        var _a;
        const slotsValidos = ((_a = window.GameRules) === null || _a === void 0 ? void 0 : _a.calcularSlotsValidos(state.mesa)) || [];
        Logger.ai(`[validatePlace] Slots válidos: ${JSON.stringify(slotsValidos)}, Target: ${action.target}`);
        if (slotsValidos.length === 0) {
            return { isValid: false, reason: "Nenhum slot válido disponível" };
        }
        if (action.target !== undefined && !slotsValidos.includes(action.target)) {
            Logger.warn(LogCategory.AI, `[validatePlace] Slot ${action.target} NÃO está em slotsValidos: ${JSON.stringify(slotsValidos)}`);
            return { isValid: false, reason: `Slot ${action.target} não é válido` };
        }
        const hasStone = state.reserva && state.reserva.some((p) => p !== null);
        if (!hasStone) {
            return { isValid: false, reason: "Sem pedras na reserva" };
        }
        return { isValid: true };
    }
    validateFlip(action, state) {
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
    validateSwap(action, state) {
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
    validateChallenge(action, state) {
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
    validateBoast(action, state) {
        const hiddenStones = state.mesa.filter((p) => p && p.virada).length;
        if (hiddenStones < 2) {
            return { isValid: false, reason: "Precisa de pelo menos 2 pedras viradas para segabar" };
        }
        return { isValid: true };
    }
    validatePeek(action, state) {
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
    executePlace(action, estado, actor) {
        return __awaiter(this, void 0, void 0, function* () {
            const slotsValidos = window.GameRules.calcularSlotsValidos(estado.mesa);
            let slotVazio = action.target !== undefined && slotsValidos.includes(action.target)
                ? action.target
                : slotsValidos[Math.floor(Math.random() * slotsValidos.length)];
            const pedraIdx = estado.reserva.findIndex((p) => p !== null);
            if (pedraIdx === -1)
                return;
            const pedra = estado.reserva[pedraIdx];
            if (window.Renderer && window.Renderer.animarBotColocar && actor === 'bot') {
                this.asyncActionInProgress = true;
                return new Promise((resolve) => {
                    window.Renderer.animarBotColocar(pedra, -1, slotVazio, () => {
                        estado.mesa[slotVazio] = pedra;
                        estado.mesa[slotVazio].virada = false;
                        estado.reserva[pedraIdx] = null;
                        if (this.botBrain && actor === 'bot') {
                            this.botBrain.observe({ tipo: 'colocar', origem: slotVazio, pedra: pedra }, estado);
                        }
                        window.GameController.persistirEstado();
                        window.avancarTurno();
                        this.asyncActionInProgress = false;
                        resolve();
                    });
                });
            }
            else {
                estado.mesa[slotVazio] = pedra;
                estado.mesa[slotVazio].virada = false;
                estado.reserva[pedraIdx] = null;
                if (this.botBrain && actor === 'bot') {
                    this.botBrain.observe({ tipo: 'colocar', origem: slotVazio, pedra: pedra }, estado);
                }
                window.GameController.persistirEstado();
                window.avancarTurno();
            }
        });
    }
    executeFlip(action, estado, actor) {
        return __awaiter(this, void 0, void 0, function* () {
            if (action.target === undefined)
                return;
            estado.mesa[action.target].virada = true;
            if (this.botBrain && actor === 'bot') {
                this.botBrain.observe({ tipo: 'virar', origem: action.target, pedra: estado.mesa[action.target] }, estado);
            }
            window.GameController.persistirEstado();
            window.avancarTurno();
        });
    }
    executeSwap(action, estado, actor) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!action.targets)
                return;
            const { from, to } = action.targets;
            if (this.botBrain && actor === 'bot') {
                this.botBrain.observe({ tipo: 'trocar', origem: from, destino: to }, estado);
            }
            Logger.ai(`Animação de Troca Acionada: ${from} <-> ${to}`);
            estado.trocaAnimacao = { from, to, timestamp: Date.now(), jogador: actor === 'bot' ? 'Bot' : 'Player' };
            window.GameController.persistirEstado();
        });
    }
    executeChallenge(action, estado, actor) {
        return __awaiter(this, void 0, void 0, function* () {
            if (action.target === undefined)
                return;
            if (window.AnalyticsManager) {
                window.AnalyticsManager.logAction('bot_challenge_init', { target: action.target });
            }
            estado.desafio = {
                tipo: "desafio",
                jogador: actor === 'bot' ? "Bot" : window.nomeAtual,
                alvo: action.target,
                resolvido: false,
                status: "aguardando_resposta"
            };
            if (window.Renderer && window.Renderer.mostrarFalaBot && actor === 'bot') {
                window.Renderer.mostrarFalaBot(`Eu desafio! O que é a pedra na posição ${action.target + 1}?`);
            }
            else if (window.notificationManager) {
                window.notificationManager.showInternal(`${actor === 'bot' ? 'Bot' : 'Jogador'} desafiou a pedra ${action.target + 1}!`);
            }
            if (window.audioManager)
                window.audioManager.playChallenge();
            window.GameController.persistirEstado();
            if (window.GameController.notificarAtualizacao) {
                window.GameController.notificarAtualizacao();
            }
        });
    }
    executeBoast(action, estado, actor) {
        return __awaiter(this, void 0, void 0, function* () {
            if (window.AnalyticsManager) {
                window.AnalyticsManager.logPvEBoast(actor === 'bot' ? "Bot" : "Player");
            }
            estado.desafio = {
                tipo: "segabar",
                jogador: actor === 'bot' ? "Bot" : window.nomeAtual,
                resolvido: false,
                status: "aguardando_resposta"
            };
            window.GameController.persistirEstado();
            window.GameController.notificarAtualizacao();
            if (this.botBrain && actor === 'bot') {
                const msg = this.botBrain.getChatter('boast_start');
                if (msg) {
                    if (window.Renderer && window.Renderer.mostrarFalaBot) {
                        window.Renderer.mostrarFalaBot(msg);
                    }
                    else if (window.notificationManager) {
                        window.notificationManager.showInternal(`Bot: ${msg}`);
                    }
                }
                else {
                    if (window.Renderer && window.Renderer.mostrarFalaBot) {
                        window.Renderer.mostrarFalaBot("Estou confiante. Eu sei todas!");
                    }
                }
            }
            if (window.audioManager)
                window.audioManager.playChallenge();
        });
    }
    executePeek(action, estado, actor) {
        return __awaiter(this, void 0, void 0, function* () {
            if (action.target === undefined)
                return;
            const pedra = estado.mesa[action.target];
            if (this.botBrain && actor === 'bot') {
                this.botBrain.updateMemory(action.target, pedra.nome, 1.0);
                if (window.Renderer && window.Renderer.mostrarFalaBot) {
                    window.Renderer.mostrarFalaBot("Hm... deixe-me ver.");
                }
                else if (window.notificationManager) {
                    window.notificationManager.showInternal(`Bot espiou a pedra na posição ${action.target + 1}`);
                }
                if (window.adicionarSilhuetaEspiada) {
                    window.adicionarSilhuetaEspiada(action.target);
                }
            }
            this.asyncActionInProgress = true;
            return new Promise((resolve) => {
                setTimeout(() => {
                    window.avancarTurno();
                    this.asyncActionInProgress = false;
                    resolve();
                }, 1500);
            });
        });
    }
    // ========== Controle de Estado do Bot ==========
    setBotThinking(thinking) {
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
                    if (window.avancarTurno)
                        window.avancarTurno();
                }
            }, 8000);
        }
        if (window.Renderer && window.Renderer.setBotThinking) {
            window.Renderer.setBotThinking(thinking);
        }
    }
    isBotThinking() {
        return this.botThinking;
    }
    reset() {
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
window.PvETurnManager = PvETurnManager;
