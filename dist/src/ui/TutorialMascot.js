/**
 * TutorialMascot.ts - Mascote Guia do Tutorial
 * v6.1: Avatar com reações visuais (happy, thinking, excited)
 */
export class TutorialMascot {
    constructor() {
        this.container = null;
        this.avatar = null;
        this.currentState = 'idle';
        // Emojis para cada estado
        this.emojis = {
            idle: '🦉',
            happy: '🎉',
            thinking: '🤔',
            excited: '✨'
        };
    }
    /**
     * Cria o mascote
     */
    create() {
        if (document.getElementById('tutorial-mascot')) {
            console.warn('[TutorialMascot] Already exists');
            return;
        }
        // Container
        this.container = document.createElement('div');
        this.container.id = 'tutorial-mascot';
        this.container.className = 'state-idle';
        // Avatar
        this.avatar = document.createElement('div');
        this.avatar.className = 'mascot-avatar';
        this.avatar.textContent = this.emojis.idle;
        this.container.appendChild(this.avatar);
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
     * Muda o estado do mascote
     */
    setState(state) {
        if (!this.container || !this.avatar)
            return;
        // Remove estado anterior
        this.container.classList.remove(`state-${this.currentState}`);
        // Aplica novo estado
        this.currentState = state;
        this.container.classList.add(`state-${state}`);
        this.avatar.textContent = this.emojis[state];
        console.log(`[TutorialMascot] State changed to: ${state}`);
    }
    /**
     * Reação rápida (happy) que volta ao idle
     */
    react(state, duration = 2000) {
        this.setState(state);
        setTimeout(() => this.setState('idle'), duration);
    }
    /**
     * Remove o mascote
     */
    destroy() {
        if (this.container) {
            this.container.style.opacity = '0';
            setTimeout(() => {
                var _a;
                (_a = this.container) === null || _a === void 0 ? void 0 : _a.remove();
                this.container = null;
                this.avatar = null;
            }, 300);
        }
    }
    /**
     * Mostra mascote
     */
    show() {
        if (this.container) {
            this.container.style.opacity = '1';
        }
    }
    /**
     * Oculta mascote
     */
    hide() {
        if (this.container) {
            this.container.style.opacity = '0';
        }
    }
    /**
     * Retorna estado atual
     */
    getState() {
        return this.currentState;
    }
}
// Global Export
window.TutorialMascot = TutorialMascot;
