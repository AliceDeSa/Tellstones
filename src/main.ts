// Tellstones Client v5.0
// =========================
// Main Orchestrator for Game Logic, managing Room State and interactions.
// Migrated to TypeScript
// Imports
import { safeStorage } from "./utils/utils.js";
import { CoinFlip } from "./ui/CoinFlip.js";
import LocaleManager from './data/LocaleManager.js';
import { RoomListScreen } from './ui/RoomListScreen.js';
import './modes/multiplayer/RoomListManager.js';
import './core/StatsManager.js';

declare global {
    interface Window {
        AnalyticsManager: any;


        RoomManager: any;
        GameController: any;
        Renderer: any;
        TutorialMode: any;
        PvEMode: any;

        tocarSomPress: () => void;
        tocarSomClick: () => void;
        showToastInterno: (msg: any) => void;
        showToast: (msg: any) => void;
        criarSala: (modo: any, publicRoom?: boolean) => any;
        entrarSala: (codigo: any, nome: any, tipo: any) => void;
        mostrarLobby: (codigo: any, nome: any, criador?: boolean) => void;
        sairPartida: () => void;
        mostrarTela: (tela: string) => void;
        avancarTurno: () => void;
        ehMinhaVez: () => boolean;
        sincronizarPedraCentralEAlinhamento: () => void;

        salaAtual: string | null;
        nomeAtual: string | null;
        souCriador: boolean;
        estadoJogo: any;
        animacaoAlinhamentoEmAndamento: boolean;
        hideTooltip: () => void;
        jaEntrouNoGame: boolean;
        animouReservaCircular: boolean;
    }
}
// Global Error Handler
window.onerror = function (message, source, lineno, colno, error) {
    if (window.AnalyticsManager) {
        window.AnalyticsManager.logError(message, error ? error.stack : "");
    }
    return false;
};
// =========================
// Global Shims (Legacy Compatibility)
// =========================
window.tocarSomPress = function () {
    if (window.audioManager)
        window.audioManager.playPress();
};
window.tocarSomClick = function () {
    if (window.audioManager)
        window.audioManager.playClick();
};
window.showToastInterno = function (msg) {
    if (window.notificationManager)
        window.notificationManager.showInternal(msg);
};
window.showToast = function (msg) {
    if (window.notificationManager)
        window.notificationManager.showGlobal(msg);
};
// =========================
// Lobby & Room Logic Handlers
// =========================
window.criarSala = function (modo, publicRoom) {
    if (window.RoomManager) {
        return window.RoomManager.criarSala(modo, publicRoom);
    }
    else {
        console.error("RoomManager not loaded!");
        return null;
    }
};
window.entrarSala = function (codigo, nome, tipo) {
    if (window.RoomManager) {
        window.RoomManager.entrarSala(codigo, nome, tipo);
    }
    else {
        console.error("RoomManager not loaded!");
    }
};
window.mostrarLobby = function (codigo, nome, criador = false) {
    if (window.RoomManager) {
        window.RoomManager.mostrarLobby(codigo, nome, criador);
    }
    else {
        console.error("RoomManager not loaded!");
    }
};
window.sairPartida = function () {
    if (window.RoomManager) {
        window.RoomManager.sairPartida();
    }
    // Stop Coin Flip Listener
    if (CoinFlip) {
        CoinFlip.pararOuvirCaraCoroa();
    }
    else {
        // Fallback
        window.mostrarTela("start-screen");
        window.location.reload();
    }
};
// =========================
// Screen Management
// =========================
window.mostrarTela = function (tela) {
    var _a, _b;
    // Clear tooltips
    if (typeof window.hideTooltip === "function")
        window.hideTooltip();
    const screens = ["start-screen", "lobby", "game"];
    screens.forEach(id => { var _a; return (_a = document.getElementById(id)) === null || _a === void 0 ? void 0 : _a.classList.remove("active"); });
    (_a = document.getElementById(tela)) === null || _a === void 0 ? void 0 : _a.classList.add("active");
    // Audio & UI Cleanup
    const creditosSom = document.getElementById("creditos-som");
    const placarTurno = document.getElementById("placar-turno-central");
    const btnMute = document.getElementById("btn-mute-global");
    if (tela === "start-screen" || tela === "lobby") {
        if (window.audioManager)
            window.audioManager.playAmbience();
        if (creditosSom)
            creditosSom.style.display = "";
        if (placarTurno)
            placarTurno.style.display = "none";
        if (btnMute)
            btnMute.style.display = "flex";
    }
    else {
        if (window.audioManager)
            window.audioManager.stopAmbience();
        if (creditosSom)
            creditosSom.style.display = "none";
        if (placarTurno)
            placarTurno.style.display = "";
        if (btnMute)
            btnMute.style.display = "none";
    }
    // Ko-fi Logic
    const kofiBtn = document.querySelector('.floatingchat-donate-button') || document.querySelector('.floatingchat-container-wrap');
    if (kofiBtn) {
        (kofiBtn as HTMLElement).style.display = (tela === "game") ? "none" : "flex";
    }
    // Cleanup Game UI when leaving
    if (tela !== "game") {
        (_b = document.getElementById("opcoes-resposta-segabar")) === null || _b === void 0 ? void 0 : _b.remove();
        const idsToHide = ["box-acoes", "carta-acoes", "icone-acoes", "tutorial-ui", "escolha-cara-coroa", "moeda-btn"];
        idsToHide.forEach(uiId => {
            const el = document.getElementById(uiId);
            if (el)
                el.style.display = "none";
        });
        const tooltip = document.getElementById("tooltip");
        if (tooltip)
            tooltip.style.display = "none";
    }
};
// =========================
// Game State & Turn Logic
// =========================
window.salaAtual = null;
window.nomeAtual = null;
window.souCriador = false;
window.estadoJogo = {
    jogadores: [],
    mesa: [],
    reserva: [],
    pedraCentral: null,
    vez: 0,
    alinhamentoFeito: false,
    centralAlinhada: false,
    mesaEspiada: null,
    vencedor: null,
    trocaAnimacao: null
};
window.avancarTurno = function () {
    if (!window.estadoJogo)
        return;
    const jogadores = window.estadoJogo.jogadores || [];
    if (jogadores.length === 0)
        return;
    // Toggle logic for 2 players
    let proximaVez = (window.estadoJogo.vez + 1) % jogadores.length;
    window.estadoJogo.vez = proximaVez;
    const proximoJogador = jogadores[proximaVez];
    const nome = proximoJogador ? proximoJogador.nome : "Oponente";
    console.log(`[System] Turn Advanced. Now it is ${nome}'s turn (Index: ${proximaVez})`);
    // Persist via GameController
    if (window.GameController && window.GameController.persistirEstado) {
        window.GameController.persistirEstado();
    }
};
// Helper: Is My Turn?
window.ehMinhaVez = function () {
    if (!window.estadoJogo.jogadores || window.estadoJogo.jogadores.length === 0)
        return false;
    const idx = window.estadoJogo.jogadores.findIndex((j: any) => j.nome === window.nomeAtual);
    let resultado = false;
    if (window.estadoJogo.jogadores.length === 2) {
        resultado = window.estadoJogo.vez === idx;
    }
    else if (window.estadoJogo.jogadores.length === 4) {
        resultado = window.estadoJogo.vez === idx % 2;
    }
    return resultado;
};
// =========================
// Animation & UI Synchronization
// =========================
window.animacaoAlinhamentoEmAndamento = false;
// Delegated to Renderer
window.sincronizarPedraCentralEAlinhamento = function () {
    if (window.Renderer) {
        window.Renderer.sincronizarPedraCentralEAlinhamento();
    }
    else {
        console.warn("Renderer not loaded for alignment sync!");
    }
};

// =========================
// Game Screen Initialization (Restored)
// =========================
(window as any).mostrarJogo = function (codigo: string, jogadores: any[], espectadores: any[]) {
    // 1. Switch Screen
    window.mostrarTela("game");

    // 2. Update Basic Info
    const elCodigo = document.getElementById("codigo-sala-valor");
    if (elCodigo) elCodigo.innerText = codigo;

    // 3. Start GameController Listeners
    if (window.GameController) {
        window.GameController.iniciarListenerEstado(codigo);
    } else {
        console.error("GameController not found in mostrarJogo!");
    }

    // 4. Initialize Local Elements if Offline/Tutorial
    if (codigo === "MODO_TUTORIAL" || codigo === "MODO_PVE") {
        if (window.Renderer) {
            window.Renderer.renderizarMesa();
            window.Renderer.renderizarPedrasReserva();
        }
    }

    console.log(`[Main] Game Started: ${codigo}`);

    // 5. Start Coin Flip Listener (Restored)
    if (CoinFlip) {
        CoinFlip.ouvirCaraCoroa();
    }
};
// =========================
// Initialization Listeners
// =========================
document.addEventListener("DOMContentLoaded", function () {
    // Buttons
    const btnStart = document.getElementById("start-game-btn");
    if (btnStart) {
        btnStart.onclick = () => {
            window.tocarSomPress();
            const modeInput = document.querySelector('input[name="mode"]:checked') as HTMLInputElement;
            const modo = modeInput ? modeInput.value : "classic";
            const nomeInput = document.getElementById("nome-criar") as HTMLInputElement;
            const nome = nomeInput.value.trim();
            if (!nome)
                return alert("Digite seu nome!");
            safeStorage.setItem("tellstones_playerName", nome);
            // Logic
            const isPublic = (document.getElementById("check-public-room") as HTMLInputElement)?.checked || false;
            const codigo = window.criarSala(modo, isPublic);
            if (window.RoomManager) {
                window.RoomManager.entrarSala(codigo, nome, "jogador");
                window.RoomManager.mostrarLobby(codigo, nome, true);
            }
            const codeDisplay = document.getElementById("codigo-sala-criada");
            if (codeDisplay)
                codeDisplay.innerText = "Código da sala: " + codigo;
        };
    }
    const btnJoin = document.getElementById("enter-room-btn");
    if (btnJoin) {
        btnJoin.onclick = () => {
            window.tocarSomPress();
            const codeInput = document.getElementById("room-code") as HTMLInputElement;
            const codigo = codeInput.value.trim().toUpperCase();
            const nomeInput = document.getElementById("nome-entrar") as HTMLInputElement;
            const nome = nomeInput.value.trim();
            const tipoInput = document.querySelector('input[name="tipo-entrada"]:checked') as HTMLInputElement;
            const tipo = tipoInput ? tipoInput.value : "jogador";
            if (!codigo)
                return alert("Digite o código da sala!");
            if (!nome)
                return alert("Digite seu nome!");
            safeStorage.setItem("tellstones_playerName", nome);
            if (window.RoomManager) {
                window.RoomManager.entrarSala(codigo, nome, tipo);
                window.RoomManager.mostrarLobby(codigo, nome, false);
            }
        };
    }
    // Audio Mute Logic
    // Audio Mute Logic
    const btnMute = document.getElementById("btn-mute-global");
    if (btnMute) {
        let isMuted = false;
        // Load initial state
        const savedMuted = safeStorage.getItem("tellstones_muted");
        if (savedMuted) isMuted = (savedMuted === 'true');

        const updateIcon = (muted: boolean) => {
            btnMute.innerText = muted ? "🔇" : "🔊";
        };

        // Initialize
        updateIcon(isMuted);
        const somFundo = document.getElementById("som-fundo") as HTMLAudioElement;
        if (somFundo) somFundo.muted = isMuted;

        // Button Click -> Emit Event
        btnMute.onclick = (e) => {
            e.preventDefault();
            const newState = !isMuted;

            // Emitir evento para quem estiver ouvindo (Settings, etc)
            if ((window as any).EventBus) {
                (window as any).EventBus.emit('AUDIO:MUTE:CHANGED', { isMuted: newState });
            }
        };

        // Listen for updates (from Settings or self)
        if ((window as any).EventBus) {
            (window as any).EventBus.on('AUDIO:MUTE:CHANGED', (data: any) => {
                isMuted = data.isMuted;

                // Update UI & Storage
                safeStorage.setItem("tellstones_muted", isMuted ? 'true' : 'false');
                updateIcon(isMuted);

                // Update Actual Audio Element
                if (somFundo) {
                    somFundo.muted = isMuted;
                    if (!isMuted && somFundo.paused) {
                        somFundo.play().catch(() => { });
                    }
                }

                // Sync global flag
                (window as any).isMuted = isMuted;
            });
        }
    }
    // Load Saved Name
    const savedName = safeStorage.getItem("tellstones_playerName");
    if (savedName) {
        const inpCriar = document.getElementById("nome-criar") as HTMLInputElement;
        const inpEntrar = document.getElementById("nome-entrar") as HTMLInputElement;
        if (inpCriar)
            inpCriar.value = savedName;
        if (inpEntrar)
            inpEntrar.value = savedName;
    }
    // Show Start Screen By Default
    window.mostrarTela("start-screen");
    // Fix Orientation & Mobile
    const checkOrientation = () => {
        const overlay = document.getElementById("rotate-device-overlay");
        if (!overlay)
            return;
        if (window.innerHeight > window.innerWidth) {
            overlay.style.display = "flex";
            overlay.style.zIndex = "9999999";
        }
        else {
            overlay.style.display = "none";
        }
    };
    window.addEventListener("resize", checkOrientation);
    checkOrientation();
    // Prevent Context Menu
    document.addEventListener("contextmenu", function (e) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'IMG' || target.closest('#game-mesa') || target.closest('.pedra-oficial'))) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, { capture: false });
    // --- NAVIGATION BUTTONS ---

    // ============ MAIN MENU BUTTONS ============

    // Play Button (Goes to GameModes)
    const btnPlay = document.getElementById("play-btn");
    if (btnPlay) {
        btnPlay.onclick = function () {
            window.tocarSomPress();
            console.log("[MainMenu] Navegando para Game Modes...");
            if ((window as any).ScreenManager) {
                (window as any).ScreenManager.navigateTo('game-modes');
            }
        };
    }

    // Options Button (Goes to Settings)
    const btnOptions = document.getElementById("options-btn");
    if (btnOptions) {
        btnOptions.onclick = function () {
            window.tocarSomPress();
            console.log("[MainMenu] Navegando para Opções...");
            if ((window as any).ScreenManager) {
                (window as any).ScreenManager.navigateTo('settings');
            }
        };
    }

    // Customization Button (MainMenu)
    const btnCustomization = document.getElementById("customization-btn");
    if (btnCustomization) {
        btnCustomization.onclick = function () {
            window.tocarSomPress();
            console.log("[MainMenu] Navegando para Personalização...");
            if ((window as any).ScreenManager) {
                (window as any).ScreenManager.navigateTo('customization');
            } else {
                // Fallback para navegação legada
                console.warn("ScreenManager not found, using legacy navigation");
                if (window.mostrarTela) window.mostrarTela('customization');
            }
        };
    }

    // ============ GAME MODES BUTTONS ============

    // Back to Menu Button (GameModes → MainMenu)
    const btnBackToMenu = document.getElementById("back-to-menu-btn");
    if (btnBackToMenu) {
        btnBackToMenu.onclick = function () {
            window.tocarSomPress();
            console.log("[GameModes] Voltando ao Menu Principal...");
            if ((window as any).ScreenManager) {
                (window as any).ScreenManager.navigateTo('main-menu');
            }
        };
    }

    // Tutorial Button
    const btnTutorial = document.getElementById("tutorial-btn");
    if (btnTutorial) {
        btnTutorial.onclick = function () {
            window.tocarSomPress();
            console.log("[Menu] Iniciando Tutorial...");

            try {
                // 1. Force UI Cleanup (Manual Fallback)
                const gameModes = document.getElementById("game-modes-screen");
                if (gameModes) gameModes.style.display = "none";
                const startScreen = document.getElementById("start-screen");
                if (startScreen) startScreen.classList.remove("active");

                // 2. Use ScreenManager to switch UI
                if ((window as any).ScreenManager) {
                    (window as any).ScreenManager.navigateTo('game');
                } else {
                    if (window.mostrarTela) window.mostrarTela("game");
                }

                // 3. Start Tutorial Mode
                if ((window as any).TutorialMode) {
                    // Check if cleaning up previous mode is needed
                    if ((window as any).currentGameMode && (window as any).currentGameMode.cleanup) {
                        (window as any).currentGameMode.cleanup();
                    }

                    (window as any).currentGameMode = new (window as any).TutorialMode();
                    (window as any).currentGameMode.start({ roomCode: "MODO_TUTORIAL" });
                    console.log("[Menu] TutorialMode iniciado com sucesso.");
                } else {
                    console.error("[Menu] TutorialMode não encontrado! Verifique se TutorialMode.js foi carregado.");
                    alert("Erro ao iniciar tutorial: Componente não carregado.");
                }
            } catch (err) {
                console.error("[Menu] Erro fatal ao iniciar tutorial:", err);
                alert("Ocorreu um erro ao iniciar o tutorial. Verifique o console.");
            }
        };
    }

    // PvE Button
    const btnPvE = document.getElementById("bot-pve-btn");
    if (btnPvE) {
        btnPvE.onclick = function () {
            window.tocarSomPress();
            console.log("[Menu] Iniciando PvE...");

            // Use ScreenManager to switch UI to Game Screen (Clean up Menu)
            if ((window as any).ScreenManager) {
                (window as any).ScreenManager.navigateTo('game');
            }

            // Create Local Room
            const codigo = "MODO_PVE";
            safeStorage.setItem("tellstones_playerName", "Jogador");

            if ((window as any).RoomManager) {
                // Manually init room data just in case
                (window as any).RoomManager.criarSala(codigo); // Mock creation
                (window as any).RoomManager.entrarSala(codigo, "Jogador", "jogador");

                // Init Mode
                if ((window as any).PvEMode) {
                    (window as any).currentGameMode = new (window as any).PvEMode();
                    (window as any).currentGameMode.start({ roomCode: codigo, playerName: "Jogador" });
                }

                // Show Game (Use mostrarJogo to init listeners like CoinFlip)
                if ((window as any).mostrarJogo) {
                    (window as any).mostrarJogo(codigo, [{ nome: "Jogador" }, { nome: "Bot" }], []);
                } else if (window.mostrarTela && !(window as any).ScreenManager) {
                    window.mostrarTela("game");
                }

            } else {
                console.error("RoomManager missing for PvE!");
            }
        };
    }




    // Back from Lobby Button
    const btnBackLobby = document.getElementById("back-from-lobby-btn");
    if (btnBackLobby) {
        btnBackLobby.onclick = function () {
            window.tocarSomPress();
            (window as any).sairPartida();
            // Ensure ScreenManager goes back to main menu
            if ((window as any).ScreenManager) {
                (window as any).ScreenManager.navigateTo('main-menu');
            }
        };
    }

    // Leave Game Button (Restored)
    const btnSair = document.getElementById("btn-sair-partida");
    const infoSala = document.getElementById("info-sala");

    if (btnSair) {
        // Logic
        btnSair.onclick = function () {
            window.tocarSomPress();
            // Immediate exit without confirmation (User Request)
            (window as any).sairPartida();
            // ScreenManager Navigation
            if ((window as any).ScreenManager) {
                (window as any).ScreenManager.navigateTo('main-menu');
            }
        };

        // Styling & Position Restoration (Legacy Logic)
        if (infoSala && !infoSala.contains(btnSair)) {
            // Move to info-sala
            infoSala.appendChild(btnSair);

            // Apply Legacy Styles
            infoSala.style.display = "flex";
            infoSala.style.flexDirection = "column";
            infoSala.style.alignItems = "center";
            infoSala.style.gap = "8px";
            infoSala.style.textAlign = "center";

            btnSair.style.position = "static";
            btnSair.style.margin = "8px 0 0 0";
            btnSair.style.fontSize = "0.85em";
            btnSair.style.padding = "6px 12px";
            btnSair.style.background = "rgba(244, 67, 54, 0.15)";
            btnSair.style.color = "#ff5252";
            btnSair.style.border = "1px solid #ff5252";
            btnSair.style.borderRadius = "4px";
            btnSair.style.cursor = "pointer";
            btnSair.style.transition = "all 0.2s";

            btnSair.onmouseover = () => {
                btnSair.style.background = "rgba(244, 67, 54, 0.3)";
                btnSair.style.boxShadow = "0 0 8px rgba(255, 82, 82, 0.4)";
            };
            btnSair.onmouseout = () => {
                btnSair.style.background = "rgba(244, 67, 54, 0.15)";
                btnSair.style.boxShadow = "none";
            };
        }
    }

    // Actions Icon (Restored)
    const iconeAcoes = document.getElementById("icone-acoes");
    const cartaAcoes = document.getElementById("carta-acoes");
    const conteudoAcoes = document.getElementById("conteudo-acoes");
    if (iconeAcoes && cartaAcoes && conteudoAcoes) {
        iconeAcoes.onclick = function () {
            if (cartaAcoes.style.display === "block") {
                cartaAcoes.style.display = "none";
            } else {
                // Import LocaleManager dynamically if needed or assume global availability via updateHTMLTranslations context
                // But for click handler we need synchronous access.
                // We'll use a helper or try to import at top level if not already. 
                // Since we can't easily change top imports without potentially breaking things, let's try to get it from window if available, 
                // or use a safe fallback.
                // Actually, let's use a dynamic import approach or rely on a global exposed by main

                // Better approach: We'll assume LocaleManager is available via the global hook we created or import it.
                // Let's add top-level import to main.ts for verify.

                // For now, let's use a robust pattern:
                import('./data/LocaleManager.js').then(module => {
                    const LocaleManager = module.default;

                    conteudoAcoes.innerHTML = `
                  <button class="fechar-card" id="fechar-card-btn">X</button>
                  <h3>${LocaleManager.t('game.actions.title')}</h3>
                  <ul>
                    <li><strong>${LocaleManager.t('game.actions.place')}:</strong> <span class='descricao-acao'>${LocaleManager.t('game.actions.placeDesc')}</span></li>
                    <li><strong>${LocaleManager.t('game.actions.hide')}:</strong> <span class='descricao-acao'>${LocaleManager.t('game.actions.hideDesc')}</span></li>
                    <li><strong>${LocaleManager.t('game.actions.swap')}:</strong> <span class='descricao-acao'>${LocaleManager.t('game.actions.swapDesc')}</span></li>
                    <li><strong>${LocaleManager.t('game.actions.peek')}:</strong> <span class='descricao-acao'>${LocaleManager.t('game.actions.peekDesc')}</span></li>
                    <li><strong>${LocaleManager.t('game.actions.challenge')}:</strong> <span class='descricao-acao'>${LocaleManager.t('game.actions.challengeDesc')}</span></li>
                    <li class="acoes-segabar-intro" style="display:block;width:100%;margin-bottom:8px;">
                      <strong>${LocaleManager.t('game.actions.boast')}:</strong> <span class='descricao-acao'>${LocaleManager.t('game.actions.boastIntro')}</span>
                    </li>
                  </ul>
                  <ul class="acoes-segabar-lista">
                    <li><strong>${LocaleManager.t('game.actions.believe')}:</strong> <span>${LocaleManager.t('game.actions.believeDesc')}</span></li>
                    <li><strong>${LocaleManager.t('game.actions.doubt')}:</strong> <span>${LocaleManager.t('game.actions.doubtDesc')}</span>
                      <ul>
                        <li>${LocaleManager.t('game.actions.doubtWin')}</li>
                        <li>${LocaleManager.t('game.actions.doubtLose')}</li>
                      </ul>
                    </li>
                    <li><strong>${LocaleManager.t('game.actions.boast')}:</strong> <span>${LocaleManager.t('game.actions.boastReplyDesc')}</span>
                      <ul>
                        <li>${LocaleManager.t('game.actions.doubtWin')}</li>
                        <li>${LocaleManager.t('game.actions.doubtLose')}</li>
                      </ul>
                    </li>
                  </ul>
                `;

                    // Re-bind close button
                    const btnFechar = document.getElementById("fechar-card-btn");
                    if (btnFechar) {
                        btnFechar.onclick = () => { cartaAcoes.style.display = "none"; };
                    }
                });
                cartaAcoes.style.display = "block";

                // Add listener to close button dynamically
                const btnFechar = document.getElementById("fechar-card-btn");
                if (btnFechar) {
                    btnFechar.onclick = () => { cartaAcoes.style.display = "none"; };
                }
            }
        };
    }

    // ===================================
    // GAME ACTION BUTTONS (Restored)
    // ===================================
    const btnDesafiar = document.getElementById("btn-desafiar");
    if (btnDesafiar) {
        btnDesafiar.onclick = function () {
            if (window.ehMinhaVez && !window.ehMinhaVez()) {
                window.showToastInterno(LocaleManager.t('notifications.notYourTurn'));
                return;
            }
            // Check GameMode permissions if applicable
            if ((window as any).currentGameMode && !(window as any).currentGameMode.canPerformAction("BOTAO_DESAFIAR")) {
                return;
            }

            if (window.tocarSomClick) window.tocarSomClick();

            window.selecionandoDesafio = true;
            window.showToastInterno(LocaleManager.t('game.selectStoneChallenge'));

            // Tutorial Trigger (Button Click Only)
            if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
        };
    }

    const btnSeGabar = document.getElementById("btn-segabar");
    if (btnSeGabar) {
        btnSeGabar.onclick = function () {
            if (window.ehMinhaVez && !window.ehMinhaVez()) {
                window.showToastInterno(LocaleManager.t('notifications.notYourTurn'));
                return;
            }
            if ((window as any).currentGameMode && !(window as any).currentGameMode.canPerformAction("BOTAO_SE_GABAR")) {
                return;
            }
            if (window.tocarSomClick) window.tocarSomClick();

            // Create Boast Challenge
            const novoDesafio = {
                tipo: "segabar",
                status: "aguardando_resposta",
                jogador: window.nomeAtual
            };
            window.estadoJogo.desafio = novoDesafio;

            // Persist
            if (window.GameController) {
                window.GameController.persistirEstado();
            } else if (window.getDBRef && window.salaAtual) {
                window.getDBRef("salas/" + window.salaAtual + "/estadoJogo").update({
                    desafio: novoDesafio,
                    vez: (window.estadoJogo.vez + 1) % window.estadoJogo.jogadores.length // Pass Turn
                });
            }

            window.avancarTurno();

            // Tutorial Trigger
            if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
        };
    }

    // Online Menu Toggle
    const btnOnline = document.getElementById("online-menu-btn");
    const onlineMenu = document.getElementById("online-menu");
    const onlineMenuContainer = document.getElementById("online-menu-container");
    const mainMenuBtns = document.getElementById("main-menu-btns");
    const gameModesScreen = document.getElementById("game-modes-screen");
    const btnBack = document.getElementById("back-to-main-btn");

    if (btnOnline && onlineMenu && mainMenuBtns && gameModesScreen) {
        btnOnline.onclick = function () {
            window.tocarSomPress();
            console.log("[Online] Opening online menu from GameModes");
            // Hide GameModes, show start-screen with online menu
            gameModesScreen.style.display = "none";
            const startScreen = document.getElementById("start-screen");
            if (startScreen) startScreen.style.display = "block";
            mainMenuBtns.style.display = "none";

            if (onlineMenuContainer) onlineMenuContainer.style.display = "block";
            onlineMenu.style.display = "flex";
        };
    }

    if (btnBack && onlineMenu && mainMenuBtns && gameModesScreen) {
        btnBack.onclick = function () {
            window.tocarSomPress();
            console.log("[Online] Closing online menu, returning to GameModes");
            // Hide online menu, hide start-screen, show GameModes
            if (onlineMenuContainer) onlineMenuContainer.style.display = "none";
            onlineMenu.style.display = "none";
            const startScreen = document.getElementById("start-screen");
            if (startScreen) startScreen.style.display = "none";
            gameModesScreen.style.display = "block";
        };

        // --- TABS LOGIC ---
        const btnCreateTab = document.getElementById("create-room-btn");
        const btnJoinTab = document.getElementById("join-room-btn");
        const sectionCreate = document.getElementById("room-options");
        const sectionJoin = document.getElementById("join-room");

        if (btnCreateTab && btnJoinTab && sectionCreate && sectionJoin) {
            btnCreateTab.onclick = function () {
                window.tocarSomPress();
                sectionCreate.style.display = "flex";
                sectionJoin.style.display = "none";

                // Visual Feedback (Active State)
                btnCreateTab.style.background = "#2d8cff";
                btnJoinTab.style.background = "transparent";
            };

            btnJoinTab.onclick = function () {
                window.tocarSomPress();
                sectionCreate.style.display = "none";
                sectionJoin.style.display = "flex";

                // Visual Feedback (Active State)
                btnJoinTab.style.background = "#2d8cff";
                btnCreateTab.style.background = "transparent";
            };

            // Default State - Set manually to avoid sound
            sectionCreate.style.display = "flex";
            sectionJoin.style.display = "none";
            btnCreateTab.style.background = "#2d8cff";
            btnJoinTab.style.background = "transparent";

            // Ensure 1x1 is checked by default (redundancy for safety)
            const radio1x1 = document.querySelector('input[name="mode"][value="1x1"]') as HTMLInputElement;
            if (radio1x1) radio1x1.checked = true;

            // Synchronize Nicknames
            const inputNomeCriar = document.getElementById("nome-criar") as HTMLInputElement;
            const inputNomeEntrar = document.getElementById("nome-entrar") as HTMLInputElement;

            if (inputNomeCriar && inputNomeEntrar) {
                inputNomeCriar.addEventListener("input", () => {
                    inputNomeEntrar.value = inputNomeCriar.value;
                });
                inputNomeEntrar.addEventListener("input", () => {
                    inputNomeCriar.value = inputNomeEntrar.value;
                });
            }
        }
    }


    if (onlineMenu) onlineMenu.style.display = "none";

    // Handle "Voltar ao Lobby" (Game Over Screen)
    const btnVoltarLobby = document.getElementById("btn-voltar-lobby");
    if (btnVoltarLobby) {
        btnVoltarLobby.onclick = function () {
            if (window.tocarSomClick) window.tocarSomClick();

            const telaVitoria = document.getElementById("tela-vitoria");
            if (telaVitoria) telaVitoria.style.display = "none";

            if (window.sairPartida) window.sairPartida();
        };
    }

    // --- DEBUG LOGGER UI ---
    if ((window as any).Logger && (window as any).Logger.isDev) {
        import("./utils/DebugLoggerUI.js").then(module => {
            new module.DebugLoggerUI();
            console.log("[Main] DebugLoggerUI Initialized");
        }).catch(e => console.error("Failed to load DebugLoggerUI", e));
    }

    // --- BOT VS BOT STUB ---
    (window as any).startBotVsBot = function () {
        if (!(window as any).PvEMode) {
            console.error("PvEMode not found.");
            return;
        }
        console.log("Starting Bot vs Bot Request...");
        // This requires significant logic changes to support 0 human players.
        // For now, we just log.
        if ((window as any).Logger) (window as any).Logger.game("Bot vs Bot Mode initiated (Simulation Only)");
    };

    // --- GLOBAL TRANSLATION UPDATE FUNCTION ---
    // Function to update all HTML elements with data-i18n attributes
    (window as any).updateHTMLTranslations = function () {
        // Import LocaleManager dynamically
        import('./data/LocaleManager.js').then(module => {
            const LocaleManager = module.default;

            // Update elements with data-i18n (text content)
            const elements = document.querySelectorAll('[data-i18n]');
            elements.forEach((el: any) => {
                const key = el.getAttribute('data-i18n');
                if (key) {
                    el.textContent = LocaleManager.t(key);
                }
            });

            // Update elements with data-i18n-placeholder (placeholder attribute)
            const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
            placeholderElements.forEach((el: any) => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (key) {
                    el.placeholder = LocaleManager.t(key);
                }
            });

            // Update localized images for Challenge/Boast buttons
            const currentLocale = LocaleManager.getCurrentLocale();
            const btnDesafiarImg = document.getElementById('btn-desafiar-img') as HTMLImageElement;
            const btnSegabarImg = document.getElementById('btn-segabar-img') as HTMLImageElement;

            if (btnDesafiarImg) {
                btnDesafiarImg.src = currentLocale === 'pt-BR'
                    ? './assets/img/ui/btn-desafiar.png'
                    : './assets/img/ui/btn-challenge.png';
            }

            if (btnSegabarImg) {
                btnSegabarImg.src = currentLocale === 'pt-BR'
                    ? './assets/img/ui/btn-Se_Gabar.png'
                    : './assets/img/ui/btn-Boast.png';
            }

            console.log('[Main] HTML translations updated');
        }).catch(err => {
            console.error('[Main] Failed to update HTML translations:', err);
        });
    };

    // Register LOCALE:CHANGE listener to auto-update HTML
    if ((window as any).EventBus) {
        (window as any).EventBus.on('LOCALE:CHANGE', () => {
            console.log('[Main] LOCALE:CHANGE detected, updating HTML translations...');
            (window as any).updateHTMLTranslations();
        });
    }

    // Initialize Room List Screen
    new RoomListScreen();

    // Initial translation update
    setTimeout(() => {
        (window as any).updateHTMLTranslations();
    }, 500);
});
