/**
 * Fantasma.ts - Perfil Caótico-Confusionista
 *
 * "O Fantasma troca constantemente. Nunca confie na posição das pedras."
 *
 * Características:
 * - Adora trocar pedras
 * - Esconde pedras frequentemente
 * - Prefere confundir a saber
 * - Jogo imprevisível e dinâmico
 */
export const FANTASMA = {
    id: 'fantasma',
    name: 'O Fantasma',
    title: 'Mestre da Confusão',
    description: 'Troca constantemente. Nunca confie na posição das pedras.',
    modifiers: {
        place: 1.0,
        flip: 1.8, // +80% esconder pedras
        swap: 2.0, // +100% trocar (ama trocar!)
        peek: 0.6, // -40% espiar (prefere confundir)
        challenge: 1.0,
        boast: 1.2
    },
    phrases: {
        winPoint: [
            "Você nunca soube onde estava.",
            "Perdeu de vista?",
            "A confusão é minha aliada."
        ],
        losePoint: [
            "Mesmo confuso... você acertou?",
            "Sorte do principiante.",
            "Impressionante, entre todo esse caos."
        ],
        challenge: [
            "Acha que sabe onde está?",
            "Vamos ver se você acompanhou.",
            "Aposto que está perdido."
        ],
        boast: [
            "Sei onde tudo está... ou não?",
            "Confusão total, mas eu sei.",
            "Caos controlado."
        ],
        swap: [
            "Perdeu de vista?",
            "Vamos embaralhar um pouco.",
            "Onde estava mesmo?",
            "Mais uma troca!",
            "Acompanhe se conseguir."
        ],
        peek: [
            "Só uma olhadinha rápida.",
            "Preciso confirmar o caos.",
            "Deixe-me ver..."
        ],
        surprised: [
            "Você conseguiu acompanhar?!",
            "Não esperava que soubesse.",
            "Impressionante rastreamento."
        ],
        confident: [
            "Ninguém sabe onde está nada.",
            "Confusão perfeita.",
            "Tudo embaralhado."
        ],
        frustrated: [
            "Preciso de mais caos!",
            "Ainda muito organizado.",
            "Vamos complicar mais."
        ]
    },
    specialBehaviors: {
        frequentSwaps: true
    }
};
// Exportar globalmente
window.FANTASMA = FANTASMA;
