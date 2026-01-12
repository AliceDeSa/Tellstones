/**
 * Classe Base de Modo de Jogo
 * Define o contrato para diferentes tipos de jogo (Multijogador, PvE, Tutorial).
 */
class GameMode {
    constructor() {
        if (this.constructor === GameMode) {
            throw new Error("Abstract classes can't be instantiated.");
        }
        this.active = false;
        this.listeners = [];
    }

    /**
     * Inicializa o modo de jogo.
     * @param {Object} config - Parâmetros de configuração (playerName, roomId, etc.)
     */
    start(config) {
        this.active = true;
        this.config = config;
        window.currentGameMode = this; // Set global reference
        // Lógica inicial de configuração se necessário
    }

    /**
     * Limpa listeners e estado ao trocar de modo.
     */
    cleanup() {
        // Lógica de limpeza se necessário
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
     * @param {Object} snapshot 
     */
    onStateChange(snapshot) {
        // Implementar nas subclasses
    }

    /**
     * Define permissão para ações (Tutorial Lock).
     */
    canPerformAction(action, context) {
        return true; // Default: tudo permitido
    }

    /**
     * Resolve um desafio (Pedra escolhida pelo oponente).
     * @param {number} idxDeduzido - Índice da pedra escolhida.
     */
    resolveChallenge(idxDeduzido) {
        console.warn("resolveChallenge não implementado neste modo.");
    }
    onStateUpdate(snapshot) {
        // To be implemented by subclasses
    }

    /**
     * Verifica se uma ação de UI é permitida no modo atual.
     * @param {string} action - Nome da ação (ex: "TROCAR_PEDRAS")
     * @param {Object} context - Dados opcionais
     * @returns {boolean}
     */
    canPerformAction(action, context = {}) {
        return true; // Por padrão, tudo é permitido
    }
}

// Export for usage
window.GameMode = GameMode;
