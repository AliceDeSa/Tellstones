// =========================
// ChallengeResolver - Módulo de Resolução de Desafios e Segabar
// =========================
// Gerencia o fluxo intermediário quando um jogador faz um desafio
// ou segabar, aguardando a resposta do oponente antes de retornar
// ao fluxo normal de turnos.
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
import LocaleManager from '../data/LocaleManager.js';
// ========================================
// ENUMS E TIPOS
// ========================================
/**
 * Tipos de resposta possíveis
 */
export var ResponseType;
(function (ResponseType) {
    // Respostas a Desafio
    ResponseType["GUESS"] = "guess";
    // Respostas a Segabar
    ResponseType["BELIEVE"] = "acreditar";
    ResponseType["DOUBT"] = "duvidar";
    ResponseType["COUNTER_BOAST"] = "segabar_tambem"; // Contra-segabar
})(ResponseType || (ResponseType = {}));
/**
 * Estado do resolver
 */
export var ResolverState;
(function (ResolverState) {
    ResolverState["IDLE"] = "IDLE";
    ResolverState["AWAITING_RESPONSE"] = "AWAITING_RESPONSE";
    ResolverState["PROVING"] = "PROVING";
    ResolverState["RESOLVING"] = "RESOLVING";
})(ResolverState || (ResolverState = {}));
// ========================================
// CLASSE PRINCIPAL
// ========================================
export class ChallengeResolver {
    constructor() {
        this.state = ResolverState.IDLE;
        this.activeChallenge = null;
        this.matchManager = null;
        this.botBrain = null;
        this.turnManager = null; // ✅ NOVO: Referência ao TurnManager
        // Timeout para resposta
        this.responseTimeout = null;
        this.RESPONSE_TIMEOUT_MS = 15000;
        Logger.sys("[ChallengeResolver] Inicializado");
    }
    // ========================================
    // CONFIGURAÇÃO
    // ========================================
    setMatchManager(manager) {
        this.matchManager = manager;
    }
    setBotBrain(brain) {
        this.botBrain = brain;
    }
    // ✅ NOVO: Configurar TurnManager
    setTurnManager(manager) {
        this.turnManager = manager;
    }
    reset() {
        this.state = ResolverState.IDLE;
        this.activeChallenge = null;
        this.clearResponseTimeout();
    }
    // ========================================
    // GETTERS
    // ========================================
    getState() {
        return this.state;
    }
    isActive() {
        return this.state !== ResolverState.IDLE;
    }
    getActiveChallenge() {
        return this.activeChallenge;
    }
    // ========================================
    // INÍCIO DE DESAFIO
    // ========================================
    /**
     * Inicia um desafio
     */
    startChallenge(action, initiatorIndex) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            Logger.game(`[ChallengeResolver] Iniciando desafio. Slot: ${action.target}, Iniciador: ${initiatorIndex}`);
            this.activeChallenge = {
                type: 'challenge',
                initiator: initiatorIndex,
                target: action.target
            };
            this.state = ResolverState.AWAITING_RESPONSE;
            // Atualizar estado do jogo
            const estado = window.estadoJogo;
            if (estado) {
                estado.desafio = {
                    tipo: 'desafio',
                    jogador: initiatorIndex === 0 ? 'Jogador' : 'Bot',
                    alvo: action.target,
                    status: 'aguardando_resposta'
                };
                if ((_a = window.GameController) === null || _a === void 0 ? void 0 : _a.persistirEstado) {
                    window.GameController.persistirEstado();
                }
            }
            // Se foi o jogador que desafiou, bot precisa responder
            if (initiatorIndex === 0 && this.botBrain) {
                yield this.requestBotChallengeResponse();
                // Não iniciar timeout - bot já respondeu
                return;
            }
            // Iniciar timeout apenas para respostas humanas
            this.startResponseTimeout();
        });
    }
    /**
     * Inicia um segabar
     */
    startBoast(action, initiatorIndex) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            Logger.game(`[ChallengeResolver] Iniciando segabar. Iniciador: ${initiatorIndex}`);
            this.activeChallenge = {
                type: 'boast',
                initiator: initiatorIndex,
                responses: [],
                currentProofIndex: 0
            };
            this.state = ResolverState.AWAITING_RESPONSE;
            // Atualizar estado do jogo
            const estado = window.estadoJogo;
            if (estado) {
                estado.desafio = {
                    tipo: 'segabar',
                    jogador: initiatorIndex === 0 ? 'Jogador' : 'Bot',
                    status: 'aguardando_resposta'
                };
                if ((_a = window.GameController) === null || _a === void 0 ? void 0 : _a.persistirEstado) {
                    window.GameController.persistirEstado();
                }
            }
            // Se foi o jogador que se gabou, bot precisa responder
            if (initiatorIndex === 0 && this.botBrain) {
                yield this.requestBotBoastResponse();
                // Não iniciar timeout - bot já respondeu
                return;
            }
            // Iniciar timeout apenas para respostas humanas
            this.startResponseTimeout();
        });
    }
    // ========================================
    // SUBMISSÃO DE RESPOSTAS
    // ========================================
    /**
     * Submete uma resposta ao desafio/segabar ativo
     */
    submitResponse(responseType, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.activeChallenge) {
                Logger.warn(LogCategory.GAME, "[ChallengeResolver] Nenhum desafio ativo para responder");
                return { success: false, points: [], reveal: [] };
            }
            this.clearResponseTimeout();
            Logger.game(`[ChallengeResolver] Resposta recebida: ${responseType}`, data);
            if (this.activeChallenge.type === 'challenge') {
                return yield this.resolveChallengeResponse(responseType, data);
            }
            else {
                return yield this.resolveBoastResponse(responseType, data);
            }
        });
    }
    // ========================================
    // RESOLUÇÃO DE DESAFIO
    // ========================================
    resolveChallengeResponse(responseType, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!this.activeChallenge || this.activeChallenge.type !== 'challenge') {
                return { success: false, points: [], reveal: [] };
            }
            this.state = ResolverState.RESOLVING;
            const estado = window.estadoJogo;
            const target = this.activeChallenge.target;
            const pedraReal = estado.mesa[target];
            const palpite = (data === null || data === void 0 ? void 0 : data.guess) || data;
            Logger.game(`[ChallengeResolver] Resolvendo desafio. Palpite: ${palpite}, Real: ${pedraReal === null || pedraReal === void 0 ? void 0 : pedraReal.nome}`);
            const acertou = pedraReal && pedraReal.nome === palpite;
            const initiator = this.activeChallenge.initiator;
            const responder = (initiator + 1) % 2;
            let result;
            if (acertou) {
                // Quem respondeu acertou - ganha 1 ponto
                Logger.game(`[ChallengeResolver] ACERTOU! ${responder === 0 ? 'Jogador' : 'Bot'} ganha 1 ponto`);
                result = {
                    success: true,
                    points: [{ playerIndex: responder, amount: 1 }],
                    reveal: [target]
                };
                if (window.notificationManager) {
                    window.notificationManager.showGlobal(`${responder === 0 ? 'Jogador' : 'Bot'} acertou e ganhou 1 ponto!`);
                }
            }
            else {
                // Quem respondeu errou - quem desafiou ganha 1 ponto
                Logger.game(`[ChallengeResolver] ERROU! ${initiator === 0 ? 'Jogador' : 'Bot'} ganha 1 ponto`);
                result = {
                    success: true,
                    points: [{ playerIndex: initiator, amount: 1 }],
                    reveal: [target]
                };
                if (window.notificationManager) {
                    window.notificationManager.showGlobal(`${responder === 0 ? 'Jogador' : 'Bot'} errou! ${initiator === 0 ? 'Jogador' : 'Bot'} ganhou 1 ponto!`);
                }
            }
            // Revelar pedra
            if (pedraReal) {
                pedraReal.virada = false;
                // Persistir mudança
                if ((_a = window.GameController) === null || _a === void 0 ? void 0 : _a.persistirEstado) {
                    window.GameController.persistirEstado();
                }
            }
            // Limpar estado do desafio
            yield this.cleanup();
            // ✅ NÃO chamar MatchManager - deixar PvEMode controlar turno
            // O turno será avançado pelo próprio fluxo do jogo
            return result;
        });
    }
    // ========================================
    // RESOLUÇÃO DE SEGABAR
    // ========================================
    resolveBoastResponse(responseType, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.activeChallenge || this.activeChallenge.type !== 'boast') {
                return { success: false, points: [], reveal: [] };
            }
            const initiator = this.activeChallenge.initiator;
            const responder = (initiator + 1) % 2;
            switch (responseType) {
                case ResponseType.BELIEVE:
                    return yield this.handleBelieve(initiator);
                case ResponseType.DOUBT:
                    return yield this.handleDoubt(initiator);
                case ResponseType.COUNTER_BOAST:
                    return yield this.handleCounterBoast(responder);
                default:
                    Logger.warn(LogCategory.GAME, `[ChallengeResolver] Resposta desconhecida: ${responseType}`);
                    return { success: false, points: [], reveal: [] };
            }
        });
    }
    handleBelieve(initiator) {
        return __awaiter(this, void 0, void 0, function* () {
            Logger.game(`[ChallengeResolver] Oponente ACREDITOU. Iniciador ganha 1 ponto`);
            const result = {
                success: true,
                points: [{ playerIndex: initiator, amount: 1 }],
                reveal: []
            };
            if (window.notificationManager) {
                window.notificationManager.showGlobal(`${initiator === 0 ? 'Jogador' : 'Bot'} ganhou 1 ponto pelo segabar!`);
            }
            yield this.cleanup();
            // ✅ NÃO chamar MatchManager - deixar PvEMode controlar turno
            return result;
        });
    }
    handleDoubt(initiator) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            Logger.game(`[ChallengeResolver] Oponente DUVIDOU. Iniciando prova...`);
            this.state = ResolverState.PROVING;
            // Atualizar estado para modo de prova
            const estado = window.estadoJogo;
            if (estado === null || estado === void 0 ? void 0 : estado.desafio) {
                estado.desafio.status = 'responder_pecas';
                estado.desafio.idxAtual = 0;
                estado.desafio.respostas = [];
                if ((_a = window.GameController) === null || _a === void 0 ? void 0 : _a.persistirEstado) {
                    window.GameController.persistirEstado();
                }
            }
            // Se foi o bot que se gabou, ele precisa provar
            if (initiator === 1 && this.botBrain) {
                return yield this.botProveBoast();
            }
            // Se foi o jogador, aguardar UI para provar
            return { success: true, points: [], reveal: [] };
        });
    }
    handleCounterBoast(responder) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            Logger.game(`[ChallengeResolver] CONTRA-SEGABAR! Responder assume e precisa provar`);
            // Trocar quem é o "dono" do segabar
            this.activeChallenge.initiator = responder;
            this.state = ResolverState.PROVING;
            // Atualizar estado
            const estado = window.estadoJogo;
            if (estado === null || estado === void 0 ? void 0 : estado.desafio) {
                estado.desafio.jogador = responder === 0 ? 'Jogador' : 'Bot';
                estado.desafio.status = 'responder_pecas';
                estado.desafio.idxAtual = 0;
                estado.desafio.respostas = [];
                if ((_a = window.GameController) === null || _a === void 0 ? void 0 : _a.persistirEstado) {
                    window.GameController.persistirEstado();
                }
            }
            // Se foi o bot que contra-gabou, ele precisa provar
            if (responder === 1 && this.botBrain) {
                return yield this.botProveBoast();
            }
            return { success: true, points: [], reveal: [] };
        });
    }
    /**
     * Submete uma prova de segabar (identificação de pedra)
     */
    submitProof(slot, stoneName) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!this.activeChallenge || this.state !== ResolverState.PROVING) {
                return null;
            }
            const estado = window.estadoJogo;
            if (!(estado === null || estado === void 0 ? void 0 : estado.desafio))
                return null;
            // Registrar resposta
            if (!estado.desafio.respostas)
                estado.desafio.respostas = [];
            estado.desafio.respostas.push({ idxMesa: slot, nomeEscolhido: stoneName });
            estado.desafio.idxAtual = (estado.desafio.idxAtual || 0) + 1;
            // Verificar se terminou
            const pedrasViradas = estado.mesa.filter((p) => p && p.virada).length;
            if (estado.desafio.idxAtual >= pedrasViradas) {
                return yield this.finishBoastProof();
            }
            // Ainda não terminou
            if ((_a = window.GameController) === null || _a === void 0 ? void 0 : _a.persistirEstado) {
                window.GameController.persistirEstado();
            }
            return null;
        });
    }
    finishBoastProof() {
        return __awaiter(this, void 0, void 0, function* () {
            const estado = window.estadoJogo;
            const initiator = this.activeChallenge.initiator;
            const responder = (initiator + 1) % 2;
            let errou = false;
            const slotsToReveal = [];
            // Validar todas as respostas
            estado.desafio.respostas.forEach((resp) => {
                const pedraReal = estado.mesa[resp.idxMesa];
                if (!pedraReal || pedraReal.nome !== resp.nomeEscolhido) {
                    errou = true;
                }
                slotsToReveal.push(resp.idxMesa);
            });
            let result;
            if (errou) {
                // ERROU - Oponente ganha 3 pontos
                Logger.game(`[ChallengeResolver] ERROU a prova! Oponente ganha 3 pontos`);
                result = {
                    success: true,
                    points: [{ playerIndex: responder, amount: 3 }],
                    reveal: slotsToReveal
                };
                if (window.audioManager) {
                    window.audioManager.playFailure();
                }
                if (window.notificationManager) {
                    window.notificationManager.showGlobal(`${initiator === 0 ? 'Jogador' : 'Bot'} errou! ${responder === 0 ? 'Jogador' : 'Bot'} ganhou 3 pontos!`);
                }
            }
            else {
                // ACERTOU - Quem se gabou ganha 3 pontos
                Logger.game(`[ChallengeResolver] ACERTOU a prova! Iniciador ganha 3 pontos`);
                result = {
                    success: true,
                    points: [{ playerIndex: initiator, amount: 3 }],
                    reveal: slotsToReveal
                };
                if (window.audioManager) {
                    window.audioManager.playSuccess();
                }
                if (window.notificationManager) {
                    window.notificationManager.showGlobal(`${initiator === 0 ? 'Jogador' : 'Bot'} provou e ganhou 3 pontos!`);
                }
            }
            // Revelar pedras
            slotsToReveal.forEach(slot => {
                if (estado.mesa[slot]) {
                    estado.mesa[slot].virada = false;
                }
            });
            yield this.cleanup();
            // ✅ NÃO chamar MatchManager - deixar PvEMode controlar turno
            return result;
        });
    }
    // ========================================
    // RESPOSTAS DO BOT
    // ========================================
    requestBotChallengeResponse() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            Logger.ai("[ChallengeResolver] Solicitando resposta do bot ao desafio...");
            // Aguardar um pouco para parecer natural
            yield this.delay(1500);
            if (!this.activeChallenge)
                return;
            const estado = window.estadoJogo;
            const target = this.activeChallenge.target;
            // Bot decide qual pedra adivinhar
            let guess = "Espada"; // Default
            if ((_b = (_a = this.botBrain) === null || _a === void 0 ? void 0 : _a.memory) === null || _b === void 0 ? void 0 : _b.getSlotMemory) {
                const memory = this.botBrain.memory.getSlotMemory(target);
                if (memory === null || memory === void 0 ? void 0 : memory.knownName) {
                    guess = memory.knownName;
                    Logger.ai(`[ChallengeResolver] Bot usando memória: ${guess}`);
                }
                else {
                    // Palpite aleatório
                    const pedras = ['Espada', 'Escudo', 'Coroa', 'Martelo', 'Bandeira', 'Balança', 'Cavalo'];
                    guess = pedras[Math.floor(Math.random() * pedras.length)];
                    Logger.ai(`[ChallengeResolver] Bot palpite aleatório: ${guess}`);
                }
            }
            // Mostrar fala do bot
            if ((_c = window.Renderer) === null || _c === void 0 ? void 0 : _c.mostrarFalaBot) {
                const stoneName = LocaleManager.t('game.stones.' + guess);
                const speech = LocaleManager.t('bot.guess').replace('{stone}', stoneName);
                window.Renderer.mostrarFalaBot(speech);
            }
            yield this.delay(1000);
            // Submeter resposta
            yield this.submitResponse(ResponseType.GUESS, { guess });
        });
    }
    requestBotBoastResponse() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            Logger.ai("[ChallengeResolver] Solicitando resposta do bot ao segabar...");
            yield this.delay(2000);
            if (!this.activeChallenge)
                return;
            // Bot decide: acreditar ou duvidar
            // Por enquanto, sempre acredita (pode ser melhorado com IA)
            const decision = Math.random() > 0.3 ? ResponseType.BELIEVE : ResponseType.DOUBT;
            Logger.ai(`[ChallengeResolver] Bot decidiu: ${decision}`);
            if ((_a = window.Renderer) === null || _a === void 0 ? void 0 : _a.mostrarFalaBot) {
                if (decision === ResponseType.BELIEVE) {
                    window.Renderer.mostrarFalaBot(LocaleManager.t('bot.believe'));
                }
                else {
                    window.Renderer.mostrarFalaBot(LocaleManager.t('bot.doubt'));
                }
            }
            yield this.delay(1000);
            yield this.submitResponse(decision);
        });
    }
    botProveBoast() {
        return __awaiter(this, void 0, void 0, function* () {
            Logger.ai("[ChallengeResolver] Bot provando segabar...");
            const estado = window.estadoJogo;
            const pedrasViradas = estado.mesa
                .map((p, i) => ({ pedra: p, slot: i }))
                .filter((item) => item.pedra && item.pedra.virada);
            for (const item of pedrasViradas) {
                yield this.delay(1000);
                let guess = item.pedra.nome; // Bot "trapaceia" sabendo a resposta
                // Com 20% de chance, errar propositalmente
                if (Math.random() < 0.2) {
                    const pedras = ['Espada', 'Escudo', 'Coroa', 'Martelo', 'Bandeira', 'Balança', 'Cavalo'];
                    guess = pedras.filter(p => p !== item.pedra.nome)[Math.floor(Math.random() * 6)];
                }
                Logger.ai(`[ChallengeResolver] Bot prova slot ${item.slot}: ${guess}`);
                const result = yield this.submitProof(item.slot, guess);
                if (result)
                    return result;
            }
            return { success: false, points: [], reveal: [] };
        });
    }
    // ========================================
    // UTILITÁRIOS
    // ========================================
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            Logger.game("[ChallengeResolver] Limpando estado...");
            // ✅ CRÍTICO: Limpar BotThinking ANTES de persistir estado
            if (this.turnManager) {
                this.turnManager.setBotThinking(false);
                Logger.game("[ChallengeResolver] BotThinking limpo");
            }
            // Limpar estado do jogo
            const estado = window.estadoJogo;
            if (estado) {
                estado.desafio = null;
                if ((_a = window.GameController) === null || _a === void 0 ? void 0 : _a.persistirEstado) {
                    window.GameController.persistirEstado();
                }
            }
            // Reset interno
            this.state = ResolverState.IDLE;
            this.activeChallenge = null;
            this.clearResponseTimeout();
        });
    }
    startResponseTimeout() {
        this.responseTimeout = setTimeout(() => {
            Logger.warn(LogCategory.GAME, "[ChallengeResolver] TIMEOUT de resposta!");
            this.cleanup();
            if (this.matchManager) {
                this.matchManager.advanceTurn();
            }
        }, this.RESPONSE_TIMEOUT_MS);
    }
    clearResponseTimeout() {
        if (this.responseTimeout) {
            clearTimeout(this.responseTimeout);
            this.responseTimeout = null;
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
// Exportar para uso global
window.ChallengeResolver = ChallengeResolver;
