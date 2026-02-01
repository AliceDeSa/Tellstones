
/**
 * PvEAutomator.ts
 * Automates Player moves in PvE mode to stress-test the Bot and Game Logic.
 */

import { Logger, LogCategory } from '../utils/Logger.js';

// Global window is now fully typed in types/global.d.ts

export const PvEAutomator = {
    isRunning: false,
    intervalId: null as any,
    actionDelay: 2500, // Time between actions

    stepCount: 1,

    setPersonality: function (name: string) {
        Logger.sys(`[PvEAutomator] Setting personality to ${name}`);
        // Restore functionality if needed later
    },

    dumpLog: function () {
        Logger.sys("[PvEAutomator] Log dump requested.");
    },

    run: function () {
        if (this.isRunning) return;
        this.isRunning = true;
        this.stepCount = 1;
        Logger.sys("[PvEAutomator] Starting... waiting for game state.");

        // Auto-navigate to PvE if on Start Screen
        const startScreen = document.getElementById("start-screen");
        if (startScreen && startScreen.classList.contains("active")) {
            Logger.sys("[PvEAutomator] On Start Screen. Clicking PvE Button...");
            const pveBtn = document.getElementById("bot-pve-btn");
            if (pveBtn) {
                pveBtn.click();
            } else {
                Logger.error(LogCategory.SYSTEM, "[PvEAutomator] PvE Button not found!");
                this.stop();
                return;
            }
        }

        this.intervalId = setInterval(() => this.loop(), 1000);
    },

    stop: function () {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        Logger.sys("[PvEAutomator] Stopped.");
    },

    loop: function () {
        // Safe check for pause/stop
        if (!this.isRunning) return;

        this.stepCount++;

        // Check Coin Toss Overlay
        const coinOverlay = document.getElementById("escolha-cara-coroa");
        if (coinOverlay && coinOverlay.style.display !== "none") {
            const btn = Math.random() > 0.5 ? document.getElementById("btn-cara") : document.getElementById("btn-coroa");
            if (btn) {
                Logger.game("[PvEAutomator] Choosing Coin Toss:", btn.id);
                btn.click();
            }
            return;
        }

        // Check Coin Button (Start Toss)
        const coinBtn = document.getElementById("moeda-btn");
        if (coinBtn && coinBtn.style.display !== "none") {
            Logger.game("[PvEAutomator] Clicking Coin to Start Toss...");
            coinBtn.click();
            return;
        }

        const estado = window.estadoJogo;
        if (!estado) {
            if (this.stepCount % 5 === 0) Logger.warn(LogCategory.GAME, "[PvEAutomator] Waiting for estadoJogo...");
            return;
        }

        // Check if Game Over (Score reached)
        const p1 = (estado.jogadores || []).find((j: any) => j.id === 'p1');
        const bot = (estado.jogadores || []).find((j: any) => j.id === 'p2' || j.nome === 'Bot');

        if (p1 && p1.pontos >= 3) {
            Logger.game("[PvEAutomator] Player Won! Resetting...");
            this.stop();
            return;
        }
        if (bot && bot.pontos >= 3) {
            Logger.game("[PvEAutomator] Bot Won! Resetting...");
            this.stop();
            return;
        }

        const isPlayerTurn = estado.vez === 0;
        const pendingChallenge = estado.desafio && estado.desafio.status === 'aguardando_resposta' && estado.desafio.jogador === 'Bot';
        const isThinking = window.botThinking; // Don't interrupt Bot

        // Debug Loop State (Every Tick for debug)
        Logger.game(`[PvEAutomator Status] Step: ${this.stepCount} | Turn: ${estado.vez} (Player? ${isPlayerTurn}) | Desafio: ${estado.desafio ? 'YES' : 'NO'} | Thinking: ${isThinking}`);

        if (isThinking) return;

        // Challenge Response (Priority)
        if (pendingChallenge) {
            Logger.game("[PvEAutomator] Found pending challenge to respond.");
            this.handleChallengeResponse(estado);
            return;
        }

        // 1. Handling "Select Stone to Challenge" (Player clicked Desafiar)
        if (window.selecionandoDesafio) {
            // ... existing logic ...
            // Add Log
            Logger.game("[PvEAutomator] In Challenge Selection Mode");
            // ...
            const hiddenStones = Array.from(document.querySelectorAll('.pedra-mesa')).filter(el => {
                const idx = parseInt(el.getAttribute('data-idx') || "-1");
                return estado.mesa[idx] && estado.mesa[idx].virada;
            });

            if (hiddenStones.length > 0) {
                // ...
                const target = hiddenStones[Math.floor(Math.random() * hiddenStones.length)] as HTMLElement;
                Logger.game("[PvEAutomator] Clicking hidden stone:", target);
                target.click();
            } else {
                Logger.warn(LogCategory.GAME, "[PvEAutomator] No hidden stones found to challenge!");
                window.selecionandoDesafio = false;
            }
            return;
        }

        // 2. Handling "Guess Name" (After selecting stone)
        const challengeOptions = document.getElementById("opcoes-desafio");
        if (challengeOptions && challengeOptions.style.display !== 'none') {
            Logger.game("[PvEAutomator] Guessing stone name...");
            const options = challengeOptions.querySelectorAll('button');
            if (options.length > 0) {
                const choice = options[Math.floor(Math.random() * options.length)] as HTMLElement;
                Logger.game("[PvEAutomator] Selecting option:", choice.innerText);
                choice.click(); // Triggers Renderer option logic
            }
            return;
        }

        // Normal Turn
        if (isPlayerTurn && !estado.desafio) {
            Logger.game("[PvEAutomator] It is Player turn. Executing random action...");
            this.performRandomAction(estado);
        }
    },

    handleChallengeResponse: function (estado: any) {
        Logger.game(`%c[PvE Step ${this.stepCount}] 🛡️ Responding to Challenge`, "color: #3498db");

        const desafio = estado.desafio;
        if (!desafio) {
            Logger.warn(LogCategory.GAME, "[PvEAutomator] No challenge found to respond to.");
            // Logger groupEnd removed
            return;
        }

        // 1. Respond to Boast (Se Gabar)
        if (desafio.tipo === 'segabar') {
            const options = ['acreditar', 'duvidar'];
            const choice = options[Math.floor(Math.random() * options.length)];
            Logger.game(`[PvEAutomator] Boast Response: ${choice}`);

            if (window.GameController && window.GameController.responderSegabar) {
                window.GameController.responderSegabar(choice);
            }
        }
        // 2. Respond to Normal Challenge (Guess the stone)
        else {
            // Logic: We need to guess the name of the stone at desafio.alvo (or pedra)
            // For automation, we can pick a random name or the correct one if we want to cheat/test validity.
            // Let's pick a random valid option from the UI if possible, or just a hardcoded one.

            // Try to find the options UI
            const optionsDiv = document.getElementById("opcoes-desafio");
            if (optionsDiv && optionsDiv.style.display !== 'none') {
                const buttons = optionsDiv.querySelectorAll("button");
                if (buttons.length > 0) {
                    const randomBtn = buttons[Math.floor(Math.random() * buttons.length)] as HTMLElement;
                    Logger.game(`[PvEAutomator] Challenge Response (UI): Clicking ${randomBtn.innerText}`);
                    randomBtn.click();
                } else {
                    Logger.warn(LogCategory.GAME, "[PvEAutomator] Options UI empty?");
                }
            } else {
                // UI might not be ready, or we are calling this too fast.
                // Fallback: Call GameController directly if we know the index.
                // We don't have direct access to 'idxDeduzido' mapping easily without UI.
                Logger.warn(LogCategory.GAME, "[PvEAutomator] Challenge Options UI not visible yet. Waiting...");
            }
        }

        // Logger groupEnd removed
    },

    performRandomAction: function (estado: any) {
        // Logger.game(`%c[PvE Step ${this.stepCount}] 🎲 Random Action`, "color: #e67e22");
        Logger.game(`[PvE Step ${this.stepCount}] 🎲 Random Action (Start)`);
        this.stepCount++;

        const actions: string[] = [];

        // Use DOM to find available reserve stones
        const handStones = document.querySelectorAll('.pedra-reserva:not(.usada)');
        const hasHandStones = handStones.length > 0;
        Logger.game(`[PvEAutomator] Hand Stones Found: ${handStones.length}`);

        const validSlots: any[] = [];
        estado.mesa.forEach((p: any, i: number) => {
            if (p === null) validSlots.push({ type: 'empty', index: i });
            else if (p.virada) validSlots.push({ type: 'hidden', index: i });
            else validSlots.push({ type: 'visible', index: i });
        });
        Logger.game(`[PvEAutomator] Slots State:`, validSlots);

        // Action: Place
        if (hasHandStones && validSlots.some(s => s.type === 'empty')) {
            actions.push('place');
        }
        Logger.game("[PvETrace] Checked Place. Actions:", actions);

        // Action: Hide
        if (validSlots.some(s => s.type === 'visible')) {
            actions.push('hide');
        }
        Logger.game("[PvETrace] Checked Hide. Actions:", actions);

        // Action: Swap
        const validSwapSlots = validSlots.filter(s => s.type !== 'empty');
        if (validSwapSlots.length >= 2) {
            actions.push('swap');
        }
        // Logger.game("[PvETrace] Checked Swap. Actions:", actions);

        // Action: Challenge
        if (validSlots.some(s => s.type === 'hidden')) {
            actions.push('challenge');
            actions.push('challenge'); // Weight it higher
        }
        // Logger.game("[PvETrace] Checked Challenge. Actions:", actions);

        // Action: Boast
        const hiddenCount = validSlots.filter(s => s.type === 'hidden').length;
        if (hiddenCount >= 2) {
            actions.push('boast');
        }
        // Logger.game("[PvETrace] Checked Boast. Actions:", actions);

        // Logger.game(`[PvEAutomator] Available Actions:`, actions);

        // Pick Random
        if (actions.length === 0) {
            Logger.warn(LogCategory.GAME, "[PvEAutomator] No actions available!");
            // // Logger groupEnd removed
            return;
        }
        const choice = actions[Math.floor(Math.random() * actions.length)];

        Logger.game(`[PvEAutomator] Random Action: ${choice}`);

        try {
            switch (choice) {
                case 'place':
                    if (window.GameController && estado.reserva.length > 0) {
                        const emptySlot = validSlots.find(s => s.type === 'empty');
                        if (emptySlot) {
                            const pedra = estado.reserva[0];
                            // Manually remove from reserve as GameController expects caller to handle it (based on code comments)
                            estado.reserva.shift();
                            window.GameController.colocarPedra(pedra, emptySlot.index);
                        } else {
                            Logger.warn(LogCategory.GAME, "[PvEAutomator] No empty slot found for Place action.");
                        }
                    }
                    break;

                case 'hide':
                    const visible = validSlots.find(s => s.type === 'visible');
                    if (visible) {
                        estado.mesa[visible.index].virada = true;
                        if (window.GameController) window.GameController.persistirEstado();
                        if (window.avancarTurno) window.avancarTurno();
                        if (window.Renderer) window.Renderer.renderizarMesa(); // Force update
                    }
                    break;

                case 'swap':
                    if (validSwapSlots.length < 2) break;
                    const idx1 = Math.floor(Math.random() * validSwapSlots.length);
                    let idx2 = Math.floor(Math.random() * validSwapSlots.length);
                    while (idx1 === idx2) {
                        idx2 = Math.floor(Math.random() * validSwapSlots.length);
                    }
                    const i1 = validSwapSlots[idx1].index;
                    const i2 = validSwapSlots[idx2].index;

                    if (window.realizarTroca) {
                        window.realizarTroca(i1, i2);
                    } else if (window.GameController && window.GameController.realizarTroca) {
                        window.GameController.realizarTroca(i1, i2);
                    } else {
                        Logger.error(LogCategory.GAME, "[PvEAutomator] GameController.realizarTroca function not found!");
                    }
                    break;

                case 'boast':
                    // Trigger Boast via UI button if available to ensure full flow, or simulate
                    const btnBoast = document.getElementById('btn-segabar');
                    if (btnBoast) {
                        btnBoast.click();
                    } else {
                        // Fallback Logic
                        const novoDesafio = {
                            tipo: "segabar",
                            status: "aguardando_resposta",
                            jogador: window.nomeAtual
                        };
                        estado.desafio = novoDesafio;
                        if (window.GameController) window.GameController.persistirEstado();
                        if (window.avancarTurno) window.avancarTurno();
                    }
                    break;

                case 'challenge':
                    // Challenge Logic: Select stone and set state
                    const hidden = validSlots.find(s => s.type === 'hidden');
                    if (hidden) {
                        const desafioAtual = {
                            tipo: "desafio",
                            status: "aguardando_resposta",
                            jogador: window.nomeAtual,
                            pedra: hidden.index,
                            idxPedra: hidden.index,
                            alvo: hidden.index
                        };
                        estado.desafio = desafioAtual;
                        if (window.GameController) window.GameController.persistirEstado();
                        if (window.avancarTurno) window.avancarTurno();
                        if (window.Renderer) window.Renderer.renderizarMesa();
                    }
                    break;
            }
        } catch (e) {
            Logger.error(LogCategory.GAME, "[PvEAutomator] Action Failed:", e);
        }
        // // Logger groupEnd removed
    },




    clickSlot: function (index: number) {
        const slots = document.querySelectorAll('#tabuleiro-wrapper .slot');
        if (slots[index]) {
            const img = slots[index].querySelector('img');
            if (img) img.click();
            else (slots[index] as HTMLElement).click();
        }
    }
};

(window as any).PvEAutomator = PvEAutomator;
Logger.game("%c[DEV] PvEAutomator loaded. Run 'window.PvEAutomator.run()' to stress test Bot.");
