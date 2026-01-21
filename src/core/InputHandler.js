// =========================
// InputHandler - Gerenciamento de Interações (Mouse/Touch)
// =========================

const InputHandler = {
    isDragging: false,
    dragItem: null,
    dragGhost: null,
    dragHighlights: [],

    init: function () {
        // Inicializa listeners globais se necessário
        console.log("[InputHandler] Initialized");
    },

    // Setup para pedras da reserva (Drag & Drop para o tabuleiro)
    setupReservaItem: function (element, pedraObj, index, isVertical) {
        if (!element) return;

        // Eventos de Mouse
        element.onmousedown = (e) => this.handleDragStart(e, element, pedraObj, index, false);

        // Eventos de Toque (Touch)
        element.addEventListener("touchstart", (e) => this.handleDragStart(e, element, pedraObj, index, true), { passive: false });

        // Dicas de Ferramenta (Tooltips)
        if (!InputHandler.isTouchDevice()) {
            element.onmouseenter = (e) => showTooltip("Arraste para o tabuleiro", e.clientX, e.clientY); // Global helper
            element.onmousemove = (e) => showTooltip("Arraste para o tabuleiro", e.clientX, e.clientY);
            element.onmouseleave = window.hideTooltip; // Global helper
        }
    },

    handleDragStart: function (e, element, pedraObj, index, isTouch) {
        if (window.tellstonesTutorial) {
            if (!window.tellstonesTutorial.verificarAcao("ARRASTAR_RESERVA")) return;
        }

        // Validações de turno
        if (!window.ehMinhaVez()) return; // Global check
        if (!window.estadoJogo.alinhamentoFeito) return;

        // Previne comportamentos padrão (scroll, etc)
        if (e.cancelable && isTouch) e.preventDefault();
        e.stopPropagation();

        // Som
        if (window.audioManager) window.audioManager.playClick();

        this.isDragging = true;
        this.dragItem = { element, pedraObj, index };

        // Get coordinates
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        const rect = element.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const offsetY = clientY - rect.top;

        // Criação do Elemento Fantasma (Ghost)
        this.createGhost(element, rect);
        element.style.opacity = "0.3";

        // Configura Áreas de Drop
        this.showDropZones();

        // Listeners para Movimento e Finalização
        const moveHandler = (ev) => this.handleDragMove(ev, offsetX, offsetY, isTouch);
        const endHandler = (ev) => this.handleDragEnd(ev, moveHandler, endHandler, isTouch);

        if (isTouch) {
            document.addEventListener("touchmove", moveHandler, { passive: false });
            document.addEventListener("touchend", endHandler);
        } else {
            document.addEventListener("mousemove", moveHandler);
            document.addEventListener("mouseup", endHandler);
        }
    },

    createGhost: function (element, rect) {
        const ghost = element.cloneNode(true);
        ghost.className = "ghost-pedra";
        ghost.style.position = "fixed";
        ghost.style.left = rect.left + "px";
        ghost.style.top = rect.top + "px";
        ghost.style.width = rect.width + "px";
        ghost.style.height = rect.height + "px";
        ghost.style.pointerEvents = "none";
        ghost.style.opacity = "0.85";
        ghost.style.zIndex = 99999;
        document.body.appendChild(ghost);
        this.dragGhost = ghost;
    },

    showDropZones: function () {
        const wrapper = document.getElementById("tabuleiro-wrapper");
        this.clearHighlights();

        const mesa = window.estadoJogo.mesa || Array(7).fill(null);
        const validos = window.GameRules.calcularSlotsValidos(mesa);
        // Reusing Renderer logic here might be tricky, usually Renderer depends on InputHandler, not vice versa
        // But strictly, InputHandler asks Renderer to show highlights or does it itself. 
        // For now, let's keep it self-contained or call a hypothetical Renderer.getSlotCoordinates

        // We need to access getSlotPositions which currently is in Renderer
        if (window.Renderer && window.Renderer.getSlotPositions) {
            const positions = window.Renderer.getSlotPositions(wrapper, 7, 68.39, 40);
            validos.forEach(slotIdx => {
                const h = document.createElement("div");
                h.className = "highlight-slot";
                h.style.position = "absolute";
                h.style.width = "68.39px";
                h.style.height = "68.39px";
                h.style.left = positions[slotIdx].left + "px";
                h.style.top = positions[slotIdx].top + "px";
                h.style.transform = "translate(-50%, -50%)";
                h.style.zIndex = 10000;
                h.setAttribute("data-slot", slotIdx);
                // Basic style
                h.style.boxShadow = "0 0 0 3px #bbb, 0 0 8px 2px #fff";
                h.style.borderRadius = "50%";
                wrapper.appendChild(h);
                this.dragHighlights.push(h);
            });
        }
    },

    clearHighlights: function () {
        this.dragHighlights.forEach(h => h.remove());
        this.dragHighlights = [];
    },

    handleDragMove: function (e, offsetX, offsetY, isTouch) {
        if (!this.isDragging || !this.dragGhost) return;
        if (isTouch && e.cancelable) e.preventDefault();

        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;

        this.dragGhost.style.left = (clientX - offsetX) + "px";
        this.dragGhost.style.top = (clientY - offsetY) + "px";

        // Collision detection for highlights
        this.dragHighlights.forEach(h => {
            const r = h.getBoundingClientRect();
            if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
                h.style.border = "2px solid #ffd700";
                h.setAttribute("data-hover", "true");
            } else {
                h.style.border = "none";
                h.removeAttribute("data-hover");
            }
        });
    },

    handleDragEnd: function (e, moveHandler, endHandler, isTouch) {
        if (isTouch) {
            document.removeEventListener("touchmove", moveHandler);
            document.removeEventListener("touchend", endHandler);
        } else {
            document.removeEventListener("mousemove", moveHandler);
            document.removeEventListener("mouseup", endHandler);
        }

        // Encontra o alvo do drop
        const dropTarget = this.dragHighlights.find(h => h.getAttribute("data-hover") === "true");

        if (dropTarget) {
            const slotIdx = parseInt(dropTarget.getAttribute("data-slot"));
            const { pedraObj, index } = this.dragItem;

            // Execute Move
            this.executeMove(pedraObj, index, slotIdx);
        } else {
            // Revert visual
            this.dragItem.element.style.opacity = "1";
        }

        // Cleanup
        if (this.dragGhost) this.dragGhost.remove();
        this.clearHighlights();
        this.isDragging = false;
        this.dragItem = null;
        this.dragGhost = null;
    },

    executeMove: function (pedraObj, indexReserva, slotIdx) {
        // Use GameController if available
        if (window.GameController) {
            // Remove from reserve in state FIRST (Controller should ideally handle this, but for now matching legacy flow)
            if (window.estadoJogo && window.estadoJogo.reserva) {
                window.estadoJogo.reserva[indexReserva] = null;
            }

            // Executa Ação
            const sucesso = window.GameController.colocarPedra(pedraObj, slotIdx);

            if (sucesso) {
                if (window.showToastInterno) window.showToastInterno("Pedra colocada!");
                if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();

                // Configura interações para a nova pedra na mesa
                // Legado: setupMesaInteractions() - mover isso futuramente
                if (typeof window.setupMesaInteractions === 'function') window.setupMesaInteractions();
            }
        } else {
            // Fallback Legado
            console.warn("[InputHandler] GameController not found, using legacy.");
            if (typeof window.inserirPedraNaMesa === 'function') {
                window.estadoJogo.reserva[indexReserva] = null;
                window.inserirPedraNaMesa(pedraObj, slotIdx);
                window.Renderer.renderizarMesa();
                window.Renderer.renderizarPedrasReserva();
                if (window.showToastInterno) window.showToastInterno("Pedra colocada!");
                if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
            }
        }
    },

    isTouchDevice: function () {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
};

window.InputHandler = InputHandler;
