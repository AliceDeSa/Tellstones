// =========================
// Renderização e Manipulação de DOM (Renderer)
// =========================

const Renderer = {

    // Exibe balão de fala do Bot no topo do tabuleiro
    mostrarFalaBot: function (texto) {
        const wrapper = document.getElementById("tabuleiro-wrapper");
        if (!wrapper) return;

        let bubble = document.getElementById("bot-speech-bubble");
        if (!bubble) {
            bubble = document.createElement("div");
            bubble.id = "bot-speech-bubble";
            bubble.style.position = "absolute";
            bubble.style.top = "-80px"; // Acima do tabuleiro
            bubble.style.left = "10%"; // Esquerda
            // bubble.style.transform = "translateX(-50%)"; // Removido centralização
            bubble.style.transform = "translateX(0)";
            bubble.style.backgroundColor = "#ffffff";
            bubble.style.color = "#333";
            bubble.style.padding = "12px 24px";
            bubble.style.borderRadius = "10px";
            bubble.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
            bubble.style.fontFamily = "'Cinzel', serif";
            bubble.style.fontSize = "16px";
            bubble.style.fontWeight = "bold";
            bubble.style.zIndex = "1000";
            bubble.style.opacity = "0";
            bubble.style.transition = "opacity 0.3s ease, transform 0.3s ease";
            bubble.style.pointerEvents = "none";
            bubble.style.textAlign = "center";
            bubble.style.minWidth = "200px";

            // Triângulo do balão
            const triangle = document.createElement("div");
            triangle.style.content = "''";
            triangle.style.position = "absolute";
            triangle.style.bottom = "-10px";
            triangle.style.bottom = "-10px";
            triangle.style.left = "20px"; // Align with left bubble
            triangle.style.marginLeft = "0";
            triangle.style.borderWidth = "10px 10px 0";
            triangle.style.borderStyle = "solid";
            triangle.style.borderColor = "#ffffff transparent transparent transparent";
            bubble.appendChild(triangle);

            wrapper.appendChild(bubble);
        }

        // Se já estiver visivel, pisca levemente
        bubble.style.transform = "translateX(-50%) scale(0.95)";
        setTimeout(() => {
            bubble.style.transform = "translateX(-50%) scale(1)";
        }, 50);

        // Atualiza texto preservando o triângulo
        const triangle = bubble.querySelector('div');
        bubble.innerText = texto;
        if (triangle) bubble.appendChild(triangle);

        bubble.style.opacity = "1";

        if (this.speechTimeout) clearTimeout(this.speechTimeout);
        this.speechTimeout = setTimeout(() => {
            bubble.style.opacity = "0";
        }, 4000);
    },

    // Remove o balão de fala do DOM e limpa timeouts
    limparFalaBot: function () {
        const bubble = document.getElementById("bot-speech-bubble");
        if (bubble) bubble.remove();
        if (this.speechTimeout) clearTimeout(this.speechTimeout);
    },

    // Renderiza as pedras na mesa (tabuleiro)
    renderizarPedrasMesa: function (mesa) {
        const wrapper = document.getElementById("tabuleiro-wrapper");
        if (!wrapper) return;

        // Remove pedras antigas (mas mantém slots)
        const antigas = wrapper.querySelectorAll(".pedra-mesa");
        antigas.forEach(el => el.remove());

        if (!window.GameConfig) return;
        const CFG = GameConfig.LAYOUT;
        const positions = this.getSlotPositions(wrapper, CFG.SLOT_COUNT, CFG.STONE_SIZE, CFG.Y_OFFSET_FIXED);

        mesa.forEach((p, i) => {
            if (!p) return;

            const div = document.createElement("div");
            div.className = "pedra-mesa"; // Classe base
            div.setAttribute("data-idx", i);
            div.style.position = "absolute";
            div.style.width = CFG.STONE_SIZE + "px";
            div.style.height = CFG.STONE_SIZE + "px";
            div.style.left = positions[i].left + "px";
            div.style.top = positions[i].top + "px";
            div.style.transform = "translate(-50%, -50%)";
            div.style.background = "transparent";
            div.style.border = "none";

            // Logic for image (Face Up or Down)
            // Se virada, mostra costas? Depende. Em Tellstones, virada = face down (escondida).
            const imgUrl = p.virada ? "assets/img/logo.webp" : p.url;
            div.innerHTML = `<img src="${imgUrl}" alt="${p.nome}" draggable="false" style="width:100%; height:100%; border-radius:50%; pointer-events:none;">`;

            // HIGHLIGHT CHALLENGED STONE
            // Se existe um desafio ativo e esta pedra é o alvo
            const desafio = window.estadoJogo.desafio;
            if (desafio && i === 0) {
                // DEBUG HIGHLIGHT
                console.log("[Renderer DEBUG V2] Desafio:", JSON.stringify(desafio));
            }

            if (desafio && !desafio.resolvido && (desafio.alvo == i || desafio.pedra == i || desafio.idxPedra == i)) {
                console.log(`[Renderer] Highlight Triggered for Stone ${i} (Alvo: ${desafio.alvo})`);
                div.style.setProperty("box-shadow", "0 0 15px 5px yellow", "important");
                div.style.setProperty("border", "3px solid yellow", "important");
                div.style.setProperty("transform", "translate(-50%, -50%) scale(1.15)", "important");
                div.style.setProperty("z-index", "1000", "important");
            } else {
                div.style.boxShadow = "0 0 20px rgba(0,0,0,0.5)";
            }

            // Click Handler for Challenge Selection

            // Click Handler for Challenge Selection
            div.onclick = function () {
                if (window.selecionandoDesafio) {
                    if (!p.virada) {
                        if (window.notificationManager) window.notificationManager.showInternal("Escolha uma pedra virada para desafiar!");
                        return;
                    }
                    console.log("[Renderer] Pedra selecionada para desafio:", i);
                    // Update State Logic
                    if (window.GameController) {
                        // Direct call ? Or update state?
                        // Legacy logic used script.js variables.
                        // Let's manually trigger the state update needed.
                        if (confirm(`Desafiar a pedra na posição ${i + 1}?`)) {
                            window.selecionandoDesafio = false;
                            // Update Challenge State
                            if (window.estadoJogo.desafio) {
                                window.estadoJogo.desafio.pedra = i; // Save index (Legacy?)
                                window.estadoJogo.desafio.alvo = i; // Target Index (Standard)
                                window.estadoJogo.desafio.tipo = 'desafio'; // FIX: Explicitly set type so Bot recognizes it
                                window.estadoJogo.desafio.status = 'responder'; // Player (Challenger) picks name ?? 
                                // WAIT. If Player Challenges Bot, Bot must GUESS.
                                // So status should be 'responder' (waiting for response).
                                // But typically 'responder' means the DEFENDER must respond.
                                // In this case, Bot is Defender. So yes, 'responder' is correct for Bot to trigger.

                                window.GameController.persistirEstado();
                            }
                        }
                    }
                }
            };

            // Tooltip
            if (p.virada) {
                div.onmouseenter = (e) => window.showTooltip("Pedra Escondida", e.clientX, e.clientY);
            } else {
                div.onmouseenter = (e) => window.showTooltip(p.nome, e.clientX, e.clientY);
            }
            div.onmouseleave = window.hideTooltip;

            wrapper.appendChild(div);
        });
    },

    // Adiciona slots fixos proporcionais no tabuleiro
    desenharSlotsFixos: function () {
        const wrapper = document.getElementById("tabuleiro-wrapper");
        if (!wrapper) return;
        // Remove slots antigos, se existirem
        const antigos = wrapper.querySelectorAll(".slot-fixo");
        antigos.forEach((el) => el.remove());
        if (!window.GameConfig) return;
        const CFG = GameConfig.LAYOUT;
        const positions = this.getSlotPositions(wrapper, CFG.SLOT_COUNT, CFG.STONE_SIZE, CFG.Y_OFFSET_FIXED);
        for (let i = 0; i < CFG.SLOT_COUNT; i++) {
            const slot = document.createElement("div");
            slot.className = "slot-fixo";
            slot.setAttribute("data-slot", i);
            slot.style.position = "absolute";
            slot.style.width = CFG.STONE_SIZE + "px";
            slot.style.height = CFG.STONE_SIZE + "px";
            slot.style.left = positions[i].left + "px";
            slot.style.top = positions[i].top + "px";
            slot.style.transform = "translate(-50%, -50%)";
            slot.style.border = "none";
            slot.style.background = "transparent";
            // slot.innerText = i+1; // Se quiser numerar as posições
            wrapper.appendChild(slot);
        }
    },

    // Renderiza a imagem do tabuleiro na tela
    renderizarMesa: function () {
        if (window.animacaoTrocaEmAndamento) return;
        // Garante que a mesa sempre tenha 7 slots e é array
        if (!window.estadoJogo) return;
        window.estadoJogo.mesa = garantirArray(window.estadoJogo.mesa);
        if (window.estadoJogo.mesa.length !== 7) {
            const novaMesa = Array(7).fill(null);
            // Se vier como array de 1 elemento, mas a pedra tem que ir para o centro
            if (
                window.estadoJogo.mesa.length === 1 &&
                window.estadoJogo.mesa[0] &&
                window.estadoJogo.centralAlinhada
            ) {
                novaMesa[3] = window.estadoJogo.mesa[0];
            } else {
                window.estadoJogo.mesa.forEach((p, i) => {
                    if (p) novaMesa[i] = p;
                });
            }
            window.estadoJogo.mesa = novaMesa;
        }
        // Requer função global renderizarPedrasMesa (ou mover para Renderer no futuro)
        // Por enquanto, chamamos a global se existir.
        if (typeof renderizarPedrasMesa === 'function') {
            renderizarPedrasMesa(window.estadoJogo.mesa);
        } else if (typeof this.renderizarPedrasMesa === 'function') {
            this.renderizarPedrasMesa(window.estadoJogo.mesa);
        }
        this.desenharSlotsFixos(); // Adiciona os slots fixos ao tabuleiro

        // Garante a atualização da UI de Desafio
        if (typeof this.renderizarOpcoesDesafio === 'function') this.renderizarOpcoesDesafio();
        if (typeof this.renderizarOpcoesSegabar === 'function') this.renderizarOpcoesSegabar();
        if (typeof this.renderizarRespostaSegabar === 'function') this.renderizarRespostaSegabar();
    },

    // Atualiza informações da sala, espectadores, placar e turno no topo da tela
    atualizarInfoSala: function (codigo, espectadores) {
        document.getElementById("codigo-sala-valor").innerText = codigo;
        document.getElementById("lista-espectadores").innerHTML = espectadores
            .map((e) => `<span>${e.nome}</span>`)
            .join(", ");
        const infoSala = document.getElementById("info-sala");
        if (
            (!codigo || codigo.trim() === "") &&
            (!espectadores || espectadores.length === 0)
        ) {
            infoSala.style.display = "none";
        } else {
            infoSala.style.display = "";
        }

        // Placar centralizado, destacando o jogador da vez em amarelo
        const placarTurnoDiv = document.getElementById("placar-turno-central");
        if (
            placarTurnoDiv &&
            window.estadoJogo &&
            window.estadoJogo.jogadores &&
            window.estadoJogo.jogadores.length > 0
        ) {
            const placar = window.estadoJogo.jogadores
                .map((j, i) => {
                    const destaque =
                        (window.estadoJogo.jogadores.length === 2 && i === window.estadoJogo.vez) ||
                        (window.estadoJogo.jogadores.length === 4 && i % 2 === window.estadoJogo.vez);
                    return `<span style='${destaque
                        ? "color:#ffd700;font-weight:bold;text-shadow:0 0 8px #ffd70088;"
                        : ""
                        }'>${j.nome}: ${j.pontos}</span>`;
                })
                .join(" <b>|</b> ");
            placarTurnoDiv.innerHTML = `<div style='margin-bottom:4px;'>${placar}</div>`;
        }
        if (typeof renderizarMarcadoresPonto === 'function') renderizarMarcadoresPonto();
    },

    // Compatibility method for GameController
    atualizarPlacar: function (jogadores) {
        // Reuses updated info logic, ignoring args as it pulls from global state usually
        this.atualizarInfoSala(window.salaAtual || "Sala", window.ultimosEspectadores || []);
    },

    // Renderiza as pedras da reserva
    renderizarPedrasReserva: function () {
        // Só bloqueia animação se o alinhamento ainda não foi feito
        if (window.animacaoAlinhamentoEmAndamento && !window.estadoJogo.alinhamentoFeito) return;
        window.estadoJogo.reserva = garantirArray(window.estadoJogo.reserva);
        // O layout depende apenas do alinhamentoFeito global
        if (window.estadoJogo.alinhamentoFeito) {
            this.renderizarPedrasVerticaisAbsoluto(window.estadoJogo.reserva);
        } else {
            this.renderizarPedrasCirculo(window.estadoJogo.reserva, window.estadoJogo.pedraCentral);
        }
    },

    // Renderiza as pedras em círculo ao redor da pedra central
    renderizarPedrasCirculo: function (pedras, pedraCentral) {
        const circle = document.getElementById("circle-pedras");
        if (!circle || !pedras || pedras.length === 0) return;
        circle.style.display = "";
        circle.innerHTML = "";
        const angStep = 360 / pedras.length;
        const raio = 100;
        if (typeof window.animouReservaCircular === "undefined")
            window.animouReservaCircular = false;
        let animar = false;
        // Só anima se ainda não animou, o DOM está pronto e houver pedras
        if (!window.animouReservaCircular && pedras.length > 0) {
            animar = true;
        }
        const TEMPO_ANIMACAO_PEDRA = 180;
        pedras.forEach((p, i) => {
            // Guard: p pode ser null se a pedra já foi jogada
            if (!p) return;

            const ang = ((angStep * i - 90) * Math.PI) / 180;
            const x = Math.cos(ang) * raio + 90;
            const y = Math.sin(ang) * raio + 90;
            const div = document.createElement("div");
            div.className = "pedra-circulo pedra-reserva";
            if (animar) {
                div.style.left = "90px";
                div.style.top = "90px";
                div.style.transform = "scale(0.2)";
                div.style.opacity = "0";
                div.innerHTML = `<img src="${p.url}" alt="${p.nome}" draggable="false">`;
                div.setAttribute("data-idx", i);
                div.onmouseenter = function (e) { showTooltip("Arraste para o Tabuleiro", e.clientX, e.clientY); };
                div.onmousemove = function (e) { showTooltip("Arraste para o Tabuleiro", e.clientX, e.clientY); };
                div.onmouseleave = hideTooltip;
                circle.appendChild(div);
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
            } else {
                div.style.left = x + "px";
                div.style.top = y + "px";
                div.style.transform = "scale(1)";
                div.style.opacity = "1";
                // Hide info for hidden stones or reserve (reserve is always visible though)
                // For reserve, stones are visible.
                div.innerHTML = `<img src="${p.url}" alt="Pedra" draggable="false">`;
                div.setAttribute("data-idx", i);
                div.onmouseenter = function (e) { showTooltip("Arraste para o tabuleiro", e.clientX, e.clientY); };
                div.onmousemove = function (e) { showTooltip("Arraste para o tabuleiro", e.clientX, e.clientY); };
                div.onmouseleave = hideTooltip;
                div.onmouseout = hideTooltip;
                circle.appendChild(div);
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
            central.title = "Aguarde o alinhamento";
            circle.appendChild(central);
        }
    },

    // Renderiza as pedras verticais (após alinhamento)
    renderizarPedrasVerticaisAbsoluto: function (pedras) {
        if (window.animacaoAlinhamentoEmAndamento) return;
        const circle = document.getElementById("circle-pedras");

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
        } else {
            circle.style.left = "20px";
            circle.style.top = "130px";
            circle.style.transform = "none";
        }

        circle.style.width = "auto";
        circle.style.height = "auto";
        circle.style.pointerEvents = "auto";
        circle.style.paddingTop = "0";
        circle.style.zIndex = "300"; // Ensure above info-sala (100) and buttons
        circle.innerHTML = "";

        pedras.forEach((p, i) => {
            if (!p) return;
            const div = document.createElement("div");
            div.className = "pedra-circulo pedra-reserva";
            div.style.position = "relative";
            div.style.left = "0";
            div.style.top = "0";
            div.style.width = "55px";
            div.style.height = "55px";
            div.innerHTML = `<img src="${p.url}" alt="${p.nome}" draggable="false" style="width:100%; height:100%;">`;
            div.setAttribute("data-idx", i);

            // Delegate Interaction and Visuals to InputHandler
            if (window.InputHandler) {
                window.InputHandler.setupReservaItem(div, p, i, true);
            }

            // Visual State Management (Disabled/Enabled cursor)
            if (!(window.estadoJogo.alinhamentoFeito && ehMinhaVez())) {
                div.style.cursor = "not-allowed";
                div.title = window.estadoJogo.alinhamentoFeito
                    ? "Aguarde sua vez"
                    : "Aguarde o alinhamento";
                // Remove listeners added by InputHandler if disabled to prevent drag start
                div.onmousedown = null;
                div.ontouchstart = null;
            } else {
                div.style.cursor = "pointer";
                div.title = "";
            }

            // Tooltip handler: ensure it hides on mouse out
            if (!div.title) { // Only if native title is not set
                div.onmouseenter = function (e) { showTooltip(p.nome, e.clientX, e.clientY); };
                div.onmousemove = function (e) { showTooltip(p.nome, e.clientX, e.clientY); };
                div.onmouseleave = hideTooltip;
                div.onmouseout = hideTooltip; // Robutez extra
            }

            circle.appendChild(div);
        });
    },

    getSlotPositions: function (wrapper, count, slotSize, gap) {
        if (!wrapper) return [];
        const w = wrapper.clientWidth;
        const h = wrapper.clientHeight;
        const positions = [];
        const cy = h / 2;
        let actualGap = gap;
        let actualSlotSize = slotSize;
        const totalWidthNeeded = (count * slotSize) + ((count - 1) * gap);
        const maxW = w * 0.90; // Force 5% margin aside
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

    desenharHighlightsFixos: function (validos, wrapper) {
        const positions = this.getSlotPositions(wrapper, 7, 68.39, 40);
        const antigos = wrapper.querySelectorAll(".highlight-slot");
        antigos.forEach((h) => h.remove());
        validos.forEach((slotIdx) => {
            const highlight = document.createElement("div");
            highlight.className = "highlight-slot";
            highlight.style.position = "absolute";
            highlight.style.width = "68.39px";
            highlight.style.height = "68.39px";
            highlight.style.left = positions[slotIdx].left + "px";
            highlight.style.top = positions[slotIdx].top + "px";
            highlight.style.transform = "translate(-50%, -50%)";
            highlight.style.background = "transparent";
            highlight.style.border = "none";
            highlight.style.borderRadius = "50%";
            highlight.style.zIndex = 10000;
            highlight.style.pointerEvents = "none";
            highlight.setAttribute("data-slot", slotIdx);
            //highlight.style.boxShadow = "0 0 0 2.5px #ffd70088, 0 0 8px 2px #fff3";
            //wrapper.appendChild(highlight);
        });
    },

    animarPedraReservaParaMesa: function (ghost, wrapper, slotIdx, callback) {
        const larguraWrapper = wrapper.offsetWidth;
        const larguraPedra = 80;
        const slots = 7;
        const slotLargura = larguraWrapper / slots;
        const leftFinal =
            wrapper.getBoundingClientRect().left +
            slotLargura * slotIdx +
            slotLargura / 2 -
            larguraPedra / 2;
        const topFinal =
            wrapper.getBoundingClientRect().top +
            wrapper.offsetHeight / 2 -
            larguraPedra / 2;
        const leftStart = parseFloat(ghost.style.left);
        const topStart = parseFloat(ghost.style.top);
        const anim = ghost.animate(
            [
                { left: leftStart + "px", top: topStart + "px" },
                { left: leftFinal + "px", top: topFinal + "px" }
            ],
            {
                duration: 700,
                easing: "cubic-bezier(0.77, 0, 0.175, 1)",
                fill: "forwards"
            }
        );
        anim.onfinish = function () {
            if (callback) callback();
        };
    },

    animarBotColocar: function (pedra, fromIdx, slotIdx, callback) {
        // Encontra a pedra na reserva visual
        const circle = document.getElementById("circle-pedras");
        if (!circle) {
            if (callback) callback();
            return;
        }

        // Tenta encontrar pelo slot da reserva (assumindo que p.nome bate ou index)
        let pedraDiv = null;
        const candidates = circle.querySelectorAll(".pedra-reserva");
        candidates.forEach(el => {
            const img = el.querySelector("img");
            if (img && img.src.includes(encodeURIComponent(pedra.url))) {
                pedraDiv = el;
            } else if (img && img.src.includes(pedra.url)) {
                pedraDiv = el;
            }
        });

        if (!pedraDiv) {
            console.warn("[Renderer] Pedra do Bot não encontrada na reserva visual:", pedra);
            if (callback) callback();
            return;
        }

        // Clone para animação
        const ghost = pedraDiv.cloneNode(true);
        const rect = pedraDiv.getBoundingClientRect();

        ghost.style.position = "fixed";
        ghost.style.left = rect.left + "px";
        ghost.style.top = rect.top + "px";
        ghost.style.width = rect.width + "px";
        ghost.style.height = rect.height + "px";
        ghost.style.zIndex = "999999";
        ghost.style.pointerEvents = "none";
        ghost.style.opacity = "1";
        document.body.appendChild(ghost);

        // Oculta original
        pedraDiv.style.opacity = "0";

        // Anima até o slot
        const tab = document.getElementById("tabuleiro-wrapper");
        this.animarPedraReservaParaMesa(ghost, tab, slotIdx, () => {
            ghost.remove();
            // O estado será atualizado pelo callback, que renderizará a mesa nova
            // Não precisamos restaurar a opacidade do original pois ele será removido na re-renderização
            if (callback) callback();
        });
    },

    // --- DEBUG: BOT MEMORY OVERLAY ---
    renderBotMemoryDebug: function (botBrain) {
        let container = document.getElementById("bot-memory-debug");

        // Strict Dev Mode Check: If NOT dev mode, ensure hidden and return
        const params = new URLSearchParams(window.location.search);
        const isDev = localStorage.getItem('tellstones_dev_mode') === 'true' || params.get('dev') === 'true';

        if (!isDev) {
            if (container) container.remove(); // Or style.display = 'none'
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
            container.style.zIndex = "99999";
            document.getElementById("tabuleiro-wrapper").appendChild(container);
        }

        container.innerHTML = "";
        if (!botBrain || !botBrain.memory) return;

        const wrapper = document.getElementById("tabuleiro-wrapper");
        const positions = this.getSlotPositions(wrapper, 7, 68.39, 40);

        positions.forEach((pos, idx) => {
            const mem = botBrain.memory[idx];
            if (mem) {
                const badge = document.createElement("div");
                // Estilo "Tutoria Like" (Caixa flutuante)
                badge.style.position = "absolute";
                badge.style.left = pos.left + "px";
                badge.style.top = (pos.top - 60) + "px"; // Acima da pedra
                badge.style.transform = "translateX(-50%)";
                badge.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
                badge.style.color = "#00ff00"; // Hacker Green
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

    // --- NOVA FUNÇÃO DE TROCA (Delegada para AnimationManager) ---
    animarTroca: function (fromIdx, toIdx, pedraFromData, pedraToData, callback) {
        if (window.AnimationManager) {
            window.AnimationManager.playSwap(fromIdx, toIdx, callback);
        } else {
            console.warn("AnimationManager missing, running callback immediately.");
            if (callback) callback();
        }
    },

    lastTrocaTimestamp: 0,

    monitorarTrocas: function (estado, onComplete) {
        if (!estado || !estado.trocaAnimacao) return;
        const troca = estado.trocaAnimacao;

        // Evita re-executar mesma animação
        if (troca.timestamp <= this.lastTrocaTimestamp) return;
        this.lastTrocaTimestamp = troca.timestamp;

        // Identificar pedras
        const pedraA = estado.mesa[troca.from];
        const pedraB = estado.mesa[troca.to];

        // Executa
        this.animarTroca(troca.from, troca.to, pedraA, pedraB, () => {
            // Após animar, força re-render final
            // E chama callback para efetivar troca de dados se necessário
            if (onComplete) onComplete(troca);
            this.renderizarMesa();
        });
    },

    // Renderiza as opções de pedras para o desafio (Duvidar)
    renderizarOpcoesDesafio: function () {
        const estadoJogo = window.estadoJogo;
        if (!estadoJogo || !estadoJogo.desafio) {
            // Esconde o container se não for para mostrar
            const antigo = document.getElementById("opcoes-desafio");
            if (antigo) antigo.style.display = "none";
            return;
        }

        // Condições de saída
        // Condições de saída atualizadas
        const status = estadoJogo.desafio.status;
        const validStatus = ["responder", "aguardando_resposta"].includes(status);

        if (!validStatus) {
            console.warn("[Renderer] Desafio UI Hidden: Invalid Status", status);
            const antigo = document.getElementById("opcoes-desafio");
            if (antigo) antigo.style.display = "none";
            return;
        }

        // Se eu sou o DESAFIANTE, eu não vejo as opções de resposta (o oponente vê)
        // Se eu sou o desafiado, eu vejo.
        // O desafiante é 'desafio.jogador'.
        if (estadoJogo.desafio.jogador === window.nomeAtual) {
            console.log("[Renderer] Desafio UI Hidden: I am the challenger", window.nomeAtual);
            return;
        }

        console.log("[Renderer] Showing Challenge Options vs", estadoJogo.desafio.jogador);

        let container = document.getElementById("opcoes-desafio");
        if (!container) {
            container = document.createElement("div");
            container.id = "opcoes-desafio";
            // Estilos
            container.style.cssText = "display: flex; justify-content: center; top: 7%; left: 50%; transform: translateX(-50%); padding: 0px; background: transparent; border: none; box-shadow: none; position: absolute; z-index: 99999; width: 740px; flex-direction: column; align-items: center;";

            // Tenta inserir no tabuleiro-center
            const tabuleiroCenter = document.getElementById("tabuleiro-center");
            if (tabuleiroCenter) {
                tabuleiroCenter.insertBefore(container, tabuleiroCenter.firstChild);
            } else {
                document.body.appendChild(container); // Fallback
            }
        } else {
            container.innerHTML = "";
            container.style.display = "flex";
        }

        const box = document.createElement("div");
        box.className = "box-desafio";
        const titulo = document.createElement("div");
        titulo.className = "titulo-desafio";
        titulo.innerText = "Adivinhe a peça do desafio!";
        box.appendChild(titulo);

        const linha = document.createElement("div");
        linha.className = "linha-pedras";

        // Importante: PEDRAS_OFICIAIS deve estar disponível globalmente ou via Constants
        let pedras = (window.PEDRAS_OFICIAIS && window.PEDRAS_OFICIAIS.length > 0) ? window.PEDRAS_OFICIAIS : null;

        if (!pedras) {
            console.warn("[Renderer] PEDRAS_OFICIAIS missing or empty. Using fallback.");
            pedras = [
                { nome: "Coroa", url: "assets/img/Coroa.svg" },
                { nome: "Espada", url: "assets/img/espada.svg" },
                { nome: "Balança", url: "assets/img/Balanca.svg" },
                { nome: "Cavalo", url: "assets/img/cavalo.svg" },
                { nome: "Escudo", url: "assets/img/escudo.svg" },
                { nome: "Bandeira", url: "assets/img/bandeira.svg" },
                { nome: "Martelo", url: "assets/img/martelo.svg" }
            ];
        }

        pedras.forEach((p, idx) => {
            console.log("[Renderer] Creating Challenge Option:", p.nome);
            const btn = document.createElement("button");
            btn.className = "pedra-reserva pedra-opcao";
            // Ensure visual interactivity overrides any default class state
            btn.style.setProperty("cursor", "pointer", "important");
            btn.style.setProperty("pointer-events", "auto", "important");
            btn.innerHTML = `<img src="${p.url}" alt="${p.nome}">`;
            btn.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (window.tocarSomClick) window.tocarSomClick();

                // Atualiza estado localmente e dispara resolução via Controller
                if (window.GameController) {
                    window.GameController.resolverDesafio(idx);
                } else {
                    // Fallback temporário
                    estadoJogo.desafio.escolhaOponente = idx;
                    estadoJogo.desafio.status = "resolvido";
                    window.salvarEstadoJogo(); // Global call
                }

                if (window.Renderer && window.Renderer.renderizarMesa) window.Renderer.renderizarMesa();
                container.style.display = "none";

                if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
            };
            linha.appendChild(btn);
        });
        box.appendChild(linha);
        container.appendChild(box);


    },

    // --- BOT FEATURES ---
    mostrarFalaBot(msg) {
        let bubble = document.getElementById("bot-dialogue-bubble");
        if (!bubble) {
            bubble = document.createElement("div");
            bubble.id = "bot-dialogue-bubble";
            document.body.appendChild(bubble);
        }

        bubble.innerText = msg;
        bubble.classList.add("visible");

        // Hide after 4 seconds
        if (window.botSpeechTimeout) clearTimeout(window.botSpeechTimeout);
        window.botSpeechTimeout = setTimeout(() => {
            bubble.classList.remove("visible");
        }, 4000);
    },

    animarBotColocar(pedra, origemIdx, destinoSlotIdx, callback) {
        if (!pedra) {
            if (callback) callback();
            return;
        }

        const startX = -70; // Off-screen Left (Reserve)
        const startY = window.innerHeight / 2 - 30; // Centered vertically

        // ... (ghost creation) ...
        const ghost = document.createElement("div");
        ghost.className = "ghost-pedra";
        ghost.innerHTML = `<img src="${pedra.url}" style="width:100%;height:100%;border-radius:50%">`;
        ghost.style.position = "fixed";
        ghost.style.left = startX + "px";
        ghost.style.top = startY + "px";
        ghost.style.width = "60px";
        ghost.style.height = "60px";
        ghost.style.zIndex = "9999";
        // Slow down animation and change easing
        ghost.style.transition = "all 1.5s cubic-bezier(0.25, 1, 0.5, 1)";
        document.body.appendChild(ghost);

        // Fallback: calcular baseado no centro
        let destX = window.innerWidth / 2;
        let destY = window.innerHeight / 2;

        // Tentar via DOM (Mesa)
        const mesaDiv = document.getElementById("pedras-mesa");
        if (mesaDiv && mesaDiv.children[destinoSlotIdx]) {
            const rect = mesaDiv.children[destinoSlotIdx].getBoundingClientRect();
            destX = rect.left + rect.width / 2;
            destY = rect.top + rect.height / 2;
        } else {
            // Fallback to getSlotPositions logic only if wrapper exists
            const wrapper = document.getElementById("tabuleiro-wrapper");
            if (wrapper && this.getSlotPositions) {
                const slots = this.getSlotPositions(wrapper, 7, 80, 10); // Estimo params
                if (slots[destinoSlotIdx]) {
                    destX = slots[destinoSlotIdx].left; // Might need offset correction if getSlotPositions returns relative to wrapper?
                    // getSlotPositions uses clientWidth which is absolute-ish but careful about offsetParent.
                    // Actually getting rect of phantom slot is safer if they exist.
                    // But usually slots dont exist safely 
                }
            }
        }

        // Trigger animation frame
        requestAnimationFrame(() => {
            ghost.style.left = (destX - 30) + "px"; // Center offset
            ghost.style.top = (destY - 30) + "px";
        });

        // Cleanup and Callback
        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            ghost.remove();
            if (callback) callback();
        };

        ghost.ontransitionend = finish;

        // Safety timeout (animation duration 0.8s + buffer)
        setTimeout(finish, 1000);
    },

    // --- END BOT FEATURES ---

    // Renderizar opções de resposta ao Se Gabar (Acreditar / Duvidar / Se Gabar Também)
    renderizarOpcoesSegabar: function () {
        const estadoJogo = window.estadoJogo;
        if (
            !estadoJogo.desafio ||
            estadoJogo.desafio.tipo !== "segabar" ||
            estadoJogo.desafio.status !== "aguardando_resposta"
        ) {
            const antigo = document.getElementById("opcoes-segabar");
            if (antigo) antigo.style.display = "none";
            return;
        }

        const desafioNormal = document.getElementById("opcoes-desafio");
        if (desafioNormal) desafioNormal.style.display = "none";

        if (estadoJogo.desafio.jogador === window.nomeAtual) return;

        let container = document.getElementById("opcoes-segabar");
        if (!container) {
            container = document.createElement("div");
            container.id = "opcoes-segabar";
            document.body.appendChild(container); // Nuclear Fix
            container.style.cssText = "display: flex; justify-content: center; top: 11%; left: 50%; transform: translateX(-50%); padding: 0px; background: transparent; border: none; box-shadow: none; position: fixed; z-index: 99999; width: 740px; flex-direction: column; align-items: center;";
        } else {
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

        // Botão Acreditar
        const btnAcreditar = this.criarBotaoAcao("Acreditar", () => {
            if (window.GameController) window.GameController.responderSegabar("acreditar");
        });

        // Botão Duvidar
        const btnDuvidar = this.criarBotaoAcao("Duvidar", () => {
            if (window.GameController) window.GameController.responderSegabar("duvidar");
        });

        // Botão Se Gabar Também
        const btnSegabarTambem = this.criarBotaoAcao("Se Gabar Também", () => {
            if (window.GameController) window.GameController.responderSegabar("segabar_tambem");
        });

        box.appendChild(btnAcreditar);
        box.appendChild(btnDuvidar);
        box.appendChild(btnSegabarTambem);
        container.appendChild(box);
    },

    // Renderizar interface de resposta do Se Gabar para o jogador que se gabou (Exame)
    renderizarRespostaSegabar: function () {
        const estadoJogo = window.estadoJogo;
        const nomeAtual = window.nomeAtual;

        if (!estadoJogo.desafio || estadoJogo.desafio.tipo !== "segabar" || estadoJogo.desafio.status !== "responder_pecas") {
            // Limpeza visual se necessário
            const container = document.getElementById("opcoes-resposta-segabar");
            if (container) container.style.display = "none";
            return;
        }

        const ehTutorialAprendiz = window.salaAtual === "MODO_TUTORIAL" && estadoJogo.desafio.jogador === "Aprendiz";
        // Check visibility: Only the Boaster sees this UI
        // If "Se Gabar Também" happened, the role swapped, so this check naturally works because 
        // estado.desafio.jogador was updated to the new boaster.
        // But we double check to ensure NO ONE ELSE sees it.
        if (nomeAtual !== estadoJogo.desafio.jogador && !ehTutorialAprendiz) {
            const container = document.getElementById("opcoes-resposta-segabar");
            if (container) {
                container.style.display = "none";
                container.innerHTML = ""; // Force clear content
            }
            return;
        }

        // --- NEW SAFETY CHECK ---
        // Se eu SOU o oponente que acabou de duvidar, eu NÃO devo ver essa tela.
        // O estado 'responder_pecas' é para quem TEM QUE RESPONDER (o Boaster).
        // Se eu cliquei em Duvidar, eu sou apenas observador da prova.
        if (estadoJogo.desafio.escolhaOponente === 'duvidar' && nomeAtual !== estadoJogo.desafio.jogador) {
            const container = document.getElementById("opcoes-resposta-segabar");
            if (container) {
                container.style.setProperty("display", "none", "important");
                container.innerHTML = "";
            }
            return;
        }

        const pedrasViradas = estadoJogo.mesa
            .map((p, idx) => ({ ...p, idx }))
            .filter((p) => p && p.virada);

        const idxAtual = estadoJogo.desafio.idxAtual || 0;
        // Proteção contra índice fora de limites (vitória/derrota já processada)
        if (idxAtual >= pedrasViradas.length) return;

        let container = document.getElementById("opcoes-resposta-segabar");
        if (!container) {
            container = document.createElement("div");
            container.id = "opcoes-resposta-segabar";
            document.body.appendChild(container);
            container.style.cssText = "display: flex; justify-content: center; top: 5%; left: 50%; transform: translateX(-50%); padding: 0px; background: transparent; border: none; box-shadow: none; position: fixed; z-index: 200000; width: 740px; flex-direction: column; align-items: center; pointer-events: none;";
        } else {
            container.innerHTML = "";
            container.style.display = "flex";
        }

        const box = document.createElement("div");
        box.className = "box-desafio";
        box.style.pointerEvents = "auto";

        const titulo = document.createElement("div");
        titulo.className = "titulo-desafio";
        titulo.innerText = `Qual é a pedra na posição ${pedrasViradas[idxAtual].idx + 1}?`;
        box.appendChild(titulo);

        // Helper para destacar
        const pedrasMesa = document.querySelectorAll(".pedra-mesa");
        pedrasMesa.forEach((el) => {
            el.style.boxShadow = "none"; // Limpa anteriores
            el.style.border = "none";
            const pIdx = parseInt(el.getAttribute("data-idx"));

            // Se for a pedra alvo da pergunta
            if (pIdx === pedrasViradas[idxAtual].idx) {
                el.style.boxShadow = "0 0 20px 8px yellow"; // Brilho forte
                el.style.border = "3px solid yellow";
                el.style.zIndex = "200001"; // Acima do overlay
                el.style.transform = "translate(-50%, -50%) scale(1.15)";
            } else if (pIdx !== undefined) {
                // Diminui opacity das outras? Opcional.
            }
        });

        // Lista de pedras para escolha
        const linha = document.createElement("div");
        linha.className = "linha-pedras";
        linha.style.cssText = "display: flex; gap: 12px; justify-content: center; margin-top: 16px; flex-wrap: wrap; width: 100%; pointer-events: auto;";

        const pedras = window.PEDRAS_OFICIAIS || [
            { nome: "Coroa", url: "assets/img/Coroa.svg" },
            { nome: "Espada", url: "assets/img/espada.svg" },
            { nome: "Balança", url: "assets/img/Balanca.svg" },
            { nome: "Cavalo", url: "assets/img/cavalo.svg" },
            { nome: "Escudo", url: "assets/img/escudo.svg" },
            { nome: "Bandeira", url: "assets/img/bandeira.svg" },
            { nome: "Martelo", url: "assets/img/martelo.svg" }
        ];
        pedras.forEach((p) => {
            const btn = document.createElement("button");
            // NÃO usar 'pedra-reserva' para evitar draggables/listeners globais e position:absolute
            btn.className = "";
            btn.style.cssText = `
                position: relative;
                width: 70px;
                height: 70px;
                background: #fff;
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                cursor: pointer !important;
                pointer-events: auto !important;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                transition: transform 0.2s, border-color 0.2s;
                opacity: 1 !important;
            `;

            btn.innerHTML = `<img src="${p.url}" alt="${p.nome}" style="width: 80%; height: 80%; pointer-events: none;">`;

            btn.onmouseover = () => {
                btn.style.borderColor = "#fff";
                btn.style.transform = "scale(1.1)";
            };
            btn.onmouseout = () => {
                btn.style.borderColor = "rgba(255,255,255,0.3)";
                btn.style.transform = "scale(1)";
            };

            btn.onclick = function () {
                if (window.audioManager) window.audioManager.playClick();
                if (window.GameController) window.GameController.verificarRespostaSegabar(pedrasViradas[idxAtual].idx, p.nome);
            };
            linha.appendChild(btn);
        });
        box.appendChild(linha);
        container.appendChild(box);
    },

    mostrarFalaBot: function (texto) {
        let bubble = document.getElementById("bot-speech-bubble");
        if (!bubble) {
            bubble = document.createElement("div");
            bubble.id = "bot-speech-bubble";
            document.body.appendChild(bubble); // Body or Wrapper? Body is safer for absolute positioning.
        }

        bubble.innerText = texto;
        bubble.classList.add("visible");

        // Auto-hide after 3.5s
        if (this.botSpeechTimeout) clearTimeout(this.botSpeechTimeout);
        this.botSpeechTimeout = setTimeout(() => {
            bubble.classList.remove("visible");
        }, 3500);
    },

    // Helper UTILS
    criarBotaoAcao: function (texto, onClick) {
        const btn = document.createElement("button");
        btn.innerText = texto;
        btn.className = "acao-btn";
        btn.style.margin = "0 12px";
        btn.onclick = onClick;
        return btn;
    }



};

window.Renderer = Renderer;
