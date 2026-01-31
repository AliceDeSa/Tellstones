// =========================
// GameState - Tipos do Estado do Jogo
// =========================

/**
 * Representa uma pedra no tabuleiro
 */
export interface Stone {
    nome: string;
    virada: boolean;
    slot: number;
}

/**
 * Representa um jogador
 */
export interface Player {
    id: string;
    nome: string;
    pontos: number;
    isBot?: boolean;
}

/**
 * Estado completo do jogo
 */
export interface GameState {
    // Jogadores
    jogadores: Player[];
    jogadorAtual: number;

    // Tabuleiro
    mesa: (Stone | null)[];
    pedrasDisponiveis: string[];

    // Turnos e Ações
    turnoAtual: number;
    acaoAtual: 'colocar' | 'virar' | 'trocar' | 'espiar' | 'desafiar' | 'segabar' | null;

    // Estado de Jogo
    jogoIniciado: boolean;
    jogoFinalizado: boolean;
    vencedor: Player | null;

    // Modo de Jogo
    modoJogo: 'tutorial' | 'pve' | 'pvp' | 'online' | null;

    // Última Ação
    ultimaAcao: {
        tipo: string;
        jogador: string;
        timestamp: number;
        dados?: any;
    } | null;

    // Histórico
    historico: Array<{
        turno: number;
        jogador: string;
        acao: string;
        timestamp: number;
    }>;

    // Tutorial State (opcional - v6.0)
    tutorialState?: {
        currentStep: number;
        allowedActions: string[];
    };
}

/**
 * Estado inicial padrão
 */
export const DEFAULT_GAME_STATE: GameState = {
    jogadores: [],
    jogadorAtual: 0,
    mesa: Array(7).fill(null),
    pedrasDisponiveis: [],
    turnoAtual: 0,
    acaoAtual: null,
    jogoIniciado: false,
    jogoFinalizado: false,
    vencedor: null,
    modoJogo: null,
    ultimaAcao: null,
    historico: []
};
