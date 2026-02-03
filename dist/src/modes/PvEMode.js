var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { GameMode } from "./GameMode.js";
import { Logger, LogCategory } from "../utils/Logger.js";
import { PvETurnManager } from "./PvETurnManager.js";
import { MatchManager, ActionType } from "../core/MatchManager.js";
import { ChallengeResolver } from "../core/ChallengeResolver.js";
import LocaleManager from "../data/LocaleManager.js";
import { EventBus } from "../core/EventBus.js";
import { EventType } from "../core/types/Events.js";
export class PvEMode extends GameMode {
    constructor() {
        super();
        this.coinListenerAttached = false;
        this.lastMesaState = null;
        this.asyncActionInProgress = false;
        this.processingReactiveResponse = false;
        this.useNewMatchManager = false; // Flag para ativar gradualmente
        this.roomCode = "MODO_PVE";
        this.playerName = null;
        this.botBrain = null;
        // Logger de Partida
        this.matchLog = [];
        this.turnCounter = 1;
        // Instanciar Gerenciador de Turnos (legado)
        this.turnManager = new PvETurnManager();
        // ✅ NOVO: Instanciar MatchManager e ChallengeResolver
        this.matchManager = new MatchManager();
        this.challengeResolver = new ChallengeResolver();
        // Conectar os dois
        this.matchManager.setChallengeResolver(this.challengeResolver);
        this.challengeResolver.setMatchManager(this.matchManager);
        Logger.sys("PvEMode inicializado com MatchManager + ChallengeResolver");
    }
    logAction(actor, actionType, details) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = `[Turn ${this.turnCounter}] [${timestamp}] **${actor}** ${actionType}: ${details}`;
        this.matchLog.push(entry);
        Logger.game(`${entry}`);
        // Verificar logging do estado do Bot
        if (actor === 'Bot' && this.botBrain) {
            const memStats = this.botBrain.getDebugStats ? this.botBrain.getDebugStats() : "N/A";
            this.matchLog.push(`   > Bot State: ${memStats}`);
        }
    }
    getMatchLog() {
        return this.matchLog.join('\n');
    }
    start(config) {
        super.start(config);
        this.playerName = config.playerName || "Jogador";
        // CRÍTICO: Reset de TODOS os estados PRIMEIRO, antes de qualquer inicialização
        Logger.sys("Iniciando Novo Jogo. Resetando TODOS os estados...");
        this.resetState();
        // Configuração de variáveis globais
        window.isLocalMode = true;
        window.salaAtual = this.roomCode;
        window.nomeAtual = this.playerName;
        window.souCriador = true;
        if (window.AnalyticsManager)
            window.AnalyticsManager.logGameStart("pve", this.roomCode, 1);
        // Reset Local State
        if (window.clearLocalData) {
            window.clearLocalData("salas/" + this.roomCode);
        }
        const refCoin = window.getDBRef("salas/" + this.roomCode + "/caraCoroa");
        if (refCoin)
            refCoin.set(null);
        // Reset explícito da memória do Bot Brain
        if (this.botBrain)
            this.botBrain = null;
        // ✅ NOVO: Reset do MatchManager e ChallengeResolver
        this.matchManager.reset();
        this.challengeResolver.reset();
        this.processingReactiveResponse = false;
        // LIMPEZA: Forçar limpeza de dados de sorteio do jogo anterior
        if (window.getDBRef) {
            window.getDBRef(`salas/${this.roomCode}/caraCoroa`).remove();
            window.getDBRef(`salas/${this.roomCode}/estadoJogo/desafio`).remove();
        }
        // Verificar se perfil existe no DB
        const refProfile = window.getDBRef("salas/" + this.roomCode + "/botProfile");
        let savedProfile = null;
        const localData = window.localData;
        if (localData && localData.salas && localData.salas[this.roomCode] && localData.salas[this.roomCode].botProfile) {
            savedProfile = localData.salas[this.roomCode].botProfile;
        }
        const profiles = ['logical', 'trickster', 'aggressive'];
        // Prioridade 1: Override de Desenvolvedor
        const devProfile = localStorage.getItem('tellstones_dev_bot_profile');
        if (devProfile && devProfile !== 'random' && profiles.includes(devProfile)) {
            const isDev = localStorage.getItem('tellstones_dev_mode') === 'true';
            if (isDev)
                Logger.ai(`Dev Override - Personalidade do Bot: ${devProfile}`);
            this.botBrain = new window.BotBrain(devProfile);
        }
        // Prioridade 2: Estado de Jogo Salvo
        else if (savedProfile && profiles.includes(savedProfile)) {
            Logger.ai(`Personalidade do Bot Restaurada: ${savedProfile}`);
            this.botBrain = new window.BotBrain(savedProfile);
        }
        // Prioridade 3: Novo Aleatório
        else {
            const selectedProfile = profiles[Math.floor(Math.random() * profiles.length)];
            Logger.ai(`Nova Personalidade do Bot: ${selectedProfile}`);
            this.botBrain = new window.BotBrain(selectedProfile);
        }
        // Salvar no DB
        const nameMap = { 'Lógico': 'logical', 'Trapaceiro': 'trickster', 'Agressivo': 'aggressive' };
        if (refProfile)
            refProfile.set(nameMap[this.botBrain.profile.name] || 'logical');
        if (window.notificationManager)
            window.notificationManager.showInternal(`Bot: ${this.botBrain.profile.name}`);
        // Configurar TurnManager com BotBrain
        this.turnManager.setBotBrain(this.botBrain);
        Logger.sys("TurnManager configurado com BotBrain");
        // ✅ NOVO: Conectar bot e TurnManager ao ChallengeResolver
        this.challengeResolver.setBotBrain(this.botBrain);
        this.challengeResolver.setTurnManager(this.turnManager);
        // Configuração de Estado Inicial
        const jogadores = [
            { nome: window.nomeAtual, id: "p1", pontos: 0 },
            { nome: "Bot", id: "p2", pontos: 0 }
        ];
        // ✅ REFATORADO: Emitir evento ao invés de chamar GameController diretamente
        EventBus.emit(EventType.PVE_GAME_INIT, { players: jogadores });
        // Inicia Listeners
        this.listenToState();
        this.listenToCoinToss();
    }
    resetState() {
        Logger.sys("Resetando TODAS as variáveis de estado do jogo...");
        // Variáveis de Instância
        this.lastVez = undefined;
        this.lastMesaState = null;
        this.turnManager.setBotThinking(false);
        this.asyncActionInProgress = false;
        this.turnCounter = 1;
        this.matchLog = [];
        // Flags Globais do Jogo
        window.selecionandoDesafio = false;
        window.resolvendoDesafio = false;
        window.animacaoTrocaEmAndamento = false;
        window.animacaoAlinhamentoEmAndamento = false;
        window.trocaPendente = null;
        // Limpar quaisquer ações pendentes do bot
        if (this.thinkingWatchdog) {
            clearTimeout(this.thinkingWatchdog);
            this.thinkingWatchdog = null;
        }
        // Resetar TurnManager
        this.turnManager.reset();
        Logger.sys("Reset de estado completo.");
    }
    cleanup() {
        super.cleanup();
        this.turnManager.setBotThinking(false); // Correto
        this.botBrain = null;
        const refState = window.getDBRef("salas/" + this.roomCode + "/estadoJogo");
        if (refState && refState.off)
            refState.off();
        const refCoin = window.getDBRef("salas/" + this.roomCode + "/caraCoroa");
        if (refCoin && refCoin.off)
            refCoin.off();
    }
    setBotProfile(profileName) {
        var _a;
        if (!this.botBrain)
            return;
        this.botBrain = new window.BotBrain(profileName);
        Logger.ai(`Personalidade do Bot forçada para: ${profileName}`);
        if (window.notificationManager)
            window.notificationManager.showInternal(`Bot Personality: ${(_a = this.botBrain) === null || _a === void 0 ? void 0 : _a.profile.name}`);
    }
    listenToCoinToss() {
        const ref = window.getDBRef("salas/" + this.roomCode + "/caraCoroa");
        this.registerListener(ref, "value", (snapshot) => {
            const data = snapshot.val();
            const estado = window.estadoJogo;
            // 1. Se não tem sorteio feito, MOSTRAR TELA
            if ((!data || !data.sorteioFinalizado) && estado && !estado.centralAlinhada) {
                if (typeof window.mostrarEscolhaCaraCoroa === "function") {
                    window.mostrarEscolhaCaraCoroa();
                    // Guard against duplicate listeners
                    if (typeof window.ouvirCaraCoroa === "function" && !this.coinListenerAttached) {
                        window.ouvirCaraCoroa();
                        this.coinListenerAttached = true;
                    }
                }
            }
            else {
                // Esconder UI se já foi
                const escolhaDiv = document.getElementById("escolha-cara-coroa");
                if (escolhaDiv)
                    escolhaDiv.style.display = "none";
            }
            // 2. Se sorteio acabou, ALINHAR (Iniciar o jogo de fato)
            if (data && data.sorteioFinalizado && estado && !estado.centralAlinhada) {
                if (typeof window.sincronizarPedraCentralEAlinhamento === "function") {
                    window.sincronizarPedraCentralEAlinhamento();
                }
            }
        });
    }
    listenToState() {
        const ref = window.getDBRef("salas/" + this.roomCode + "/estadoJogo");
        this.registerListener(ref, "value", (snapshot) => {
            const estado = snapshot.val();
            // LOG DEBUG para diagnóstico de travamento no Jogo 2
            Logger.debug(LogCategory.GAME, "Atualização de Estado Recebida:", estado ? {
                centralAlinhada: estado.centralAlinhada,
                vez: estado.vez,
                active: this.active,
                thinking: this.turnManager.isBotThinking()
            } : "null");
            if (!estado)
                return;
            // CRÍTICO: Se jogo terminou, forçar limpeza de botThinking e reset de estado
            if (estado.vencedor) {
                Logger.game("Jogo Finalizado. Vencedor:", estado.vencedor);
                this.resetState(); // Reset completo de estado
                return; // Parar processamento de lógica adicional
            }
            // Normalize
            if (!estado.mesa)
                estado.mesa = Array(7).fill(null);
            if (!estado.reserva)
                estado.reserva = [];
            // 1. Monitor Swap Animation
            if (window.Renderer && window.Renderer.monitorarTrocas) {
                window.Renderer.monitorarTrocas(estado, (troca) => {
                    // Animação Concluída
                    if (window.GameController && window.GameController.finalizarTrocaServer) {
                        window.GameController.finalizarTrocaServer(troca);
                    }
                    if (this.botBrain && troca.jogador !== 'Bot') {
                        Logger.ai("[OBSERVAR] Callback de Troca Concluída. Trocando Memória:", troca);
                        this.botBrain.observe({
                            tipo: 'trocar',
                            origem: troca.from,
                            destino: troca.to
                        }, null);
                        this.logAction(troca.jogador === 'Bot' ? 'Bot' : (this.playerName || "Player"), "SWAPPED", `Slot ${troca.from} <-> Slot ${troca.to}`);
                    }
                });
            }
            // Lógica de Decaimento de Turno
            if (this.lastVez !== undefined && this.lastVez !== estado.vez) {
                if (this.botBrain) {
                    Logger.ai("[OBSERVAR] Fim de Turno / Novo Turno. Decaindo Memória.");
                    this.botBrain.observe({ tipo: 'turn_end' }, estado);
                }
                // Log de Mudança de Turno
                const currentPlayer = estado.vez === 0 ? this.playerName : "Bot";
                this.turnCounter++;
                this.logAction("System", "Turn Start", `Now it is ${currentPlayer}'s turn.`);
            }
            this.lastVez = estado.vez;
            // OBSERVATION LOGIC
            const brain = this.botBrain;
            if (brain && this.lastMesaState) {
                estado.mesa.forEach((p, i) => {
                    const oldP = this.lastMesaState[i];
                    // Placement
                    if (p && !oldP) {
                        brain.observe({ tipo: 'colocar', origem: i, pedra: p }, estado);
                        this.logAction(estado.vez === 0 ? (this.playerName || "Jogador") : "Bot", "PLACED", `Stone ${p.nome} at Slot ${i}`);
                    }
                    // Flip
                    if (p && oldP && p.virada !== oldP.virada) {
                        const actionName = p.virada ? "HID" : "REVEALED";
                        brain.observe({ tipo: 'virar', origem: i, pedra: p }, estado);
                        this.logAction(estado.vez === 0 ? (this.playerName || "Jogador") : "Bot", actionName, `Stone at Slot ${i}`);
                    }
                });
                this.scanVisibleStones(estado);
            }
            else if (brain && !this.lastMesaState) {
                this.scanVisibleStones(estado);
            }
            // --- RENDER VISUALS EXPLICITLY ---
            if (window.Renderer) {
                const Renderer = window.Renderer;
                Renderer.renderizarMesa();
                Renderer.renderizarPedrasReserva();
                Renderer.atualizarInfoSala(this.roomCode, []);
                if (Renderer.renderizarOpcoesDesafio)
                    Renderer.renderizarOpcoesDesafio();
                if (Renderer.renderizarOpcoesSegabar)
                    Renderer.renderizarOpcoesSegabar();
                if (Renderer.renderizarRespostaSegabar)
                    Renderer.renderizarRespostaSegabar();
                if (estado.vencedor) {
                    const msg = `Vencedor: ${estado.vencedor.nomes ? estado.vencedor.nomes.join(', ') : 'Desconhecido'}`;
                    Logger.game(`[PvE] ${msg}`);
                    if (window.notificationManager)
                        window.notificationManager.showGlobal(msg);
                    if (window.AnalyticsManager) {
                        const playersList = Array.isArray(estado.jogadores) ? estado.jogadores : Object.values(estado.jogadores);
                        const player = playersList.find((j) => j.id === 'p1' || j.nome !== 'Bot');
                        const bot = playersList.find((j) => j.id === 'p2' || j.nome === 'Bot');
                        window.AnalyticsManager.logPvEWin(estado.vencedor.nomes ? estado.vencedor.nomes[0] : 'Unknown', bot ? bot.pontos : 0, player ? player.pontos : 0);
                    }
                }
                if (Renderer.renderBotMemoryDebug && this.botBrain) {
                    Renderer.renderBotMemoryDebug(this.botBrain);
                }
            }
            if (estado.centralAlinhada && typeof window.sincronizarPedraCentralEAlinhamento === "function") {
                // Sync ok
            }
            this.checkTurn(estado);
        });
    }
    checkPendingActions(estado) {
        if (!estado.desafio)
            return false;
        // 1. Bot needs to Prove Boast
        if (estado.desafio.tipo === "segabar" && estado.desafio.jogador === "Bot" && estado.desafio.status === "responder_pecas") {
            if (!this.turnManager.isBotThinking()) {
                this.turnManager.setBotThinking(true);
                setTimeout(() => this.proveBotBoast(estado), 1000);
            }
            return true;
        }
        // 2. Bot needs to Respond to Player Boast (AÇÃO REATIVA)
        if (estado.desafio.tipo === "segabar" && estado.desafio.jogador !== "Bot" && estado.desafio.status === "aguardando_resposta") {
            // ✅ PROTEÇÃO: Prevenir loop infinito
            if (this.processingReactiveResponse) {
                return true;
            }
            if (!this.turnManager.isBotThinking()) {
                this.processingReactiveResponse = true;
                this.turnManager.setBotThinking(true);
                // ✅ REFATORADO: Emitir evento ao invés de chamar Renderer diretamente
                EventBus.emit(EventType.BOT_SPEECH, { message: LocaleManager.t('bot.thinking') });
                // ✅ USAR TURNMANAGER para resposta reativa
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    yield this.turnManager.handleReactiveResponse('segabar', estado);
                    this.turnManager.setBotThinking(false);
                    this.processingReactiveResponse = false;
                    // ✅ CORREÇÃO: Após resposta reativa, verificar se é turno do bot
                    Logger.ai("[checkPendingActions] Resposta reativa completa. Verificando turno...");
                    setTimeout(() => {
                        const freshState = window.estadoJogo;
                        if (freshState && this.active) {
                            this.checkTurn(freshState);
                        }
                    }, 100);
                }), 2500);
            }
            return true;
        }
        // 3. Bot needs to Resolve Player Challenge (AÇÃO REATIVA)
        const isSimpleChallenge = (estado.desafio.tipo === "desafio" || estado.desafio.tipo === "desafio_simples" || !estado.desafio.tipo);
        if (isSimpleChallenge && estado.desafio.jogador !== "Bot" && estado.desafio.status === 'aguardando_resposta') {
            // ✅ PROTEÇÃO: Prevenir loop infinito
            if (this.processingReactiveResponse) {
                return true;
            }
            if (!this.turnManager.isBotThinking()) {
                this.processingReactiveResponse = true;
                this.turnManager.setBotThinking(true);
                // ✅ USAR TURNMANAGER para resposta reativa
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    const freshState = window.estadoJogo;
                    if (!freshState.desafio) {
                        this.turnManager.setBotThinking(false);
                        this.processingReactiveResponse = false;
                        return;
                    }
                    Logger.ai(`Bot respondendo a desafio do jogador (slot ${freshState.desafio.alvo})`);
                    yield this.turnManager.handleReactiveResponse('desafio', freshState);
                    this.turnManager.setBotThinking(false);
                    this.processingReactiveResponse = false;
                    // ✅ CORREÇÃO: Após resposta reativa, verificar se é turno do bot
                    Logger.ai("[checkPendingActions] Resposta reativa completa. Verificando turno...");
                    setTimeout(() => {
                        const newestState = window.estadoJogo;
                        if (newestState && this.active) {
                            this.checkTurn(newestState);
                        }
                    }, 100);
                }), 1500);
            }
            return true;
        }
        // 4. Handle Resolved Bot Challenge
        if (estado.desafio.jogador === "Bot" && estado.desafio.status === "resolvido") {
            if (!this.turnManager.isBotThinking())
                this.resolveBotChallengeResult(estado);
            return true;
        }
        return false;
    }
    checkTurn(estado) {
        var _a, _b;
        try {
            // ===============================
            // VALIDAÇÕES BÁSICAS
            // ===============================
            if (!this.active) {
                Logger.debug(LogCategory.GAME, "checkTurn Abortado: !this.active");
                return;
            }
            if (!estado || estado.vencedor) {
                return;
            }
            if (!this.botBrain) {
                Logger.warn(LogCategory.AI, "BotBrain ausente, reinicializando...");
                this.setBotProfile('random');
                return;
            }
            if (this.roomCode === "MODO_TUTORIAL") {
                return;
            }
            if (!estado.centralAlinhada) {
                Logger.debug(LogCategory.GAME, "Turno bloqueado por !centralAlinhada");
                return;
            }
            // Verificar se sorteio foi finalizado
            const localData = window.localData;
            if ((_b = (_a = localData === null || localData === void 0 ? void 0 : localData.salas) === null || _a === void 0 ? void 0 : _a[this.roomCode]) === null || _b === void 0 ? void 0 : _b.caraCoroa) {
                const cc = localData.salas[this.roomCode].caraCoroa;
                if (!cc.sorteioFinalizado) {
                    Logger.debug(LogCategory.GAME, "Turno bloqueado por Sorteio de Moeda");
                    return;
                }
            }
            // Verificar animação de troca
            if (window.animacaoTrocaEmAndamento) {
                Logger.debug(LogCategory.GAME, "Turno bloqueado por Animação de Troca");
                return;
            }
            // ===============================
            // USAR CHALLENGERESOLVER PARA DESAFIOS/SEGABAR
            // ===============================
            if (estado.desafio) {
                // Verificar se ChallengeResolver já está ativo
                if (this.challengeResolver.isActive()) {
                    Logger.debug(LogCategory.GAME, "ChallengeResolver ativo - aguardando resolução");
                    return;
                }
                // Desafio/Segabar que precisa de resposta do BOT
                if (estado.desafio.jogador !== "Bot" && estado.desafio.status === 'aguardando_resposta') {
                    if (this.processingReactiveResponse) {
                        return;
                    }
                    if (!this.turnManager.isBotThinking()) {
                        this.processingReactiveResponse = true;
                        this.turnManager.setBotThinking(true);
                        const tipo = estado.desafio.tipo === 'segabar' ? 'boast' : 'challenge';
                        Logger.ai(`Bot precisa responder a ${tipo} do jogador`);
                        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                            try {
                                if (tipo === 'challenge') {
                                    yield this.challengeResolver.startChallenge({ type: ActionType.CHALLENGE, player: 'Jogador', target: estado.desafio.alvo }, 0 // Jogador iniciou
                                    );
                                }
                                else {
                                    yield this.challengeResolver.startBoast({ type: ActionType.BOAST, player: 'Jogador' }, 0 // Jogador iniciou
                                    );
                                }
                            }
                            finally {
                                this.turnManager.setBotThinking(false);
                                this.processingReactiveResponse = false;
                            }
                        }), 1500);
                    }
                    return;
                }
                // Bot precisa provar segabar
                if (estado.desafio.tipo === "segabar" && estado.desafio.jogador === "Bot" && estado.desafio.status === "responder_pecas") {
                    if (!this.turnManager.isBotThinking()) {
                        this.turnManager.setBotThinking(true);
                        setTimeout(() => this.proveBotBoast(estado), 1000);
                    }
                    return;
                }
                // ✅ NOVO: Bot desafiou o jogador - aguardar resposta via UI
                // Quando o bot desafia, o jogador responde via UI existente (botões de escolha)
                // NÃO bloquear - deixar UI processar
                if (estado.desafio.jogador === "Bot" && estado.desafio.status === 'aguardando_resposta') {
                    // O jogador vai responder via UI - não fazer nada aqui
                    Logger.debug(LogCategory.GAME, "Aguardando resposta do jogador ao desafio do Bot (via UI)");
                    return;
                }
                // ✅ NOVO: Bot desafiou e jogador já respondeu - processar resultado
                if (estado.desafio.jogador === "Bot" && estado.desafio.status === 'resolvido') {
                    // Limpar estado do desafio para continuar
                    Logger.game("Desafio do Bot resolvido. Limpando estado...");
                    estado.desafio = null;
                    // ✅ REFATORADO: Emitir evento ao invés de chamar GameController diretamente
                    EventBus.emit(EventType.PVE_STATE_PERSIST, {});
                    // Não retornar - deixar turno continuar
                }
                // Outro desafio ativo não tratado - aguardar
                if (estado.desafio) {
                    Logger.debug(LogCategory.GAME, "Turno bloqueado por Desafio Ativo");
                    return;
                }
            }
            // ===============================
            // TURNO NORMAL DO BOT
            // ===============================
            if (estado.vez === 1) {
                const blockers = [];
                if (this.turnManager.isBotThinking())
                    blockers.push("BotThinking");
                if (window.selecionandoDesafio)
                    blockers.push("SelectingChallenge");
                if (window.resolvendoDesafio)
                    blockers.push("ResolvingChallenge");
                if (window.animacaoTrocaEmAndamento)
                    blockers.push("SwapAnimClient");
                if (estado.trocaAnimacao)
                    blockers.push("SwapAnimServer");
                if (blockers.length > 0) {
                    Logger.debug(LogCategory.AI, `Turno do Bot Bloqueado por flags: ${blockers.join(", ")}`);
                    return;
                }
                Logger.debug(LogCategory.AI, "Lógica de Turno do Bot Acionada. Chamando executeBotTurn...");
                this.turnManager.setBotThinking(true);
                const thinkTime = this.botBrain.calculateThinkTime(window.estadoJogo, { type: 'unknown' });
                Logger.ai(`Bot Pensando por ${thinkTime.toFixed(0)}ms`);
                setTimeout(() => {
                    try {
                        if (window.estadoJogo.vez !== 1) {
                            Logger.warn(LogCategory.AI, "Bot abortou turno (Turno mudou durante tempo de pensar).");
                            this.turnManager.setBotThinking(false);
                            return;
                        }
                        this.executeBotTurn();
                    }
                    catch (e) {
                        Logger.error(LogCategory.AI, "Bot Crasheou:", e);
                        this.turnManager.setBotThinking(false);
                    }
                }, thinkTime);
            }
            this.lastMesaState = JSON.parse(JSON.stringify(estado.mesa));
        }
        catch (err) {
            Logger.error(LogCategory.GAME, "checkTurn crasheou:", err);
            this.turnManager.setBotThinking(false);
        }
    }
    scanVisibleStones(estado) {
        if (!this.botBrain || !estado.mesa)
            return;
        estado.mesa.forEach((p, i) => {
            if (p && !p.virada) {
                this.botBrain.updateMemory(i, p.nome, 1.0);
            }
        });
    }
    executeBotTurn() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.active) {
                    this.turnManager.setBotThinking(false);
                    return;
                }
                const estado = window.estadoJogo;
                // SEGURANÇA: Verificar desafio ativo antes de mover
                if (estado.desafio) {
                    Logger.warn(LogCategory.AI, "executeBotTurn interceptou desafio ativo. Abortando movimento.");
                    // Crítico: Resetar thinking para que checkPendingActions possa agendar a resposta
                    this.turnManager.setBotThinking(false);
                    if (this.checkPendingActions(estado))
                        return;
                    return;
                }
                if (!estado || estado.vez !== 1) {
                    this.turnManager.setBotThinking(false);
                    return;
                }
                // Solicitar decisão do bot via TurnManager (isolado)
                const decision = this.turnManager.requestBotDecision();
                if (!decision) {
                    Logger.warn(LogCategory.AI, "Bot não retornou decisão válida. Avançando turno.");
                    // ✅ REFATORADO: Emitir evento ao invés de chamar função global
                    EventBus.emit(EventType.TURN_ADVANCE, {});
                    this.turnManager.setBotThinking(false);
                    return;
                }
                // Executar ação via TurnManager (validação + execução isoladas)
                yield this.turnManager.executeAction(decision, 'bot');
                // TurnManager gerencia asyncActionInProgress internamente
                this.turnManager.setBotThinking(false);
            }
            catch (err) {
                Logger.error(LogCategory.AI, "executeBotTurn crasheou:", err);
                // ✅ REFATORADO: Emitir evento ao invés de chamar função global
                EventBus.emit(EventType.TURN_ADVANCE, {});
                this.turnManager.setBotThinking(false);
            }
        });
    }
    // MÉTODOS performBot* REMOVIDOS - Agora implementados em PvETurnManager
    // Ver: PvETurnManager.executePlace(), executeFlip(), executeSwap(), executeChallenge(), executeBoast()
    /**
     * @deprecated Este método está obsoleto. Use turnManager.handleReactiveResponse('desafio') em vez disso.
     * Mantido apenas para compatibilidade com código legado.
     */
    resolveChallenge(idxDeduzido) {
        const estado = window.estadoJogo;
        if (!estado || !estado.desafio)
            return;
        // CASO 1: Bot Desafiou -> Jogador está Respondendo
        if (estado.desafio.jogador === 'Bot') {
            const options = window.PEDRAS_OFICIAIS || [
                { nome: "Coroa" }, { nome: "Espada" }, { nome: "Balança" },
                { nome: "Cavalo" }, { nome: "Escudo" }, { nome: "Bandeira" }, { nome: "Martelo" }
            ];
            if (options[idxDeduzido]) {
                const playerAnswer = options[idxDeduzido].nome;
                Logger.game(`Jogador respondeu: ${playerAnswer} (Opção ${idxDeduzido})`);
                estado.desafio.resposta = playerAnswer;
                estado.desafio.status = 'resolvido';
                // ✅ REFATORADO: Emitir evento ao invés de chamar GameController diretamente
                EventBus.emit(EventType.PVE_STATE_PERSIST, {});
            }
            return;
        }
        // CASO 2: Jogador Desafiou -> Bot está Adivinhando
        if (!estado.mesa[idxDeduzido])
            return;
        // ✅ REFATORADO: Emitir evento ao invés de chamar Renderer diretamente
        EventBus.emit(EventType.BOT_SPEECH, { message: LocaleManager.t('bot.thinking2') });
        setTimeout(() => {
            try {
                const brain = this.botBrain;
                if (!brain)
                    return;
                const palpite = brain.predictStone(idxDeduzido);
                const correta = estado.mesa[idxDeduzido].nome;
                if (window.Renderer && window.Renderer.mostrarFalaBot) {
                    window.Renderer.mostrarFalaBot(`Eu acho que é... ${palpite}!`);
                }
                setTimeout(() => {
                    try {
                        estado.mesa[idxDeduzido].virada = false;
                        // ✅ REFATORADO: Emitir evento ao invés de chamar GameController diretamente
                        EventBus.emit(EventType.PVE_STATE_PERSIST, {});
                        let vencedor = null;
                        const success = (palpite === correta);
                        if (window.AnalyticsManager)
                            window.AnalyticsManager.logAction('challenge', {
                                target_stone: correta,
                                bot_guess: palpite,
                                success: success,
                                player_won: (palpite !== correta)
                            });
                        if (window.AnalyticsManager) {
                            const playerWon = (palpite !== correta);
                            window.AnalyticsManager.logPvEChallenge("Player", playerWon, "challenge", correta);
                        }
                        const playersList = Array.isArray(estado.jogadores) ? estado.jogadores : Object.values(estado.jogadores);
                        const bot = playersList.find((j) => j.id === 'p2' || j.nome === 'Bot');
                        const player = playersList.find((j) => j.id === 'p1' || j.nome !== 'Bot');
                        if (palpite === correta) {
                            if (window.notificationManager)
                                window.notificationManager.showInternal(LocaleManager.t('pve.botCorrect'));
                            if (window.audioManager)
                                window.audioManager.playFailure();
                            bot.pontos = (bot.pontos || 0) + 1;
                            vencedor = bot;
                            const chat = brain.getChatter('winning');
                            if (chat)
                                setTimeout(() => {
                                    // ✅ REFATORADO: Emitir evento de fala do bot
                                    EventBus.emit(EventType.BOT_SPEECH, { message: chat });
                                }, 2000);
                        }
                        else {
                            if (window.notificationManager)
                                window.notificationManager.showInternal(LocaleManager.t('pve.botWrong'));
                            player.pontos = (player.pontos || 0) + 1;
                            vencedor = player;
                            const chat = brain.getChatter('losing');
                            if (chat)
                                setTimeout(() => {
                                    // ✅ REFATORADO: Emitir evento de fala do bot
                                    EventBus.emit(EventType.BOT_SPEECH, { message: chat });
                                }, 2000);
                        }
                        if (vencedor && vencedor.id === 'p1') {
                            if (window.audioManager)
                                window.audioManager.playSuccess();
                        }
                        else {
                            if (window.audioManager)
                                window.audioManager.playFailure();
                        }
                        try {
                            if (window.estadoJogo)
                                window.estadoJogo.desafio = null;
                            window.getDBRef("salas/" + window.salaAtual + "/estadoJogo/desafio").remove();
                        }
                        catch (err) {
                            console.error("Error clearing challenge DB", err);
                        }
                        estado.desafio = null;
                        window.GameController.persistirEstado();
                        if (window.GameController)
                            window.GameController.verificarFimDeJogo();
                    }
                    catch (innerE) {
                        Logger.error(LogCategory.AI, "resolveChallenge Inner:", innerE);
                        estado.desafio = null;
                        window.GameController.persistirEstado();
                    }
                    finally {
                        this.turnManager.setBotThinking(false);
                        if (window.avancarTurno)
                            window.avancarTurno();
                        if (window.estadoJogo && window.estadoJogo.vez === 0) {
                            if (window.avancarTurno)
                                window.avancarTurno();
                        }
                    }
                }, 1500);
            }
            catch (e) {
                Logger.error(LogCategory.AI, "resolveChallenge Outer:", e);
                this.turnManager.setBotThinking(false);
            }
        }, 1500);
    }
    /**
     * @deprecated Este método está obsoleto. Use turnManager.handleReactiveResponse('segabar') em vez disso.
     * Mantido apenas para compatibilidade com código legado.
     */
    respondToPlayerBoast(estado) {
        try {
            if (window.AnalyticsManager && !this.turnManager.isBotThinking()) {
                window.AnalyticsManager.logPvEBoast("Player");
            }
            if (!this.botBrain) {
                Logger.warn(LogCategory.AI, "BotBrain ausente em respondToPlayerBoast");
                this.turnManager.setBotThinking(false);
                return;
            }
            const memoryValues = Object.values(this.botBrain.memory);
            // Normalize Jogadores
            let playersList = [];
            if (Array.isArray(estado.jogadores)) {
                playersList = estado.jogadores;
            }
            else if (estado.jogadores) {
                playersList = Object.values(estado.jogadores);
            }
            const player = playersList.find((j) => j.id === 'p1' || j.nome !== 'Bot');
            const playerScore = player ? (player.pontos || 0) : 0;
            let decision = "acreditar";
            if (playerScore >= 2) {
                Logger.ai("Jogador no Match Point (2). Bot recusa aceitar Segabar.");
                decision = "duvidar";
            }
            else {
                decision = this.botBrain.decideBoastResponse(estado);
            }
            if (decision === "duvidar") {
                if (window.Renderer && window.Renderer.mostrarFalaBot)
                    window.Renderer.mostrarFalaBot("Não acredito. Duvido!");
                if (window.GameController)
                    window.GameController.responderSegabar("duvidar");
            }
            else if (decision === "segabar_tambem") {
                if (window.Renderer && window.Renderer.mostrarFalaBot)
                    window.Renderer.mostrarFalaBot("Ah é? Pois EU sei todas!");
                if (window.GameController)
                    window.GameController.responderSegabar("segabar_tambem");
            }
            else {
                if (window.Renderer && window.Renderer.mostrarFalaBot)
                    window.Renderer.mostrarFalaBot("Tudo bem, acredito.");
                // IMPORTANT: Use the controller to handle scoring if possible, OR force scoring here if controller expects it
                if (window.GameController && window.GameController.responderSegabar) {
                    window.GameController.responderSegabar("acreditar");
                }
                else {
                    // Fallback manual resolution if needed (unlikely if GameController is present)
                    estado.desafio = null;
                }
            }
            // We must re-evaluate state because responderSegabar may have triggered updates synchronously
            // while we were "thinking", or will trigger them soon.
            // If the turn passed to us, we need to know.
            if (this.active) {
                setTimeout(() => {
                    const freshState = window.estadoJogo;
                    this.checkTurn(freshState);
                }, 100);
            }
        }
        catch (e) {
            Logger.error(LogCategory.AI, "respondToPlayerBoast crasheou:", e);
        }
        finally {
            this.turnManager.setBotThinking(false);
        }
    }
    // performBotBoast REMOVIDO - Agora implementado em PvETurnManager.executeBoast()
    proveBotBoast(estado) {
        try {
            const hiddenIndices = estado.mesa.map((p, i) => (p && p.virada) ? i : -1).filter((i) => i !== -1);
            const answers = hiddenIndices.map((idx) => {
                const prediction = this.botBrain.predictStone(idx);
                return { idx, name: prediction };
            });
            let i = 0;
            const revealNext = () => {
                if (i >= answers.length) {
                    if (this.turnManager.isBotThinking())
                        this.turnManager.setBotThinking(false);
                    return;
                }
                const ans = answers[i];
                if (window.Renderer && window.Renderer.mostrarFalaBot)
                    window.Renderer.mostrarFalaBot(`Aposto que a ${ans.idx + 1} é... ${ans.name}!`);
                if (i === answers.length - 1) {
                    this.turnManager.setBotThinking(false);
                }
                if (window.GameController && window.GameController.verificarRespostaSegabar) {
                    window.GameController.verificarRespostaSegabar(ans.idx, ans.name);
                }
                i++;
                if (i < answers.length) {
                    setTimeout(revealNext, 2000);
                }
            };
            revealNext();
        }
        catch (e) {
            Logger.error(LogCategory.AI, "proveBotBoast falhou:", e);
            this.turnManager.setBotThinking(false);
        }
    }
    resolveBotChallengeResult(estadoSnapshot) {
        if (this.turnManager.isBotThinking())
            return;
        this.turnManager.setBotThinking(true);
        const estado = window.estadoJogo;
        const desafio = estado.desafio;
        const targetIdx = desafio.alvo;
        const answer = desafio.resposta;
        if (!estado.mesa[targetIdx]) {
            estado.desafio = null;
            this.turnManager.setBotThinking(false); // Correto
            window.GameController.persistirEstado();
            return;
        }
        const realStone = estado.mesa[targetIdx];
        const correct = (realStone.nome === answer);
        estado.mesa[targetIdx].virada = false;
        window.GameController.persistirEstado();
        if (window.notificationManager)
            window.notificationManager.showInternal(LocaleManager.t('pve.stoneRevealed').replace('{stone}', realStone.nome));
        setTimeout(() => {
            try {
                let winner = null;
                const playersList = Array.isArray(estado.jogadores)
                    ? estado.jogadores
                    : Object.values(estado.jogadores);
                const bot = playersList.find((j) => j.id === 'p2' || j.nome === 'Bot');
                const player = playersList.find((j) => j.id === 'p1' || j.nome !== 'Bot');
                if (correct) {
                    if (window.notificationManager)
                        window.notificationManager.showInternal(LocaleManager.t('pve.playerCorrect'));
                    if (window.audioManager)
                        window.audioManager.playSuccess();
                    player.pontos = (player.pontos || 0) + 1;
                    winner = player;
                    const chat = this.botBrain.getChatter('losing');
                    if (chat)
                        setTimeout(() => { if (window.Renderer && window.Renderer.mostrarFalaBot)
                            window.Renderer.mostrarFalaBot(chat); }, 1500);
                }
                else {
                    if (window.notificationManager)
                        window.notificationManager.showInternal(LocaleManager.t('pve.playerWrong').replace('{stone}', realStone.nome));
                    if (window.audioManager)
                        window.audioManager.playFailure();
                    bot.pontos = (bot.pontos || 0) + 1;
                    winner = bot;
                    const chat = this.botBrain.getChatter('winning');
                    if (chat)
                        setTimeout(() => { if (window.Renderer && window.Renderer.mostrarFalaBot)
                            window.Renderer.mostrarFalaBot(chat); }, 1500);
                }
                if (window.AnalyticsManager) {
                    const botWon = !correct;
                    window.AnalyticsManager.logPvEChallenge("Bot", botWon, "challenge", realStone.nome);
                }
                estado.desafio = null;
                window.GameController.persistirEstado();
                if (window.GameController)
                    window.GameController.verificarFimDeJogo();
            }
            catch (e) {
                Logger.error(LogCategory.AI, "resolveBotChallengeResultAsync:", e);
                if (window.avancarTurno)
                    window.avancarTurno();
            }
            finally {
                this.turnManager.setBotThinking(false); // Correto
                if (window.avancarTurno)
                    window.avancarTurno();
                setTimeout(() => {
                    const currentVez = window.estadoJogo ? window.estadoJogo.vez : -1;
                    if (currentVez === 1) {
                        this.checkTurn(window.estadoJogo);
                    }
                }, 500);
            }
        }, 2000);
    }
}
// Global Export
window.PvEMode = PvEMode;
