export class GameMode {
    constructor() {
        this.config = null;
        this.active = false;
        this.listeners = [];
        this.config = null;
        this.active = false;
        this.listeners = [];
    }
    /**
     * Inicializa o modo de jogo.
     * @param config - Parâmetros de configuração (playerName, roomId, etc.)
     */
    start(config) {
        this.active = true;
        this.config = config;
        // Expose global reference for debugging or legacy access
        window.currentGameMode = this;
    }
    /**
     * Limpa listeners e estado ao trocar de modo.
     */
    cleanup() {
        this.active = false;
        // Remove todos os listeners registrados
        this.listeners.forEach(l => {
            if (l.ref && l.type) {
                l.ref.off(l.type, l.callback);
            }
        });
        this.listeners = [];
    }
    /**
     * Helper para registrar listeners (Firebase/LocalDB) para limpeza automática.
     */
    registerListener(ref, type, callback) {
        ref.on(type, callback);
        this.listeners.push({ ref, type, callback });
    }
    /**
     * Lida com atualizações de estado do DB.
     */
    onStateChange(snapshot) {
        // Implementar nas subclasses
    }
    /**
     * Verifica se uma ação de UI é permitida no modo atual.
     */
    canPerformAction(action, context = {}) {
        return true; // Default: tudo permitido
    }
    /**
     * Resolve um desafio (Pedra escolhida pelo oponente).
     * @param idxDeduzido - Índice da pedra escolhida.
     */
    resolveChallenge(idxDeduzido) {
        console.warn("resolveChallenge não implementado neste modo.");
    }
    onStateUpdate(snapshot) {
        // To be implemented by subclasses
    }
}
// Global scope
window.GameMode = GameMode;
