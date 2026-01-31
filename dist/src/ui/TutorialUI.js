/**
 * TutorialUI.ts - Interface visual do tutorial com efeito typewriter
 * Parte da v6.0: UI modularizada e separada da lógica
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class TutorialUI {
    constructor(config = {}) {
        this.overlay = null;
        this.texto = null;
        this.btnNext = null;
        this.skipTypewriter = false;
        this.nextCallback = null;
        this.config = {
            position: config.position || { top: '170px', right: '280px' },
            theme: config.theme || 'default',
            typewriterSpeed: config.typewriterSpeed || 30
        };
    }
    /**
     * Cria a interface do tutorial
     */
    create() {
        if (document.getElementById('tutorial-ui')) {
            console.warn('[TutorialUI] UI já existe, pulando criação.');
            return;
        }
        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorial-ui';
        this.overlay.className = `tutorial-ui-container theme-${this.config.theme}`;
        this.overlay.style.top = this.config.position.top;
        this.overlay.style.right = this.config.position.right;
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
            if (window.audioManager) {
                window.audioManager.playClick();
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
    destroy() {
        if (this.overlay) {
            this.overlay.style.animation = 'tutorial-fade-out 0.3s ease-in';
            setTimeout(() => {
                var _a;
                (_a = this.overlay) === null || _a === void 0 ? void 0 : _a.remove();
                this.overlay = null;
                this.texto = null;
                this.btnNext = null;
            }, 300);
        }
    }
    /**
     * Exibe um passo do tutorial com efeito typewriter
     */
    showStep(step, canProceed) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.texto)
                return;
            this.skipTypewriter = false;
            this.setButtonEnabled(canProceed);
            // Limpar conteúdo anterior
            this.texto.innerHTML = '';
            // Título
            const titleEl = document.createElement('h3');
            titleEl.className = 'tutorial-title';
            this.texto.appendChild(titleEl);
            yield this.typewrite(step.titulo, titleEl, this.config.typewriterSpeed * 0.8);
            // Mensagem
            const msgEl = document.createElement('p');
            msgEl.className = 'tutorial-message';
            this.texto.appendChild(msgEl);
            yield this.typewrite(step.msg, msgEl, this.config.typewriterSpeed);
            // Ação
            const actionEl = document.createElement('p');
            actionEl.className = 'tutorial-action';
            this.texto.appendChild(actionEl);
            yield this.typewrite(step.acao, actionEl, this.config.typewriterSpeed * 1.2);
        });
    }
    /**
     * Habilita/desabilita o botão próximo
     */
    setButtonEnabled(enabled) {
        if (!this.btnNext)
            return;
        if (enabled) {
            this.btnNext.classList.remove('disabled');
            this.btnNext.disabled = false;
            this.btnNext.innerHTML = 'Próximo >>';
            this.pulse();
        }
        else {
            this.btnNext.classList.add('disabled');
            this.btnNext.disabled = true;
            this.btnNext.innerHTML = 'Aguardando ação...';
        }
    }
    /**
     * Define callback do botão próximo
     */
    onNextClick(callback) {
        this.nextCallback = callback;
    }
    /**
     * Animação de pulso no botão
     */
    pulse() {
        if (!this.btnNext)
            return;
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
    shake() {
        if (!this.overlay)
            return;
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
    typewrite(text_1, element_1) {
        return __awaiter(this, arguments, void 0, function* (text, element, speed = 30) {
            var _a;
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
                if (i % 3 === 0 && ((_a = window.audioManager) === null || _a === void 0 ? void 0 : _a.playTyping)) {
                    window.audioManager.playTyping();
                }
                // Pausas em pontuação
                let delay = speed;
                if (char === '.' || char === '!' || char === '?') {
                    delay = speed * 10;
                }
                else if (char === ',' || char === ';') {
                    delay = speed * 5;
                }
                yield this.sleep(delay);
                // Skip se usuário clicou
                if (this.skipTypewriter) {
                    element.insertBefore(document.createTextNode(text.slice(i + 1)), cursor);
                    break;
                }
            }
            // Remover cursor após 2s
            setTimeout(() => cursor.remove(), 2000);
        });
    }
    /**
     * Sleep helper para async/await
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Torna elemento arrastável
     */
    _makeHumansDraggable(handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const container = this.overlay;
        if (!container)
            return;
        handle.onmousedown = dragMouseDown;
        handle.ontouchstart = dragTouchStart;
        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        function dragTouchStart(e) {
            const touch = e.touches[0];
            pos3 = touch.clientX;
            pos4 = touch.clientY;
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementDragTouch;
        }
        function elementDrag(e) {
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
        function elementDragTouch(e) {
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
window.TutorialUI = TutorialUI;
