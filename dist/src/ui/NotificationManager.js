"use strict";
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
     * @param msg Mensagem HTML/Texto
     * @param duration (opcional, padrão 4000ms)
     */
    showGlobal(msg, duration = 4000) {
        if (!this.globalToast)
            return;
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
        this.timers.global = window.setTimeout(() => {
            if (this.globalToast)
                this.globalToast.style.opacity = "0";
            setTimeout(() => {
                if (this.globalToast)
                    this.globalToast.style.display = "none";
            }, 400); // Fade out duration
        }, duration);
    }
    /**
     * Adiciona uma mensagem à fila de notificações internas.
     * @param msg Mensagem HTML/Texto
     * @param duration (opcional, padrão 2500ms)
     */
    showInternal(msg, duration = 2500) {
        this.queue.push({ msg, duration });
        this.processQueue();
    }
    /**
     * Processa a fila de notificações uma a uma.
     */
    processQueue() {
        if (this.isShowingInternal || this.queue.length === 0)
            return;
        if (!this.internalToast)
            return;
        this.isShowingInternal = true;
        const current = this.queue.shift();
        if (current) {
            this.internalToast.innerHTML = current.msg;
            this.internalToast.classList.remove("mostrar");
            void this.internalToast.offsetWidth; // Force reflow
            this.internalToast.classList.add("mostrar");
            if (this.timers.internal)
                clearTimeout(this.timers.internal);
            this.timers.internal = window.setTimeout(() => {
                if (this.internalToast)
                    this.internalToast.classList.remove("mostrar"); // Começa fade out
                // Aguarda o fade out terminar antes de puxar a próxima
                setTimeout(() => {
                    this.isShowingInternal = false;
                    this.processQueue();
                }, 500); // 500ms é uma estimativa segura para transitions css de opacidade
            }, current.duration);
        }
    }
    clear() {
        this.queue = [];
        this.isShowingInternal = false;
        if (this.timers.internal) {
            clearTimeout(this.timers.internal);
            this.timers.internal = null;
        }
        if (this.internalToast) {
            this.internalToast.className = ""; // Remove all classes including mostrar
            this.internalToast.innerHTML = "";
        }
        // Also clear global if needed, although global is usually transient
        if (this.timers.global) {
            clearTimeout(this.timers.global);
            this.timers.global = null;
        }
        if (this.globalToast) {
            this.globalToast.style.display = "none";
            this.globalToast.style.opacity = "0";
        }
    }
}
// Global Assignment
window.notificationManager = new NotificationManager();
