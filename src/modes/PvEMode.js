/**
 * Modo PvE (Jogador vs Ambiente)
 * Gerencia estado de jogo local com um oponente IA.
 */
class PvEMode extends GameMode {
    constructor() {
        super();
        this.roomCode = "MODO_PVE";
        this.playerName = null;
        this.botBrain = null;
        this.botThinking = false;
    }

    start(config) {
        super.start(config);
        this.playerName = config.playerName || "Jogador";

        // Globals setup
        window.isLocalMode = true;
        window.salaAtual = this.roomCode;
        window.nomeAtual = this.playerName;

        // Reset Local State
        if (window.clearLocalData) {
            window.clearLocalData("salas/" + this.roomCode);
        }
        // Force clear coin toss specifically
        const refCoin = getDBRef("salas/" + this.roomCode + "/caraCoroa");
        if (refCoin) refCoin.set(null);

        // Reset Bot Brain Memory explicitly
        if (this.botBrain) this.botBrain = null;

        // Inicializa Brain com Perfil Aleatório (Padrão) ou Dev Override
        const profiles = ['logical', 'trickster', 'aggressive'];
        // Check legacy or dev config? For now, pure random as requested.
        const selectedProfile = profiles[Math.floor(Math.random() * profiles.length)];

        this.botBrain = new BotBrain(selectedProfile);
        if (window.showToastInterno) window.showToastInterno(`Bot: ${this.botBrain.profile.name}`);

        // Configuração de Estado Inicial
        const jogadores = [
            { nome: window.nomeAtual, id: "p1", pontos: 0 },
            { nome: "Bot", id: "p2", pontos: 0 }
        ];

        // Cria e Salva estado inicial via LocalDB
        const estadoInicial = GameController.inicializarJogo(jogadores);

        // Mock Local Data structure explicitly (só pra garantir, mas o inicializarJogo já deve ter salvo)
        // Mas o GameController salva via getDBRef, que salva em localData.

        // Inicia Listeners (Idêntico ao Multiplayer)
        this.listenToState();
        this.listenToCoinToss();
    }

    cleanup() {
        super.cleanup();
        this.botBrain = null;

        const refState = getDBRef("salas/" + this.roomCode + "/estadoJogo");
        if (refState && refState.off) refState.off();

        const refCoin = getDBRef("salas/" + this.roomCode + "/caraCoroa");
        if (refCoin && refCoin.off) refCoin.off();
    }

    setBotProfile(profileName) {
        if (!this.botBrain) return;
        this.botBrain = new BotBrain(profileName);
        console.log("[PvEMode] Bot Personality forced to:", profileName);
        if (window.showToastInterno) window.showToastInterno(`Bot Personality: ${this.botBrain.profile.name}`);
    }

    listenToCoinToss() {
        const ref = getDBRef("salas/" + this.roomCode + "/caraCoroa");
        this.registerListener(ref, "value", (snapshot) => {
            const data = snapshot.val();
            const estado = window.estadoJogo;

            // 1. Se não tem sorteio feito, MOSTRAR TELA
            if ((!data || !data.sorteioFinalizado) && estado && !estado.centralAlinhada) {
                if (typeof mostrarEscolhaCaraCoroa === "function") {
                    mostrarEscolhaCaraCoroa();
                    // ouvirCaraCoroa is usually one-off, but here we trigger UI
                    if (typeof ouvirCaraCoroa === "function") ouvirCaraCoroa();
                }
            }
            else {
                // Esconder UI se já foi
                const escolhaDiv = document.getElementById("escolha-cara-coroa");
                if (escolhaDiv) escolhaDiv.style.display = "none";
            }

            // 2. Se sorteio acabou, ALINHAR (Iniciar o jogo de fato)
            if (data && data.sorteioFinalizado && estado && !estado.centralAlinhada) {
                // Chama a função global que faz a animação e seta centralAlinhada
                if (typeof sincronizarPedraCentralEAlinhamento === "function") {
                    sincronizarPedraCentralEAlinhamento();
                }
            }
        });
    }

    listenToState() {
        const ref = getDBRef("salas/" + this.roomCode + "/estadoJogo");

        this.registerListener(ref, "value", (snapshot) => {
            const estado = snapshot.val();
            if (!estado) return;

            // Normalize
            if (!estado.mesa) estado.mesa = Array(7).fill(null);
            if (!estado.reserva) estado.reserva = [];

            // 1. Monitor Swap Animation (Critical for Swap action to work visually)
            // 1. Monitor Swap Animation (Critical for Swap action to work visually AND Memory)
            if (window.Renderer && window.Renderer.monitorarTrocas) {
                window.Renderer.monitorarTrocas(estado, (troca) => {
                    // Animation Done: Execute Data Swap (if not done)
                    if (window.finalizarTrocaServer) {
                        window.finalizarTrocaServer(troca);
                    }

                    // CRITICAL: Update Bot Memory AFTER the data swap logic runs
                    // We know 'troca' happened. The 'state' is now consistent with the swap? 
                    // No, 'monitorarTrocas' uses 'estado' which triggered the animation.
                    // 'finalizarTrocaServer' updates 'estadoJogo' (Local/DB). 
                    // The LISTENER will trigger again with new state (and no animation).
                    // BUT for Bot, we want to update memory NOW or on that next listener trigger?
                    // Safe approach: Update Memory NOW based on the action 'trocar'.
                    // AND force a Scan of the new positions when the state updates.

                    if (this.botBrain && troca.jogador !== 'Bot') {
                        console.log("[BOT OBSERVE] Swap Completed Callback. Swapping Memory:", troca);
                        this.botBrain.observe({
                            tipo: 'trocar',
                            origem: troca.from,
                            destino: troca.to
                        }, null); // State is null here to avoid accidental scan inside observe (deprecated)
                    }
                });
            }

            // Turn Decay Logic (Detect Turn Change)
            if (this.lastVez !== undefined && this.lastVez !== estado.vez) {
                // Turn changed. Apply Decay.
                // But only if we have been playing (not first load)
                if (this.botBrain) {
                    console.log("[BOT OBSERVE] Turn End / New Turn. Decaying Memory.");
                    this.botBrain.observe({ tipo: 'turn_end' }, estado);
                }
            }
            this.lastVez = estado.vez;


            // OBSERVATION LOGIC (Placement, Flips)
            // We do this simply by comparing states.
            if (this.botBrain && this.lastMesaState) {
                estado.mesa.forEach((p, i) => {
                    const oldP = this.lastMesaState[i];
                    // Placement
                    if (p && !oldP) {
                        this.botBrain.observe({ tipo: 'colocar', origem: i, pedra: p }, estado);
                    }
                    // Flip
                    if (p && oldP && p.virada !== oldP.virada) {
                        this.botBrain.observe({ tipo: 'virar', origem: i, pedra: p }, estado);
                    }
                });

                // SCAN VISIBLE STONES (Ground Truth)
                // Always scan what is visible to reinforce memory
                this.scanVisibleStones(estado);
            } else if (this.botBrain && !this.lastMesaState) {
                // First Load? Scan fully.
                this.scanVisibleStones(estado);
            }

            // --- RENDER VISUALS EXPLICITLY ---
            if (window.Renderer) {
                // 1. Mesa e Reserva
                window.Renderer.renderizarMesa();

                // Hack: Se a reserva não animou ainda, garantir que ela apareça se já estiver ok
                // O script.js controla window.animouReservaCircular.
                window.Renderer.renderizarPedrasReserva();

                // 2. Placar e Jogadores
                // Em PvE não tem espectadores, passamos array vazio
                window.Renderer.atualizarInfoSala(this.roomCode, []);

                // 3. Desafios
                if (window.Renderer.renderizarOpcoesDesafio) window.Renderer.renderizarOpcoesDesafio();
                if (window.Renderer.renderizarOpcoesSegabar) window.Renderer.renderizarOpcoesSegabar();
                if (window.Renderer.renderizarRespostaSegabar) window.Renderer.renderizarRespostaSegabar();

                // 4. Vitória
                if (estado.vencedor) {
                    const msg = `Vencedor: ${estado.vencedor.nomes ? estado.vencedor.nomes.join(', ') : 'Desconhecido'}`;
                    console.log("[PvE] " + msg);
                    if (window.showToast) window.showToast(msg);
                }

                // DEBUG BOT MEMORY
                if (window.Renderer.renderBotMemoryDebug && this.botBrain) {
                    window.Renderer.renderBotMemoryDebug(this.botBrain);
                }
            }

            // Sync Alignment logic (Legacy support)
            if (estado.centralAlinhada && typeof sincronizarPedraCentralEAlinhamento === "function") {
                // Apenas para garantir que variaveis globais de alinhamento estejam ok
                // sync... já faz render, mas sem problemas chamar de novo
            }

            // Bot logic
            this.checkTurn(estado);
        });
    }

    checkTurn(estado) {
        try {
            if (!estado || estado.vencedor) return;
            if (!this.botBrain) {
                console.warn("[PvE] BotBrain missing, re-initializing...");
                this.setBotProfile('random'); // Self-repair
                return;
            }

            // Aguarda alinhamento ou sorteio
            if (!estado.centralAlinhada) return;

            // Verifica Sorteio via LocalDB (caminho padrao do script.js)
            if (window.localData && window.localData.salas && window.localData.salas[this.roomCode].caraCoroa) {
                const cc = window.localData.salas[this.roomCode].caraCoroa;
                if (!cc.sorteioFinalizado) return;
            }

            // Guard: Se houver animação ou interação bloqueante, não faz nada
            if (window.animacaoTrocaEmAndamento) return;

            // Se tem desafio pendente (Jogador se gabou), Bot precisa responder
            if (estado.desafio && estado.desafio.tipo === "segabar" && estado.desafio.jogador !== "Bot" && !estado.desafio.resolvido) {
                if (!this.botThinking) {
                    this.botThinking = true;
                    setTimeout(() => {
                        try {
                            const resp = this.botBrain.decideBoastResponse(estado);
                            // Usa GameController para responder
                            GameController.responderSegabar(resp);
                        } catch (e) {
                            console.error("[PvE CRITICAL] Bot Boast Response Failed:", e);
                            // Fallback: Duvidar para não travar
                            GameController.responderSegabar("duvidar");
                        } finally {
                            this.botThinking = false;
                        }
                    }, 2000);
                }
                return;
            }
        } catch (err) {
            console.error("[PvE CRITICAL] checkTurn crashed:", err);
            this.botThinking = false; // Reset lock
        }

        // Se Bot foi desafiado (tipo 'desafio_simples' ou 'duvida' vindo do Player), ele deve ter respondido via resolveChallenge
        // Mas se o estado estiver 'esperando resposta', e o desafio foi feito PELO JOGADOR, o Bot precisa responder.
        // Em Tellstones, Player desafia clicando na pedra. O Controller chama resolveChallenge imediatamente se for local?
        // Vamos verificar como o Controller lida com Challenge.

        if (estado.vez === 1 && !this.botThinking && !window.selecionandoDesafio && !window.resolvendoDesafio) {
            console.log("[PvE DEBUG] Bot Turn Logic Triggered. Calling executeBotTurn...");

            // Verifica se há um desafio simples pendente contra o Bot
            // Fallback: If type is undefined but challenge exists and not segabar, assume simple challenge.
            const isChallenge = estado.desafio
                && (estado.desafio.tipo === "desafio" || estado.desafio.tipo === "desafio_simples" || !estado.desafio.tipo)
                && estado.desafio.tipo !== "segabar"; // Explicit exclude boast

            if (isChallenge && !estado.desafio.resolvido && estado.desafio.jogador !== "Bot") {
                this.botThinking = true;
                setTimeout(() => {
                    // Safety Check: Challenge might be gone or state changed
                    if (!estado.desafio) {
                        console.warn("[PvE] Challenge disappeared before Bot could resolve.");
                        this.botThinking = false;
                        return;
                    }

                    // Try to finding target from 'alvo' or 'pedra' or 'idxPedra'
                    const idx = (estado.desafio.alvo !== undefined) ? estado.desafio.alvo :
                        (estado.desafio.pedra !== undefined) ? estado.desafio.pedra :
                            (estado.desafio.idxPedra !== undefined) ? estado.desafio.idxPedra : 0;

                    console.log(`[PvE] Bot resolving challenge at index ${idx}`);
                    this.resolveChallenge(idx);
                    this.botThinking = false;
                }, 2000);
                return;
            }

            // Verifica se há um SE GABAR pendente (Jogador se gabou, Bot precisa responder)
            if (estado.desafio && estado.desafio.tipo === "segabar" && estado.desafio.status === "aguardando_resposta" && estado.desafio.jogador !== "Bot") {
                this.botThinking = true;
                console.log("[PvE] Bot precisa responder ao Se Gabar do Jogador.");
                showToastInterno("Bot está pensando se acredita em você...");

                setTimeout(() => {
                    this.respondToPlayerBoast(estado);
                    this.botThinking = false;
                }, 2500);
                return;
            }

            this.botThinking = true;
            showToastInterno("Bot está pensando...");

            // Delay aumentado para ser mais perceptível
            setTimeout(() => {
                try {
                    this.executeBotTurn();
                } catch (e) {
                    console.error("[PvE ERROR] Bot Crashed:", e);
                    this.botThinking = false;
                }
            }, 2500 + Math.random() * 1000);
        } else {
            if (estado.vez === 1) console.log(`[PvE DEBUG] Bot Turn Blocked. Thinking: ${this.botThinking}, SelDesafio: ${window.selecionandoDesafio}, ResDesafio: ${window.resolvendoDesafio}`);
        }

        // Update bot's internal state memory after processing
        this.lastMesaState = JSON.parse(JSON.stringify(estado.mesa));
    }

    // Helper to scan visible stones
    scanVisibleStones(estado) {
        if (!this.botBrain || !estado.mesa) return;
        estado.mesa.forEach((p, i) => {
            if (p && !p.virada) {
                // Ground Truth: If I see it, I know it 100%
                this.botBrain.updateMemory(i, p.nome, 1.0);
            }
        });
    }

    executeBotTurn() {
        try {
            const estado = window.estadoJogo;
            // Validação dupla
            if (!estado || estado.vez !== 1) {
                this.botThinking = false;
                return;
            }

            if (!this.botBrain) {
                console.error("[PvE ERROR] BotBrain missing in executeBotTurn. Re-init.");
                this.setBotProfile('random');
                if (!this.botBrain) {
                    // Critical failure, pass turn to avoid lock
                    window.avancarTurno();
                    return;
                }
            }

            const decision = this.botBrain.decideMove(estado);
            console.log("[BOT] Decisão:", JSON.stringify(decision));

            if (!decision) throw new Error("Bot decided nothing (null decision)");

            switch (decision.type) {
                case 'place':
                    this.performBotPlace(estado);
                    break;
                case 'flip':
                    this.performBotFlip(estado);
                    break;
                case 'swap':
                    if (!this.performBotSwap(estado)) {
                        this.performBotFlip(estado);
                    }
                    break;
                case 'boast':
                    this.performBotBoast(estado);
                    break;
                case 'challenge':
                    this.performBotChallenge(estado);
                    break;
                case 'peek':
                    // Bot chose to Peek (Espiar)
                    // If BotBrain didn't specify index, pick random hidden
                    let idx = decision.idx;
                    if (idx === undefined) {
                        const hiddenIndices = estado.mesa.map((p, i) => (p && p.virada) ? i : -1).filter(i => i !== -1);
                        if (hiddenIndices.length > 0) {
                            idx = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
                        }
                    }

                    if (idx !== undefined && estado.mesa[idx]) {
                        const pedra = estado.mesa[idx];
                        this.botBrain.updateMemory(idx, pedra.nome, 1.0);
                        if (window.showToastInterno) window.showToastInterno(`Bot espiou a pedra na posição ${idx + 1}`);
                        if (window.avancarTurno) window.avancarTurno();
                    } else {
                        console.warn("[PvE] Bot peeking invalid stone:", idx);
                        if (window.avancarTurno) window.avancarTurno();
                    }
                    break;
                default:
                    // Fallback
                    console.warn("[PvE] Unknown decision type:", decision.type);
                    if (!this.performBotPlace(estado)) {
                        this.performBotFlip(estado);
                    }
                    break;
            }
        } catch (err) {
            console.error("[PvE CRITICAL] executeBotTurn crashed:", err);
            // Emergency Advance to prevent lock
            if (window.avancarTurno) window.avancarTurno();
        } finally {
            this.botThinking = false;
        }
    }

    performBotPlace(estado) {
        // Encontra primeiro slot válido
        const slotsValidos = GameRules.calcularSlotsValidos(estado.mesa);
        if (slotsValidos.length === 0) return false;

        // Simples: escolhe primeiro slot
        const slotVazio = slotsValidos[0];

        // Encontra primeira pedra na mão
        const pedraIdx = estado.reserva.findIndex(p => p !== null);
        if (pedraIdx === -1) return false;

        const pedra = estado.reserva[pedraIdx];

        // --- AQUI A CORREÇÃO PRINCIPAL ---
        // Usar GameController para modificar estado.
        // GameController.colocarPedra(pedra, slotVazio) apenas bota na mesa.
        // Precisamos tirar da reserva LOCALMENTE e salvar.
        // O GameController não gerencia "Reserva" globalmente de forma atômica no método 'colocarPedra' atual,
        // ele apenas valida Mesa. 
        // Vamos fazer a mutação completa aqui e salvar.

        estado.mesa[slotVazio] = pedra;
        estado.mesa[slotVazio].virada = false;
        estado.reserva[pedraIdx] = null; // Tira da mão

        // Bot observa
        this.botBrain.observe({ tipo: 'colocar', origem: slotVazio, pedra: pedra }, estado);

        // Persist
        GameController.persistirEstado();
        window.avancarTurno();

        return true;
    }

    performBotFlip(estado) {
        // Vira a primeira pedra visível
        // Melhoria: Bot deve virar algo que ele sabe ou que quer esconder
        const visibleIndices = estado.mesa.map((p, i) => (p && !p.virada) ? i : -1).filter(i => i !== -1);

        if (visibleIndices.length > 0) {
            // Escolhe aleatória das visíveis para não ser robótico demais
            const idx = visibleIndices[Math.floor(Math.random() * visibleIndices.length)];

            estado.mesa[idx].virada = true;

            this.botBrain.observe({ tipo: 'virar', origem: idx, pedra: estado.mesa[idx] }, estado);

            GameController.persistirEstado();
            window.avancarTurno();
            return true;
        }
        return false;
    }

    performBotSwap(estado) {
        // Troca duas pedras na mesa
        // Precisa de pelo menos 2 pedras
        const pedrasIndices = estado.mesa.map((p, i) => p ? i : -1).filter(i => i !== -1);
        if (pedrasIndices.length < 2) return false;

        // Escolhe duas aleatorias
        const idxA = pedrasIndices[Math.floor(Math.random() * pedrasIndices.length)];
        let idxB = pedrasIndices[Math.floor(Math.random() * pedrasIndices.length)];
        while (idxA === idxB) {
            idxB = pedrasIndices[Math.floor(Math.random() * pedrasIndices.length)];
        }

        // Animação de troca (Visual apenas) é tratada pelo listener
        // Mas a lógica de dados é:
        const temp = estado.mesa[idxA];
        estado.mesa[idxA] = estado.mesa[idxB];
        estado.mesa[idxB] = temp;

        // Bot observa troca
        this.botBrain.observe({ tipo: 'trocar', origem: idxA, destino: idxB }, estado);

        // Registro de animação para UI
        estado.trocaAnimacao = { from: idxA, to: idxB, timestamp: Date.now() };

        GameController.persistirEstado();
        window.avancarTurno();

        return true;
    }

    resolveChallenge(idxDeduzido) {
        const estado = window.estadoJogo;

        if (!estado.mesa[idxDeduzido]) return;

        showToastInterno("Bot está pensando na resposta...");
        setTimeout(() => {
            try {
                // Passa estado para predictStone
                const palpite = this.botBrain.predictStone(idxDeduzido);
                const correta = estado.mesa[idxDeduzido].nome;

                showToastInterno(`Bot diz: É ${palpite}...`);

                setTimeout(() => {
                    try {
                        estado.mesa[idxDeduzido].virada = false;

                        let vencedor = null;


                        // Normalize players array/object
                        const playersList = Array.isArray(estado.jogadores)
                            ? estado.jogadores
                            : Object.values(estado.jogadores);

                        const bot = playersList.find(j => j.id === 'p2' || j.nome === 'Bot');
                        const player = playersList.find(j => j.id === 'p1' || j.nome !== 'Bot');

                        if (palpite === correta) {
                            showToastInterno("Bot acertou! Ponto para o Bot.");
                            if (window.tocarSomFalha) window.tocarSomFalha();
                            bot.pontos = (bot.pontos || 0) + 1;
                            vencedor = bot;
                            if (window.Renderer && window.Renderer.mostrarMensagem) {
                                window.Renderer.mostrarMensagem("Bot venceu o desafio!");
                            } else {
                                console.log("[PvE] Bot venceu desafio.");
                            }
                        } else {
                            showToastInterno("Bot errou! Ponto para você.");
                            player.pontos = (player.pontos || 0) + 1;
                            vencedor = player;
                        }

                        // Tocar Som
                        if (vencedor && vencedor.id === 'p1') {
                            if (window.tocarSomSucesso) window.tocarSomSucesso();
                        } else {
                            if (window.tocarSomFalha) window.tocarSomFalha();
                        }

                        // Limpa desafio
                        estado.desafio = null;
                        GameController.persistirEstado();
                        // REMOVIDO: avancarTurno() aqui fazia o turno pular o Bot.
                        // O Bot apenas respondeu uma ação do Jogador. Agora é a vez do Bot agir (startBotTurn loop cuidará disso?)
                        // NÃO. Se o Jogador desafiou, gastou o turno dele.
                        // O Bot respondeu. Agora o turno deveria ser do Bot.
                        // Mas 'vez' já estava em 1 (Bot) para ele responder.
                        // Se não avançarmos, 'vez' continua em 1.
                        // O loop `checkTurn` verá vez=1, mas sem desafio pendente.
                        // Então cairá em `executeBotTurn`.
                        // O Bot jogará. Isso é o correto: Jogador desafiou -> Bot responde -> Bot joga.
                        // wait, if Bot answers correct -> Bot gains point.
                        // Bot plays immediately?
                        // Yes, the Challenge is the Player's Action.
                        // So Bot Turn logic is correct.

                    } catch (innerE) {
                        console.error("[PvE ERROR] resolveChallenge Inner:", innerE);
                        // FORCE CLEANUP TO PREVENT LOOP
                        if (estado) {
                            estado.desafio = null;
                            GameController.persistirEstado();
                        }
                    }
                }, 1500);
            } catch (e) {
                console.error("[PvE ERROR] resolveChallenge Outer:", e);
            }
        }, 1500);
    }

    respondToPlayerBoast(estado) {
        // Simple logic: If Bot knows many stones, it might Doubt. For now, 50/50 or always Doubt to be aggressive.
        // Better: Check confidence sum.
        const confidenceSum = this.botBrain.memory.reduce((acc, m) => acc + (m ? m.confidence : 0), 0);
        const knownCount = this.botBrain.memory.filter(m => m && m.confidence > 0.8).length;

        // Se eu conheço poucas, assume que o Jogador conhece (Acredita).
        // Se eu conheço MUITAS, talvez o Jogador esteja blefando ou eu posso ganhar depois ?
        // Regra heurística:
        // Se Bot conhece < 3 pedras, Acredita (medo de perder ponto de imediato).
        // Se Bot conhece >= 3 pedras, Duvida (tenta ganhar ponto).

        const decision = (knownCount >= 3 || Math.random() > 0.6) ? "duvidar" : "acreditar";

        console.log(`[PvE] Bot response to Boast: ${decision} (Known: ${knownCount})`);

        if (decision === "duvidar") {
            showToastInterno("Bot diz: Eu duvido!");
            if (window.GameController) window.GameController.responderSegabar("duvidar");
        } else {
            showToastInterno("Bot diz: Ok, acredito.");
            if (window.GameController) window.GameController.responderSegabar("acreditar");
        }
    }

    performBotBoast(estado) {
        estado.desafio = {
            tipo: "segabar",
            jogador: "Bot",
            resolvido: false,
            status: "aguardando_resposta"
        };
        GameController.persistirEstado();
        GameController.notificarAtualizacao();
        showToastInterno("Bot está se Gabando!");
        tocarSomDesafio();
    }

    performBotChallenge(estado) {
        const hiddenIndices = estado.mesa.map((p, i) => (p && p.virada) ? i : -1).filter(i => i !== -1);
        if (hiddenIndices.length === 0) return this.performBotFlip(estado);

        const idx = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];

        estado.desafio = {
            tipo: "desafio", // Standard type
            jogador: "Bot",
            alvo: idx,
            pedra: idx, // Legacy support
            idxPedra: idx, // Redundancy
            resolvido: false,
            status: "aguardando_resposta"
        };

        GameController.persistirEstado();
        showToastInterno(`Bot desafiou pedra ${idx + 1}! O que é?`);
        tocarSomDesafio();

        // Pass control to Player to answer
        if (window.avancarTurno) window.avancarTurno();
    }
}
