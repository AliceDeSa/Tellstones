
export interface GameConfig {
    [key: string]: any;
}

export interface GameListener {
    ref: any;
    type: string;
    callback: (snapshot: any) => void;
}

export class GameMode {
    public config: GameConfig | null = null;
    public active: boolean = false;
    protected listeners: GameListener[] = [];

    constructor() {
        this.config = null;
        this.active = false;
        this.listeners = [];
    }

    /**
     * Inicializa o modo de jogo.
     * @param config - Parâmetros de configuração (playerName, roomId, etc.)
     */
    start(config: GameConfig): void {
        this.active = true;
        this.config = config;

        // Expose global reference for debugging or legacy access
        (window as any).currentGameMode = this;
    }

    /**
     * Limpa listeners e estado ao trocar de modo.
     */
    cleanup(): void {
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
    registerListener(ref: any, type: string, callback: (snap: any) => void): void {
        ref.on(type, callback);
        this.listeners.push({ ref, type, callback });
    }

    /**
     * Lida com atualizações de estado do DB.
     */
    onStateChange(snapshot: any): void {
        // Implementar nas subclasses
    }

    /**
     * Verifica se uma ação de UI é permitida no modo atual.
     */
    canPerformAction(action: any, context: any = {}): boolean {
        return true; // Default: tudo permitido
    }

    /**
     * Resolve um desafio (Pedra escolhida pelo oponente).
     * @param idxDeduzido - Índice da pedra escolhida.
     */
    resolveChallenge(idxDeduzido: number): void {
        console.warn("resolveChallenge não implementado neste modo.");
    }

    onStateUpdate(snapshot: any): void {
        // To be implemented by subclasses
    }
}

// Global scope
(window as any).GameMode = GameMode;
