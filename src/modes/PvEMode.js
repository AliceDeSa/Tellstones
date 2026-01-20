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

        // Match Logger (User Request for Tutorial-like logs)
        this.matchLog = [];
        this.turnCounter = 1;
    }

    logAction(actor, actionType, details) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = `[Turn ${this.turnCounter}] [${timestamp}] **${actor}** ${actionType}: ${details}`;
        this.matchLog.push(entry);
        console.log(`%c${entry}`, 'color: #bada55; font-weight: bold;');

        // Verify Bot State logging
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

        // Globals setup
        window.isLocalMode = true;
        window.salaAtual = this.roomCode;
        window.nomeAtual = this.playerName;
        window.souCriador = true; // FIX: Essential for coin toss logic

        // Reset Local State
        if (window.clearLocalData) {
            window.clearLocalData("salas/" + this.roomCode);
        }
        // Force clear coin toss specifically
        const refCoin = getDBRef("salas/" + this.roomCode + "/caraCoroa");
        if (refCoin) refCoin.set(null);

        // Reset Bot Brain Memory explicitly
        if (this.botBrain) this.botBrain = null;

        // Check if Profile exists in DB (Persistence)
        const refProfile = getDBRef("salas/" + this.roomCode + "/botProfile");

        // This is async in Firebase, but we need it now. 
        // Sync approach for "Local Mode" relies on localData if available, 
        // but typically we can just set it if we are the host (which we are).
        // Issue: If we reload, we want to fetch it. Be we can't await here easily in current architecture.
        // Workaround: We generate a random one, but if snapshot exists later, we override?
        // Better: Check window.localData immediately if available.

        let savedProfile = null;
        if (window.localData && window.localData.salas && window.localData.salas[this.roomCode] && window.localData.salas[this.roomCode].botProfile) {
            savedProfile = window.localData.salas[this.roomCode].botProfile;
        }

        const profiles = ['logical', 'trickster', 'aggressive'];

        // Priority 1: Developer Override (LocalStorage)
        const devProfile = localStorage.getItem('tellstones_dev_bot_profile');
        if (devProfile && devProfile !== 'random' && profiles.includes(devProfile)) {
            console.log(`[PvE] Dev Override Bot Personality: ${devProfile}`);
            this.botBrain = new BotBrain(devProfile);
            // Don't save to DB yet, keep it local override? 
            // Better to save it so state is consistent if we reload and lose localstorage?
            // Actually, if it's dev override, we want it to stick.
        }
        // Priority 2: Saved Game State (Resume)
        else if (savedProfile && profiles.includes(savedProfile)) {
            console.log(`[PvE] Restored Bot Personality: ${savedProfile}`);
            this.botBrain = new BotBrain(savedProfile);
        }
        // Priority 3: Random New
        else {
            const selectedProfile = profiles[Math.floor(Math.random() * profiles.length)];
            console.log(`[PvE] New Bot Personality: ${selectedProfile}`);
            this.botBrain = new BotBrain(selectedProfile);
        }

        // Save to DB (Sync)
        if (refProfile) refProfile.set(this.botBrain.profile.name.toLowerCase() === 'lógico' ? 'logical' : (this.botBrain.profile.name.toLowerCase() === 'trapaceiro' ? 'trickster' : (this.botBrain.profile.name.toLowerCase() === 'agressivo' ? 'aggressive' : 'logical')));
        // Simplified: map back or just dont worry, verify later.
        // Actually, BotBrain.profile has name "Lógico". We need "logical".
        // Let's just fix the DB set to be clean
        const nameMap = { 'Lógico': 'logical', 'Trapaceiro': 'trickster', 'Agressivo': 'aggressive' };
        if (refProfile) refProfile.set(nameMap[this.botBrain.profile.name] || 'logical');

        if (window.showToastInterno) window.showToastInterno(`Bot: ${this.botBrain.profile.name}`);

        // Configuração de Estado Inicial
        const jogadores = [
            { nome: window.nomeAtual, id: "p1", pontos: 0 },
            { nome: "Bot", id: "p2", pontos: 0 }
        ];

        // Cria e Salva estado inicial via LocalDB
        // Note: inicializarJogo saves to 'estadoJogo', avoiding overwritten profile if separate
        const estadoInicial = GameController.inicializarJogo(jogadores);

        // Inicia Listeners
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
                    // Guard against duplicate listeners
                    if (typeof ouvirCaraCoroa === "function" && !this.coinListenerAttached) {
                        ouvirCaraCoroa();
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
                            tipo: 'trocar',
                            origem: troca.from,
                            destino: troca.to
                        }, null); // State is null here to avoid accidental scan inside observe (deprecated)

                        this.logAction(troca.jogador === 'Bot' ? 'Bot' : this.playerName, "SWAPPED", `Slot ${troca.from} <-> Slot ${troca.to}`);
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
            if (this.lastVez !== undefined && this.lastVez !== estado.vez) {
                // Turn changed. Apply Decay.
                // But only if we have been playing (not first load)
                if (this.botBrain) {
                    console.log("[BOT OBSERVE] Turn End / New Turn. Decaying Memory.");
                    this.botBrain.observe({ tipo: 'turn_end' }, estado);
                }

                // Log Turn Change
                const currentPlayer = estado.vez === 0 ? this.playerName : "Bot";
                this.turnCounter++;
                this.logAction("System", "Turn Start", `Now it is ${currentPlayer}'s turn.`);
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
                        this.logAction(estado.vez === 0 ? this.playerName : "Bot", "PLACED", `Stone ${p.nome} at Slot ${i}`);
                    }
                    // Flip
                    if (p && oldP && p.virada !== oldP.virada) {
                        const actionName = p.virada ? "HID" : "REVEALED"; // virada=true means Hidden (Face Down)
                        this.botBrain.observe({ tipo: 'virar', origem: i, pedra: p }, estado);
                        this.logAction(estado.vez === 0 ? this.playerName : "Bot", actionName, `Stone at Slot ${i}`);
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
            // Se tem desafio pendente (Jogador se gabou), Bot precisa responder
            if (estado.desafio && estado.desafio.tipo === "segabar" && estado.desafio.jogador !== "Bot" && !estado.desafio.resolvido && estado.desafio.status === "aguardando_resposta") {
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

            // --- BOT PROVING BOAST (Bot Boasted -> Player Doubted -> Bot must Reveal) ---
            if (estado.desafio && estado.desafio.tipo === "segabar" && estado.desafio.jogador === "Bot" && estado.desafio.status === "responder_pecas") {
                if (!this.botThinking) {
                    this.botThinking = true;
                    setTimeout(() => {
                        this.proveBotBoast(estado);
                    }, 1500);
                }
                return;
            }

            // --- DETECT RESOLVED BOT CHALLENGE ---
            // Jogador respondeu ao desafio do Bot.
            if (estado.desafio && estado.desafio.jogador === "Bot" && estado.desafio.status === "resolvido") {
                this.resolveBotChallengeResult(estado);
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

        // Added !estado.trocaAnimacao to block Bot if an animation is pending but not yet started by listener

        // --- PRIORITY: Responding to Simple Challenge ---
        // Even if it's NOT Bot's turn (Player Challenged -> vez=0), Bot must respond.
        const isChallenge = estado.desafio
            && (estado.desafio.tipo === "desafio" || estado.desafio.tipo === "desafio_simples" || !estado.desafio.tipo)
            && estado.desafio.tipo !== "segabar"; // Explicit exclude boast

        if (isChallenge && !estado.desafio.resolvido && estado.desafio.jogador !== "Bot" && !this.botThinking) {
            this.botThinking = true;
            setTimeout(() => {
                if (!estado.desafio) {
                    console.warn("[PvE] Challenge disappeared before Bot could resolve.");
                    this.botThinking = false;
                    return;
                }
                const idx = (estado.desafio.alvo !== undefined) ? estado.desafio.alvo :
                    (estado.desafio.pedra !== undefined) ? estado.desafio.pedra :
                        (estado.desafio.idxPedra !== undefined) ? estado.desafio.idxPedra : 0;

                console.log(`[PvE] Bot resolving challenge at index ${idx}`);
                this.resolveChallenge(idx);
            }, 2000);
            return;
        }

        // --- NORMAL TURN LOGIC ---
        if (estado.vez === 1 && !this.botThinking && !window.selecionandoDesafio && !window.resolvendoDesafio && !window.animacaoTrocaEmAndamento && !estado.trocaAnimacao) {
            console.log("[PvE DEBUG] Bot Turn Logic Triggered. Calling executeBotTurn...");

            console.log("[PvE DEBUG] Bot Turn Logic Triggered. Calling executeBotTurn...");

            // (Challenge Check removed from here, moved up)

            // Verifica se há um SE GABAR pendente (Jogador se gabou, Bot precisa responder)
            if (estado.desafio && estado.desafio.tipo === "segabar" && estado.desafio.status === "aguardando_resposta" && estado.desafio.jogador !== "Bot") {
                this.botThinking = true;
                console.log("[PvE] Bot precisa responder ao Se Gabar do Jogador.");
                if (window.Renderer && window.Renderer.mostrarFalaBot) window.Renderer.mostrarFalaBot("Hm... deixe-me pensar.");

                setTimeout(() => {
                    this.respondToPlayerBoast(estado);
                    this.botThinking = false;
                }, 2500);
                return;
            }

            this.botThinking = true;
            // showToastInterno("Bot está pensando..."); REMOVED BY USER REQUEST

            // Delay aumentado para ser mais perceptível (Thinking Time)
            setTimeout(() => {
                try {
                    // Safety check again before executing
                    if (estado.vez !== 1) return;

                    this.executeBotTurn();
                } catch (e) {
                    console.error("[PvE ERROR] Bot Crashed:", e);
                    this.botThinking = false;
                }
                // DO NOT reset botThinking here unconditionally if using async actions!
                // Logic moved inside executeBotTurn
            }, 5000 + Math.random() * 2000);
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
                    const startedAsync = this.performBotPlace(estado, decision);
                    if (startedAsync) {
                        this.asyncActionInProgress = true;
                        return; // Exit without clearing botThinking
                    }
                    break;
                case 'flip':
                    this.performBotFlip(estado, decision);
                    break;
                case 'swap':
                    if (!this.performBotSwap(estado, decision)) {
                        this.performBotFlip(estado, decision);
                    }
                    break;
                case 'boast':
                    this.performBotBoast(estado);
                    break;
                case 'challenge':
                    this.performBotChallenge(estado, decision);
                    break;
                case 'peek':
                    // Bot chose to Peek (Espiar) - Updated Logic for Visualization
                    let idx = decision.target;

                    // Fallback to random if no target
                    if (idx === undefined || idx === -1) {
                        const hiddenIndices = estado.mesa.map((p, i) => (p && p.virada) ? i : -1).filter(i => i !== -1);
                        if (hiddenIndices.length > 0) {
                            idx = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
                        }
                    }

                    if (idx !== undefined && idx !== -1 && estado.mesa[idx]) {
                        const pedra = estado.mesa[idx];
                        this.botBrain.updateMemory(idx, pedra.nome, 1.0);

                        // NOTIFICATION: Use Bubble
                        if (window.Renderer && window.Renderer.mostrarFalaBot) {
                            window.Renderer.mostrarFalaBot("Hm... deixe-me ver.");
                        } else {
                            showToastInterno(`Bot espiou a pedra na posição ${idx + 1}`);
                        }

                        // VISUALIZATION: Golden Glow
                        if (window.adicionarSilhuetaEspiada) {
                            window.adicionarSilhuetaEspiada(idx);
                        }

                        // Delay using ASYNC logic
                        this.asyncActionInProgress = true;
                        setTimeout(() => {
                            window.avancarTurno();
                            this.botThinking = false;
                            this.asyncActionInProgress = false;
                        }, 1500);
                        return; // RETURN EARLY

                    } else {
                        console.warn("[PvE] Bot peeking invalid stone:", idx);
                        if (window.avancarTurno) window.avancarTurno();
                    }
                    break;
                default:
                    // Fallback
                    console.warn("[PvE] Unknown decision type:", decision.type);
                    if (!this.performBotPlace(estado)) {
                        this.performBotFlip(estado, decision); // Pass decision even if fallback
                    }
                    break;
            }
        } catch (err) {
            console.error("[PvE CRITICAL] executeBotTurn crashed:", err);
            // Emergency Advance to prevent lock
            if (window.avancarTurno) window.avancarTurno();
        } finally {
            if (!this.asyncActionInProgress) {
                this.botThinking = false;
            }
        }
    }

    performBotPlace(estado, decision) {
        // Encontra primeiro slot válido
        const slotsValidos = GameRules.calcularSlotsValidos(estado.mesa);
        if (slotsValidos.length === 0) return false;

        let slotVazio = -1;

        // Try decision target
        if (decision && decision.target !== undefined && decision.target !== -1) {
            const t = decision.target;
            // Validate if truly empty and valid
            if (slotsValidos.includes(t)) {
                slotVazio = t;
            }
        }

        // Fallback: Random or First
        if (slotVazio === -1) {
            slotVazio = slotsValidos[Math.floor(Math.random() * slotsValidos.length)];
        }

        // Encontra primeira pedra na mão
        const pedraIdx = estado.reserva.findIndex(p => p !== null);
        if (pedraIdx === -1) return false;

        const pedra = estado.reserva[pedraIdx];

        // --- ANIMATED PLACEMENT ---
        // We defer the state update until AFTER animation

        // Remove from reserve visually immediately? No, animate from reserve.
        // Logic:
        // 1. Trigger Animation
        // 2. In Callback, Update State + Advance Turn

        if (window.Renderer && window.Renderer.animarBotColocar) {
            window.Renderer.animarBotColocar(pedra, -1, slotVazio, () => {
                // Callback: Commit State
                estado.mesa[slotVazio] = pedra;
                estado.mesa[slotVazio].virada = false;
                estado.reserva[pedraIdx] = null; // Tira da mão

                this.botBrain.observe({ tipo: 'colocar', origem: slotVazio, pedra: pedra }, estado);
                GameController.persistirEstado();
                window.avancarTurno();

                // Clear flags
                this.botThinking = false;
                this.asyncActionInProgress = false;
            });
            return true; // Started async flow
        } else {
            // Fallback: Instant
            estado.mesa[slotVazio] = pedra;
            estado.mesa[slotVazio].virada = false;
            estado.reserva[pedraIdx] = null; // Tira da mão

            this.botBrain.observe({ tipo: 'colocar', origem: slotVazio, pedra: pedra }, estado);
            GameController.persistirEstado();
            window.avancarTurno();
            return true;
        }
    }

    performBotFlip(estado, decision) {
        // Vira a primeira pedra visível
        // Melhoria: Bot deve virar algo que ele sabe ou que quer esconder

        let idx = -1;

        // Try to take from Decision
        if (decision && decision.target !== undefined && decision.target !== -1) {
            const t = decision.target;
            if (estado.mesa[t] && !estado.mesa[t].virada) {
                idx = t;
            }
        }

        // Fallback: Random visible
        if (idx === -1) {
            const visibleIndices = estado.mesa.map((p, i) => (p && !p.virada) ? i : -1).filter(i => i !== -1);
            if (visibleIndices.length > 0) {
                idx = visibleIndices[Math.floor(Math.random() * visibleIndices.length)];
            }
        }

        if (idx !== -1) {
            estado.mesa[idx].virada = true;

            this.botBrain.observe({ tipo: 'virar', origem: idx, pedra: estado.mesa[idx] }, estado);

            GameController.persistirEstado();
            window.avancarTurno();
            return true;
        }
        return false;
    }

    performBotSwap(estado, decision) {
        // Troca duas pedras na mesa
        // Precisa de pelo menos 2 pedras
        const pedrasIndices = estado.mesa.map((p, i) => p ? i : -1).filter(i => i !== -1);
        if (pedrasIndices.length < 2) return false;

        let idxA = -1;
        let idxB = -1;

        // Try decision targets
        if (decision && decision.targets && decision.targets.from !== undefined && decision.targets.to !== undefined) {
            idxA = decision.targets.from;
            idxB = decision.targets.to;
        }

        // Validate or Fallback
        if (idxA === -1 || idxB === -1 || idxA === idxB || !estado.mesa[idxA] || !estado.mesa[idxB]) {
            // Escolhe duas aleatorias
            idxA = pedrasIndices[Math.floor(Math.random() * pedrasIndices.length)];
            idxB = pedrasIndices[Math.floor(Math.random() * pedrasIndices.length)];
            while (idxA === idxB) {
                idxB = pedrasIndices[Math.floor(Math.random() * pedrasIndices.length)];
            }
        }

        // Animação de troca (Visual apenas) é tratada pelo listener
        // OBS: Não precisamos trocar manualmente aqui, pois o listener ('script.js')
        // vai detectar 'trocaAnimacao', executar a animação e DEPOIS trocar os dados e passar o turno.
        // Se trocarmos aqui, o listener vai trocar de novo (revertendo) e causar bugs.

        // Bot observa troca (Intenção)
        this.botBrain.observe({ tipo: 'trocar', origem: idxA, destino: idxB }, estado);

        // Registro de animação para UI e Listener
        // IMPORTANTE: Adicionar 'jogador: Bot' para que o monitorarTrocas saiba quem fez.
        console.log(`[PvE] Bot Swapping Animation Triggered: ${idxA} <-> ${idxB}`);
        estado.trocaAnimacao = { from: idxA, to: idxB, timestamp: Date.now(), jogador: 'Bot' };

        // Save State - This triggers the listener in script.js
        GameController.persistirEstado();

        // DO NOT CALL avancarTurno() HERE. The listener handles it after animation.

        return true;
    }

    resolveChallenge(idxDeduzido) {
        const estado = window.estadoJogo;
        if (!estado || !estado.desafio) return;

        // CASE 1: Bot Challenged -> Player is Answering
        // idxDeduzido came from Renderer click (Option Index 0-6)
        if (estado.desafio.jogador === 'Bot') {
            const options = window.PEDRAS_OFICIAIS || [
                { nome: "Coroa" }, { nome: "Espada" }, { nome: "Balança" },
                { nome: "Cavalo" }, { nome: "Escudo" }, { nome: "Bandeira" }, { nome: "Martelo" }
            ];

            // Map Index -> Name
            if (options[idxDeduzido]) {
                const playerAnswer = options[idxDeduzido].nome;
                console.log(`[PvE] Player answered: ${playerAnswer} (Option ${idxDeduzido})`);

                estado.desafio.resposta = playerAnswer;
                estado.desafio.status = 'resolvido'; // This triggers resolveBotChallengeResult loop
                GameController.persistirEstado();
            }
            return;
        }

        // CASE 2: Player Challenged -> Bot is Guessing
        // idxDeduzido is the Target Slot (Table Index 0-6)
        if (!estado.mesa[idxDeduzido]) return;

        // showToastInterno("Bot está pensando na resposta...");
        if (window.Renderer && window.Renderer.mostrarFalaBot) window.Renderer.mostrarFalaBot("Um momento...");

        setTimeout(() => {
            try {
                // Passa estado para predictStone
                const palpite = this.botBrain.predictStone(idxDeduzido);
                const correta = estado.mesa[idxDeduzido].nome;

                // showToastInterno(`Bot diz: É ${palpite}...`);
                if (window.Renderer && window.Renderer.mostrarFalaBot) {
                    window.Renderer.mostrarFalaBot(`Eu acho que é... ${palpite}!`);
                }

                setTimeout(() => {
                    try {
                        estado.mesa[idxDeduzido].virada = false;
                        // FIX: Persist Reveal Immediately so player sees it
                        GameController.persistirEstado();

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

                            const chat = this.botBrain.getChatter('winning');
                            if (chat) setTimeout(() => showToastInterno(`Bot: "${chat}"`), 2000);
                            if (window.Renderer && window.Renderer.mostrarMensagem) {
                                window.Renderer.mostrarMensagem("Bot venceu o desafio!");
                            } else {
                                console.log("[PvE] Bot venceu desafio.");
                            }
                        } else {
                            showToastInterno("Bot errou! Ponto para você.");
                            player.pontos = (player.pontos || 0) + 1;
                            vencedor = player;

                            const chat = this.botBrain.getChatter('losing');
                            if (chat) setTimeout(() => showToastInterno(`Bot: "${chat}"`), 2000);
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
                        // ADVANCE TURN: Challenge Resolution is an interaction. Play must continue.
                        if (window.avancarTurno) window.avancarTurno();

                    } catch (innerE) {
                        console.error("[PvE ERROR] resolveChallenge Inner:", innerE);
                        // FORCE CLEANUP TO PREVENT LOOP
                        estado.desafio = null;
                        GameController.persistirEstado();
                    } finally {
                        this.botThinking = false; // FIX: Reset lock after async logic is done
                    }
                }, 1500);
            } catch (e) {
                console.error("[PvE ERROR] resolveChallenge Outer:", e);
                this.botThinking = false; // Safety unlock if outer fails
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
            // showToastInterno("Bot diz: Eu duvido!");
            if (window.Renderer && window.Renderer.mostrarFalaBot) window.Renderer.mostrarFalaBot("Não acredito. Duvido!");
            if (window.GameController) window.GameController.responderSegabar("duvidar");
        } else {
            // showToastInterno("Bot diz: Ok, acredito.");
            if (window.Renderer && window.Renderer.mostrarFalaBot) window.Renderer.mostrarFalaBot("Tudo bem, acredito.");
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
        GameController.notificarAtualizacao();

        // Chatter
        const msg = this.botBrain.getChatter('boast_start');
        if (msg) showToastInterno(`Bot: ${msg}`);
        else showToastInterno("Bot está se Gabando!");

        tocarSomDesafio();
    }

    proveBotBoast(estado) {
        // Bot must correctly identify all hidden stones.
        // It iterates through them and calls verify.

        try {
            const hiddenIndices = estado.mesa.map((p, i) => (p && p.virada) ? i : -1).filter(i => i !== -1);

            // Should match what GameController expects. 
            // In 'responder_pecas', GameController waits for 'verificarRespostaSegabar'.
            // Bot will invoke it for EACH hidden stone.

            // Loop with delay to simulate dramatic reveal? 
            // Better: One by one via recursivity or async loop.

            // Pre-calculate answers
            const answers = hiddenIndices.map(idx => {
                // Bot uses its Memory/Prediction
                const prediction = this.botBrain.predictStone(idx);
                console.log(`[PvE] Bot predicting Slot ${idx} as ${prediction}`);
                return { idx, name: prediction };
            });

            // Execute Sequentially
            let i = 0;
            const revealNext = () => {
                if (i >= answers.length) {
                    this.botThinking = false;
                    return; // Done, GameController will handle 'finalizar' when count reached
                }

                const ans = answers[i];
                showToastInterno(`Bot aposta que ${ans.idx} é ${ans.name}...`);

                // Using GameController method directly? 
                if (window.GameController && window.GameController.verificarRespostaSegabar) {
                    window.GameController.verificarRespostaSegabar(ans.idx, ans.name);
                }

                i++;
                if (i < answers.length) setTimeout(revealNext, 1500);
                else {
                    // Final Clean up after last reveal
                    setTimeout(() => { this.botThinking = false; }, 1000);
                }
            };

            revealNext();

        } catch (e) {
            console.error("[PvE] proveBotBoast failed:", e);
            this.botThinking = false;
            // Abort
            estado.desafio = null;
            GameController.persistirEstado();
        }
    }

    resolveBotChallengeResult(estadoSnapshot) {
        if (this.botThinking) return;
        this.botThinking = true;

        const estado = window.estadoJogo; // CRITICAL FIX: Use global state for persistence

        const desafio = estado.desafio;
        const targetIdx = desafio.alvo; // Index of stone on table
        const answer = desafio.resposta; // Name string from Player

        if (!estado.mesa[targetIdx]) {
            // Error state or stone removed?
            estado.desafio = null;
            this.botThinking = false;
            GameController.persistirEstado();
            return;
        }

        const realStone = estado.mesa[targetIdx];
        const correct = (realStone.nome === answer);

        // REVEAL STONE IMMEDIATELY
        estado.mesa[targetIdx].virada = false;

        // PERSIST REVEAL (So player sees it immediately)
        GameController.persistirEstado();

        // Notify
        showToastInterno(`Pedra Revelada: ${realStone.nome}`);

        setTimeout(() => {
            // Score Logic
            let winner = null;
            // Normalize players array/object
            const playersList = Array.isArray(estado.jogadores)
                ? estado.jogadores
                : Object.values(estado.jogadores);

            const bot = playersList.find(j => j.id === 'p2' || j.nome === 'Bot');
            const player = playersList.find(j => j.id === 'p1' || j.nome !== 'Bot');


            if (correct) {
                showToastInterno("Você acertou! Ponto para você.");
                if (window.tocarSomSucesso) window.tocarSomSucesso();
                player.pontos = (player.pontos || 0) + 1;
                winner = player;

                const chat = this.botBrain.getChatter('losing');
                if (chat) setTimeout(() => showToastInterno(`Bot: "${chat}"`), 1500);

            } else {
                showToastInterno(`Você errou! Era ${realStone.nome}. Ponto para o Bot.`);
                if (window.tocarSomFalha) window.tocarSomFalha();
                bot.pontos = (bot.pontos || 0) + 1;
                winner = bot;

                const chat = this.botBrain.getChatter('winning');
                if (chat) setTimeout(() => showToastInterno(`Bot: "${chat}"`), 1500);
            }

            // Clear Challenge
            estado.desafio = null;
            this.botThinking = false;

            // Persist
            GameController.persistirEstado();

            // Important: Check Win Condition is implicit in persist/render loop in script.js
            // BUT we might want to advance turn?
            // If Player Answered, it was Bot's turn to Challenge.
            // Now that it's resolved, it should be Player's Turn?
            // "Desafiar" consumes turn. Correct.
            // So we should call avancarTurno() to switch back to Player (vez 0).
            // However, 'vez' might already be 0 if Bot logic didn't shift it yet?
            // Bot turn sets vez=1. When finished, it calls avancarTurno -> vez=0.
            // BUT Challenge logic is async. Bot set Challenge state.
            // Wait. When Bot performed 'Challenge', did it pass turn?
            // Usually Challenge is an Action. Action -> Next Turn.
            // If Next Turn is Player, Player receives "Responder" state.
            // Player Responds -> Saves State.
            // Now Game detects "Resolved".
            // We process points. And then... whose turn is it?
            // Standard tellstones: Challenge ends the turn exchange for that interaction.
            // If Challenger Wins -> Challenger goes again? No.
            // Usually play continues unless game over.
            // Let's assume standard rotation.
            // Since Bot Challenged (Turn Bot), next is Player.
            // So if we are processing this, we ensure 'vez' ends up at Player (0).

            if (estado.vez === 1) { // If still Bot
                window.avancarTurno();
            }

        }, 2000);
    }

    performBotChallenge(estado, decision) {
        const hiddenIndices = estado.mesa.map((p, i) => (p && p.virada) ? i : -1).filter(i => i !== -1);
        if (hiddenIndices.length === 0) return this.performBotFlip(estado, decision);

        let idx = -1;
        if (decision && decision.target !== undefined && decision.target !== -1) {
            idx = decision.target;
        }

        // Validate if still hidden
        if (idx !== -1 && (!estado.mesa[idx] || !estado.mesa[idx].virada)) {
            idx = -1; // Invalid target (maybe revealed meanwhile?)
        }

        if (idx === -1) {
            idx = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
        }

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
        GameController.persistirEstado();

        // Chatter
        const msg = this.botBrain.getChatter('challenge_start');
        if (msg) showToastInterno(`Bot: ${msg}`);
        else showToastInterno(`Bot desafiou pedra ${idx + 1}! O que é?`);

        tocarSomDesafio();

        // FORCE RENDER for visual highlight
        if (window.Renderer && window.Renderer.renderizarMesa) {
            window.Renderer.renderizarMesa();
        }

        // Pass control to Player to answer
        if (window.avancarTurno) window.avancarTurno();
    }
}
