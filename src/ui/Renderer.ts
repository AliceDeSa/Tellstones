"use strict";
import LocaleManager from '../data/LocaleManager.js';
// =========================
// Renderização e Manipulação de DOM (Renderer)
// =========================

// Definition for Tooltips
(window as any).showTooltip = function (text: string, x: number, y: number) {
    const tooltip = document.getElementById("tooltip");
    if (tooltip && text) {
        tooltip.innerHTML = text;
        tooltip.style.display = "block";

        // Prevent overflow
        const rw = tooltip.offsetWidth;
        const rh = tooltip.offsetHeight;
        let finalX = x + 15;
        let finalY = y + 15;

        if (finalX + rw > window.innerWidth) finalX = x - rw - 10;
        if (finalY + rh > window.innerHeight) finalY = y - rh - 10;

        tooltip.style.left = finalX + "px";
        tooltip.style.top = finalY + "px";
    }
};

(window as any).hideTooltip = function () {
    const tooltip = document.getElementById("tooltip");
    if (tooltip) {
        tooltip.style.display = "none";
    }
};

const Renderer = {
    speechTimeout: null as any,
    // Exibe balão de fala do Bot no topo da tela (Global)
    mostrarFalaBot: function (texto: string) {
        // Remove previous bubble if exists to avoid stratification
        let existing = document.getElementById("bot-speech-bubble");
        if (existing)
            existing.remove();
        let bubble = document.createElement("div");
        bubble.id = "bot-speech-bubble";
        bubble.style.position = "fixed"; // Global positioning
        bubble.style.top = "12%"; // Top center area
        bubble.style.left = "50%";
        bubble.style.transform = "translateX(-50%) scale(0.8)"; // Start slightly small
        bubble.style.backgroundColor = "#ffffff";
        bubble.style.color = "#333";
        bubble.style.padding = "12px 24px";
        bubble.style.borderRadius = "10px";
        bubble.style.boxShadow = "0 8px 24px rgba(0,0,0,0.5)"; // Stronger shadow
        bubble.style.fontFamily = "'Cinzel', serif";
        bubble.style.fontSize = "18px";
        bubble.style.fontWeight = "bold";
        bubble.style.zIndex = "2100"; // Critical Priority
        bubble.style.opacity = "0";
        bubble.style.transition = "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"; // Bouncy pop
        bubble.style.pointerEvents = "none";
        bubble.style.textAlign = "center";
        bubble.style.minWidth = "220px";
        bubble.style.maxWidth = "80vw";
        // Triangle (Pointer downwards)
        const triangle = document.createElement("div");
        triangle.style.content = "''";
        triangle.style.position = "absolute";
        triangle.style.bottom = "-10px";
        triangle.style.left = "50%";
        triangle.style.marginLeft = "-10px";
        triangle.style.borderWidth = "10px 10px 0";
        triangle.style.borderStyle = "solid";
        triangle.style.borderColor = "#ffffff transparent transparent transparent";
        bubble.appendChild(triangle);
        // Text Node
        const textNode = document.createTextNode(texto);
        bubble.appendChild(textNode);
        // Re-append triangle to ensure it stays (though visual order matters less with absolute)
        bubble.appendChild(triangle);
        document.body.appendChild(bubble);
        // Animate In
        requestAnimationFrame(() => {
            bubble.style.opacity = "1";
            bubble.style.transform = "translateX(-50%) scale(1)";
        });
        // Auto-Hide
        if (this.speechTimeout)
            clearTimeout(this.speechTimeout);
        this.speechTimeout = setTimeout(() => {
            bubble.style.opacity = "0";
            bubble.style.transform = "translateX(-50%) scale(0.8)";
            setTimeout(() => {
                if (bubble.parentNode)
                    bubble.remove();
            }, 300);
        }, 4000);
    },
    // Remove o balão de fala do DOM e limpa timeouts
    limparFalaBot: function () {
        const bubble = document.getElementById("bot-speech-bubble");
        if (bubble)
            bubble.remove();
        if (this.speechTimeout)
            clearTimeout(this.speechTimeout);
    },
    // Renderiza as pedras na mesa (tabuleiro)
    renderizarPedrasMesa: function (mesa: any[]) {
        const wrapper = document.getElementById("tabuleiro-wrapper");
        if (!wrapper)
            return;
        // Remove pedras antigas (mas mantém slots)
        const antigas = wrapper.querySelectorAll(".pedra-mesa");
        antigas.forEach(el => el.remove());
        if (!window.GameConfig)
            return;
        const CFG = window.GameConfig.LAYOUT;
        const positions = this.getSlotPositions(wrapper, CFG.SLOT_COUNT, CFG.STONE_SIZE, CFG.Y_OFFSET_FIXED);
        mesa.forEach((p, i) => {
            if (!p)
                return;
            const div = document.createElement("div");
            div.className = "pedra-mesa"; // Classe base
            div.setAttribute("data-idx", i.toString());
            div.style.position = "absolute";
            div.style.width = CFG.STONE_SIZE + "px";
            div.style.height = CFG.STONE_SIZE + "px";
            div.style.left = positions[i].left + "px";
            div.style.top = positions[i].top + "px";
            div.style.transform = "translate(-50%, -50%)";
            div.style.background = "#fff"; // Fix: Restore white background for stones
            div.style.border = "2px solid #2d8cff"; // Fix: Restore blue border
            div.style.borderRadius = "50%"; // Fix: Ensure shadow follows circle shape

            // DEBUG: Verifying turn status
            const isMyTurn = window.ehMinhaVez ? window.ehMinhaVez() : false;
            // console.log(`[Renderer] Rendering stone ${i}. MyTurn: ${isMyTurn}, Alinhamento: ${window.estadoJogo.alinhamentoFeito}`);

            // FORCE POINTER EVENTS
            div.style.pointerEvents = "auto";
            div.style.cursor = isMyTurn ? "pointer" : "not-allowed";

            // Logic for image (Face Up or Down)
            if (p.virada) {
                div.innerHTML = ""; // Face down: Solid white stone (no image)
            } else {
                // FIXED: Runtime migration for legacy paths coming from Firebase
                let url = p.url;
                if (url && url.indexOf("assets/img/stones/demacia") === -1 && url.indexOf("assets/img/stones/new_set") === -1 && url.indexOf("assets/img/coins") === -1) {
                    // Legacy path detected? Fix it.
                    if (url.includes("Coroa")) url = "assets/img/stones/demacia/Coroa.svg";
                    else if (url.includes("espada")) url = "assets/img/stones/demacia/espada.svg";
                    else if (url.includes("escudo")) url = "assets/img/stones/demacia/escudo.svg";
                    else if (url.includes("cavalo")) url = "assets/img/stones/demacia/cavalo.svg";
                    else if (url.includes("bandeira")) url = "assets/img/stones/demacia/bandeira.svg";
                    else if (url.includes("martelo")) url = "assets/img/stones/demacia/martelo.svg";
                    else if (url.includes("Balanca")) url = "assets/img/stones/demacia/Balanca.svg";
                    else if (url.includes("Cara.png")) url = "assets/img/coins/classic/Cara.png"; // Coin fix
                    else if (url.includes("Coroa.png")) url = "assets/img/coins/classic/Coroa.png"; // Coin fix
                }

                div.innerHTML = `<img src="${url}" alt="${p.nome}" draggable="false" style="width:100%; height:100%; border-radius:50%; pointer-events:none;">`;
            }
            // HIGHLIGHT CHALLENGED STONE
            const desafio = window.estadoJogo.desafio;
            if (desafio && !desafio.resolvido && (desafio.alvo == i || desafio.pedra == i || desafio.idxPedra == i)) {
                div.style.setProperty("box-shadow", "0 0 15px 5px yellow", "important");
                div.style.setProperty("border", "3px solid yellow", "important");
                div.style.setProperty("transform", "translate(-50%, -50%) scale(1.15)", "important");
                div.style.setProperty("z-index", "1000", "important");
            }
            else {
                div.style.boxShadow = "0 0 20px rgba(0,0,0,0.5)";
            }
            // --- INTERACTION LOGIC (Drag & Double Click) ---
            if (window.ehMinhaVez && window.ehMinhaVez()) {
                // 1. Double Click (Hide / Peek)
                div.ondblclick = (e) => {
                    e.preventDefault();
                    if (p.virada) {
                        // PEEK (Espiar / Full Logic)

                        // 1. Rich Notification
                        if (window.notificationManager) {
                            window.notificationManager.showInternal(
                                `Você espiou: ${p.nome} <span style='display:inline-block;width:44px;height:44px;background:#fff;border-radius:50%;vertical-align:middle;margin-left:8px;box-shadow:0 1px 4px #0002;'><img src='${p.url}' alt='${p.nome}' style='width:40px;height:40px;vertical-align:middle;margin:2px;'></span>`
                            );
                        }

                        // 2. Notify others (Public Log)
                        if (window.getDBRef && window.salaAtual && window.nomeAtual) {
                            window.getDBRef("salas/" + window.salaAtual + "/notificacoes").push({
                                msg: `${window.nomeAtual} espiou uma pedra.`,
                                skip: window.nomeAtual
                            });

                            // 3. Update State (mesaEspiada) -> Triggers animation/golden border
                            window.getDBRef("salas/" + window.salaAtual + "/estadoJogo").update({ mesaEspiada: i });

                            // 4. Cleanup after delay
                            setTimeout(() => {
                                if (window.getDBRef) window.getDBRef("salas/" + window.salaAtual + "/estadoJogo/mesaEspiada").remove();
                            }, 2200);
                        }

                        // 5. Notify Tutorial
                        if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();

                        // 6. Advance Turn
                        if (window.avancarTurno) window.avancarTurno();

                    } else {
                        // HIDE (Esconder)
                        if (window.tocarSomPress) window.tocarSomPress();
                        window.estadoJogo.mesa[i].virada = true;

                        // Save State
                        if (window.GameController) window.GameController.persistirEstado();

                        // Notify Tutorial
                        if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();

                        // Advance Turn
                        if (window.avancarTurno) window.avancarTurno();

                        // Force Immediate Re-render (Visual Feedback)
                        if (window.Renderer) window.Renderer.renderizarMesa();
                    }
                };

                // 2. Drag & Drop (Swap)
                div.setAttribute("draggable", "true");

                div.ondragstart = (e) => {
                    if (e.dataTransfer) {
                        e.dataTransfer.setData("idx", i.toString());
                        e.dataTransfer.effectAllowed = "move";
                        div.style.opacity = "0.5";
                        if (window.notificationManager) window.notificationManager.showInternal(`Arrastando ${p.nome}...`);
                    }
                };

                div.ondragend = () => {
                    div.style.opacity = "1";
                };

                div.ondragover = (e) => {
                    e.preventDefault(); // Necessary to allow dropping
                    e.dataTransfer!.dropEffect = "move";
                    div.style.border = "2px solid yellow";
                };

                div.ondragleave = () => {
                    div.style.border = "2px solid #2d8cff"; // Restore
                };

                div.ondrop = (e) => {
                    e.preventDefault();
                    div.style.border = "2px solid #2d8cff";

                    if (!e.dataTransfer) return;
                    const fromIdx = parseInt(e.dataTransfer.getData("idx"));

                    // Validate Swap
                    if (!isNaN(fromIdx) && fromIdx !== i) {
                        console.log(`[Renderer] Swapping ${fromIdx} <-> ${i}`);

                        // Check if valid start stone exists
                        if (!window.estadoJogo.mesa[fromIdx]) {
                            if (window.notificationManager) window.notificationManager.showInternal("Inválido!");
                            return;
                        }

                        // Use GameController to trigger swap via 'trocaAnimacao' (Legacy Pattern)
                        // This ensures all clients receive the animation trigger
                        if (window.GameController && window.GameController.realizarTroca) {
                            window.GameController.realizarTroca(fromIdx, i);
                        }
                        // Fallback: Direct Firebase Update if GameController method missing (Legacy Shim)
                        else if (window.getDBRef && window.salaAtual && window.nomeAtual) {
                            window.getDBRef("salas/" + window.salaAtual + "/estadoJogo/trocaAnimacao").set({
                                from: fromIdx,
                                to: i,
                                timestamp: Date.now(),
                                jogador: window.nomeAtual
                            });
                        }
                        else {
                            // Local Logic Only (Offline/PvE Fallback)
                            // Logic
                            if (window.realizarTroca) {
                                window.realizarTroca(fromIdx, i);
                            } else {
                                const temp = window.estadoJogo.mesa[fromIdx];
                                window.estadoJogo.mesa[fromIdx] = window.estadoJogo.mesa[i];
                                window.estadoJogo.mesa[i] = temp;
                                if (window.GameController) window.GameController.persistirEstado();
                                if (window.avancarTurno) window.avancarTurno();
                                if (window.Renderer) window.Renderer.renderizarMesa();
                            }
                        }

                        if (window.notificationManager) window.notificationManager.showInternal("Pedras trocadas!");

                        // Tutorial Trigger (Swap Action)
                        if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
                    }
                };
            } else {
                div.style.cursor = "not-allowed";
                div.title = "Aguarde sua vez";
            }

            // Click Handler for Challenge (Special Case)
            div.onclick = function (e) {
                if (window.selecionandoDesafio || (window.estadoJogo.desafio && window.estadoJogo.desafio.status === "selecionando")) {
                    e.stopPropagation();
                    if (!p.virada) {
                        if (window.notificationManager)
                            window.notificationManager.showInternal("Escolha uma pedra virada para desafiar!");
                        return;
                    }

                    // Notify User
                    if (window.notificationManager) window.notificationManager.showInternal("Aguarde o oponente escolher a pedra!");

                    // Visual Feedback
                    // if (window.adicionarSilhuetaEspiada) window.adicionarSilhuetaEspiada(i);

                    // Update State
                    window.selecionandoDesafio = false;

                    // Logic from main.js to update State
                    const desafioAtual = window.estadoJogo.desafio || {};
                    desafioAtual.pedra = i;
                    desafioAtual.idxPedra = i; // Compatibility
                    desafioAtual.alvo = i; // Compatibility
                    desafioAtual.jogador = window.nomeAtual; // REQUIRED for Tutorial Validation
                    // desafioAtual.tipo = 'desafio'; // Usually set by start button?
                    desafioAtual.status = 'aguardando_resposta'; // Sync with main.js legacy

                    window.estadoJogo.desafio = desafioAtual;

                    // Firebase Update (if global getDBRef exists, otherwise GameController handles persistence)
                    if (window.GameController) {
                        window.GameController.persistirEstado();
                    } else if (window.getDBRef && window.salaAtual) {
                        window.getDBRef("salas/" + window.salaAtual + "/estadoJogo/desafio").set(desafioAtual);
                    }

                    // TUTORIAL TRIGGER
                    if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();

                    // Advance Turn
                    if (window.avancarTurno) window.avancarTurno();

                    // Force Re-render
                    if (window.Renderer) window.Renderer.renderizarMesa();
                }
            };
            // Tooltip
            if (p.virada) {
                div.onmouseenter = (e) => window.showTooltip(LocaleManager.t('game.tooltips.hiddenStone'), e.clientX, e.clientY);
            }
            else {
                div.onmouseenter = (e) => window.showTooltip(LocaleManager.t('game.stones.' + p.nome), e.clientX, e.clientY);
            }
            div.onmouseleave = window.hideTooltip;
            wrapper.appendChild(div);
        });
    },
    // Adiciona slots fixos proporcionais no tabuleiro
    desenharSlotsFixos: function () {
        const wrapper = document.getElementById("tabuleiro-wrapper");
        if (!wrapper)
            return;
        // Remove slots antigos
        const antigos = wrapper.querySelectorAll(".slot-fixo");
        antigos.forEach((el) => el.remove());
        if (!window.GameConfig)
            return;
        const CFG = window.GameConfig.LAYOUT;
        // Use slot count (7) explicitly or config
        const positions = this.getSlotPositions(wrapper, CFG.SLOT_COUNT, CFG.STONE_SIZE, CFG.Y_OFFSET_FIXED);
        for (let i = 0; i < CFG.SLOT_COUNT; i++) {
            const slot = document.createElement("div");
            slot.className = "slot-fixo";
            slot.setAttribute("data-slot", i.toString());
            slot.style.position = "absolute";
            slot.style.width = CFG.STONE_SIZE + "px";
            slot.style.height = CFG.STONE_SIZE + "px";
            slot.style.left = positions[i].left + "px";
            slot.style.top = positions[i].top + "px";
            slot.style.transform = "translate(-50%, -50%)";
            slot.style.border = "none";
            slot.style.background = "transparent";
            wrapper.appendChild(slot);
        }
    },
    // Renderiza a imagem do tabuleiro na tela
    renderizarMesa: function () {
        if (window.animacaoTrocaEmAndamento)
            return;
        if (!window.estadoJogo)
            return;
        window.estadoJogo.mesa = window.garantirArray(window.estadoJogo.mesa);
        // Ensure 7 slots logic
        if (window.estadoJogo.mesa.length !== 7) {
            const novaMesa = Array(7).fill(null);
            // Handle legacy 1-slot or misalignment
            if (window.estadoJogo.mesa.length === 1 && window.estadoJogo.mesa[0] && window.estadoJogo.centralAlinhada) {
                novaMesa[3] = window.estadoJogo.mesa[0];
            }
            if (window.estadoJogo && window.estadoJogo.mesa) {
                window.estadoJogo.mesa.forEach((p: any, i: number) => {
                    if (p)
                        novaMesa[i] = p;
                });
            }
            window.estadoJogo.mesa = novaMesa;
        }
        // Render Stones
        this.renderizarPedrasMesa(window.estadoJogo.mesa);
        this.renderizarPedrasMesa(window.estadoJogo.mesa);
        this.desenharSlotsFixos();
        this.renderizarMarcadoresPonto(); // FORCE RENDER DOTS
        // Garante a atualização da UI de Desafio
        this.renderizarOpcoesDesafio();
        this.renderizarOpcoesSegabar();
        this.renderizarRespostaSegabar();
    },
    // Atualiza informações da sala, espectadores, placar e turno
    atualizarInfoSala: function (codigo: string, espectadores: any[]) {
        const codigoEl = document.getElementById("codigo-sala-valor");
        if (codigoEl)
            codigoEl.innerText = codigo;
        const listaEsp = document.getElementById("lista-espectadores");
        if (listaEsp) {
            listaEsp.innerHTML = espectadores
                .map((e: any) => `<span>${e.nome}</span>`)
                .join(", ");
        }
        const infoSala = document.getElementById("info-sala");
        if (infoSala) {
            if ((!codigo || codigo.trim() === "") && (!espectadores || espectadores.length === 0)) {
                infoSala.style.display = "none";
            }
            else {
                infoSala.style.display = "";
            }
        }
        // Placar
        const placarTurnoDiv = document.getElementById("placar-turno-central");
        if (placarTurnoDiv && window.estadoJogo && window.estadoJogo.jogadores && window.estadoJogo.jogadores.length > 0) {
            const placar = window.estadoJogo.jogadores
                .map((j: any, i: number) => {
                    const destaque = (window.estadoJogo.jogadores.length === 2 && i === window.estadoJogo.vez) ||
                        (window.estadoJogo.jogadores.length === 4 && i % 2 === window.estadoJogo.vez);
                    return `<span style='${destaque ? "color:#ffd700;font-weight:bold;text-shadow:0 0 8px #ffd70088;" : ""}'>${j.nome}: ${j.pontos}</span>`;
                })
                .join(" <b>|</b> ");
            placarTurnoDiv.innerHTML = `<div style='margin-bottom:4px;'>${placar}</div>`;
        }

        // Call the new internal method for visual dots
        this.renderizarMarcadoresPonto();
    },

    // New Method: Bridge from Controller
    atualizarPlacar: function (jogadores: any[]) {
        // Just refresh the room info/score display
        this.atualizarInfoSala(window.salaAtual || "Sala", window.ultimosEspectadores || []);
    },

    // New Method: Visual Score Dots
    renderizarMarcadoresPonto: function () {
        if (!window.estadoJogo || !window.estadoJogo.jogadores) return;

        // Remove 'ativo' from all first
        const marcadoresEsquerda = document.querySelectorAll(".marcador-esquerda");
        const marcadoresDireita = document.querySelectorAll(".marcador-direita");

        marcadoresEsquerda.forEach((el) => el.classList.remove("ativo"));
        marcadoresDireita.forEach((el) => el.classList.remove("ativo"));

        // Player 1 (Human/Aprendiz) -> Bottom Left markers
        const p1 = window.estadoJogo.jogadores[0];
        if (p1 && p1.pontos > 0) {
            for (let i = 0; i < p1.pontos; i++) {
                // FIX: Player 1 = Bottom Left (marcador-esquerda)
                const marker = document.querySelector(`.marcador-esquerda[data-idx='${i}']`);
                if (marker) marker.classList.add("ativo");
            }
        }

        // Player 2 (Bot/Mestre) -> Top Right markers
        const p2 = window.estadoJogo.jogadores[1];
        if (p2 && p2.pontos > 0) {
            for (let i = 0; i < p2.pontos; i++) {
                // FIX: Player 2 = Top Right (marcador-direita)
                const marker = document.querySelector(`.marcador-direita[data-idx='${i}']`);
                if (marker) marker.classList.add("ativo");
            }
        }
    },
    renderizarPedrasReserva: function () {
        if (window.animacaoAlinhamentoEmAndamento && !window.estadoJogo.alinhamentoFeito)
            return;
        window.estadoJogo.reserva = window.garantirArray(window.estadoJogo.reserva);
        if (window.estadoJogo.alinhamentoFeito) {
            this.renderizarPedrasVerticaisAbsoluto(window.estadoJogo.reserva);
        }
        else {
            this.renderizarPedrasCirculo(window.estadoJogo.reserva, window.estadoJogo.pedraCentral);
        }
    },
    renderizarPedrasCirculo: function (pedras: any[], pedraCentral: any) {
        const circle = document.getElementById("circle-pedras");
        if (!circle || !pedras || pedras.length === 0)
            return;
        circle.style.display = "";
        circle.innerHTML = "";
        const angStep = 360 / pedras.length;
        const raio = 100;
        if (typeof window.animouReservaCircular === "undefined")
            window.animouReservaCircular = false;
        let animar = false;
        if (!window.animouReservaCircular && pedras.length > 0) {
            animar = true;
        }
        const TEMPO_ANIMACAO_PEDRA = 180;
        pedras.forEach((p, i) => {
            if (!p)
                return;
            const ang = ((angStep * i - 90) * Math.PI) / 180;
            const x = Math.cos(ang) * raio + 90;
            const y = Math.sin(ang) * raio + 90;
            const div = document.createElement("div");
            div.className = "pedra-circulo pedra-reserva";
            // Shared Logic
            div.innerHTML = `<img src="${this._fixAssetPath(p.url)}" alt="${p.nome}" draggable="false">`;
            div.setAttribute("data-idx", i.toString());
            div.onmouseenter = function (e: MouseEvent) { window.showTooltip(LocaleManager.t('game.tooltips.dragToTable'), e.clientX, e.clientY); };
            div.onmousemove = function (e: MouseEvent) { window.showTooltip(LocaleManager.t('game.tooltips.dragToTable'), e.clientX, e.clientY); };
            div.onmouseleave = window.hideTooltip;
            div.onmouseout = window.hideTooltip;
            circle.appendChild(div);
            if (animar) {
                div.style.left = "90px";
                div.style.top = "90px";
                div.style.transform = "scale(0.2)";
                div.style.opacity = "0";
                setTimeout(() => {
                    div.style.transition = "all 0.8s cubic-bezier(0.77,0,0.175,1)";
                    div.style.left = x + "px";
                    div.style.top = y + "px";
                    div.style.transform = "scale(1)";
                    div.style.opacity = "1";
                    if (i === pedras.length - 1) {
                        window.animouReservaCircular = true;
                    }
                }, TEMPO_ANIMACAO_PEDRA + i * TEMPO_ANIMACAO_PEDRA);
            }
            else {
                div.style.left = x + "px";
                div.style.top = y + "px";
                div.style.transform = "scale(1)";
                div.style.opacity = "1";
            }
        });
        if (pedraCentral) {
            const central = document.createElement("div");
            central.className = "pedra-circulo pedra-reserva pedra-central";
            central.style.left = "90px";
            central.style.top = "90px";
            central.innerHTML = `<img src="${pedraCentral.url}" alt="${pedraCentral.nome}" draggable="false">`;
            central.onmousedown = null;
            central.style.cursor = "not-allowed";
            central.title = LocaleManager.t('game.tooltips.waitAlignment');
            circle.appendChild(central);
        }
    },
    renderizarPedrasVerticaisAbsoluto: function (pedras: any[]) {
        if (window.animacaoAlinhamentoEmAndamento)
            return;
        const circle = document.getElementById("circle-pedras");
        if (!circle)
            return;
        circle.style.display = "flex";
        circle.style.flexDirection = "column";
        circle.style.justifyContent = "flex-start";
        circle.style.alignItems = "flex-start";
        circle.style.gap = "6px";
        circle.style.position = "fixed";
        if (window.innerWidth < 900) {
            circle.style.left = "40px";
            circle.style.top = "20px";
            circle.style.transform = "scale(0.65)";
            circle.style.transformOrigin = "top left";
            circle.style.flexWrap = "wrap";
            circle.style.maxHeight = "90vh";
        }
        else {
            circle.style.left = "20px";
            circle.style.top = "130px";
            circle.style.transform = "none";
        }
        circle.style.width = "auto";
        circle.style.height = "auto";
        circle.style.pointerEvents = "auto";
        circle.style.paddingTop = "0";
        circle.style.zIndex = "300";
        circle.innerHTML = "";
        pedras.forEach((p, i) => {
            if (!p)
                return;
            const div = document.createElement("div");
            div.className = "pedra-circulo pedra-reserva";
            div.style.position = "relative";
            div.style.left = "0";
            div.style.top = "0";
            div.style.width = "55px";
            div.style.height = "55px";
            // Important: Inner image needs no border-radius if container handles it
            div.innerHTML = `<img src="${this._fixAssetPath(p.url)}" alt="${p.nome}" draggable="false" style="width:100%; height:100%;">`;
            div.setAttribute("data-idx", i.toString());
            // Delegate Interaction and Visuals to InputHandler
            if (window.InputHandler) {
                window.InputHandler.setupReservaItem(div, p, i, true);
            }
            // Visual State Management (Disabled/Enabled cursor)
            if (!(window.estadoJogo.alinhamentoFeito && window.ehMinhaVez())) {
                div.style.cursor = "not-allowed";
                div.title = window.estadoJogo.alinhamentoFeito
                    ? LocaleManager.t('game.tooltips.waitTurn')
                    : LocaleManager.t('game.tooltips.waitAlignment');
                div.onmousedown = null;
                div.ontouchstart = null;
            }
            else {
                div.style.cursor = "pointer";
                div.title = "";
            }
            // Tooltip handler
            if (!div.title) {
                div.onmouseenter = function (e: MouseEvent) { window.showTooltip(LocaleManager.t('game.stones.' + p.nome), e.clientX, e.clientY); };
                div.onmousemove = function (e: MouseEvent) { window.showTooltip(LocaleManager.t('game.stones.' + p.nome), e.clientX, e.clientY); };
                div.onmouseleave = window.hideTooltip;
                div.onmouseout = window.hideTooltip;
            }
            circle.appendChild(div);
        });
    },
    getSlotPositions: function (wrapper: HTMLElement, count: number, slotSize: number, gap: number) {
        if (!wrapper)
            return [];
        const w = wrapper.clientWidth;
        const h = wrapper.clientHeight;
        const positions = [];
        const cy = h / 2;
        let actualGap = gap;
        let actualSlotSize = slotSize;
        const totalWidthNeeded = (count * slotSize) + ((count - 1) * gap);
        const maxW = w * 0.90;
        if (totalWidthNeeded > maxW) {
            const scale = maxW / totalWidthNeeded;
            actualSlotSize = slotSize * scale;
            actualGap = gap * scale;
        }
        const totalW = (count * actualSlotSize) + ((count - 1) * actualGap);
        let startX = (w - totalW) / 2;
        for (let i = 0; i < count; i++) {
            positions.push({
                left: startX + (i * (actualSlotSize + actualGap)) + (actualSlotSize / 2),
                top: cy
            });
        }
        return positions;
    },
    desenharHighlightsFixos: function (validos: number[], wrapper: HTMLElement) {
        // Implementation kept for compatibility (may be unused)
        // const positions = this.getSlotPositions(wrapper, 7, 68.39, 40);
        const antigos = wrapper.querySelectorAll(".highlight-slot");
        antigos.forEach((h) => h.remove());
        // Highlights are currently disabled in JS code logic (commented out in original)
        // Leaving logic skeleton if needed for future
    },

    // --- STONE MOVEMENTS & ALIGNMENT ---
    sincronizarPedraCentralEAlinhamento: function () {
        console.log("[Renderer] sincronizarPedraCentralEAlinhamento CALLED");
        // This function syncs the transition from "Circle" (Post-Coin Flip) to "Line" (Game Start)
        if (window.animacaoAlinhamentoEmAndamento) {
            console.log("[Renderer] Animation already in progress. Aborting.");
            return;
        }

        const circle = document.getElementById("circle-pedras");
        if (!circle) {
            console.error("[Renderer] Circle element not found!");
            return;
        }

        // Force visibility
        circle.style.display = "block";

        if (window.estadoJogo.alinhamentoFeito) {
            console.log("[Renderer] Alinhamento already done. Rendering reserve.");
            this.renderizarPedrasReserva();
            return;
        }

        window.animacaoAlinhamentoEmAndamento = true;
        const wrapper = document.getElementById("tabuleiro-wrapper");
        const tabuleiroCenter = document.getElementById("tabuleiro-center"); // Corrected ID from 'centro' to 'center'

        if (wrapper && tabuleiroCenter) {
            console.log("[Renderer] Starting _executarAnimacaoAlinhamento...");
            this._executarAnimacaoAlinhamento(circle, wrapper, tabuleiroCenter);
        } else {
            console.error("[Renderer] Wrapper or Center not found for animation. wrapper:", !!wrapper, "center:", !!tabuleiroCenter);
            // Fallback if UI not ready
            window.animacaoAlinhamentoEmAndamento = false;
            window.estadoJogo.alinhamentoFeito = true;
        }
    },

    _executarAnimacaoAlinhamento: function (circle: HTMLElement, wrapper: HTMLElement, tabuleiroCenter: HTMLElement) {
        console.log("[Renderer] _executarAnimacaoAlinhamento STARTED");
        let pedraCentral = window.estadoJogo.pedraCentral;
        console.log("[Renderer] Stone Central from State:", pedraCentral);

        const larguraPedra = 80;

        // Visual Element in Circle (Source)
        const centralDiv = circle.querySelector(".pedra-central") as HTMLElement;
        console.log("[Renderer] centralDiv found?", !!centralDiv);
        let startX, startY;

        if (centralDiv) {
            const rect = centralDiv.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.top + rect.height / 2;
            centralDiv.style.opacity = "0"; // Hide source visually
        } else {
            const circleRect = circle.getBoundingClientRect();
            startX = circleRect.left + 90;
            startY = circleRect.top + 90;
        }

        console.log(`[Renderer] Animation Start Coords: ${startX}, ${startY}`);

        // Destination: Center Slot of Table (Target)
        const wrapperRect = wrapper.getBoundingClientRect();
        const slotWidth = wrapperRect.width / 7;
        const destX = wrapperRect.left + (slotWidth * 3) + (slotWidth / 2);
        const destY = wrapperRect.top + (wrapperRect.height / 2);

        // Create Animated Stone (Fixed to Viewport)
        const pedraAnimada = document.createElement("div");
        pedraAnimada.className = "pedra-mesa pedra-oficial pedra-animada-mesa";
        pedraAnimada.style.position = "fixed";
        pedraAnimada.style.left = startX + "px";
        pedraAnimada.style.top = startY + "px";
        pedraAnimada.style.width = larguraPedra + "px";
        pedraAnimada.style.height = larguraPedra + "px";
        pedraAnimada.style.zIndex = "999999";
        pedraAnimada.style.transform = "translate(-50%, -50%)";
        pedraAnimada.style.borderRadius = "50%";

        if (pedraCentral) {
            pedraAnimada.innerHTML = `<img src="${pedraCentral.url}" alt="${pedraCentral.nome}" draggable="false" style="width:100%;height:100%;border-radius:50%">`;
        }
        document.body.appendChild(pedraAnimada);

        const anim = pedraAnimada.animate([
            { left: startX + "px", top: startY + "px" },
            { left: destX + "px", top: destY + "px" }
        ], {
            duration: 1500,
            easing: "cubic-bezier(0.25, 1, 0.5, 1)",
            fill: "forwards"
        });

        // CRITICAL: Safety timeout to ensure callback fires even if onfinish fails
        let callbackFired = false;
        const executeCallback = () => {
            if (callbackFired) return;
            callbackFired = true;

            pedraAnimada.remove();

            // 1. UPDATE STATE
            const novaMesa = [null, null, null, pedraCentral, null, null, null];

            if (window.getDBRef && window.salaAtual) {
                window.getDBRef("salas/" + window.salaAtual + "/estadoJogo").update({
                    mesa: novaMesa,
                    pedraCentral: null,
                    centralAlinhada: true,
                    alinhamentoFeito: true
                });
            } else {
                window.estadoJogo.mesa = novaMesa;
                window.estadoJogo.pedraCentral = null;
                window.estadoJogo.centralAlinhada = true;
                window.estadoJogo.alinhamentoFeito = true;
                if (window.GameController) window.GameController.persistirEstado();
            }

            // 2. RENDER TABLE
            if (window.Renderer) window.Renderer.renderizarMesa();

            // 3. ANIMATE REMAINING STONES
            const pedrasDivs = Array.from(circle.querySelectorAll(".pedra-circulo:not(.pedra-central)")) as HTMLElement[];
            const total = pedrasDivs.length;
            const containerAltura = 260; // Approximated
            const alturaPedra = 80;
            const espacamento = total > 1 ? (containerAltura - alturaPedra) / (total - 1) : 0;

            pedrasDivs.forEach((div, i) => {
                const rect = div.getBoundingClientRect();
                const parentRect = circle.getBoundingClientRect();
                const leftAtual = rect.left - parentRect.left;
                const topAtual = rect.top - parentRect.top;

                // Target local coordinates relative to circle container just like Legacy
                const leftFinal = 90 - leftAtual;
                const topFinal = i * espacamento - topAtual;

                div.style.transition = "transform 0.7s cubic-bezier(0.77,0,0.175,1)";
                div.style.zIndex = "10000";
                div.style.transform = `translate(${leftFinal}px, ${topFinal}px)`;
            });

            // 4. CLEANUP
            setTimeout(() => {
                if (circle) circle.innerHTML = "";
                window.animacaoAlinhamentoEmAndamento = false;
                if (window.Renderer) window.Renderer.renderizarPedrasReserva();
                window.estadoJogo.alinhamentoFeito = true;

                // NOTIFY ONLY - Do not advance turn (CoinFlip already decided who starts)
                // The state update above (alinhamentoFeito=true) should trigger consumers.
                if (window.GameController && window.GameController.notificarAtualizacao) {
                    window.GameController.notificarAtualizacao();
                }
            }, 700);
        };

        anim.onfinish = executeCallback;

        // Safety timeout: 2s (animation is 1.5s + 0.7s cleanup = 2.2s total expected)
        setTimeout(() => {
            if (!callbackFired) {
                console.warn("[Renderer] Alignment Animation Safety Timeout Triggered");
                executeCallback();
            }
        }, 2000);
    },
    animarPedraReservaParaMesa: function (ghost: HTMLElement, wrapper: HTMLElement, slotIdx: number, callback: Function) {
        const larguraWrapper = wrapper.offsetWidth;
        const larguraPedra = 80;
        const slots = 7;
        const slotLargura = larguraWrapper / slots;
        const leftFinal = wrapper.getBoundingClientRect().left +
            slotLargura * slotIdx +
            slotLargura / 2 -
            larguraPedra / 2;
        const topFinal = wrapper.getBoundingClientRect().top +
            wrapper.offsetHeight / 2 -
            larguraPedra / 2;
        const leftStart = parseFloat(ghost.style.left);
        const topStart = parseFloat(ghost.style.top);
        const anim = ghost.animate([
            { left: leftStart + "px", top: topStart + "px" },
            { left: leftFinal + "px", top: topFinal + "px" }
        ], {
            duration: 700,
            easing: "cubic-bezier(0.77, 0, 0.175, 1)",
            fill: "forwards"
        });


        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            if (callback) callback();
        };

        anim.onfinish = finish;
        setTimeout(finish, 1000); // Safety net for 700ms animation
    },
    // Consolidated Animation Logic
    animarBotColocar: function (pedra: any, fromIdx: number, slotIdx: number, callback: Function) {
        if (!pedra) {
            if (callback)
                callback();
            return;
        }
        // --- ATTEMPT 1: Try to find existing DOM element in Reserve to animate from visually ---
        const circle = document.getElementById("circle-pedras");
        let element: HTMLElement | null = null;
        if (circle) {
            const candidates = circle.querySelectorAll(".pedra-reserva");
            candidates.forEach((el) => {
                const img = el.querySelector("img");
                if (img && (img.src.includes(encodeURIComponent(pedra.url)) || img.src.includes(pedra.url))) {
                    element = el as HTMLElement;
                }
            });
        }
        // Encontrar elemento visual da pedra na mão
        const reservaContainer = document.getElementById("pedras-mao");
        if (reservaContainer) {
            const pedrasMao = Array.from(reservaContainer.children) as HTMLElement[];
            if (pedrasMao[fromIdx]) {
                element = pedrasMao[fromIdx];
            }
        }
        if (element) {
            // Animate from existing element clone
            const ghost = element.cloneNode(true) as HTMLElement;
            const rect = element.getBoundingClientRect();
            ghost.style.position = "fixed";
            ghost.style.left = rect.left + "px";
            ghost.style.top = rect.top + "px";
            ghost.style.width = rect.width + "px";
            ghost.style.height = rect.height + "px";
            ghost.style.zIndex = "2000"; // Visual FX Tier
            ghost.style.pointerEvents = "none";
            ghost.style.opacity = "1";
            document.body.appendChild(ghost);
            // Hide original
            element.style.opacity = "0";
            const tab = document.getElementById("tabuleiro-wrapper");
            if (tab) {
                this.animarPedraReservaParaMesa(ghost, tab, slotIdx, () => {
                    ghost.remove();
                    if (callback)
                        callback();
                });
            }
            else {
                ghost.remove();
                if (callback)
                    callback();
            }
            return;
        }
        // --- ATTEMPT 2: Fallback (Ghost from scratch) ---
        // Helpful if reserve is not rendered or Bot cheats/plays invisible stone
        const startX = -70;
        const startY = window.innerHeight / 2 - 30;
        const ghost = document.createElement("div");
        ghost.className = "ghost-pedra";
        ghost.innerHTML = `<img src="${pedra.url}" style="width:100%;height:100%;border-radius:50%">`;
        ghost.style.position = "fixed";
        ghost.style.left = startX + "px";
        ghost.style.top = startY + "px";
        ghost.style.width = "60px";
        ghost.style.height = "60px";
        ghost.style.zIndex = "2000"; // Visual FX
        ghost.style.transition = "all 1.5s cubic-bezier(0.25, 1, 0.5, 1)";
        document.body.appendChild(ghost);
        // Destination Calc
        let destX = window.innerWidth / 2;
        let destY = window.innerHeight / 2;
        const wrapper = document.getElementById("tabuleiro-wrapper");
        if (wrapper) {
            const CFG = window.GameConfig ? window.GameConfig.LAYOUT : { STONE_SIZE: 68.39 };
            const positions = this.getSlotPositions(wrapper, 7, CFG.STONE_SIZE || 68.39, 40);
            if (positions[slotIdx]) {
                const rectWrapper = wrapper.getBoundingClientRect();
                destX = rectWrapper.left + positions[slotIdx].left;
                destY = rectWrapper.top + positions[slotIdx].top;
            }
        }
        requestAnimationFrame(() => {
            ghost.style.left = (destX - 30) + "px";
            ghost.style.top = (destY - 30) + "px";
        });
        const finish = () => {
            ghost.remove();
            if (callback)
                callback();
        };
        ghost.ontransitionend = finish;
        setTimeout(finish, 1600); // Safety
    },
    renderBotMemoryDebug: function (botBrain: any) {
        let container = document.getElementById("bot-memory-debug");
        const params = new URLSearchParams(window.location.search);
        const isDev = localStorage.getItem('tellstones_dev_mode') === 'true' || params.get('dev') === 'true';
        if (!isDev) {
            if (container)
                container.remove();
            return;
        }
        if (!container) {
            container = document.createElement("div");
            container.id = "bot-memory-debug";
            container.style.position = "absolute";
            container.style.top = "0";
            container.style.left = "0";
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.pointerEvents = "none";
            container.style.zIndex = "9005"; // Debug Layer
            const wrapper = document.getElementById("tabuleiro-wrapper");
            if (wrapper)
                wrapper.appendChild(container);
        }
        container.innerHTML = "";
        if (!botBrain || !botBrain.memory)
            return;
        const wrapper = document.getElementById("tabuleiro-wrapper");
        if (!wrapper)
            return;
        const CFG = window.GameConfig ? window.GameConfig.LAYOUT : { STONE_SIZE: 68.39 };
        const positions = this.getSlotPositions(wrapper, 7, CFG.STONE_SIZE || 68.39, 40);
        positions.forEach((pos, idx) => {
            const mem = botBrain.memory[idx];
            if (mem && container) {
                const badge = document.createElement("div");
                badge.style.position = "absolute";
                badge.style.left = pos.left + "px";
                badge.style.top = (pos.top - 60) + "px";
                badge.style.transform = "translateX(-50%)";
                badge.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
                badge.style.color = "#00ff00";
                badge.style.padding = "4px 8px";
                badge.style.borderRadius = "4px";
                badge.style.fontSize = "10px";
                badge.style.fontFamily = "monospace";
                badge.style.textAlign = "center";
                badge.style.border = "1px solid #00ff00";
                badge.style.pointerEvents = "none";
                const confPercent = Math.round(mem.confidence * 100);
                badge.innerHTML = `<div>${mem.stoneName}</div><div style="font-weight:bold">${confPercent}%</div>`;
                container.appendChild(badge);
            }
        });
    },
    animarTroca: function (fromIdx: number, toIdx: number, pedraFromData: any, pedraToData: any, callback: Function) {
        if (window.AnimationManager) {
            console.log(`[Renderer] Delegating Swap Animation: ${fromIdx} <-> ${toIdx}`);
            window.AnimationManager.playSwap(fromIdx, toIdx, callback);
        }
        else {
            console.warn("[Renderer] AnimationManager missing, running callback immediately.");
            if (callback)
                callback();
        }
    },
    lastTrocaTimestamp: 0,
    monitorarTrocas: function (estado: any, onComplete: Function) {
        if (!estado || !estado.trocaAnimacao)
            return;
        const troca = estado.trocaAnimacao;
        // Debug Log
        // console.log(`[Renderer] Checking Swap: TS=${troca.timestamp} vs Last=${this.lastTrocaTimestamp}`);

        if (troca.timestamp <= this.lastTrocaTimestamp)
            return;

        console.log(`[Renderer] New Swap Detected! Initiating Animation...`);
        this.lastTrocaTimestamp = troca.timestamp;

        // Player or Bot?
        // Renderer doesn't care, just animates.
        const pedraA = estado.mesa[troca.from];
        const pedraB = estado.mesa[troca.to];
        this.animarTroca(troca.from, troca.to, null, null, () => {
            console.log("[Renderer] Swap Animation Finished. Calling onComplete...");
            try {
                // Primary Callback (PvEMode usually)
                if (onComplete) {
                    onComplete(troca);
                }

                // FALLBACK ROBUSTNESS: Ensure State is Finalized if Callback didn't do it
                // We check if 'trocaAnimacao' is still present after a short delay, implying callback failed to clear it.
                // Actually, let's just force call it if it exists, logic inside finalizarTrocaServer is idempotent usually.
                if (window.GameController && window.GameController.finalizarTrocaServer) {
                    console.log("[Renderer] Fallback: Ensuring finalizarTrocaServer is called.");
                    window.GameController.finalizarTrocaServer(troca);
                }

            } catch (err) {
                console.error("[Renderer CRITICAL] Error in Swap onComplete callback:", err);
            }
            // Re-render only after animation to show final state
            this.renderizarMesa();
        });
    },
    renderizarOpcoesDesafio: function () {
        const estadoJogo = window.estadoJogo;
        if (!estadoJogo || !estadoJogo.desafio) {
            const antigo = document.getElementById("opcoes-desafio");
            if (antigo)
                antigo.style.display = "none";
            return;
        }
        const status = estadoJogo.desafio.status;
        const validStatus = ["responder", "aguardando_resposta"].includes(status);
        if (!validStatus) {
            const antigo = document.getElementById("opcoes-desafio");
            if (antigo)
                antigo.style.display = "none";
            return;
        }
        if (estadoJogo.desafio.jogador === window.nomeAtual) {
            // Se eu sou o desafiante, não devo ver opções de resposta (se fosse esse o caso)
            // Mas 'responder' normalmente é pro oponente.
            return;
        }
        let container = document.getElementById("opcoes-desafio");
        if (!container) {
            container = document.createElement("div");
            container.id = "opcoes-desafio";
            container.style.cssText = "display: flex; justify-content: center; top: 7%; left: 50%; transform: translateX(-50%); padding: 0px; background: transparent; border: none; box-shadow: none; position: absolute; z-index: 1000; width: 740px; flex-direction: column; align-items: center;";
            const tabuleiroCenter = document.getElementById("tabuleiro-center");
            if (tabuleiroCenter) {
                tabuleiroCenter.insertBefore(container, tabuleiroCenter.firstChild);
            }
            else {
                document.body.appendChild(container); // Fallback
            }
        }
        else {
            container.innerHTML = "";
            container.style.display = "flex";
        }
        const box = document.createElement("div");
        box.className = "box-desafio";
        const titulo = document.createElement("div");
        titulo.className = "titulo-desafio";
        titulo.innerText = LocaleManager.t('game.guessChallengeTitle');
        box.appendChild(titulo);
        const linha = document.createElement("div");
        linha.className = "linha-pedras";
        let pedras = (window.PEDRAS_OFICIAIS && window.PEDRAS_OFICIAIS.length > 0) ? window.PEDRAS_OFICIAIS : null;
        if (!pedras)
            pedras = []; // Safe fallback
        pedras.forEach((p, idx) => {
            const btn = document.createElement("button");
            btn.className = "pedra-reserva pedra-opcao";
            btn.style.setProperty("cursor", "pointer", "important");
            btn.style.setProperty("pointer-events", "auto", "important");
            btn.innerHTML = `<img src="${p.url}" alt="${p.nome}">`;
            btn.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (window.tocarSomClick)
                    window.tocarSomClick();
                if (window.GameController) {
                    window.GameController.resolverDesafio(idx);
                }
                if (Renderer && Renderer.renderizarMesa)
                    Renderer.renderizarMesa();
                if (container)
                    container.style.display = "none";
                if (window.tellstonesTutorial)
                    window.tellstonesTutorial.registrarAcaoConcluida();
            };
            linha.appendChild(btn);
        });
        box.appendChild(linha);
        container.appendChild(box);
    },
    renderizarOpcoesSegabar: function () {
        const estadoJogo = window.estadoJogo;
        if (!estadoJogo.desafio ||
            estadoJogo.desafio.tipo !== "segabar" ||
            estadoJogo.desafio.status !== "aguardando_resposta") {
            const antigo = document.getElementById("opcoes-segabar");
            if (antigo)
                antigo.style.display = "none";
            return;
        }
        const desafioNormal = document.getElementById("opcoes-desafio");
        if (desafioNormal)
            desafioNormal.style.display = "none";
        if (estadoJogo.desafio.jogador === window.nomeAtual)
            return;
        let container = document.getElementById("opcoes-segabar");
        if (!container) {
            container = document.createElement("div");
            container.id = "opcoes-segabar";
            document.body.appendChild(container);
            container.style.cssText = "display: flex; justify-content: center; top: 11%; left: 50%; transform: translateX(-50%); padding: 0px; background: transparent; border: none; box-shadow: none; position: fixed; z-index: 99999; width: 740px; flex-direction: column; align-items: center;";
        }
        else {
            container.innerHTML = "";
            container.style.display = "flex";
        }
        const box = document.createElement("div");
        box.className = "box-desafio";
        box.style.display = "flex";
        box.style.flexDirection = "row";
        box.style.justifyContent = "center";
        box.style.alignItems = "center";
        box.style.gap = "18px";
        const btnAcreditar = this.criarBotaoAcao(LocaleManager.t('game.actions.believe'), () => {
            if (window.GameController)
                window.GameController.responderSegabar("acreditar");
        });
        const btnDuvidar = this.criarBotaoAcao(LocaleManager.t('game.actions.doubt'), () => {
            if (window.GameController)
                window.GameController.responderSegabar("duvidar");
        });
        const btnSegabarTambem = this.criarBotaoAcao(LocaleManager.t('game.actions.boastToo'), () => {
            if (window.GameController)
                window.GameController.responderSegabar("segabar_tambem");
        });
        box.appendChild(btnAcreditar);
        box.appendChild(btnDuvidar);
        box.appendChild(btnSegabarTambem);
        container.appendChild(box);
    },
    // Helper for Runtime Migration of Legacy Paths
    _fixAssetPath: function (url: string): string {
        if (!url) return url;
        if (url.indexOf("assets/img/stones/demacia") === -1 && url.indexOf("assets/img/stones/new_set") === -1 && url.indexOf("assets/img/coins") === -1) {
            // Legacy path detected? Fix it.
            if (url.includes("Coroa")) return "assets/img/stones/demacia/Coroa.svg";
            if (url.includes("espada")) return "assets/img/stones/demacia/espada.svg";
            if (url.includes("escudo")) return "assets/img/stones/demacia/escudo.svg";
            if (url.includes("cavalo")) return "assets/img/stones/demacia/cavalo.svg";
            if (url.includes("bandeira")) return "assets/img/stones/demacia/bandeira.svg";
            if (url.includes("martelo")) return "assets/img/stones/demacia/martelo.svg";
            if (url.includes("Balanca")) return "assets/img/stones/demacia/Balanca.svg";
            if (url.includes("Cara.png")) return "assets/img/coins/classic/Cara.png";
            if (url.includes("Coroa.png")) return "assets/img/coins/classic/Coroa.png";
        }
        return url;
    },


    renderizarRespostaSegabar: function () {
        const estadoJogo = window.estadoJogo;
        if (!estadoJogo.desafio || estadoJogo.desafio.tipo !== "segabar" || estadoJogo.desafio.status !== "responder_pecas") {
            const container = document.getElementById("opcoes-resposta-segabar");
            if (container)
                container.style.display = "none";
            return;
        }
        // Only logic for render remaining... will implement below
        if (estadoJogo.desafio.jogador !== window.nomeAtual)
            return;

        // Reuse "opcoes-desafio" to inherit legacy.css styles!
        let container = document.getElementById("opcoes-desafio");
        if (!container) {
            container = document.createElement("div");
            container.id = "opcoes-desafio"; // CRITICAL: Use correct ID for CSS

            // Align with tabuleiro-center if possible
            const tabuleiroCenter = document.getElementById("tabuleiro-center");
            if (tabuleiroCenter) {
                tabuleiroCenter.insertBefore(container, tabuleiroCenter.firstChild);
            } else {
                document.body.appendChild(container); // Fallback
            }
        }

        // Ensure styles match exactly what legacy.css expects (flex, centered)
        // Note: legacy.css might target #opcoes-desafio directly too, so be careful with inline overrides if they conflict.
        // But renderizarOpcoesDesafio sets inline styles too, so we match them.
        container.style.cssText = "display: flex; justify-content: center; top: 7%; left: 50%; transform: translateX(-50%); padding: 0px; background: transparent; border: none; box-shadow: none; position: absolute; z-index: 99999; width: 740px; flex-direction: column; align-items: center; pointer-events: none;";

        container.innerHTML = "";
        container.style.display = "flex";

        const box = document.createElement("div");
        box.className = "box-desafio";
        box.style.pointerEvents = "auto";

        // const pedrasViradas = estadoJogo.mesa.filter((p: any) => p && p.virada);
        // const total = pedrasViradas.length;
        const currentIdx = estadoJogo.desafio.idxAtual || 0;
        const titulo = document.createElement("div");
        titulo.className = "titulo-desafio";
        titulo.innerText = LocaleManager.t('game.proveTitle').replace('{ordinal}', (currentIdx + 1).toString());
        box.appendChild(titulo);

        const linha = document.createElement("div");
        linha.className = "linha-pedras";

        const pedras = window.PEDRAS_OFICIAIS || [];
        pedras.forEach((p) => {
            const btn = document.createElement("button");
            btn.className = "pedra-reserva pedra-opcao";
            btn.style.setProperty("cursor", "pointer", "important");
            btn.style.setProperty("pointer-events", "auto", "important");
            btn.innerHTML = `<img src="${p.url}" alt="${p.nome}" style="pointer-events:none">`;

            btn.onmouseover = () => { btn.style.transform = "scale(1.1)"; btn.style.zIndex = "100"; };
            btn.onmouseout = () => { btn.style.transform = "scale(1)"; btn.style.zIndex = "auto"; };

            btn.onclick = (e) => {
                e.preventDefault();
                if (window.tocarSomClick)
                    window.tocarSomClick();

                // Identify which table slot is the Nth hidden stone
                let count = 0;
                let targetIdx = -1;
                for (let i = 0; i < 7; i++) {
                    const st = estadoJogo.mesa[i];
                    if (st && st.virada) {
                        if (count === currentIdx) {
                            targetIdx = i;
                            break;
                        }
                        count++;
                    }
                }

                if (targetIdx !== -1) {
                    if (window.GameController)
                        window.GameController.verificarRespostaSegabar(targetIdx, p.nome);

                    // Tutorial Check
                    if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
                }
            };
            linha.appendChild(btn);
        });
        box.appendChild(linha);
        container.appendChild(box);
    },
    criarBotaoAcao: function (texto: string, onClick: (e: MouseEvent) => void) {
        const btn = document.createElement("button");
        btn.innerText = texto;
        btn.className = "btn-acao-desafio";
        btn.style.padding = "10px 20px";
        btn.style.fontSize = "16px";
        btn.style.fontFamily = "'Cinzel', serif";
        btn.style.color = "#fff";
        btn.style.background = "linear-gradient(45deg, #4a90e2, #003366)";
        btn.style.border = "2px solid #a8cfee";
        btn.style.borderRadius = "8px";
        btn.style.cursor = "pointer";
        btn.style.boxShadow = "0 4px 10px rgba(0,0,0,0.5)";
        btn.onmouseover = () => { btn.style.transform = "scale(1.05)"; };
        btn.onmouseout = () => { btn.style.transform = "scale(1)"; };
        btn.onclick = (e) => {
            e.preventDefault();
            if (onClick)
                // @ts-ignore
                onClick();
        };
        return btn;
    }
};
window.Renderer = Renderer;
