// =========================
// Regras e Lógica Pura do Jogo
// =========================

interface Player {
    nome: string;
    id?: string;
    pontos?: number;
}

interface Stone {
    nome: string;
    url: string;
    virada?: boolean;
    fixo?: boolean;
}

interface GameState {
    jogadores: Player[];
    mesa: (Stone | null)[];
    reserva: Stone[];
    pedraCentral: (Stone | null);
    vez: number;
    alinhamentoFeito: boolean;
    centralAlinhada: boolean;
    mesaEspiada: number | null;
    vencedor: string | null;
    trocaAnimacao: any;
    desafio?: any;
    caraCoroa?: any;
    botProfile?: any;
}

const GameRules = {
    // Cria o estado inicial do jogo
    createInitialState: function (jogadores: Player[], pedrasOficiais: Stone[]): GameState {
        // Embaralhar as pedras da reserva a cada partida
        const pedrasEmbaralhadas = pedrasOficiais
            .slice()
            .sort(() => Math.random() - 0.5);
        const pedraCentral = pedrasEmbaralhadas.shift() || null;

        return {
            jogadores: jogadores.map((j) => ({
                nome: j.nome,
                pontos: 0,
                id: j.id || j.nome
            })),
            mesa: Array(7).fill(null), // sem pedra central ainda
            reserva: pedrasEmbaralhadas,
            pedraCentral: pedraCentral ? { ...pedraCentral, virada: false } : null,
            vez: 1, // Começa com o jogador index 1 (Aprendiz)
            alinhamentoFeito: false, // Flag para animação inicial
            centralAlinhada: false, // Flag quando pedra central é posicionada
            mesaEspiada: null, // Índice da pedra sendo espiada
            vencedor: null,
            trocaAnimacao: null
        };
    },

    // Retorna array de índices válidos (0 a 6) para inserir pedra na mesa
    calcularSlotsValidos: function (mesa: (Stone | null)[]): number[] {
        const slots = Array(7)
            .fill(null)
            .map((_, i) => i);
        const ocupados = mesa.map((p) => p && p.nome && p.url);
        let validos: number[] = [];
        for (let i = 0; i < 7; i++) {
            if (ocupados[i]) continue; // já tem pedra
            // verifica se é adjacente a uma pedra
            if ((i > 0 && ocupados[i - 1]) || (i < 6 && ocupados[i + 1])) {
                validos.push(i);
            }
        }
        // Se mesa vazia, apenas posição central (3) é válida
        if (mesa.filter((p) => p && p.nome && p.url).length === 0) {
            return [3];
        }
        return validos;
    }
};

if (typeof window !== 'undefined') {
    (window as any).GameRules = GameRules;
}

// Export for Node/Jest environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameRules;
}
