class NotificationManager {
    constructor() {
        this.globalToast = document.getElementById("toast");
        this.internalToast = document.getElementById("toast-interno");
        this.timers = {
            global: null,
            internal: null
        };
        this.queue = [];
        this.isShowingInternal = false;
    }

    /**
     * Exibe um toast global (centralizado/topo) para mensagens importantes de sistema.
     * @param {string} msg 
     * @param {number} duration (opcional, padrão 4000ms)
     */
    showGlobal(msg, duration = 4000) {
        if (!this.globalToast) return;

        // Clear previous animation
        if (this.timers.global) {
            clearTimeout(this.timers.global);
            this.timers.global = null;
        }

        this.globalToast.innerHTML = msg;
        this.globalToast.style.display = "block";
        // Force reflow
        void this.globalToast.offsetWidth;
        this.globalToast.style.opacity = "1";

        this.timers.global = setTimeout(() => {
            this.globalToast.style.opacity = "0";
            setTimeout(() => {
                this.globalToast.style.display = "none";
            }, 400); // Fade out duration
        }, duration);
    }

    /**
     * Adiciona uma mensagem à fila de notificações internas.
     * @param {string} msg 
     * @param {number} duration (opcional, padrão 2500ms)
     */
    showInternal(msg, duration = 2500) {
        this.queue.push({ msg, duration });
        this.processQueue();
    }

    /**
     * Processa a fila de notificações uma a uma.
     */
    processQueue() {
        if (this.isShowingInternal || this.queue.length === 0) return;
        if (!this.internalToast) return;

        this.isShowingInternal = true;
        const current = this.queue.shift();

        this.internalToast.innerHTML = current.msg;
        this.internalToast.classList.remove("mostrar");
        void this.internalToast.offsetWidth; // Force reflow
        this.internalToast.classList.add("mostrar");

        // Tempo de leitura + Tempo de animação de saída (assumindo transition CSS)
        // Se quisermos que APÓS sumir comece a proxima:
        // Espera duration (tempo visivel) -> Remove class (time fade out ~0.5s) -> Next

        if (this.timers.internal) clearTimeout(this.timers.internal);

        this.timers.internal = setTimeout(() => {
            this.internalToast.classList.remove("mostrar"); // Começa fade out

            // Aguarda o fade out terminar antes de puxar a próxima
            setTimeout(() => {
                this.isShowingInternal = false;
                this.processQueue();
            }, 500); // 500ms é uma estimativa segura para transitions css de opacidade

        }, current.duration);
    }
}

// Global Instance
window.notificationManager = new NotificationManager();
