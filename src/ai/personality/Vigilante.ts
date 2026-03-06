/**
 * Vigilante.ts - Perfil Defensivo-Analítico
 * 
 * "O Vigilante observa pacientemente. Ataca quando tem certeza absoluta."
 * 
 * Características:
 * - Espera alta confiança antes de desafiar
 * - Prefere espiar a adivinhar
 * - Raramente segaba
 * - Jogo calculado e metódico
 */

import { MaestroProfile } from "./MaestroProfile.js";

export const VIGILANTE: MaestroProfile = {
    id: 'vigilante',
    name: 'O Vigilante',
    title: 'Guardião da Certeza',
    description: 'Observa pacientemente. Ataca quando tem certeza absoluta.',

    modifiers: {
        place: 1.0,
        flip: 1.1,
        swap: 0.9,
        peek: 1.5,      // +50% valor de espiar
        challenge: 0.7, // -30% tendência a desafiar
        boast: 0.5      // -50% tendência a segabar
    },

    phrases: {
        winPoint: [
            "A paciência vence a pressa.",
            "Sabia exatamente onde estava.",
            "Observação é a chave."
        ],
        losePoint: [
            "Você me surpreendeu... desta vez.",
            "Impressionante dedução.",
            "Não esperava essa jogada."
        ],
        challenge: [
            "Tenho certeza absoluta.",
            "Vi você colocar essa pedra.",
            "Não há dúvida."
        ],
        boast: [
            "Conheço cada pedra nesta mesa.",
            "Observei tudo atentamente.",
            "Minha memória não falha."
        ],
        swap: [
            "Vamos reorganizar um pouco.",
            "Uma pequena mudança.",
            "Ajustando as posições."
        ],
        peek: [
            "Preciso confirmar algo.",
            "Deixe-me verificar...",
            "Apenas checando."
        ],
        surprised: [
            "Não vi isso vindo.",
            "Interessante...",
            "Hmm, inesperado."
        ],
        confident: [
            "Tudo sob controle.",
            "Sei exatamente o que fazer.",
            "Conheço cada movimento."
        ],
        frustrated: [
            "Preciso de mais informação.",
            "Ainda há incertezas.",
            "Não posso agir sem certeza."
        ]
    },

    specialBehaviors: {
        defensivePlay: true
    }
};

// Exportar globalmente
(window as any).VIGILANTE = VIGILANTE;
