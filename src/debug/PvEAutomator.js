/**
 * PvEAutomator.js
 * Automates Player moves in PvE mode to stress-test the Bot and Game Logic.
 * 
 * Usage:
 * PvEAutomator.run(); - Starts automation
 * PvEAutomator.stop(); - Stops automation
 */

window.PvEAutomator = {
    isRunning: false,
    intervalId: null,
    actionDelay: 2500, // Time between actions

    setPersonality: function (name) {
        if (window.currentGameMode && window.currentGameMode.setBotProfile) {
            window.currentGameMode.setBotProfile(name);
            console.log(`[PvEAutomator] Bot set to: ${name}`);
        } else {
            console.warn("[PvEAutomator] Cannot set personality (GameMode not ready?)");
        }
    },

    dumpLog: function () {
        if (window.currentGameMode && window.currentGameMode.getMatchLog) {
            console.log("\n====== MATCH LOG ======");
            console.log(window.currentGameMode.getMatchLog());
            console.log("=======================\n");
        }
    },

    run: function () {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("[PvEAutomator] Starting... waiting for game state.");

        // Auto-navigate to PvE if on Start Screen
        const startScreen = document.getElementById("start-screen");
        if (startScreen && startScreen.classList.contains("active")) {
            console.log("[PvEAutomator] On Start Screen. Clicking PvE Button...");
            const pveBtn = document.getElementById("bot-pve-btn");
            if (pveBtn) {
                pveBtn.click();
            } else {
                console.error("[PvEAutomator] PvE Button not found!");
                this.stop();
                return;
            }
        } else if (window.GameController && window.GameController.mode !== 'pve') {
            console.warn("[PvEAutomator] Not in PvE Mode and not on Start Screen.");
            // Optional: Try to exit current match?
        }

        this.intervalId = setInterval(() => this.loop(), 1000);
    },

    stop: function () {
        this.isRunning = false;
        clearInterval(this.intervalId);
        this.isRunning = false;
        clearInterval(this.intervalId);
        console.log("[PvEAutomator] Stopped.");
        this.dumpLog(); // Auto dump on stop
    },

    loop: function () {
        // Safe check for pause/stop
        if (!this.isRunning) return;

        // Check Coin Toss Overlay
        const coinOverlay = document.getElementById("escolha-cara-coroa");
        if (coinOverlay && coinOverlay.style.display !== "none") {
            const btn = Math.random() > 0.5 ? document.getElementById("btn-cara") : document.getElementById("btn-coroa");
            if (btn) {
                console.log("[PvEAutomator] Choosing Coin Toss:", btn.id);
                btn.click();
            }
            return;
        }

        // Check Coin Button (Start Toss)
        const coinBtn = document.getElementById("moeda-btn");
        if (coinBtn && coinBtn.style.display !== "none") {
            console.log("[PvEAutomator] Clicking Coin to Start Toss...");
            coinBtn.click();
            return;
        }

        const estado = window.estadoJogo;
        if (!estado) return;

        // Check if Game Over (Score reached)
        // Ensure players exist before checking points
        const p1 = (estado.jogadores || []).find(j => j.id === 'p1');
        const bot = (estado.jogadores || []).find(j => j.id === 'p2' || j.nome === 'Bot');

        if (p1 && p1.pontos >= 3) {
            console.log("[PvEAutomator] Player Won! Resetting...");
            this.stop();
            return;
        }
        if (bot && bot.pontos >= 3) {
            console.log("[PvEAutomator] Bot Won! Resetting...");
            this.stop();
            return;
        }

        // Logic primarily triggers when it is Player's Turn (vez === 0)
        // OR when there is a Challenge pending for Player (desafio.jogador === 'Bot')
        const isPlayerTurn = estado.vez === 0;
        const pendingChallenge = estado.desafio && estado.desafio.status === 'aguardando_resposta' && estado.desafio.jogador === 'Bot';
        const isThinking = window.botThinking; // Don't interrupt Bot

        if (isThinking) return;


        // Challenge Response (Priority)
        if (pendingChallenge) {
            this.handleChallengeResponse(estado);
            return;
        }

        // 1. Handling "Select Stone to Challenge" (Player clicked Desafiar)
        if (window.selecionandoDesafio) {
            console.log("[PvEAutomator] Selecting stone to challenge...");
            const hiddenStones = Array.from(document.querySelectorAll('.pedra-mesa')).filter(el => {
                // Check if it's hidden (Renderer sets img src or we check state)
                // Renderer now has onclick logic that checks state.
                // Ideally we check DOM or State. 
                // Let's use State to match index, then finding element.
                const idx = parseInt(el.getAttribute('data-idx'));
                return estado.mesa[idx] && estado.mesa[idx].virada;
            });

            if (hiddenStones.length > 0) {
                const target = hiddenStones[Math.floor(Math.random() * hiddenStones.length)];
                target.click(); // Triggers Renderer onclick
            } else {
                console.warn("[PvEAutomator] No hidden stones to challenge? Cancelling.");
                window.selecionandoDesafio = false;
            }
            return;
        }

        // 2. Handling "Guess Name" (After selecting stone)
        const challengeOptions = document.getElementById("opcoes-desafio");
        if (challengeOptions && challengeOptions.style.display !== 'none') {
            console.log("[PvEAutomator] Guessing stone name...");
            const options = challengeOptions.querySelectorAll('button');
            if (options.length > 0) {
                const choice = options[Math.floor(Math.random() * options.length)];
                choice.click(); // Triggers Renderer option logic
            }
            return;
        }

        // Normal Turn
        if (isPlayerTurn && !estado.desafio) {
            // Anti-spam check: wait a bit
            // Implemented via simple random chance per tick or timeout tracking
            if (Math.random() < 0.3) {
                this.performRandomAction(estado);
            }
        }
    },

    handleChallengeResponse: function (estado) {
        console.log("[PvEAutomator] Responding to Bot Challenge...");
        const desafio = estado.desafio;

        if (desafio.tipo === 'segabar') {
            // Randomly Believe or Doubt
            const action = Math.random() > 0.5 ? 'acreditar' : 'duvidar';
            console.log(`[PvEAutomator] Responded Boast: ${action}`);
            if (window.GameController) window.GameController.responderSegabar(action);
        } else if (desafio.tipo === 'desafio' || desafio.tipo === 'desafio_simples') {
            // Pick a stone to Reveal (Challenge Logic usually requires showing a stone?)
            // Wait, if Bot challenged Player to name a stone... UI shows options.
            // Renderer shows buttons. We can simulate clicking a button.

            // If Bot challenged US, we usually just see result?
            // "Desafio Simples": Player challenges Bot.
            // "Se Gabar": Player claims they know all.

            // If Bot Challenges Player (rare/not implemented fully? Bot usually just predicts).
            // Actually, currently Bot only predicts (Challenge) or Boasts.
            // If Bot challenges (points), it picks a stone and asks Player "What is this?" 
            // OR checks if Player was wrong?

            // In current code, `performBotChallenge` -> RESOLVES instantly?
            // No, `resolveChallenge` is called.

            // If Bot Boast, Player must choose Believe/Doubt. Handled above.
        }
    },

    performRandomAction: function (estado) {
        // Available Actions:
        // 1. Place Stone (Colocar) - If valid
        // 2. Hide Stone (Virar) - If valid
        // 3. Swap Stones (Trocar) - If valid (2 hidden?)
        // 4. Challenge (Desafiar) - If valid (at least 1 hidden)
        // 5. Boast (Se Gabar) - If valid (all hidden/placed?)

        const actions = [];

        // Use DOM to find available reserve stones
        const handStones = document.querySelectorAll('.pedra-reserva:not(.usada)');
        const hasHandStones = handStones.length > 0;

        const validSlots = [];
        estado.mesa.forEach((p, i) => {
            if (p === null) validSlots.push({ type: 'empty', index: i });
            else if (p.virada) validSlots.push({ type: 'hidden', index: i });
            else validSlots.push({ type: 'visible', index: i });
        });

        // Action: Place (if hand not empty and empty slots exist)
        if (hasHandStones && validSlots.some(s => s.type === 'empty')) {
            actions.push('place');
        }

        // Action: Hide (if visible slots exist)
        if (validSlots.some(s => s.type === 'visible')) {
            actions.push('hide');
        }

        // Action: Swap (if any stones exist? usually requires hidden?)
        // Rules: Swap any two stones.
        if (validSlots.length >= 2) {
            actions.push('swap');
        }

        // Action: Challenge (if hidden exists)
        if (validSlots.some(s => s.type === 'hidden')) {
            actions.push('challenge');
            actions.push('challenge'); // Weight it higher
        }

        // Action: Boast (Se Gabar) - If many hidden or feeling lucky
        // Rule: Usually requires knowledge, but random test just tries it.
        // Valid if game allows (not blocked).
        // Since we don't know rules deeply here, let's try it if > 2 hidden.
        const hiddenCount = validSlots.filter(s => s.type === 'hidden').length;
        if (hiddenCount >= 2) {
            actions.push('boast');
        }

        // Pick Random
        if (actions.length === 0) return;
        const choice = actions[Math.floor(Math.random() * actions.length)];

        console.log(`[PvEAutomator] Random Action: ${choice}`);

        try {
            switch (choice) {
                case 'place':
                    // Click a hand stone, then a slot
                    const stone = handStones[0];
                    stone.click();
                    setTimeout(() => {
                        const emptySlot = document.querySelector('.slot.vazio, .slot:not(.ocupado)');
                        if (emptySlot) emptySlot.click();
                    }, 500);
                    break;

                case 'hide':
                    // Click a visible stone
                    // In UI, clicking a visible stone Flips it? Or need Action Menu?
                    // Depends on InputHandler.
                    // Assuming Click = Flip for Visible.
                    // Need to find DOM element for visible stone.
                    // Use `estado.mesa` to find index, then selector.
                    const visibleIdx = validSlots.find(s => s.type === 'visible').index;
                    this.clickSlot(visibleIdx);
                    break;

                case 'swap':
                    // Click Swap Button (if exists?) or Drag? 
                    // Tellstones logic: Click 'Swap' action button?
                    // Or click 2 stones?
                    // Usually: Click Stone A -> Click Stone B (swaps).
                    // Or Action Menu -> Swap -> A -> B.
                    // Let's assume inputHandler supports direct interaction or we call Controller.

                    // But we want to test UI.
                    // Let's stick to GameController for stability.

                    // Let's stick to window.realizarTroca for stability as it is global in script.js

                    const i1 = validSlots[0].index;
                    const i2 = validSlots[1].index;

                    if (window.realizarTroca) {
                        window.realizarTroca(i1, i2);
                    } else {
                        console.error("[PvEAutomator] realizarTroca function not found!");
                    }
                    break;

                case 'boast':
                    // Click Boast Button
                    const btnBoast = document.getElementById('btn-segabar');
                    if (btnBoast) {
                        console.log("[PvEAutomator] Clicking Boast!");
                        btnBoast.click();
                    } else {
                        console.warn("[PvEAutomator] Boast button not found.");
                    }
                    break;

                case 'challenge':
                    // Click 'Challenge' button?
                    const btn = document.getElementById('btn-desafiar');
                    if (btn) btn.click();

                    setTimeout(() => {
                        // Click a hidden stone
                        const hidden = validSlots.find(s => s.type === 'hidden');
                        if (hidden) this.clickSlot(hidden.index);

                        setTimeout(() => {
                            // Select a stone from options (guess)
                            const options = document.querySelectorAll('#opcoes-desafio button');
                            if (options.length > 0) {
                                const randomOpt = options[Math.floor(Math.random() * options.length)];
                                randomOpt.click();
                            }
                        }, 1000);
                    }, 1000);
                    break;
            }
        } catch (e) {
            console.error("[PvEAutomator] Action Failed:", e);
        }
    },

    clickSlot: function (index) {
        const slots = document.querySelectorAll('#tabuleiro-wrapper .slot');
        if (slots[index]) {
            // Dispatch click event
            // Note: slot might have img inside
            const img = slots[index].querySelector('img');
            if (img) img.click();
            else slots[index].click();
        }
    }
};

console.log("[DEV] PvEAutomator loaded. Run 'window.PvEAutomator.run()' to stress test Bot.");
