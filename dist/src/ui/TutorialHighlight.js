/**
 * TutorialHighlight.ts - Sistema de Destaques Visuais
 * v6.1: Highlights dourados pulsantes para guiar o jogador
 */
export class TutorialHighlight {
    /**
     * Destaca um elemento genérico
     */
    static highlightElement(selector, type = 'glow') {
        const element = typeof selector === 'string'
            ? document.querySelector(selector)
            : selector;
        if (!element) {
            console.warn(`[TutorialHighlight] Element not found: ${selector}`);
            return;
        }
        // Remove highlights anteriores
        this.removeHighlights();
        // Adiciona novo highlight
        const className = `tutorial-highlight-${type}`;
        element.classList.add(className);
        this.activeHighlights.add(element);
        console.log(`[TutorialHighlight] Applied ${type} to`, element);
    }
    /**
     * Destaca uma pedra específica na mesa
     */
    static highlightStone(index, type = 'glow') {
        // Pedras são renderizadas como .stone-slot-{index}
        const stone = document.querySelector(`.stone-slot-${index}`);
        if (stone) {
            this.highlightElement(stone, type);
        }
    }
    /**
     * Destaca um botão de ação
     */
    static highlightButton(buttonId, type = 'pulse') {
        const button = document.getElementById(buttonId);
        if (button) {
            this.highlightElement(button, type);
        }
    }
    /**
     * Remove todos os highlights
     */
    static removeHighlights() {
        this.activeHighlights.forEach(element => {
            element.classList.remove('tutorial-highlight-glow');
            element.classList.remove('tutorial-highlight-pulse');
            element.classList.remove('tutorial-highlight-ring');
        });
        this.activeHighlights.clear();
    }
    /**
     * Verifica se há highlight ativo
     */
    static hasActiveHighlights() {
        return this.activeHighlights.size > 0;
    }
}
TutorialHighlight.activeHighlights = new Set();
// Global Export
window.TutorialHighlight = TutorialHighlight;
