/**
 * MaestroProfile.ts - Interface de Personalidade do Bot
 * 
 * Define a estrutura para perfis de Maestro com modificadores,
 * frases contextuais e comportamentos únicos.
 */

import { PersonalityModifiers } from "../core/DecisionEngine.js";

export interface MaestroPhrases {
    // Frases de vitória
    winPoint: string[];
    losePoint: string[];

    // Frases de ação
    challenge: string[];
    boast: string[];
    swap: string[];
    peek: string[];

    // Frases de reação
    surprised: string[];
    confident: string[];
    frustrated: string[];
}

export interface MaestroProfile {
    // Identificação
    id: string;
    name: string;
    title: string;
    description: string;

    // Avatar (futuro)
    avatar?: string;

    // Modificadores de decisão
    modifiers: PersonalityModifiers;

    // Frases contextuais
    phrases: MaestroPhrases;

    // Comportamentos especiais
    specialBehaviors?: {
        earlyChallenge?: boolean;    // Desafia cedo no jogo
        frequentSwaps?: boolean;      // Troca constantemente
        defensivePlay?: boolean;      // Joga defensivo
        bluffMaster?: boolean;        // Blefa em boasts
    };
}

/**
 * Retorna frase aleatória de uma categoria
 */
export function getRandomPhrase(phrases: string[]): string {
    return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Retorna frase contextual baseada no evento
 */
export function getContextualPhrase(
    profile: MaestroProfile,
    event: keyof MaestroPhrases
): string {
    const phrases = profile.phrases[event];
    return getRandomPhrase(phrases);
}

// Exportar globalmente
(window as any).MaestroProfile = { getRandomPhrase, getContextualPhrase };
