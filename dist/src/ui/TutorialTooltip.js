/**
 * TutorialTooltip.ts - Tooltips Direcionais
 * v6.1: Setas apontando para elementos interativos
 */
export class TutorialTooltip {
    /**
     * Mostra tooltip apontando para elemento
     */
    static show(config) {
        const target = typeof config.target === 'string'
            ? document.querySelector(config.target)
            : config.target;
        if (!target) {
            console.warn(`[TutorialTooltip] Target not found: ${config.target}`);
            return;
        }
        // Remove tooltip anterior
        this.hide();
        // Cria tooltip
        const tooltip = document.createElement('div');
        tooltip.className = `tutorial-tooltip position-${config.position || 'top'}`;
        tooltip.textContent = config.text;
        document.body.appendChild(tooltip);
        this.activeTooltip = tooltip;
        // Posiciona
        this.positionTooltip(tooltip, target, config.position || 'top');
    }
    /**
     * Posiciona tooltip relativo ao alvo
     */
    static positionTooltip(tooltip, target, position) {
        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        let top = 0;
        let left = 0;
        switch (position) {
            case 'top':
                top = targetRect.top - tooltipRect.height - 15;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'bottom':
                top = targetRect.bottom + 15;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'left':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.left - tooltipRect.width - 15;
                break;
            case 'right':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.right + 15;
                break;
        }
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }
    /**
     * Remove tooltip
     */
    static hide() {
        if (this.activeTooltip) {
            this.activeTooltip.remove();
            this.activeTooltip = null;
        }
    }
    /**
     * Verifica se há tooltip ativo
     */
    static isActive() {
        return this.activeTooltip !== null;
    }
}
TutorialTooltip.activeTooltip = null;
// Global Export
window.TutorialTooltip = TutorialTooltip;
