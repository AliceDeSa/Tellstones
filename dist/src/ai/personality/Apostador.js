/**
 * Apostador.ts - Perfil Agressivo-Arriscado
 *
 * "O Apostador desafia cedo. Aceita riscos. Vive na borda."
 *
 * Características:
 * - Desafia mesmo com 50-60% de confiança
 * - Segaba frequentemente
 * - Não perde tempo espiando
 * - Jogo agressivo e ousado
 */
export const APOSTADOR = {
    id: 'apostador',
    name: 'O Apostador',
    title: 'Mestre do Risco',
    description: 'Desafia cedo. Aceita riscos. Vive na borda.',
    modifiers: {
        place: 1.0,
        flip: 1.2,
        swap: 1.1,
        peek: 0.4, // -60% espiar (não perde tempo)
        challenge: 1.6, // +60% desafiar (ama o risco)
        boast: 1.8 // +80% segabar (blefa muito)
    },
    phrases: {
        winPoint: [
            "A sorte favorece os ousados!",
            "Vale a aposta!",
            "Arriscar compensa.",
            "Sabia que daria certo!"
        ],
        losePoint: [
            "Quase... quase...",
            "Valeu a tentativa.",
            "Próxima vez dá certo.",
            "Nem sempre funciona."
        ],
        challenge: [
            "Vale a aposta!",
            "Vamos arriscar!",
            "Aposto que é essa!",
            "Tudo ou nada!"
        ],
        boast: [
            "Conheço todas!",
            "Aposto minha reputação nisso.",
            "Sei exatamente onde estão.",
            "Fácil demais!"
        ],
        swap: [
            "Vamos complicar as coisas.",
            "Uma pequena aposta.",
            "Mudando o jogo."
        ],
        peek: [
            "Rápida confirmação.",
            "Só pra ter certeza.",
            "Uma olhadinha."
        ],
        surprised: [
            "Não esperava isso!",
            "Que reviravolta!",
            "Impressionante!"
        ],
        confident: [
            "Tudo sob controle!",
            "Sei o que estou fazendo.",
            "Confiante como sempre.",
            "Aposta ganha!"
        ],
        frustrated: [
            "Preciso de mais ação!",
            "Muito devagar!",
            "Vamos acelerar isso!"
        ]
    },
    specialBehaviors: {
        earlyChallenge: true,
        bluffMaster: true
    }
};
// Exportar globalmente
window.APOSTADOR = APOSTADOR;
