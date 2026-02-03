/**
 * TutorialProgressBar.ts - Barra de Progresso do Tutorial
 * v6.1: Indicador visual minimalista no topo
 */
export class TutorialProgressBar {
    constructor() {
        this.container = null;
        this.dotsContainer = null;
        this.totalSteps = 9;
    }
    /**
     * Cria a barra de progresso
     */
    create(totalSteps = 9) {
        if (document.getElementById('tutorial-progress-bar')) {
            console.warn('[TutorialProgressBar] Already exists');
            return;
        }
        this.totalSteps = totalSteps;
        // Container principal
        this.container = document.createElement('div');
        this.container.id = 'tutorial-progress-bar';
        // Container dos dots
        this.dotsContainer = document.createElement('div');
        this.dotsContainer.className = 'progress-dots';
        // Cria dots
        for (let i = 0; i < totalSteps; i++) {
            const dot = document.createElement('span');
            dot.className = 'dot';
            dot.dataset.step = String(i);
            this.dotsContainer.appendChild(dot);
        }
        this.container.appendChild(this.dotsContainer);
        document.body.appendChild(this.container);
        // Fade in
        this.container.style.opacity = '0';
        setTimeout(() => {
            if (this.container) {
                this.container.style.transition = 'opacity 0.3s';
                this.container.style.opacity = '1';
            }
        }, 100);
    }
    /**
     * Atualiza o progresso
     */
    setProgress(currentStep) {
        if (!this.dotsContainer)
            return;
        const dots = this.dotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            if (index < currentStep) {
                dot.classList.add('active');
            }
            else {
                dot.classList.remove('active');
            }
        });
    }
    /**
     * Remove a barra
     */
    destroy() {
        if (this.container) {
            this.container.style.opacity = '0';
            setTimeout(() => {
                var _a;
                (_a = this.container) === null || _a === void 0 ? void 0 : _a.remove();
                this.container = null;
                this.dotsContainer = null;
            }, 300);
        }
    }
    /**
     * Mostra a barra (se estava oculta)
     */
    show() {
        if (this.container) {
            this.container.style.opacity = '1';
        }
    }
    /**
     * Oculta a barra
     */
    hide() {
        if (this.container) {
            this.container.style.opacity = '0';
        }
    }
}
// Global Export
window.TutorialProgressBar = TutorialProgressBar;
