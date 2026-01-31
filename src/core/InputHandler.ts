// =========================
// InputHandler - Gerenciamento de Interações (Mouse/Touch)
// =========================

interface IDragItem {
    element: HTMLElement;
    pedraObj: any;
    index: number;
}

interface IInputHandler {
    isDragging: boolean;
    dragItem: IDragItem | null;
    dragGhost: HTMLElement | null;
    dragHighlights: HTMLElement[];
    init(): void;
    setupGlobalListeners(): void;
    setupReservaItem(element: HTMLElement, pedraObj: any, index: number, isVertical: boolean): void;
    handleDragStart(e: MouseEvent | TouchEvent, element: HTMLElement, pedraObj: any, index: number, isTouch: boolean): void;
    createGhost(element: HTMLElement, rect: DOMRect): void;
    showDropZones(): void;
    clearHighlights(): void;
    handleDragMove(e: MouseEvent | TouchEvent, offsetX: number, offsetY: number, isTouch: boolean): void;
    handleDragEnd(e: MouseEvent | TouchEvent, moveHandler: EventListener, endHandler: EventListener, isTouch: boolean): void;
    executeMove(pedraObj: any, indexReserva: number, slotIdx: number): void;
    isTouchDevice(): boolean;
}

// Declarações Globais (Legado/Outros Módulos)
declare var showTooltip: (text: string, x: number, y: number) => void;
declare var hideTooltip: () => void;

const InputHandler: IInputHandler = {
    isDragging: false,
    dragItem: null,
    dragGhost: null,
    dragHighlights: [],

    init: function () {
        // Inicializa listeners globais se necessário
        console.log("[InputHandler] Initialized");
        this.setupGlobalListeners();
    },

    setupGlobalListeners: function () {
        // Botões de Desafio e Se Gabar (Tutorial Integration)
        const btnDesafiar = document.getElementById("btn-desafiar");
        if (btnDesafiar) {
            btnDesafiar.addEventListener("click", () => {
                if ((window as any).tellstonesTutorial) {
                    setTimeout(() => (window as any).tellstonesTutorial.registrarAcaoConcluida(), 200);
                }
            });
        }
        const btnSeGabar = document.getElementById("btn-segabar");
        if (btnSeGabar) {
            btnSeGabar.addEventListener("click", () => {
                if ((window as any).tellstonesTutorial) {
                    setTimeout(() => (window as any).tellstonesTutorial.registrarAcaoConcluida(), 200);
                }
            });
        }

        // Escolha Cara ou Coroa
        const btnCara = document.getElementById("btn-cara");
        if (btnCara) {
            btnCara.onclick = () => {
                const el = document.getElementById("escolha-cara-coroa");
                if (el) el.style.display = "none";
                if ((window as any).definirEscolha) (window as any).definirEscolha("cara");
            };
        }
        const btnCoroa = document.getElementById("btn-coroa");
        if (btnCoroa) {
            btnCoroa.onclick = () => {
                const el = document.getElementById("escolha-cara-coroa");
                if (el) el.style.display = "none";
                if ((window as any).definirEscolha) (window as any).definirEscolha("coroa");
            };
        }
    },

    // Setup para pedras da reserva (Drag & Drop para o tabuleiro)
    setupReservaItem: function (element: HTMLElement, pedraObj: any, index: number, isVertical: boolean) {
        if (!element) return;

        // Eventos de Mouse
        element.onmousedown = (e) => this.handleDragStart(e, element, pedraObj, index, false);

        // Eventos de Toque (Touch)
        element.addEventListener("touchstart", (e) => this.handleDragStart(e, element, pedraObj, index, true), { passive: false });

        // Dicas de Ferramenta (Tooltips)
        if (!InputHandler.isTouchDevice()) {
            element.onmouseenter = (e) => (window as any).showTooltip("Arraste para o tabuleiro", e.clientX, e.clientY); // Global helper
            element.onmousemove = (e) => (window as any).showTooltip("Arraste para o tabuleiro", e.clientX, e.clientY);
            element.onmouseleave = (window as any).hideTooltip; // Global helper
        }
    },

    handleDragStart: function (e: MouseEvent | TouchEvent, element: HTMLElement, pedraObj: any, index: number, isTouch: boolean) {
        if ((window as any).tellstonesTutorial) {
            if (!(window as any).tellstonesTutorial.verificarAcao("ARRASTAR_RESERVA")) return;
        }

        // Validações de turno
        if ((window as any).ehMinhaVez && !(window as any).ehMinhaVez()) return; // Global check
        if ((window as any).estadoJogo && !(window as any).estadoJogo.alinhamentoFeito) return;

        // Previne comportamentos padrão (scroll, etc)
        if (e.cancelable && isTouch) e.preventDefault();
        e.stopPropagation();

        // Som
        if ((window as any).audioManager) (window as any).audioManager.playClick();

        this.isDragging = true;
        this.dragItem = { element, pedraObj, index };

        // Get coordinates
        let clientX: number, clientY: number;
        if (isTouch) {
            const touchEvent = e as TouchEvent;
            clientX = touchEvent.touches[0].clientX;
            clientY = touchEvent.touches[0].clientY;
        } else {
            const mouseEvent = e as MouseEvent;
            clientX = mouseEvent.clientX;
            clientY = mouseEvent.clientY;
        }

        const rect = element.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const offsetY = clientY - rect.top;

        // Criação do Elemento Fantasma (Ghost)
        this.createGhost(element, rect);
        if (element) element.style.opacity = "0.3";

        // Configura Áreas de Drop
        this.showDropZones();

        // Listeners para Movimento e Finalização
        const moveHandler = (ev: Event) => this.handleDragMove(ev as MouseEvent | TouchEvent, offsetX, offsetY, isTouch);
        const endHandler = (ev: Event) => this.handleDragEnd(ev as MouseEvent | TouchEvent, moveHandler, endHandler, isTouch);

        if (isTouch) {
            document.addEventListener("touchmove", moveHandler, { passive: false });
            document.addEventListener("touchend", endHandler);
        } else {
            document.addEventListener("mousemove", moveHandler);
            document.addEventListener("mouseup", endHandler);
        }
    },

    createGhost: function (element: HTMLElement, rect: DOMRect) {
        const ghost = element.cloneNode(true) as HTMLElement;
        ghost.className = "ghost-pedra";
        ghost.style.position = "fixed";
        ghost.style.left = rect.left + "px";
        ghost.style.top = rect.top + "px";
        ghost.style.width = rect.width + "px";
        ghost.style.height = rect.height + "px";
        ghost.style.pointerEvents = "none";
        ghost.style.opacity = "0.85";
        ghost.style.zIndex = "99999";
        document.body.appendChild(ghost);
        this.dragGhost = ghost;
    },

    showDropZones: function () {
        const wrapper = document.getElementById("tabuleiro-wrapper");
        if (!wrapper) return;
        this.clearHighlights();

        const mesa = (window as any).estadoJogo ? (window as any).estadoJogo.mesa : Array(7).fill(null);
        // Assuming GameRules is available globally (it is)
        const validos = (window as any).GameRules ? (window as any).GameRules.calcularSlotsValidos(mesa) : [3];

        // We need to access getSlotPositions which currently is in Renderer
        if ((window as any).Renderer && (window as any).Renderer.getSlotPositions) {
            const positions = (window as any).Renderer.getSlotPositions(wrapper, 7, 68.39, 40);
            validos.forEach((slotIdx: number) => {
                const h = document.createElement("div");
                h.className = "highlight-slot";
                h.style.position = "absolute";
                h.style.width = "68.39px";
                h.style.height = "68.39px";
                h.style.left = positions[slotIdx].left + "px";
                h.style.top = positions[slotIdx].top + "px";
                h.style.transform = "translate(-50%, -50%)";
                h.style.zIndex = "10000";
                h.setAttribute("data-slot", slotIdx.toString());
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

    handleDragMove: function (e: MouseEvent | TouchEvent, offsetX: number, offsetY: number, isTouch: boolean) {
        if (!this.isDragging || !this.dragGhost) return;
        if (isTouch && e.cancelable) e.preventDefault();

        let clientX: number, clientY: number;
        if (isTouch) {
            const touchEvent = e as TouchEvent;
            clientX = touchEvent.touches[0].clientX;
            clientY = touchEvent.touches[0].clientY;
        } else {
            const mouseEvent = e as MouseEvent;
            clientX = mouseEvent.clientX;
            clientY = mouseEvent.clientY;
        }

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

    handleDragEnd: function (e: MouseEvent | TouchEvent, moveHandler: EventListener, endHandler: EventListener, isTouch: boolean) {
        if (isTouch) {
            document.removeEventListener("touchmove", moveHandler);
            document.removeEventListener("touchend", endHandler);
        } else {
            document.removeEventListener("mousemove", moveHandler);
            document.removeEventListener("mouseup", endHandler);
        }

        // Encontra o alvo do drop
        const dropTarget = this.dragHighlights.find(h => h.getAttribute("data-hover") === "true");

        if (dropTarget && this.dragItem) {
            const slotIdx = parseInt(dropTarget.getAttribute("data-slot") || "0");
            const { pedraObj, index } = this.dragItem;

            // Execute Move
            this.executeMove(pedraObj, index, slotIdx);
        } else if (this.dragItem) {
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

    executeMove: function (pedraObj: any, indexReserva: number, slotIdx: number) {
        // Use GameController if available
        if ((window as any).GameController) {
            // Remove from reserve in state FIRST (Controller should ideally handle this, but for now matching legacy flow)
            if ((window as any).estadoJogo && (window as any).estadoJogo.reserva) {
                (window as any).estadoJogo.reserva[indexReserva] = null;
            }

            // Executa Ação
            const sucesso = (window as any).GameController.colocarPedra(pedraObj, slotIdx);

            if (sucesso) {
                if ((window as any).showToastInterno) (window as any).showToastInterno("Pedra colocada!");
                if ((window as any).tellstonesTutorial) (window as any).tellstonesTutorial.registrarAcaoConcluida();

                // Configura interações para a nova pedra na mesa
                // Legado: setupMesaInteractions() - mover isso futuramente
                if (typeof (window as any).setupMesaInteractions === 'function') (window as any).setupMesaInteractions();
            }
        } else {
            // Fallback Legado
            console.warn("[InputHandler] GameController not found, using legacy.");
            if (typeof (window as any).inserirPedraNaMesa === 'function') {
                (window as any).estadoJogo.reserva[indexReserva] = null;
                (window as any).inserirPedraNaMesa(pedraObj, slotIdx);
                (window as any).Renderer.renderizarMesa();
                (window as any).Renderer.renderizarPedrasReserva();
                if ((window as any).showToastInterno) (window as any).showToastInterno("Pedra colocada!");
                if ((window as any).tellstonesTutorial) (window as any).tellstonesTutorial.registrarAcaoConcluida();
            }
        }
    },

    isTouchDevice: function () {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
};

(window as any).InputHandler = InputHandler;
