/**
 * MaestroProfile.ts - Interface de Personalidade do Bot
 *
 * Define a estrutura para perfis de Maestro com modificadores,
 * frases contextuais e comportamentos únicos.
 */
/**
 * Retorna frase aleatória de uma categoria
 */
export function getRandomPhrase(phrases) {
    return phrases[Math.floor(Math.random() * phrases.length)];
}
/**
 * Retorna frase contextual baseada no evento
 */
export function getContextualPhrase(profile, event) {
    const phrases = profile.phrases[event];
    return getRandomPhrase(phrases);
}
// Exportar globalmente
window.MaestroProfile = { getRandomPhrase, getContextualPhrase };
