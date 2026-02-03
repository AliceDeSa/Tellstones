// =========================
// GameController - Orquestração do Jogo
// =========================

import { Logger, LogCategory } from "../utils/Logger.js";
import LocaleManager from "../data/LocaleManager.js";
import { EventBus } from "./EventBus.js";
import { EventType } from "./types/Events.js";

interface GameControllerInterface {
    inicializarJogo(jogadores: any[]): any;
    colocarPedra(pedraObj: any, slotIdx: number): boolean;
    realizarTroca(from: number, to: number): void;
    resolverDesafio(idxDeduzido: number): void;
    processarResolucaoDesafio(idxDeduzidoOpcional?: number): void;
    responderSegabar(acao: string): void;
    verificarRespostaSegabar(idxMesa: number, nomeEscolhido: string): void;
    finalizarDesafioSegabar(estado: any): void;
    atualizarEstado(novoEstado: any): void;
    declararVencedor(nome: string): void;
    persistirEstado(): void;
    notificarAtualizacao(): void;
    verificarFimDeJogo(): void;
    finalizarTrocaServer(troca: any): void;
    avancarTurno(): void;
    iniciarListenerEstado(codigo: string): void;
    verificarSincronizacao(estado: any): void;
    stateListener?: any;
}

const GameController: GameControllerInterface = {

    // --- MOVED METHODS (Fix TS Parsing Issue) ---

    // Finalizar Troca (Chamado após animação)
    // Server-Side: Limpa estado e passa vez
    finalizarTrocaServer: function (troca: any) {
        Logger.game("[GameController] finalizarTrocaServer CALLED for:", troca);

        const estado = (window as any).estadoJogo;
        if (!troca || !estado) {
            Logger.warn(LogCategory.GAME, "[GameController] Missing troca or estado data. Aborting finish.");
            return;
        }

        // 1. Remove Animation Flag (Clean State)
        const updates: any = {};
        updates["trocaAnimacao"] = null;

        // 2. Perform Swap in Data (Confirm)
        // Note: Logic in realizarTroca might have already swapped 'mesa' but we ensure it matches final.
        // Actually, we trust 'mesa' was swapped at start. We just confirm cleanup.

        (window as any).getDBRef("salas/" + (window as any).salaAtual + "/estadoJogo").update(updates);

        // Persist First
        if (window.GameController && window.GameController.persistirEstado) {
            window.GameController.persistirEstado();
        }

        // Notify
        if (window.GameController && window.GameController.notificarAtualizacao) {
            window.GameController.notificarAtualizacao();
        }

        // ✅ CORREÇÃO: Avançar turno APENAS se foi troca do BOT
        // Trocas do jogador JÁ avançaram em realizarTroca()
        // Mas trocas do bot PRECISAM avançar aqui
        if (troca.jogador === "Bot") {
            if ((window as any).avancarTurno) {
                Logger.game("[GameController] Bot swap complete. Advancing turn...");
                (window as any).avancarTurno();
            }
        } else {
            Logger.game("[GameController] Player swap complete. Turn already advanced in realizarTroca().");
        }
    },

    // Avançar Turno
    avancarTurno: function () {
        const estado = (window as any).estadoJogo;
        if (!estado || !estado.jogadores || estado.jogadores.length === 0) return;

        let novoVez = estado.vez;
        if (estado.jogadores.length === 2) {
            novoVez = (estado.vez + 1) % 2;
        } else if (estado.jogadores.length === 4) {
            novoVez = (estado.vez + 1) % 2;
        }

        const salaAtual = (window as any).salaAtual;

        // --- MODO TUTORIAL ---
        if (salaAtual === "MODO_TUTORIAL") {
            const tutorial = (window as any).tellstonesTutorial;
            const passosPermitidos = [5, 6, 7, 8];
            if (!tutorial || !passosPermitidos.includes(tutorial.passo)) {
                (window as any).estadoJogo = { ...estado };
                if ((window as any).tellstonesTutorial) (window as any).tellstonesTutorial.registrarAcaoConcluida();
                if ((window as any).Renderer) (window as any).Renderer.renderizarMesa();
                return;
            }
        }

        // --- MODO LOCAL / PVE ---
        if ((window as any).isLocalMode || salaAtual === "MODO_PVE") {
            estado.vez = novoVez;
            (window as any).estadoJogo = { ...estado };
            this.persistirEstado();

            if (typeof (window as any).Renderer !== 'undefined' && (window as any).Renderer.atualizarInfoSala) {
                const espect = (window as any).ultimosEspectadores || [];
                (window as any).Renderer.atualizarInfoSala(salaAtual, espect);
            }
            if ((window as any).Renderer) (window as any).Renderer.renderizarMesa();

            if ((window as any).currentGameMode && (window as any).currentGameMode.checkTurn) {
                setTimeout(() => (window as any).currentGameMode.checkTurn(), 100);
            }
            return;
        }

        // --- MODO MULTIPLAYER ---
        estado.vez = novoVez;
        (window as any).getDBRef("salas/" + salaAtual + "/estadoJogo/vez").transaction((currentVez: number) => {
            return novoVez;
        }, (error: any, committed: boolean, snapshot: any) => {
            if (committed) {
                if ((window as any).Renderer) (window as any).Renderer.renderizarMesa();
            }
        });
    },

    // Listener de Estado (Substitui ouvirEstadoJogo)
    iniciarListenerEstado: function (codigo: string) {
        if (this.stateListener) this.stateListener.off();

        this.stateListener = (window as any).getDBRef("salas/" + codigo + "/estadoJogo");

        // --- COIN TOSS & SYNC CHECK (ONCE) ---
        // Verify Coin Toss / Alignment only ONCE when joining, not every state update.
        // CoinFlip.js already handles dynamic updates for the coin itself.
        if ((window as any).getDBRef) {
            (window as any).getDBRef("salas/" + codigo + "/caraCoroa").once("value", (snap: any) => {
                const coinData = snap.val();
                const estado = (window as any).estadoJogo;

                // If Coin Toss NOT finished or missing, and game not aligned -> Show UI
                if ((!coinData || !coinData.sorteioFinalizado) && estado && !estado.centralAlinhada) {
                    if (typeof (window as any).mostrarEscolhaCaraCoroa === 'function') {
                        (window as any).mostrarEscolhaCaraCoroa();
                        if (typeof (window as any).ouvirCaraCoroa === 'function') (window as any).ouvirCaraCoroa();
                    }
                }

                // If Coin Toss FINISHED but not aligned -> Trigger Alignment
                if (coinData && coinData.sorteioFinalizado && estado && !estado.centralAlinhada) {
                    if (typeof (window as any).sincronizarPedraCentralEAlinhamento === 'function') {
                        (window as any).sincronizarPedraCentralEAlinhamento();
                    }
                }
            });
        }

        this.stateListener.on("value", (snapshot: any) => {
            const estado = snapshot.val();
            if (!estado) return;

            (window as any).estadoJogo = estado;

            if (!(window as any).estadoJogo.mesa) (window as any).estadoJogo.mesa = Array(7).fill(null);
            if (!(window as any).estadoJogo.reserva) (window as any).estadoJogo.reserva = [];

            if ((window as any).Renderer) {
                (window as any).Renderer.renderizarMesa();
                (window as any).Renderer.renderizarPedrasReserva();
                (window as any).Renderer.atualizarPlacar(estado.jogadores);
                (window as any).Renderer.monitorarTrocas(estado, (troca: any) => {
                    this.finalizarTrocaServer(troca);
                });

                const espect = (window as any).ultimosEspectadores || [];
                (window as any).Renderer.atualizarInfoSala(codigo, espect);
            }

            this.verificarSincronizacao(estado);

            // Sync: Stone Alignment Logic (State Driven)
            // If state says aligned but we haven't animated locally yet
            if (estado.centralAlinhada && !(window as any).alinhamentoAnimado) {
                (window as any).alinhamentoAnimado = true;
                if (typeof (window as any).sincronizarPedraCentralEAlinhamento === 'function') {
                    (window as any).sincronizarPedraCentralEAlinhamento();
                }
            }
        });


    },

    verificarSincronizacao: function (estado: any) {
        if (estado.vencedor) {
            const telaVitoria = document.getElementById("tela-vitoria");
            const msg = document.getElementById("tela-vitoria-msg");
            const titulo = document.getElementById("tela-vitoria-titulo");

            if (telaVitoria && msg && titulo) {
                telaVitoria.style.display = "flex";
                if (estado.vencedor === (window as any).nomeAtual) {
                    titulo.innerText = "Vitória!";
                    msg.innerText = LocaleManager.t('victory.congratulations');
                    if ((window as any).audioManager) (window as any).audioManager.playSuccess();
                } else {
                    titulo.innerText = "Derrota";
                    msg.innerText = `${estado.vencedor} venceu!`;
                    if ((window as any).audioManager) (window as any).audioManager.playFailure();
                }
            }
        }
    },

    // --- ORIGINAL PROPERTIES ---

    // Inicializa o jogo
    inicializarJogo: function (jogadores: any[]) {
        if (!(window as any).GameRules) {
            Logger.error(LogCategory.GAME, "GameRules não carregado!");
            return;
        }

        // Cria estado inicial puro
        const novoEstado = (window as any).GameRules.createInitialState(jogadores, (window as any).PEDRAS_OFICIAIS || []);
        this.atualizarEstado(novoEstado);

        // IMPORTANT: Persist state immediately so listeners pick it up
        this.persistirEstado();

        return novoEstado;
    },

    // Ação: Colocar pedra da reserva na mesa
    colocarPedra: function (pedraObj: any, slotIdx: number) {
        // 1. Validação (GameRules)
        const estado = (window as any).estadoJogo;
        if (!estado) return false;

        // Por enquanto, validação básica aqui
        if (estado.mesa[slotIdx] !== null) {
            Logger.warn(LogCategory.GAME, "Slot ocupado!");
            if ((window as any).audioManager) (window as any).audioManager.playFailure();
            return false;
        }

        // 2. Atualização de Estado
        estado.mesa[slotIdx] = pedraObj;

        // Sound Event (Visual Polish)
        if ((window as any).audioManager) (window as any).audioManager.playPlace();

        // Remove da reserva (já feito pelo caller por enquanto)

        this.persistirEstado();
        this.notificarAtualizacao();

        // Multiplayer: Avançar turno
        if ((window as any).avancarTurno) (window as any).avancarTurno();

        return true;
    },

    // Ação: Realizar Troca (Swap)
    realizarTroca: function (from: number, to: number) {
        if (!window.estadoJogo) return;
        const mesa = window.estadoJogo.mesa;
        if (!mesa[from] || !mesa[to]) return;

        // 1. Update State Locally (Optimistic)
        const temp = mesa[from];
        mesa[from] = mesa[to];
        mesa[to] = temp;

        // 2. Trigger DB Event for Animation (and State Sync)
        if (window.salaAtual) {
            // Update Mesa AND TrocaAnimacao atomically-ish
            // Note: We send 'trocaAnimacao' to trigger the animation event listener
            // AND we update 'mesa' so validation passes.
            const updates: any = {};
            updates["mesa"] = mesa;
            updates["vez"] = 0; // Reset turn (optional rules)
            updates["trocaAnimacao"] = {
                from: from,
                to: to,
                timestamp: Date.now(),
                jogador: window.nomeAtual
            };

            (window as any).getDBRef("salas/" + window.salaAtual + "/estadoJogo").update(updates);
        }

        // 3. Local Fallback (Tutorial/Offline)
        if (window.salaAtual === "MODO_TUTORIAL") {
            // For Tutorial, we also need to trigger the listener we just added
            // But since we updated DB, the listener SHOULD fire if we are connected.
            // If local only:
            if (!(window as any).getDBRef) {
                if (window.AnimationManager) {
                    window.AnimationManager.playSwap(from, to, () => {
                        if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
                        if (window.Renderer) window.Renderer.renderizarMesa();
                    });
                }
            }
        }

        // Pass Turn if Rule says so
        if (window.avancarTurno) window.avancarTurno();
    },

    // Ação: Resolver Desafio (Oponente escolheu uma pedra)
    resolverDesafio: function (idxDeduzido: number) {
        if (!(window as any).estadoJogo || !(window as any).estadoJogo.desafio) return;
        // Passa a escolha diretamente para ser processada na transação
        this.processarResolucaoDesafio(idxDeduzido);
    },

    processarResolucaoDesafio: function (idxDeduzidoOpcional?: number) {
        if ((window as any).currentGameMode && typeof (window as any).currentGameMode.resolveChallenge === 'function') {
            (window as any).currentGameMode.resolveChallenge(idxDeduzidoOpcional);
        } else {
            Logger.warn(LogCategory.GAME, "[GameController] Nenhum modo de jogo ativo ou resolveChallenge não implementado.");
        }
    },


    // Ação: Responder ao Se Gabar
    responderSegabar: function (acao: string) {
        // acao: 'acreditar' | 'duvidar' | 'segabar_tambem'
        const estado = (window as any).estadoJogo;
        if (!estado.desafio || estado.desafio.tipo !== "segabar") return;

        if ((window as any).tellstonesTutorial && !(window as any).tellstonesTutorial.verificarAcao("RESPONDER_DESAFIO")) return;

        const salaAtual = (window as any).salaAtual;

        // --- ACREDITAR ---
        if (acao === "acreditar") {
            const jogadorDesafio = estado.desafio.jogador;
            // FIX: Ensure correct player index lookup even if names are ambiguous
            let idx = estado.jogadores.findIndex((j: any) => j.nome === jogadorDesafio);

            // Fallback for PvE where 'Jogador' might be named differently in local state
            if (idx === -1 && jogadorDesafio === (window as any).nomeAtual) {
                idx = estado.jogadores.findIndex((j: any) => j.id === 'p1' || j.id === 'jogador');
            }

            if (idx !== -1) estado.jogadores[idx].pontos++;

            if (salaAtual === "MODO_TUTORIAL") {
                if ((window as any).notificationManager) (window as any).notificationManager.showInternal(LocaleManager.t('victory.believedMaster'));
                estado.vez = 1;
                // Force update
                (window as any).getDBRef("salas/" + salaAtual + "/estadoJogo").update({
                    jogadores: estado.jogadores,
                    vez: 1
                });
                (window as any).getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
                if ((window as any).tellstonesTutorial) setTimeout(() => (window as any).tellstonesTutorial.registrarAcaoConcluida(), 500);

                this.notificarAtualizacao();
                return;
            }

            // Normal Flow
            (window as any).getDBRef("salas/" + salaAtual + "/estadoJogo").update({
                jogadores: estado.jogadores
            });
            (window as any).getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();

            // FORCE LOCAL UPDATE (Sync with PvE Loop)
            estado.desafio = null;
            if ((window as any).estadoJogo) (window as any).estadoJogo.desafio = null;

            if ((window as any).notificationManager) (window as any).notificationManager.showGlobal(LocaleManager.t('victory.playerWon').replace('{name}', jogadorDesafio));
            // FORCE TURN FIX: Do NOT advance turn here. 
            // Initiate Boast (Player) -> Turn passes to Bot (1).
            // Bot Responds (Believes) -> Turn is still (1)? 
            // If we advance, it goes to (0) Player. User says that is wrong.
            // So we keep it on Bot (1), and Bot loop should pick it up.
        }

        // --- DUVIDAR ---
        else if (acao === "duvidar") {
            if (salaAtual === "MODO_TUTORIAL") {
                if ((window as any).notificationManager) (window as any).notificationManager.showInternal(LocaleManager.t('victory.doubtedMaster'));
                // Simula Mestre provando
                setTimeout(() => {
                    if ((window as any).notificationManager) (window as any).notificationManager.showInternal(LocaleManager.t('victory.masterProved'));
                    const idxBot = estado.jogadores.findIndex((j: any) => j.nome === "Mestre");
                    if (idxBot !== -1) estado.jogadores[idxBot].pontos += 3;
                    estado.vez = 1;
                    (window as any).getDBRef("salas/" + salaAtual + "/estadoJogo").update({
                        jogadores: estado.jogadores,
                        vez: 1
                    });
                    (window as any).getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
                    if ((window as any).tellstonesTutorial) setTimeout(() => (window as any).tellstonesTutorial.registrarAcaoConcluida(), 500);
                    this.notificarAtualizacao();
                }, 1500);
                return;
            }

            // Inicia fluxo de prova
            estado.desafio.status = "responder_pecas";
            estado.desafio.idxAtual = 0;
            estado.desafio.respostas = [];
            this.persistirEstado();
        }

        // --- SE GABAR TAMBÉM ---
        else if (acao === "segabar_tambem") {
            // Regra: O jogador 2 rouba o Boast e precisa provar a sequência IMEDIATAMENTE.
            estado.desafio.jogador = (window as any).nomeAtual; // Agora eu sou o Boaster
            estado.desafio.status = "responder_pecas"; // Vai direto para a prova
            estado.desafio.idxAtual = 0;
            estado.desafio.respostas = [];

            if (salaAtual === "MODO_TUTORIAL") {
                if ((window as any).tellstonesTutorial) (window as any).tellstonesTutorial.registrarAcaoConcluida();
            }
            this.persistirEstado();
        }

        this.notificarAtualizacao();
    },

    // Ação: Verificar Resposta (Exame Se Gabar)
    verificarRespostaSegabar: function (idxMesa: number, nomeEscolhido: string) {
        const estado = (window as any).estadoJogo;
        if (!estado.desafio) return;
        if (!estado.desafio.respostas) estado.desafio.respostas = [];
        if (typeof estado.desafio.idxAtual === 'undefined') estado.desafio.idxAtual = 0;

        // Armazena a resposta
        estado.desafio.respostas.push({ idxMesa, nomeEscolhido });
        estado.desafio.idxAtual++;

        const pedrasViradas = estado.mesa.filter((p: any) => p && p.virada);
        const totalParaResponder = pedrasViradas.length; // Como não viramos, o count é constante ou deve ser conferido

        // Verifica se terminou a sequência
        if (estado.desafio.idxAtual >= totalParaResponder) {
            this.finalizarDesafioSegabar(estado);
        } else {
            // Continua para a próxima
            this.persistirEstado();
            this.notificarAtualizacao();
        }
    },

    finalizarDesafioSegabar: function (estado: any) {
        const salaAtual = (window as any).salaAtual;
        let errou = false;

        // Validação em Lote e REVELAÇÃO FORÇADA
        estado.desafio.respostas.forEach((resp: any) => {
            const pedraReal = estado.mesa[resp.idxMesa];
            if (!pedraReal || pedraReal.nome !== resp.nomeEscolhido) {
                errou = true;
            }
            // Revela todas as pedras ao final (Permanente)
            if (estado.mesa[resp.idxMesa]) estado.mesa[resp.idxMesa].virada = false;
        });

        if (!errou) {
            // VENCEU O DESAFIO
            if ((window as any).audioManager) (window as any).audioManager.playSuccess();
            if ((window as any).notificationManager) (window as any).notificationManager.showGlobal(LocaleManager.t('victory.playerProved'));

            // Robust Scoring: Update directly via Firebase Transaction/Update to avoid race
            const boasterName = estado.desafio.jogador;
            let idxJogador = estado.jogadores.findIndex((j: any) => j.nome === boasterName);

            Logger.game(`[GameController] Finalizing Boast. Boaster: ${boasterName}, Index Found: ${idxJogador}`);

            if (idxJogador !== -1) {
                // Optimistic update locally
                estado.jogadores[idxJogador].pontos += 3;

                if ((window as any).AnalyticsManager) (window as any).AnalyticsManager.logAction('boast', { result: 'win', points: 3 });

                // Direct DB update to ensure points are counted even if full state save fails
                if (salaAtual !== "MODO_TUTORIAL") {
                    (window as any).getDBRef(`salas/${salaAtual}/estadoJogo/jogadores/${idxJogador}/pontos`)
                        .transaction((pontos: number) => (pontos || 0) + 3);
                }

                // Check Vitoria
                if (estado.jogadores[idxJogador].pontos >= 3) {
                    this.declararVencedor(estado.jogadores[idxJogador].nome);
                    if ((window as any).AnalyticsManager) (window as any).AnalyticsManager.logGameEnd((window as any).salaAtual, estado.jogadores[idxJogador].nome, 0);
                }
            }

            (window as any).getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();

            if (salaAtual === "MODO_TUTORIAL" && (window as any).tellstonesTutorial) {
                setTimeout(() => (window as any).tellstonesTutorial.registrarAcaoConcluida(), 500);
            }
            if ((window as any).avancarTurno) (window as any).avancarTurno();

        } else {
            // ERROU
            // ERROU - Ponto ao oponente
            if ((window as any).audioManager) (window as any).audioManager.playFailure();
            // ERROU - Ponto ao oponente
            // Oponente ganha 3 pontos.
            // WARNING: 'vez' might be confusing here. Use logic: Not Current Boaster.
            if (!estado.desafio) {
                Logger.error(LogCategory.GAME, "[GameController] Criticall! Desafio state missing in failure handler.");
                return;
            }

            const boasterName = estado.desafio.jogador;
            let idxBoaster = estado.jogadores.findIndex((j: any) => j.nome === boasterName);

            // Fallback lookup
            if (idxBoaster === -1 && boasterName === (window as any).nomeAtual) {
                idxBoaster = estado.jogadores.findIndex((j: any) => j.id === 'p1' || j.id === 'jogador');
            }

            // In 1v1, Opponent is 1 - idxBoaster. In 4P, it's next team. Assuming 1v1 for now.
            // If still -1, default to 0 (Player) to avoid crash, but log error.
            if (idxBoaster === -1) {
                Logger.error(LogCategory.GAME, `[GameController] Boaster '${boasterName}' not found in players list! Defaulting to index 0.`);
                idxBoaster = 0;
            }

            const idxOponente = (idxBoaster === 0) ? 1 : 0;

            Logger.game(`[GameController] Boaster (${boasterName}, idx=${idxBoaster}) Failed! Awarding points to Opponent (idx=${idxOponente})`);

            if (estado.jogadores[idxOponente]) {
                estado.jogadores[idxOponente].pontos += 3;
                if (salaAtual === "MODO_TUTORIAL" && (window as any).tellstonesTutorial) {
                    (window as any).tellstonesTutorial.registrarAcaoConcluida();
                }

                // Direct DB update
                if (salaAtual !== "MODO_TUTORIAL") {
                    (window as any).getDBRef(`salas/${salaAtual}/estadoJogo/jogadores/${idxOponente}/pontos`)
                        .transaction((pontos: number) => (pontos || 0) + 3);
                }
            }

            // Clear Challenge State LAST to avoid crashes
            estado.desafio = null;

            // Força atualização visual imediata de pontos
            if ((window as any).Renderer) (window as any).Renderer.atualizarPlacar(estado.jogadores);

            this.persistirEstado();
            this.notificarAtualizacao();
            if ((window as any).avancarTurno) (window as any).avancarTurno();
        }

        // Limpa estado auxiliar só se não removeu o desafio inteiro antes
        if (estado.desafio) {
            estado.desafio.respostas = [];
            estado.desafio.idxAtual = 0;
        }

        this.persistirEstado();
        this.notificarAtualizacao();
        this.verificarFimDeJogo();
    },

    // --- HELPERS ---
    atualizarEstado: function (novoEstado: any) {
        (window as any).estadoJogo = novoEstado;
        // Sync global se necessário
    },
    declararVencedor: function (nome: string) {
        if (!(window as any).estadoJogo) return;
        (window as any).estadoJogo.vencedor = nome;
        this.persistirEstado();

        // VISUAL POLISH: Confetti & Sound
        if ((window as any).ConfettiManager) (window as any).ConfettiManager.start();
        if ((window as any).audioManager) (window as any).audioManager.playSuccess();

        if ((window as any).notificationManager) {
            (window as any).notificationManager.showGlobal(LocaleManager.t('victory.winner').replace('{name}', nome), 5000);
        }
        Logger.game(`[GameController] Vencedor declarado: ${nome}`);
    },

    // --- UTILS ---
    persistirEstado: function () {
        // Salva no Firebase/LocalDB
        if ((window as any).salaAtual) {
            (window as any).getDBRef("salas/" + (window as any).salaAtual + "/estadoJogo").set((window as any).estadoJogo);
        }
    },

    notificarAtualizacao: function () {
        // Força re-render
        if ((window as any).Renderer) {
            (window as any).Renderer.renderizarMesa();
            (window as any).Renderer.renderizarPedrasReserva();
        }
    },

    // Verificação de Fim de Jogo
    verificarFimDeJogo: function () {
        const estado = (window as any).estadoJogo;
        if (!estado || !estado.jogadores) return;

        // SKIP for Tutorial (Managed by Script)
        if ((window as any).salaAtual === "MODO_TUTORIAL") return;

        const WIN_SCORE = 3;

        let vencedor = null;
        if (Array.isArray(estado.jogadores)) {
            vencedor = estado.jogadores.find((j: any) => j.pontos >= WIN_SCORE);
        } else {
            vencedor = Object.values(estado.jogadores).find((j: any) => j.pontos >= WIN_SCORE);
        }

        if (vencedor) {
            Logger.game("[GameController] Fim de Jogo! Vencedor:", vencedor.nome);

            // Mark state as ended to stop Bot/Interactions
            estado.vencedor = vencedor.nome;
            this.persistirEstado();

            if ((window as any).notificationManager) (window as any).notificationManager.showGlobal(`Vencedor: ${vencedor.nome}!`);

            // Show Victory Screen
            const tela = document.getElementById("tela-vitoria");
            if (tela) {
                tela.style.display = "flex";
                const titulo = document.getElementById("tela-vitoria-titulo");
                const msg = document.getElementById("tela-vitoria-msg");

                if (titulo) titulo.innerText = `${vencedor.nome} Venceu o Jogo!`;

                const isMe = (vencedor.id === 'p1' || vencedor.nome === (window as any).nomeAtual);
                if (msg) msg.innerText = isMe
                    ? LocaleManager.t('victory.masterTitle')
                    : "Derrota! Mais sorte na próxima vez.";

                // Play Sound
                if ((window as any).audioManager) {
                    if (isMe) (window as any).audioManager.playSuccess();
                    else (window as any).audioManager.playFailure();
                }
            }
        }
    }
};

// =========================
// ✅ REFATORADO v6.0: EventBus Listeners
// =========================
// Retrocompatibilidade: Responder a eventos do PvE Mode

EventBus.on(EventType.PVE_GAME_INIT, (data) => {
    Logger.sys('[GameController] Event PVE_GAME_INIT received');
    GameController.inicializarJogo(data.players);
});

EventBus.on(EventType.PVE_STATE_PERSIST, () => {
    Logger.debug(LogCategory.GAME, '[GameController] Event PVE_STATE_PERSIST received');
    GameController.persistirEstado();
});

EventBus.on(EventType.TURN_ADVANCE, () => {
    Logger.debug(LogCategory.GAME, '[GameController] Event TURN_ADVANCE received');
    GameController.avancarTurno();
});

// Multiplayer Listeners
EventBus.on(EventType.MULTIPLAYER_STATE_UPDATE, (data) => {
    // Logger.debug(LogCategory.NET, '[GameController] State Update received');
    GameController.atualizarEstado(data.state);
});

EventBus.on(EventType.MULTIPLAYER_GAME_START, (data) => {
    Logger.net('[GameController] Game Start received from Lobby');
    // Se a função mostrarJogo for global, mantemos aqui por compatibilidade ou a movemos?
    // Por enquanto, assumimos que quem escuta isso é o ScreenManager ou similar.
    // Mas o MultiplayerMode emitia isso para (window as any).mostrarJogo
    if ((window as any).mostrarJogo) {
        (window as any).mostrarJogo(data.roomCode, data.players, data.spectators);
    }
});

EventBus.on(EventType.MULTIPLAYER_VICTORY, (data) => {
    Logger.game(`[GameController] Victory Event: ${data.isLocalPlayer ? 'Win' : 'Loss'}`);
    const msg = data.isLocalPlayer
        ? LocaleManager.t('multiplayer.victory')
        : LocaleManager.t('multiplayer.defeat');

    // Notificação visual
    EventBus.emit(EventType.UI_NOTIFICATION, { message: msg, type: data.isLocalPlayer ? 'success' : 'error' });

    // Play sound based on result
    if ((window as any).audioManager) {
        if (data.isLocalPlayer) (window as any).audioManager.playSuccess();
        else (window as any).audioManager.playFailure();
    }

    // Tela de Vitória Global (se existir)
    setTimeout(() => {
        if ((window as any).checarTelaVitoriaGlobal)
            (window as any).checarTelaVitoriaGlobal();
    }, 500);
});

// Exportar globalmente
(window as any).GameController = GameController;