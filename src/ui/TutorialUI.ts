/**
 * TutorialUI.ts - Interface visual do tutorial com efeito typewriter
 * Parte da v6.0: UI modularizada e separada da lógica
 */

export interface TutorialUIConfig {
    position?: { top: string; right: string };
    theme?: 'default' | 'dark' | 'premium';
    typewriterSpeed?: number;
}

export interface TutorialStep {
    titulo: string;
    msg: string;
    acao: string;
}

export class TutorialUI {
    private overlay: HTMLDivElement | null = null;
    private texto: HTMLDivElement | null = null;
    private btnNext: HTMLButtonElement | null = null;
    private config: TutorialUIConfig;
    private skipTypewriter: boolean = false;
    private nextCallback: (() => void) | null = null;

    constructor(config: TutorialUIConfig = {}) {
        this.config = {
            position: config.position || { top: '170px', right: '280px' },
            theme: config.theme || 'default',
            typewriterSpeed: config.typewriterSpeed || 30
        };
    }

    /**
     * Cria a interface do tutorial
     */
    create(): void {
        if (document.getElementById('tutorial-ui')) {
            console.warn('[TutorialUI] UI já existe, pulando criação.');
            return;
        }

        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorial-ui';
        this.overlay.className = `tutorial-ui-container theme-${this.config.theme}`;
        this.overlay.style.top = this.config.position!.top;
        this.overlay.style.right = this.config.position!.right;

        // Handle (barra de arrastar)
        const handle = document.createElement('div');
        handle.className = 'tutorial-handle';
        handle.innerHTML = '⋮⋮ TUTORIAL ⋮⋮';
        this.overlay.appendChild(handle);

        // Container de texto
        this.texto = document.createElement('div');
        this.texto.className = 'tutorial-content';
        this.overlay.appendChild(this.texto);

        // Botão próximo
        this.btnNext = document.createElement('button');
        this.btnNext.className = 'tutorial-btn';
        this.btnNext.innerText = 'Próximo >>';
        this.btnNext.onclick = () => {
            if ((window as any).audioManager) {
                (window as any).audioManager.playClick();
            }
            if (this.nextCallback) {
                this.nextCallback();
            }
        };
        this.overlay.appendChild(this.btnNext);

        document.body.appendChild(this.overlay);
        this._makeHumansDraggable(handle);

        // Animação de entrada
        this.overlay.style.animation = 'tutorial-fade-in 0.5s ease-out';
    }

    /**
     * Destroi a interface do tutorial
     */
    destroy(): void {
        if (this.overlay) {
            this.overlay.style.animation = 'tutorial-fade-out 0.3s ease-in';
            setTimeout(() => {
                this.overlay?.remove();
                this.overlay = null;
                this.texto = null;
                this.btnNext = null;
            }, 300);
        }
    }

    /**
     * Exibe um passo do tutorial com efeito typewriter
     */
    async showStep(step: TutorialStep, canProceed: boolean): Promise<void> {
        if (!this.texto) return;

        this.skipTypewriter = false;
        this.setButtonEnabled(canProceed);

        // Limpar conteúdo anterior
        this.texto.innerHTML = '';

        // Título
        const titleEl = document.createElement('h3');
        titleEl.className = 'tutorial-title';
        this.texto.appendChild(titleEl);
        await this.typewrite(step.titulo, titleEl, this.config.typewriterSpeed! * 0.8);

        // Mensagem
        const msgEl = document.createElement('p');
        msgEl.className = 'tutorial-message';
        this.texto.appendChild(msgEl);
        await this.typewrite(step.msg, msgEl, this.config.typewriterSpeed!);

        // Ação
        const actionEl = document.createElement('p');
        actionEl.className = 'tutorial-action';
        this.texto.appendChild(actionEl);
        await this.typewrite(step.acao, actionEl, this.config.typewriterSpeed! * 1.2);
    }

    /**
     * Habilita/desabilita o botão próximo
     */
    setButtonEnabled(enabled: boolean): void {
        if (!this.btnNext) return;

        if (enabled) {
            this.btnNext.classList.remove('disabled');
            this.btnNext.disabled = false;
            this.btnNext.innerHTML = 'Próximo >>';
            this.pulse();
        } else {
            this.btnNext.classList.add('disabled');
            this.btnNext.disabled = true;
            this.btnNext.innerHTML = 'Aguardando ação...';
        }
    }

    /**
     * Define callback do botão próximo
     */
    onNextClick(callback: () => void): void {
        this.nextCallback = callback;
    }

    /**
     * Animação de pulso no botão
     */
    pulse(): void {
        if (!this.btnNext) return;
        this.btnNext.style.animation = 'tutorial-pulse 0.5s ease-in-out';
        setTimeout(() => {
            if (this.btnNext) {
                this.btnNext.style.animation = '';
            }
        }, 500);
    }

    /**
     * Animação de shake (erro)
     */
    shake(): void {
        if (!this.overlay) return;
        this.overlay.style.animation = 'tutorial-shake 0.5s ease-in-out';
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.style.animation = '';
            }
        }, 500);
    }

    /**
     * Efeito typewriter premium
     */
    private async typewrite(
        text: string,
        element: HTMLElement,
        speed: number = 30
    ): Promise<void> {
        element.textContent = '';

        // Criar cursor piscando
        const cursor = document.createElement('span');
        cursor.className = 'typewriter-cursor';
        element.appendChild(cursor);

        // Permitir skip ao clicar
        const skipHandler = () => {
            this.skipTypewriter = true;
        };
        element.addEventListener('click', skipHandler, { once: true });

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            // Inserir caractere antes do cursor
            const textNode = document.createTextNode(char);
            element.insertBefore(textNode, cursor);

            // Som de digitação (cada 3 caracteres)
            if (i % 3 === 0 && (window as any).audioManager?.playTyping) {
                (window as any).audioManager.playTyping();
            }

            // Pausas em pontuação
            let delay = speed;
            if (char === '.' || char === '!' || char === '?') {
                delay = speed * 10;
            } else if (char === ',' || char === ';') {
                delay = speed * 5;
            }

            await this.sleep(delay);

            // Skip se usuário clicou
            if (this.skipTypewriter) {
                element.insertBefore(
                    document.createTextNode(text.slice(i + 1)),
                    cursor
                );
                break;
            }
        }

        // Remover cursor após 2s
        setTimeout(() => cursor.remove(), 2000);
    }

    /**
     * Sleep helper para async/await
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Torna elemento arrastável
     */
    private _makeHumansDraggable(handle: HTMLElement): void {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const container = this.overlay;
        if (!container) return;

        handle.onmousedown = dragMouseDown;
        handle.ontouchstart = dragTouchStart;

        function dragMouseDown(e: MouseEvent) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function dragTouchStart(e: TouchEvent) {
            const touch = e.touches[0];
            pos3 = touch.clientX;
            pos4 = touch.clientY;
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementDragTouch;
        }

        function elementDrag(e: MouseEvent) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            if (container) {
                container.style.top = (container.offsetTop - pos2) + 'px';
                container.style.left = (container.offsetLeft - pos1) + 'px';
            }
        }

        function elementDragTouch(e: TouchEvent) {
            const touch = e.touches[0];
            pos1 = pos3 - touch.clientX;
            pos2 = pos4 - touch.clientY;
            pos3 = touch.clientX;
            pos4 = touch.clientY;
            if (container) {
                container.style.top = (container.offsetTop - pos2) + 'px';
                container.style.left = (container.offsetLeft - pos1) + 'px';
            }
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
        }
    }
}

// Global Export
(window as any).TutorialUI = TutorialUI;
