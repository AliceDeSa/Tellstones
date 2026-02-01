export { };

declare global {
    interface Window {
        // Core Managers
        GameController: any;
        RoomManager: any;
        AnalyticsManager: any;
        Renderer: any;
        InputHandler: any;
        Logger: any;

        // UI Managers
        audioManager: any;
        notificationManager: any;
        ChangelogManager: any;
        AnimationManager: any;

        // Modes
        TutorialMode: any;
        PvEMode: any;
        MultiplayerMode: any;
        GameMode: any;
        currentGameMode: any;
        tellstonesTutorial: any; // Instance

        // Bot
        BotBrain: any;

        // Game State & Config
        GameConfig: any;
        estadoJogo: any;
        salaAtual: string | null;
        nomeAtual: string | null;
        souCriador: boolean;
        PEDRAS_OFICIAIS: { nome: string; url: string }[];

        // Flags
        isMuted: boolean;
        selecionandoDesafio: boolean;
        resolvendoDesafio: boolean;
        animacaoTrocaEmAndamento: boolean;
        jaEntrouNoGame: boolean;
        animouReservaCircular: boolean;
        botThinking: boolean;

        // Functions (Legacy/Global Access)
        tocarSomPress: () => void;
        tocarSomClick: () => void;
        showToastInterno: (msg: string) => void;
        showToast: (msg: string) => void;
        criarSala: (modo: string) => string;
        entrarSala: (codigo: string, nome: string, tipo: string) => void;
        mostrarLobby: (codigo: string, nome: string, criador: boolean) => void;
        sairPartida: () => void;
        mostrarTela: (tela: string) => void;
        avancarTurno: () => void;
        ehMinhaVez: () => boolean;
        sincronizarPedraCentralEAlinhamento: () => void;
        realizarTroca: (from: number, to: number) => void;
        hideTooltip: () => void;
        garantirArray: (arr: any) => any[];

        // Firebase
        firebaseSecrets: any;
        getDBRef: (path: string) => any;
        ultimosEspectadores: any[];

        // Debug Automators
        PvEAutomator: any;
        TutorialAutomator: any;
    }
}
