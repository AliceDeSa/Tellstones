import { GameMode, GameConfig } from "./GameMode.js";
import { Logger, LogCategory } from "../utils/Logger.js";
import { PvETurnManager, TurnAction } from "./PvETurnManager.js";
import { MatchManager, MatchState, ActionType, GameAction } from "../core/MatchManager.js";
import { ChallengeResolver, ResponseType, ResolverState } from "../core/ChallengeResolver.js";
import LocaleManager from "../data/LocaleManager.js";

// Garantir que tipos globais sejam reconhecidos ou redeclarados localmente se necessário
// Assumindo que BotBrain e outros estão globais, referenciados via window

// Definir Tipos de Decisão
interface BotDecision {
    type: 'place' | 'flip' | 'swap' | 'boast' | 'challenge' | 'peek';
    target?: number;
    targets?: { from: number; to: number };
    signature?: string;
}

declare class BotBrain {
    constructor(profile: string);
    profile: any;
    memory: any;
    observe(action: any, state: any): void;
    calculateThinkTime(state: any, decision: any): number;
    decideMove(state: any): BotDecision;
    updateMemory(slot: number, name: string, confidence: number): void;
    predictStone(slot: number): string;
    getChatter(event: string): string | null;
    decideBoastResponse(state: any): string;
    getDebugStats(): string;
}

export class PvEMode extends GameMode {
    public roomCode: string;
    public playerName: string | null;
    public botBrain: BotBrain | null;
    public matchLog: string[];
    public turnCounter: number;
    private coinListenerAttached: boolean = false;
    private lastVez: number | undefined;
    private lastMesaState: any[] | null = null;
    private asyncActionInProgress: boolean = false;
    private processingReactiveResponse: boolean = false;

    // Gerenciador de Turnos (Nova Camada de Isolamento)
    private turnManager: PvETurnManager;

    // ✅ NOVO: Gerenciadores de Partida e Desafio
    private matchManager: MatchManager;
    private challengeResolver: ChallengeResolver;
    private useNewMatchManager: boolean = false; // Flag para ativar gradualmente

    constructor() {
        super();
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

    private logAction(actor: string, actionType: string, details: string): void {
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

    public getMatchLog(): string {
        return this.matchLog.join('\n');
    }

    public start(config: GameConfig): void {
        super.start(config);
        this.playerName = config.playerName || "Jogador";

        // CRÍTICO: Reset de TODOS os estados PRIMEIRO, antes de qualquer inicialização
        Logger.sys("Iniciando Novo Jogo. Resetando TODOS os estados...");
        this.resetState();

        // Configuração de variáveis globais
        (window as any).isLocalMode = true;
        (window as any).salaAtual = this.roomCode;
        (window as any).nomeAtual = this.playerName;
        (window as any).souCriador = true;

        if ((window as any).AnalyticsManager) (window as any).AnalyticsManager.logGameStart("pve", this.roomCode, 1);

        // Reset Local State
        if ((window as any).clearLocalData) {
            (window as any).clearLocalData("salas/" + this.roomCode);
        }

        const refCoin = (window as any).getDBRef("salas/" + this.roomCode + "/caraCoroa");
        if (refCoin) refCoin.set(null);

        // Reset explícito da memória do Bot Brain
        if (this.botBrain) this.botBrain = null;

        // ✅ NOVO: Reset do MatchManager e ChallengeResolver
        this.matchManager.reset();
        this.challengeResolver.reset();
        this.processingReactiveResponse = false;

        // LIMPEZA: Forçar limpeza de dados de sorteio do jogo anterior
        if ((window as any).getDBRef) {
            (window as any).getDBRef(`salas/${this.roomCode}/caraCoroa`).remove();
            (window as any).getDBRef(`salas/${this.roomCode}/estadoJogo/desafio`).remove();
        }

        // Verificar se perfil existe no DB
        const refProfile = (window as any).getDBRef("salas/" + this.roomCode + "/botProfile");

        let savedProfile: string | null = null;
        const localData = (window as any).localData;
        if (localData && localData.salas && localData.salas[this.roomCode] && localData.salas[this.roomCode].botProfile) {
            savedProfile = localData.salas[this.roomCode].botProfile;
        }

        const profiles = ['logical', 'trickster', 'aggressive'];

        // Prioridade 1: Override de Desenvolvedor
        const devProfile = localStorage.getItem('tellstones_dev_bot_profile');
        if (devProfile && devProfile !== 'random' && profiles.includes(devProfile)) {
            const isDev = localStorage.getItem('tellstones_dev_mode') === 'true';
            if (isDev) Logger.ai(`Dev Override - Personalidade do Bot: ${devProfile}`);
            this.botBrain = new (window as any).BotBrain(devProfile);
        }
        // Prioridade 2: Estado de Jogo Salvo
        else if (savedProfile && profiles.includes(savedProfile)) {
            Logger.ai(`Personalidade do Bot Restaurada: ${savedProfile}`);
            this.botBrain = new (window as any).BotBrain(savedProfile);
        }
        // Prioridade 3: Novo Aleatório
        else {
            const selectedProfile = profiles[Math.floor(Math.random() * profiles.length)];
            Logger.ai(`Nova Personalidade do Bot: ${selectedProfile}`);
            this.botBrain = new (window as any).BotBrain(selectedProfile);
        }

        // Salvar no DB
        const nameMap: Record<string, string> = { 'Lógico': 'logical', 'Trapaceiro': 'trickster', 'Agressivo': 'aggressive' };
        if (refProfile) refProfile.set(nameMap[this.botBrain!.profile.name] || 'logical');

        if ((window as any).notificationManager) (window as any).notificationManager.showInternal(`Bot: ${this.botBrain!.profile.name}`);

        // Configurar TurnManager com BotBrain
        this.turnManager.setBotBrain(this.botBrain);
        Logger.sys("TurnManager configurado com BotBrain");

        // ✅ NOVO: Conectar bot e TurnManager ao ChallengeResolver
        this.challengeResolver.setBotBrain(this.botBrain);
        this.challengeResolver.setTurnManager(this.turnManager);

        // Configuração de Estado Inicial
        const jogadores = [
            { nome: (window as any).nomeAtual, id: "p1", pontos: 0 },
            { nome: "Bot", id: "p2", pontos: 0 }
        ];

        // Cria e Salva estado inicial via LocalDB
        (window as any).GameController.inicializarJogo(jogadores);

        // Inicia Listeners
        this.listenToState();
        this.listenToCoinToss();
    }

    private resetState(): void {
        Logger.sys("Resetando TODAS as variáveis de estado do jogo...");

        // Variáveis de Instância
        this.lastVez = undefined;
        this.lastMesaState = null;
        this.turnManager.setBotThinking(false);
        this.asyncActionInProgress = false;
        this.turnCounter = 1;
        this.matchLog = [];

        // Flags Globais do Jogo
        (window as any).selecionandoDesafio = false;
        (window as any).resolvendoDesafio = false;
        (window as any).animacaoTrocaEmAndamento = false;
        (window as any).animacaoAlinhamentoEmAndamento = false;
        (window as any).trocaPendente = null;

        // Limpar quaisquer ações pendentes do bot
        if ((this as any).thinkingWatchdog) {
            clearTimeout((this as any).thinkingWatchdog);
            (this as any).thinkingWatchdog = null;
        }

        // Resetar TurnManager
        this.turnManager.reset();

        Logger.sys("Reset de estado completo.");
    }

    public cleanup(): void {
        super.cleanup();
        this.turnManager.setBotThinking(false);  // Correto
        this.botBrain = null;

        const refState = (window as any).getDBRef("salas/" + this.roomCode + "/estadoJogo");
        if (refState && refState.off) refState.off();

        const refCoin = (window as any).getDBRef("salas/" + this.roomCode + "/caraCoroa");
        if (refCoin && refCoin.off) refCoin.off();
    }

    public setBotProfile(profileName: string): void {
        if (!this.botBrain) return;
        this.botBrain = new (window as any).BotBrain(profileName);
        Logger.ai(`Personalidade do Bot forçada para: ${profileName}`);
        if ((window as any).notificationManager) (window as any).notificationManager.showInternal(`Bot Personality: ${this.botBrain?.profile.name}`);
    }

    private listenToCoinToss(): void {
        const ref = (window as any).getDBRef("salas/" + this.roomCode + "/caraCoroa");
        this.registerListener(ref, "value", (snapshot) => {
            const data = snapshot.val();
            const estado = (window as any).estadoJogo;

            // 1. Se não tem sorteio feito, MOSTRAR TELA
            if ((!data || !data.sorteioFinalizado) && estado && !estado.centralAlinhada) {
                if (typeof (window as any).mostrarEscolhaCaraCoroa === "function") {
                    (window as any).mostrarEscolhaCaraCoroa();
                    // Guard against duplicate listeners
                    if (typeof (window as any).ouvirCaraCoroa === "function" && !this.coinListenerAttached) {
                        (window as any).ouvirCaraCoroa();
                        this.coinListenerAttached = true;
                    }
                }
            }
            else {
                // Esconder UI se já foi
                const escolhaDiv = document.getElementById("escolha-cara-coroa");
                if (escolhaDiv) escolhaDiv.style.display = "none";
            }

            // 2. Se sorteio acabou, ALINHAR (Iniciar o jogo de fato)
            if (data && data.sorteioFinalizado && estado && !estado.centralAlinhada) {
                if (typeof (window as any).sincronizarPedraCentralEAlinhamento === "function") {
                    (window as any).sincronizarPedraCentralEAlinhamento();
                }
            }
        });
    }

    private listenToState(): void {
        const ref = (window as any).getDBRef("salas/" + this.roomCode + "/estadoJogo");

        this.registerListener(ref, "value", (snapshot) => {
            const estado = snapshot.val();
            // LOG DEBUG para diagnóstico de travamento no Jogo 2
            Logger.debug(LogCategory.GAME, "Atualização de Estado Recebida:", estado ? {
                centralAlinhada: estado.centralAlinhada,
                vez: estado.vez,
                active: this.active,
                thinking: this.turnManager.isBotThinking()
            } : "null");

            if (!estado) return;

            // CRÍTICO: Se jogo terminou, forçar limpeza de botThinking e reset de estado
            if (estado.vencedor) {
                Logger.game("Jogo Finalizado. Vencedor:", estado.vencedor);
                this.resetState(); // Reset completo de estado
                return; // Parar processamento de lógica adicional
            }

            // Normalize
            if (!estado.mesa) estado.mesa = Array(7).fill(null);
            if (!estado.reserva) estado.reserva = [];

            // 1. Monitor Swap Animation
            if ((window as any).Renderer && (window as any).Renderer.monitorarTrocas) {
                (window as any).Renderer.monitorarTrocas(estado, (troca: any) => {
                    // Animação Concluída
                    if ((window as any).GameController && (window as any).GameController.finalizarTrocaServer) {
                        (window as any).GameController.finalizarTrocaServer(troca);
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
                estado.mesa.forEach((p: any, i: number) => {
                    const oldP = this.lastMesaState![i];
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
            } else if (brain && !this.lastMesaState) {
                this.scanVisibleStones(estado);
            }

            // --- RENDER VISUALS EXPLICITLY ---
            if ((window as any).Renderer) {
                const Renderer = (window as any).Renderer;
                Renderer.renderizarMesa();
                Renderer.renderizarPedrasReserva();
                Renderer.atualizarInfoSala(this.roomCode, []);

                if (Renderer.renderizarOpcoesDesafio) Renderer.renderizarOpcoesDesafio();
                if (Renderer.renderizarOpcoesSegabar) Renderer.renderizarOpcoesSegabar();
                if (Renderer.renderizarRespostaSegabar) Renderer.renderizarRespostaSegabar();

                if (estado.vencedor) {
                    const msg = `Vencedor: ${estado.vencedor.nomes ? estado.vencedor.nomes.join(', ') : 'Desconhecido'}`;
                    console.log("[PvE] " + msg);
                    if ((window as any).notificationManager) (window as any).notificationManager.showGlobal(msg);

                    if ((window as any).AnalyticsManager) {
                        const playersList = Array.isArray(estado.jogadores) ? estado.jogadores : Object.values(estado.jogadores);
                        const player = playersList.find((j: any) => j.id === 'p1' || j.nome !== 'Bot');
                        const bot = playersList.find((j: any) => j.id === 'p2' || j.nome === 'Bot');
                        (window as any).AnalyticsManager.logPvEWin(
                            estado.vencedor.nomes ? estado.vencedor.nomes[0] : 'Unknown',
                            bot ? bot.pontos : 0,
                            player ? player.pontos : 0
                        );
                    }
                }

                if (Renderer.renderBotMemoryDebug && this.botBrain) {
                    Renderer.renderBotMemoryDebug(this.botBrain);
                }
            }

            if (estado.centralAlinhada && typeof (window as any).sincronizarPedraCentralEAlinhamento === "function") {
                // Sync ok
            }

            this.checkTurn(estado);
        });
    }

    private checkPendingActions(estado: any): boolean {
        if (!estado.desafio) return false;

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
                if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) {
                    (window as any).Renderer.mostrarFalaBot("Hm... deixe-me pensar.");
                }

                // ✅ USAR TURNMANAGER para resposta reativa
                setTimeout(async () => {
                    await this.turnManager.handleReactiveResponse('segabar', estado);
                    this.turnManager.setBotThinking(false);
                    this.processingReactiveResponse = false;

                    // ✅ CORREÇÃO: Após resposta reativa, verificar se é turno do bot
                    Logger.ai("[checkPendingActions] Resposta reativa completa. Verificando turno...");
                    setTimeout(() => {
                        const freshState = (window as any).estadoJogo;
                        if (freshState && this.active) {
                            this.checkTurn(freshState);
                        }
                    }, 100);
                }, 2500);
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
                setTimeout(async () => {
                    const freshState = (window as any).estadoJogo;
                    if (!freshState.desafio) {
                        this.turnManager.setBotThinking(false);
                        this.processingReactiveResponse = false;
                        return;
                    }

                    Logger.ai(`Bot respondendo a desafio do jogador (slot ${freshState.desafio.alvo})`);
                    await this.turnManager.handleReactiveResponse('desafio', freshState);
                    this.turnManager.setBotThinking(false);
                    this.processingReactiveResponse = false;

                    // ✅ CORREÇÃO: Após resposta reativa, verificar se é turno do bot
                    Logger.ai("[checkPendingActions] Resposta reativa completa. Verificando turno...");
                    setTimeout(() => {
                        const newestState = (window as any).estadoJogo;
                        if (newestState && this.active) {
                            this.checkTurn(newestState);
                        }
                    }, 100);
                }, 1500);
            }
            return true;
        }

        // 4. Handle Resolved Bot Challenge
        if (estado.desafio.jogador === "Bot" && estado.desafio.status === "resolvido") {
            if (!this.turnManager.isBotThinking()) this.resolveBotChallengeResult(estado);
            return true;
        }

        return false;
    }

    private checkTurn(estado: any): void {
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
            const localData = (window as any).localData;
            if (localData?.salas?.[this.roomCode]?.caraCoroa) {
                const cc = localData.salas[this.roomCode].caraCoroa;
                if (!cc.sorteioFinalizado) {
                    Logger.debug(LogCategory.GAME, "Turno bloqueado por Sorteio de Moeda");
                    return;
                }
            }

            // Verificar animação de troca
            if ((window as any).animacaoTrocaEmAndamento) {
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

                        setTimeout(async () => {
                            try {
                                if (tipo === 'challenge') {
                                    await this.challengeResolver.startChallenge(
                                        { type: ActionType.CHALLENGE, player: 'Jogador', target: estado.desafio.alvo },
                                        0 // Jogador iniciou
                                    );
                                } else {
                                    await this.challengeResolver.startBoast(
                                        { type: ActionType.BOAST, player: 'Jogador' },
                                        0 // Jogador iniciou
                                    );
                                }
                            } finally {
                                this.turnManager.setBotThinking(false);
                                this.processingReactiveResponse = false;
                            }
                        }, 1500);
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
                    if ((window as any).GameController?.persistirEstado) {
                        (window as any).GameController.persistirEstado();
                    }
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
                const blockers: string[] = [];
                if (this.turnManager.isBotThinking()) blockers.push("BotThinking");
                if ((window as any).selecionandoDesafio) blockers.push("SelectingChallenge");
                if ((window as any).resolvendoDesafio) blockers.push("ResolvingChallenge");
                if ((window as any).animacaoTrocaEmAndamento) blockers.push("SwapAnimClient");
                if (estado.trocaAnimacao) blockers.push("SwapAnimServer");

                if (blockers.length > 0) {
                    Logger.debug(LogCategory.AI, `Turno do Bot Bloqueado por flags: ${blockers.join(", ")}`);
                    return;
                }

                Logger.debug(LogCategory.AI, "Lógica de Turno do Bot Acionada. Chamando executeBotTurn...");

                this.turnManager.setBotThinking(true);
                const thinkTime = this.botBrain!.calculateThinkTime((window as any).estadoJogo, { type: 'unknown' });
                Logger.ai(`Bot Pensando por ${thinkTime.toFixed(0)}ms`);

                setTimeout(() => {
                    try {
                        if ((window as any).estadoJogo.vez !== 1) {
                            Logger.warn(LogCategory.AI, "Bot abortou turno (Turno mudou durante tempo de pensar).");
                            this.turnManager.setBotThinking(false);
                            return;
                        }
                        this.executeBotTurn();
                    } catch (e) {
                        Logger.error(LogCategory.AI, "Bot Crasheou:", e);
                        this.turnManager.setBotThinking(false);
                    }
                }, thinkTime);
            }

            this.lastMesaState = JSON.parse(JSON.stringify(estado.mesa));
        } catch (err) {
            Logger.error(LogCategory.GAME, "checkTurn crasheou:", err);
            this.turnManager.setBotThinking(false);
        }
    }

    private scanVisibleStones(estado: any): void {
        if (!this.botBrain || !estado.mesa) return;
        estado.mesa.forEach((p: any, i: number) => {
            if (p && !p.virada) {
                this.botBrain!.updateMemory(i, p.nome, 1.0);
            }
        });
    }

    private async executeBotTurn(): Promise<void> {
        try {
            if (!this.active) {
                this.turnManager.setBotThinking(false);
                return;
            }

            const estado = (window as any).estadoJogo;

            // SEGURANÇA: Verificar desafio ativo antes de mover
            if (estado.desafio) {
                Logger.warn(LogCategory.AI, "executeBotTurn interceptou desafio ativo. Abortando movimento.");
                // Crítico: Resetar thinking para que checkPendingActions possa agendar a resposta
                this.turnManager.setBotThinking(false);
                if (this.checkPendingActions(estado)) return;
                return;
            }

            if (!estado || estado.vez !== 1) {
                this.turnManager.setBotThinking(false);
                return;
            }

            // Solicitar decisão do bot via TurnManager (isolado)
            const decision: TurnAction | null = this.turnManager.requestBotDecision();

            if (!decision) {
                Logger.warn(LogCategory.AI, "Bot não retornou decisão válida. Avançando turno.");
                if ((window as any).avancarTurno) (window as any).avancarTurno();
                this.turnManager.setBotThinking(false);
                return;
            }

            // Executar ação via TurnManager (validação + execução isoladas)
            await this.turnManager.executeAction(decision, 'bot');

            // TurnManager gerencia asyncActionInProgress internamente
            this.turnManager.setBotThinking(false);

        } catch (err) {
            Logger.error(LogCategory.AI, "executeBotTurn crasheou:", err);
            if ((window as any).avancarTurno) (window as any).avancarTurno();
            this.turnManager.setBotThinking(false);
        }
    }

    // MÉTODOS performBot* REMOVIDOS - Agora implementados em PvETurnManager
    // Ver: PvETurnManager.executePlace(), executeFlip(), executeSwap(), executeChallenge(), executeBoast()

    /**
     * @deprecated Este método está obsoleto. Use turnManager.handleReactiveResponse('desafio') em vez disso.
     * Mantido apenas para compatibilidade com código legado.
     */
    public resolveChallenge(idxDeduzido: number): void {
        const estado = (window as any).estadoJogo;
        if (!estado || !estado.desafio) return;

        // CASO 1: Bot Desafiou -> Jogador está Respondendo
        if (estado.desafio.jogador === 'Bot') {
            const options = (window as any).PEDRAS_OFICIAIS || [
                { nome: "Coroa" }, { nome: "Espada" }, { nome: "Balança" },
                { nome: "Cavalo" }, { nome: "Escudo" }, { nome: "Bandeira" }, { nome: "Martelo" }
            ];

            if (options[idxDeduzido]) {
                const playerAnswer = options[idxDeduzido].nome;
                Logger.game(`Jogador respondeu: ${playerAnswer} (Opção ${idxDeduzido})`);

                estado.desafio.resposta = playerAnswer;
                estado.desafio.status = 'resolvido';
                (window as any).GameController.persistirEstado();
            }
            return;
        }

        // CASO 2: Jogador Desafiou -> Bot está Adivinhando
        if (!estado.mesa[idxDeduzido]) return;

        if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) (window as any).Renderer.mostrarFalaBot("Um momento...");

        setTimeout(() => {
            try {
                const brain = this.botBrain;
                if (!brain) return;

                const palpite = brain.predictStone(idxDeduzido);
                const correta = estado.mesa[idxDeduzido].nome;

                if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) {
                    (window as any).Renderer.mostrarFalaBot(`Eu acho que é... ${palpite}!`);
                }

                setTimeout(() => {
                    try {
                        estado.mesa[idxDeduzido].virada = false;
                        (window as any).GameController.persistirEstado();

                        let vencedor = null;

                        const success = (palpite === correta);
                        if ((window as any).AnalyticsManager) (window as any).AnalyticsManager.logAction('challenge', {
                            target_stone: correta,
                            bot_guess: palpite,
                            success: success,
                            player_won: (palpite !== correta)
                        });

                        if ((window as any).AnalyticsManager) {
                            const playerWon = (palpite !== correta);
                            (window as any).AnalyticsManager.logPvEChallenge("Player", playerWon, "challenge", correta);
                        }

                        const playersList = Array.isArray(estado.jogadores) ? estado.jogadores : Object.values(estado.jogadores);
                        const bot = playersList.find((j: any) => j.id === 'p2' || j.nome === 'Bot');
                        const player = playersList.find((j: any) => j.id === 'p1' || j.nome !== 'Bot');

                        if (palpite === correta) {
                            if ((window as any).notificationManager) (window as any).notificationManager.showInternal(LocaleManager.t('pve.botCorrect'));
                            if ((window as any).audioManager) (window as any).audioManager.playFailure();
                            bot.pontos = (bot.pontos || 0) + 1;
                            vencedor = bot;

                            const chat = brain.getChatter('winning');
                            if (chat) setTimeout(() => {
                                if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) (window as any).Renderer.mostrarFalaBot(chat);
                                else if ((window as any).notificationManager) (window as any).notificationManager.showInternal(`Bot: "${chat}"`);
                            }, 2000);
                        } else {
                            if ((window as any).notificationManager) (window as any).notificationManager.showInternal(LocaleManager.t('pve.botWrong'));
                            player.pontos = (player.pontos || 0) + 1;
                            vencedor = player;

                            const chat = brain.getChatter('losing');
                            if (chat) setTimeout(() => {
                                if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) (window as any).Renderer.mostrarFalaBot(chat);
                                else if ((window as any).notificationManager) (window as any).notificationManager.showInternal(`Bot: "${chat}"`);
                            }, 2000);
                        }

                        if (vencedor && vencedor.id === 'p1') {
                            if ((window as any).audioManager) (window as any).audioManager.playSuccess();
                        } else {
                            if ((window as any).audioManager) (window as any).audioManager.playFailure();
                        }

                        try {
                            if ((window as any).estadoJogo) (window as any).estadoJogo.desafio = null;
                            (window as any).getDBRef("salas/" + (window as any).salaAtual + "/estadoJogo/desafio").remove();
                        } catch (err) { console.error("Error clearing challenge DB", err); }

                        estado.desafio = null;
                        (window as any).GameController.persistirEstado();
                        if ((window as any).GameController) (window as any).GameController.verificarFimDeJogo();


                    } catch (innerE) {
                        Logger.error(LogCategory.AI, "resolveChallenge Inner:", innerE);
                        estado.desafio = null;
                        (window as any).GameController.persistirEstado();
                    } finally {
                        this.turnManager.setBotThinking(false);
                        if ((window as any).avancarTurno) (window as any).avancarTurno();

                        if ((window as any).estadoJogo && (window as any).estadoJogo.vez === 0) {
                            if ((window as any).avancarTurno) (window as any).avancarTurno();
                        }
                    }
                }, 1500);
            } catch (e) {
                Logger.error(LogCategory.AI, "resolveChallenge Outer:", e);
                this.turnManager.setBotThinking(false);
            }
        }, 1500);
    }

    /**
     * @deprecated Este método está obsoleto. Use turnManager.handleReactiveResponse('segabar') em vez disso.
     * Mantido apenas para compatibilidade com código legado.
     */
    private respondToPlayerBoast(estado: any): void {
        try {
            if ((window as any).AnalyticsManager && !this.turnManager.isBotThinking()) {
                (window as any).AnalyticsManager.logPvEBoast("Player");
            }

            if (!this.botBrain) {
                Logger.warn(LogCategory.AI, "BotBrain ausente em respondToPlayerBoast");
                this.turnManager.setBotThinking(false);
                return;
            }

            const memoryValues = Object.values(this.botBrain.memory);

            // Normalize Jogadores
            let playersList: any[] = [];
            if (Array.isArray(estado.jogadores)) {
                playersList = estado.jogadores;
            } else if (estado.jogadores) {
                playersList = Object.values(estado.jogadores);
            }

            const player = playersList.find((j: any) => j.id === 'p1' || j.nome !== 'Bot');
            const playerScore = player ? (player.pontos || 0) : 0;

            let decision = "acreditar";

            if (playerScore >= 2) {
                Logger.ai("Jogador no Match Point (2). Bot recusa aceitar Segabar.");
                decision = "duvidar";
            } else {
                decision = this.botBrain.decideBoastResponse(estado);
            }

            if (decision === "duvidar") {
                if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) (window as any).Renderer.mostrarFalaBot("Não acredito. Duvido!");
                if ((window as any).GameController) (window as any).GameController.responderSegabar("duvidar");
            } else if (decision === "segabar_tambem") {
                if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) (window as any).Renderer.mostrarFalaBot("Ah é? Pois EU sei todas!");
                if ((window as any).GameController) (window as any).GameController.responderSegabar("segabar_tambem");
            } else {
                if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) (window as any).Renderer.mostrarFalaBot("Tudo bem, acredito.");

                // IMPORTANT: Use the controller to handle scoring if possible, OR force scoring here if controller expects it
                if ((window as any).GameController && (window as any).GameController.responderSegabar) {
                    (window as any).GameController.responderSegabar("acreditar");
                } else {
                    // Fallback manual resolution if needed (unlikely if GameController is present)
                    estado.desafio = null;
                }
            }

            // We must re-evaluate state because responderSegabar may have triggered updates synchronously
            // while we were "thinking", or will trigger them soon.
            // If the turn passed to us, we need to know.
            if (this.active) {
                setTimeout(() => {
                    const freshState = (window as any).estadoJogo;
                    this.checkTurn(freshState);
                }, 100);
            }

        } catch (e) {
            Logger.error(LogCategory.AI, "respondToPlayerBoast crasheou:", e);
        } finally {
            this.turnManager.setBotThinking(false);
        }
    }

    // performBotBoast REMOVIDO - Agora implementado em PvETurnManager.executeBoast()

    private proveBotBoast(estado: any): void {
        try {
            const hiddenIndices = estado.mesa.map((p: any, i: number) => (p && p.virada) ? i : -1).filter((i: number) => i !== -1);

            const answers = hiddenIndices.map((idx: number) => {
                const prediction = this.botBrain!.predictStone(idx);
                return { idx, name: prediction };
            });

            let i = 0;
            const revealNext = () => {
                if (i >= answers.length) {
                    if (this.turnManager.isBotThinking()) this.turnManager.setBotThinking(false);
                    return;
                }

                const ans = answers[i];
                if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) (window as any).Renderer.mostrarFalaBot(`Aposto que a ${ans.idx + 1} é... ${ans.name}!`);

                if (i === answers.length - 1) {
                    this.turnManager.setBotThinking(false);
                }

                if ((window as any).GameController && (window as any).GameController.verificarRespostaSegabar) {
                    (window as any).GameController.verificarRespostaSegabar(ans.idx, ans.name);
                }

                i++;
                if (i < answers.length) {
                    setTimeout(revealNext, 2000);
                }
            };
            revealNext();

        } catch (e) {
            Logger.error(LogCategory.AI, "proveBotBoast falhou:", e);
            this.turnManager.setBotThinking(false);
        }
    }

    private resolveBotChallengeResult(estadoSnapshot: any): void {
        if (this.turnManager.isBotThinking()) return;
        this.turnManager.setBotThinking(true);

        const estado = (window as any).estadoJogo;
        const desafio = estado.desafio;
        const targetIdx = desafio.alvo;
        const answer = desafio.resposta;

        if (!estado.mesa[targetIdx]) {
            estado.desafio = null;
            this.turnManager.setBotThinking(false);  // Correto
            (window as any).GameController.persistirEstado();
            return;
        }

        const realStone = estado.mesa[targetIdx];
        const correct = (realStone.nome === answer);

        estado.mesa[targetIdx].virada = false;
        (window as any).GameController.persistirEstado();

        if ((window as any).notificationManager) (window as any).notificationManager.showInternal(LocaleManager.t('pve.stoneRevealed').replace('{stone}', realStone.nome));

        setTimeout(() => {
            try {
                let winner = null;
                const playersList = Array.isArray(estado.jogadores)
                    ? estado.jogadores
                    : Object.values(estado.jogadores);

                const bot = playersList.find((j: any) => j.id === 'p2' || j.nome === 'Bot');
                const player = playersList.find((j: any) => j.id === 'p1' || j.nome !== 'Bot');


                if (correct) {
                    if ((window as any).notificationManager) (window as any).notificationManager.showInternal(LocaleManager.t('pve.playerCorrect'));
                    if ((window as any).audioManager) (window as any).audioManager.playSuccess();
                    player.pontos = (player.pontos || 0) + 1;
                    winner = player;

                    const chat = this.botBrain!.getChatter('losing');
                    if (chat) setTimeout(() => { if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) (window as any).Renderer.mostrarFalaBot(chat); }, 1500);

                } else {
                    if ((window as any).notificationManager) (window as any).notificationManager.showInternal(LocaleManager.t('pve.playerWrong').replace('{stone}', realStone.nome));
                    if ((window as any).audioManager) (window as any).audioManager.playFailure();
                    bot.pontos = (bot.pontos || 0) + 1;
                    winner = bot;

                    const chat = this.botBrain!.getChatter('winning');
                    if (chat) setTimeout(() => { if ((window as any).Renderer && (window as any).Renderer.mostrarFalaBot) (window as any).Renderer.mostrarFalaBot(chat); }, 1500);
                }

                if ((window as any).AnalyticsManager) {
                    const botWon = !correct;
                    (window as any).AnalyticsManager.logPvEChallenge("Bot", botWon, "challenge", realStone.nome);
                }

                estado.desafio = null;
                (window as any).GameController.persistirEstado();

                if ((window as any).GameController) (window as any).GameController.verificarFimDeJogo();

            } catch (e) {
                Logger.error(LogCategory.AI, "resolveBotChallengeResultAsync:", e);
                if ((window as any).avancarTurno) (window as any).avancarTurno();
            } finally {
                this.turnManager.setBotThinking(false);  // Correto
                if ((window as any).avancarTurno) (window as any).avancarTurno();

                setTimeout(() => {
                    const currentVez = (window as any).estadoJogo ? (window as any).estadoJogo.vez : -1;
                    if (currentVez === 1) {
                        this.checkTurn((window as any).estadoJogo);
                    }
                }, 500);
            }

        }, 2000);
    }

}

// Global Export
(window as any).PvEMode = PvEMode;



