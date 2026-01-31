// =========================
// GameController - Orquestração do Jogo
// =========================
import { Logger, LogCategory } from "../utils/Logger.js";
const GameController = {
    // --- MOVED METHODS (Fix TS Parsing Issue) ---
    // Finalizar Troca (Chamado após animação)
    // Server-Side: Limpa estado e passa vez
    finalizarTrocaServer: function (troca) {
        Logger.game("[GameController] finalizarTrocaServer CALLED for:", troca);
        const estado = window.estadoJogo;
        if (!troca || !estado) {
            Logger.warn(LogCategory.GAME, "[GameController] Missing troca or estado data. Aborting finish.");
            return;
        }
        // 1. Remove Animation Flag (Clean State)
        const updates = {};
        updates["trocaAnimacao"] = null;
        // 2. Perform Swap in Data (Confirm)
        // Note: Logic in realizarTroca might have already swapped 'mesa' but we ensure it matches final.
        // Actually, we trust 'mesa' was swapped at start. We just confirm cleanup.
        window.getDBRef("salas/" + window.salaAtual + "/estadoJogo").update(updates);
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
            if (window.avancarTurno) {
                Logger.game("[GameController] Bot swap complete. Advancing turn...");
                window.avancarTurno();
            }
        }
        else {
            Logger.game("[GameController] Player swap complete. Turn already advanced in realizarTroca().");
        }
    },
    // Avançar Turno
    avancarTurno: function () {
        const estado = window.estadoJogo;
        if (!estado || !estado.jogadores || estado.jogadores.length === 0)
            return;
        let novoVez = estado.vez;
        if (estado.jogadores.length === 2) {
            novoVez = (estado.vez + 1) % 2;
        }
        else if (estado.jogadores.length === 4) {
            novoVez = (estado.vez + 1) % 2;
        }
        const salaAtual = window.salaAtual;
        // --- MODO TUTORIAL ---
        if (salaAtual === "MODO_TUTORIAL") {
            const tutorial = window.tellstonesTutorial;
            const passosPermitidos = [5, 6, 7, 8];
            if (!tutorial || !passosPermitidos.includes(tutorial.passo)) {
                window.estadoJogo = Object.assign({}, estado);
                if (window.tellstonesTutorial)
                    window.tellstonesTutorial.registrarAcaoConcluida();
                if (window.Renderer)
                    window.Renderer.renderizarMesa();
                return;
            }
        }
        // --- MODO LOCAL / PVE ---
        if (window.isLocalMode || salaAtual === "MODO_PVE") {
            estado.vez = novoVez;
            window.estadoJogo = Object.assign({}, estado);
            this.persistirEstado();
            if (typeof window.Renderer !== 'undefined' && window.Renderer.atualizarInfoSala) {
                const espect = window.ultimosEspectadores || [];
                window.Renderer.atualizarInfoSala(salaAtual, espect);
            }
            if (window.Renderer)
                window.Renderer.renderizarMesa();
            if (window.currentGameMode && window.currentGameMode.checkTurn) {
                setTimeout(() => window.currentGameMode.checkTurn(), 100);
            }
            return;
        }
        // --- MODO MULTIPLAYER ---
        estado.vez = novoVez;
        window.getDBRef("salas/" + salaAtual + "/estadoJogo/vez").transaction((currentVez) => {
            return novoVez;
        }, (error, committed, snapshot) => {
            if (committed) {
                if (window.Renderer)
                    window.Renderer.renderizarMesa();
            }
        });
    },
    // Listener de Estado (Substitui ouvirEstadoJogo)
    iniciarListenerEstado: function (codigo) {
        if (this.stateListener)
            this.stateListener.off();
        this.stateListener = window.getDBRef("salas/" + codigo + "/estadoJogo");
        // --- COIN TOSS & SYNC CHECK (ONCE) ---
        // Verify Coin Toss / Alignment only ONCE when joining, not every state update.
        // CoinFlip.js already handles dynamic updates for the coin itself.
        if (window.getDBRef) {
            window.getDBRef("salas/" + codigo + "/caraCoroa").once("value", (snap) => {
                const coinData = snap.val();
                const estado = window.estadoJogo;
                // If Coin Toss NOT finished or missing, and game not aligned -> Show UI
                if ((!coinData || !coinData.sorteioFinalizado) && estado && !estado.centralAlinhada) {
                    if (typeof window.mostrarEscolhaCaraCoroa === 'function') {
                        window.mostrarEscolhaCaraCoroa();
                        if (typeof window.ouvirCaraCoroa === 'function')
                            window.ouvirCaraCoroa();
                    }
                }
                // If Coin Toss FINISHED but not aligned -> Trigger Alignment
                if (coinData && coinData.sorteioFinalizado && estado && !estado.centralAlinhada) {
                    if (typeof window.sincronizarPedraCentralEAlinhamento === 'function') {
                        window.sincronizarPedraCentralEAlinhamento();
                    }
                }
            });
        }
        this.stateListener.on("value", (snapshot) => {
            const estado = snapshot.val();
            if (!estado)
                return;
            window.estadoJogo = estado;
            if (!window.estadoJogo.mesa)
                window.estadoJogo.mesa = Array(7).fill(null);
            if (!window.estadoJogo.reserva)
                window.estadoJogo.reserva = [];
            if (window.Renderer) {
                window.Renderer.renderizarMesa();
                window.Renderer.renderizarPedrasReserva();
                window.Renderer.atualizarPlacar(estado.jogadores);
                window.Renderer.monitorarTrocas(estado, (troca) => {
                    this.finalizarTrocaServer(troca);
                });
                const espect = window.ultimosEspectadores || [];
                window.Renderer.atualizarInfoSala(codigo, espect);
            }
            this.verificarSincronizacao(estado);
            // Sync: Stone Alignment Logic (State Driven)
            // If state says aligned but we haven't animated locally yet
            if (estado.centralAlinhada && !window.alinhamentoAnimado) {
                window.alinhamentoAnimado = true;
                if (typeof window.sincronizarPedraCentralEAlinhamento === 'function') {
                    window.sincronizarPedraCentralEAlinhamento();
                }
            }
        });
    },
    verificarSincronizacao: function (estado) {
        if (estado.vencedor) {
            const telaVitoria = document.getElementById("tela-vitoria");
            const msg = document.getElementById("tela-vitoria-msg");
            const titulo = document.getElementById("tela-vitoria-titulo");
            if (telaVitoria && msg && titulo) {
                telaVitoria.style.display = "flex";
                if (estado.vencedor === window.nomeAtual) {
                    titulo.innerText = "Vitória!";
                    msg.innerText = "Parabéns, você venceu!";
                    if (window.audioManager)
                        window.audioManager.playSuccess();
                }
                else {
                    titulo.innerText = "Derrota";
                    msg.innerText = `${estado.vencedor} venceu!`;
                    if (window.audioManager)
                        window.audioManager.playFailure();
                }
            }
        }
    },
    // --- ORIGINAL PROPERTIES ---
    // Inicializa o jogo
    inicializarJogo: function (jogadores) {
        if (!window.GameRules) {
            Logger.error(LogCategory.GAME, "GameRules não carregado!");
            return;
        }
        // Cria estado inicial puro
        const novoEstado = window.GameRules.createInitialState(jogadores, window.PEDRAS_OFICIAIS || []);
        this.atualizarEstado(novoEstado);
        // IMPORTANT: Persist state immediately so listeners pick it up
        this.persistirEstado();
        return novoEstado;
    },
    // Ação: Colocar pedra da reserva na mesa
    colocarPedra: function (pedraObj, slotIdx) {
        // 1. Validação (GameRules)
        const estado = window.estadoJogo;
        if (!estado)
            return false;
        // Por enquanto, validação básica aqui
        if (estado.mesa[slotIdx] !== null) {
            Logger.warn(LogCategory.GAME, "Slot ocupado!");
            if (window.audioManager)
                window.audioManager.playFailure();
            return false;
        }
        // 2. Atualização de Estado
        estado.mesa[slotIdx] = pedraObj;
        // Sound Event (Visual Polish)
        if (window.audioManager)
            window.audioManager.playPlace();
        // Remove da reserva (já feito pelo caller por enquanto)
        this.persistirEstado();
        this.notificarAtualizacao();
        // Multiplayer: Avançar turno
        if (window.avancarTurno)
            window.avancarTurno();
        return true;
    },
    // Ação: Realizar Troca (Swap)
    realizarTroca: function (from, to) {
        if (!window.estadoJogo)
            return;
        const mesa = window.estadoJogo.mesa;
        if (!mesa[from] || !mesa[to])
            return;
        // 1. Update State Locally (Optimistic)
        const temp = mesa[from];
        mesa[from] = mesa[to];
        mesa[to] = temp;
        // 2. Trigger DB Event for Animation (and State Sync)
        if (window.salaAtual) {
            // Update Mesa AND TrocaAnimacao atomically-ish
            // Note: We send 'trocaAnimacao' to trigger the animation event listener
            // AND we update 'mesa' so validation passes.
            const updates = {};
            updates["mesa"] = mesa;
            updates["vez"] = 0; // Reset turn (optional rules)
            updates["trocaAnimacao"] = {
                from: from,
                to: to,
                timestamp: Date.now(),
                jogador: window.nomeAtual
            };
            window.getDBRef("salas/" + window.salaAtual + "/estadoJogo").update(updates);
        }
        // 3. Local Fallback (Tutorial/Offline)
        if (window.salaAtual === "MODO_TUTORIAL") {
            // For Tutorial, we also need to trigger the listener we just added
            // But since we updated DB, the listener SHOULD fire if we are connected.
            // If local only:
            if (!window.getDBRef) {
                if (window.AnimationManager) {
                    window.AnimationManager.playSwap(from, to, () => {
                        if (window.tellstonesTutorial)
                            window.tellstonesTutorial.registrarAcaoConcluida();
                        if (window.Renderer)
                            window.Renderer.renderizarMesa();
                    });
                }
            }
        }
        // Pass Turn if Rule says so
        if (window.avancarTurno)
            window.avancarTurno();
    },
    // Ação: Resolver Desafio (Oponente escolheu uma pedra)
    resolverDesafio: function (idxDeduzido) {
        if (!window.estadoJogo || !window.estadoJogo.desafio)
            return;
        // Passa a escolha diretamente para ser processada na transação
        this.processarResolucaoDesafio(idxDeduzido);
    },
    processarResolucaoDesafio: function (idxDeduzidoOpcional) {
        if (window.currentGameMode && typeof window.currentGameMode.resolveChallenge === 'function') {
            window.currentGameMode.resolveChallenge(idxDeduzidoOpcional);
        }
        else {
            Logger.warn(LogCategory.GAME, "[GameController] Nenhum modo de jogo ativo ou resolveChallenge não implementado.");
        }
    },
    // Ação: Responder ao Se Gabar
    responderSegabar: function (acao) {
        // acao: 'acreditar' | 'duvidar' | 'segabar_tambem'
        const estado = window.estadoJogo;
        if (!estado.desafio || estado.desafio.tipo !== "segabar")
            return;
        if (window.tellstonesTutorial && !window.tellstonesTutorial.verificarAcao("RESPONDER_DESAFIO"))
            return;
        const salaAtual = window.salaAtual;
        // --- ACREDITAR ---
        if (acao === "acreditar") {
            const jogadorDesafio = estado.desafio.jogador;
            // FIX: Ensure correct player index lookup even if names are ambiguous
            let idx = estado.jogadores.findIndex((j) => j.nome === jogadorDesafio);
            // Fallback for PvE where 'Jogador' might be named differently in local state
            if (idx === -1 && jogadorDesafio === window.nomeAtual) {
                idx = estado.jogadores.findIndex((j) => j.id === 'p1' || j.id === 'jogador');
            }
            if (idx !== -1)
                estado.jogadores[idx].pontos++;
            if (salaAtual === "MODO_TUTORIAL") {
                if (window.notificationManager)
                    window.notificationManager.showInternal(`Você acreditou. O Mestre marcou ponto!`);
                estado.vez = 1;
                // Force update
                window.getDBRef("salas/" + salaAtual + "/estadoJogo").update({
                    jogadores: estado.jogadores,
                    vez: 1
                });
                window.getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
                if (window.tellstonesTutorial)
                    setTimeout(() => window.tellstonesTutorial.registrarAcaoConcluida(), 500);
                this.notificarAtualizacao();
                return;
            }
            // Normal Flow
            window.getDBRef("salas/" + salaAtual + "/estadoJogo").update({
                jogadores: estado.jogadores
            });
            window.getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
            // FORCE LOCAL UPDATE (Sync with PvE Loop)
            estado.desafio = null;
            if (window.estadoJogo)
                window.estadoJogo.desafio = null;
            if (window.notificationManager)
                window.notificationManager.showGlobal(`${jogadorDesafio} ganhou 1 ponto!`);
            // FORCE TURN FIX: Do NOT advance turn here. 
            // Initiate Boast (Player) -> Turn passes to Bot (1).
            // Bot Responds (Believes) -> Turn is still (1)? 
            // If we advance, it goes to (0) Player. User says that is wrong.
            // So we keep it on Bot (1), and Bot loop should pick it up.
        }
        // --- DUVIDAR ---
        else if (acao === "duvidar") {
            if (salaAtual === "MODO_TUTORIAL") {
                if (window.notificationManager)
                    window.notificationManager.showInternal("Você duvidou! O Mestre vai provar...");
                // Simula Mestre provando
                setTimeout(() => {
                    if (window.notificationManager)
                        window.notificationManager.showInternal("Mestre revelou as pedras e acertou! 3 Pantos para ele.");
                    const idxBot = estado.jogadores.findIndex((j) => j.nome === "Mestre");
                    if (idxBot !== -1)
                        estado.jogadores[idxBot].pontos += 3;
                    estado.vez = 1;
                    window.getDBRef("salas/" + salaAtual + "/estadoJogo").update({
                        jogadores: estado.jogadores,
                        vez: 1
                    });
                    window.getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
                    if (window.tellstonesTutorial)
                        setTimeout(() => window.tellstonesTutorial.registrarAcaoConcluida(), 500);
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
            estado.desafio.jogador = window.nomeAtual; // Agora eu sou o Boaster
            estado.desafio.status = "responder_pecas"; // Vai direto para a prova
            estado.desafio.idxAtual = 0;
            estado.desafio.respostas = [];
            if (salaAtual === "MODO_TUTORIAL") {
                if (window.tellstonesTutorial)
                    window.tellstonesTutorial.registrarAcaoConcluida();
            }
            this.persistirEstado();
        }
        this.notificarAtualizacao();
    },
    // Ação: Verificar Resposta (Exame Se Gabar)
    verificarRespostaSegabar: function (idxMesa, nomeEscolhido) {
        const estado = window.estadoJogo;
        if (!estado.desafio)
            return;
        if (!estado.desafio.respostas)
            estado.desafio.respostas = [];
        if (typeof estado.desafio.idxAtual === 'undefined')
            estado.desafio.idxAtual = 0;
        // Armazena a resposta
        estado.desafio.respostas.push({ idxMesa, nomeEscolhido });
        estado.desafio.idxAtual++;
        const pedrasViradas = estado.mesa.filter((p) => p && p.virada);
        const totalParaResponder = pedrasViradas.length; // Como não viramos, o count é constante ou deve ser conferido
        // Verifica se terminou a sequência
        if (estado.desafio.idxAtual >= totalParaResponder) {
            this.finalizarDesafioSegabar(estado);
        }
        else {
            // Continua para a próxima
            this.persistirEstado();
            this.notificarAtualizacao();
        }
    },
    finalizarDesafioSegabar: function (estado) {
        const salaAtual = window.salaAtual;
        let errou = false;
        // Validação em Lote e REVELAÇÃO FORÇADA
        estado.desafio.respostas.forEach((resp) => {
            const pedraReal = estado.mesa[resp.idxMesa];
            if (!pedraReal || pedraReal.nome !== resp.nomeEscolhido) {
                errou = true;
            }
            // Revela todas as pedras ao final (Permanente)
            if (estado.mesa[resp.idxMesa])
                estado.mesa[resp.idxMesa].virada = false;
        });
        if (!errou) {
            // VENCEU O DESAFIO
            if (window.audioManager)
                window.audioManager.playSuccess();
            if (window.notificationManager)
                window.notificationManager.showGlobal("Você provou seu conhecimento e VENCEU 3 PONTOS!");
            // Robust Scoring: Update directly via Firebase Transaction/Update to avoid race
            const boasterName = estado.desafio.jogador;
            let idxJogador = estado.jogadores.findIndex((j) => j.nome === boasterName);
            Logger.game(`[GameController] Finalizing Boast. Boaster: ${boasterName}, Index Found: ${idxJogador}`);
            if (idxJogador !== -1) {
                // Optimistic update locally
                estado.jogadores[idxJogador].pontos += 3;
                if (window.AnalyticsManager)
                    window.AnalyticsManager.logAction('boast', { result: 'win', points: 3 });
                // Direct DB update to ensure points are counted even if full state save fails
                if (salaAtual !== "MODO_TUTORIAL") {
                    window.getDBRef(`salas/${salaAtual}/estadoJogo/jogadores/${idxJogador}/pontos`)
                        .transaction((pontos) => (pontos || 0) + 3);
                }
                // Check Vitoria
                if (estado.jogadores[idxJogador].pontos >= 3) {
                    this.declararVencedor(estado.jogadores[idxJogador].nome);
                    if (window.AnalyticsManager)
                        window.AnalyticsManager.logGameEnd(window.salaAtual, estado.jogadores[idxJogador].nome, 0);
                }
            }
            window.getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
            if (salaAtual === "MODO_TUTORIAL" && window.tellstonesTutorial) {
                setTimeout(() => window.tellstonesTutorial.registrarAcaoConcluida(), 500);
            }
            if (window.avancarTurno)
                window.avancarTurno();
        }
        else {
            // ERROU
            // ERROU - Ponto ao oponente
            if (window.audioManager)
                window.audioManager.playFailure();
            // ERROU - Ponto ao oponente
            // Oponente ganha 3 pontos.
            // WARNING: 'vez' might be confusing here. Use logic: Not Current Boaster.
            if (!estado.desafio) {
                Logger.error(LogCategory.GAME, "[GameController] Criticall! Desafio state missing in failure handler.");
                return;
            }
            const boasterName = estado.desafio.jogador;
            let idxBoaster = estado.jogadores.findIndex((j) => j.nome === boasterName);
            // Fallback lookup
            if (idxBoaster === -1 && boasterName === window.nomeAtual) {
                idxBoaster = estado.jogadores.findIndex((j) => j.id === 'p1' || j.id === 'jogador');
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
                if (salaAtual === "MODO_TUTORIAL" && window.tellstonesTutorial) {
                    window.tellstonesTutorial.registrarAcaoConcluida();
                }
                // Direct DB update
                if (salaAtual !== "MODO_TUTORIAL") {
                    window.getDBRef(`salas/${salaAtual}/estadoJogo/jogadores/${idxOponente}/pontos`)
                        .transaction((pontos) => (pontos || 0) + 3);
                }
            }
            // Clear Challenge State LAST to avoid crashes
            estado.desafio = null;
            // Força atualização visual imediata de pontos
            if (window.Renderer)
                window.Renderer.atualizarPlacar(estado.jogadores);
            this.persistirEstado();
            this.notificarAtualizacao();
            if (window.avancarTurno)
                window.avancarTurno();
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
    atualizarEstado: function (novoEstado) {
        window.estadoJogo = novoEstado;
        // Sync global se necessário
    },
    declararVencedor: function (nome) {
        if (!window.estadoJogo)
            return;
        window.estadoJogo.vencedor = nome;
        this.persistirEstado();
        // VISUAL POLISH: Confetti & Sound
        if (window.ConfettiManager)
            window.ConfettiManager.start();
        if (window.audioManager)
            window.audioManager.playSuccess();
        if (window.notificationManager) {
            window.notificationManager.showGlobal(`VENCEDOR: ${nome}!`, 5000);
        }
        Logger.game(`[GameController] Vencedor declarado: ${nome}`);
    },
    // --- UTILS ---
    persistirEstado: function () {
        // Salva no Firebase/LocalDB
        if (window.salaAtual) {
            window.getDBRef("salas/" + window.salaAtual + "/estadoJogo").set(window.estadoJogo);
        }
    },
    notificarAtualizacao: function () {
        // Força re-render
        if (window.Renderer) {
            window.Renderer.renderizarMesa();
            window.Renderer.renderizarPedrasReserva();
        }
    },
    // Verificação de Fim de Jogo
    verificarFimDeJogo: function () {
        const estado = window.estadoJogo;
        if (!estado || !estado.jogadores)
            return;
        // SKIP for Tutorial (Managed by Script)
        if (window.salaAtual === "MODO_TUTORIAL")
            return;
        const WIN_SCORE = 3;
        let vencedor = null;
        if (Array.isArray(estado.jogadores)) {
            vencedor = estado.jogadores.find((j) => j.pontos >= WIN_SCORE);
        }
        else {
            vencedor = Object.values(estado.jogadores).find((j) => j.pontos >= WIN_SCORE);
        }
        if (vencedor) {
            Logger.game("[GameController] Fim de Jogo! Vencedor:", vencedor.nome);
            // Mark state as ended to stop Bot/Interactions
            estado.vencedor = vencedor.nome;
            this.persistirEstado();
            if (window.notificationManager)
                window.notificationManager.showGlobal(`Vencedor: ${vencedor.nome}!`);
            // Show Victory Screen
            const tela = document.getElementById("tela-vitoria");
            if (tela) {
                tela.style.display = "flex";
                const titulo = document.getElementById("tela-vitoria-titulo");
                const msg = document.getElementById("tela-vitoria-msg");
                if (titulo)
                    titulo.innerText = `${vencedor.nome} Venceu o Jogo!`;
                const isMe = (vencedor.id === 'p1' || vencedor.nome === window.nomeAtual);
                if (msg)
                    msg.innerText = isMe
                        ? "Parabéns! Você provou ser um mestre do Tellstones."
                        : "Derrota! Mais sorte na próxima vez.";
                // Play Sound
                if (window.audioManager) {
                    if (isMe)
                        window.audioManager.playSuccess();
                    else
                        window.audioManager.playFailure();
                }
            }
        }
    }
};
window.GameController = GameController;
