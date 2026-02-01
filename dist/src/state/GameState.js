// =========================
// GameState - Tipos do Estado do Jogo
// =========================
/**
 * Estado inicial padrão
 */
export const DEFAULT_GAME_STATE = {
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
