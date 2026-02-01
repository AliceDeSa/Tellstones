/**
 * Button Component - Tellstones UI
 * Componente de botão reutilizável
 */
export class Button {
    constructor(props) {
        this.props = Object.assign({ variant: 'primary', size: 'md', disabled: false }, props);
        this.element = this.create();
    }
    create() {
        const btn = document.createElement('button');
        // Classes base
        const classes = ['ui-btn'];
        classes.push(`ui-btn--${this.props.variant}`);
        if (this.props.size !== 'md') {
            classes.push(`ui-btn--${this.props.size}`);
        }
        if (this.props.disabled) {
            classes.push('ui-btn--disabled');
        }
        if (this.props.className) {
            classes.push(this.props.className);
        }
        btn.className = classes.join(' ');
        btn.disabled = this.props.disabled || false;
        // Conteúdo
        if (this.props.icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'ui-btn__icon';
            iconSpan.textContent = this.props.icon;
            btn.appendChild(iconSpan);
        }
        const textSpan = document.createElement('span');
        textSpan.className = 'ui-btn__text';
        textSpan.textContent = this.props.text;
        btn.appendChild(textSpan);
        // Event listener
        if (this.props.onClick) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.props.disabled && this.props.onClick) {
                    // Play click sound if available
                    if (window.audioManager) {
                        window.audioManager.playClick();
                    }
                    this.props.onClick();
                }
            });
        }
        return btn;
    }
    /**
     * Retorna o elemento DOM do botão
     */
    getElement() {
        return this.element;
    }
    /**
     * Anexa o botão a um container
     */
    appendTo(container) {
        container.appendChild(this.element);
    }
    /**
     * Atualiza o texto do botão
     */
    setText(text) {
        this.props.text = text;
        const textSpan = this.element.querySelector('.ui-btn__text');
        if (textSpan) {
            textSpan.textContent = text;
        }
    }
    /**
     * Habilita/desabilita o botão
     */
    setDisabled(disabled) {
        this.props.disabled = disabled;
        this.element.disabled = disabled;
        this.element.classList.toggle('ui-btn--disabled', disabled);
    }
    /**
     * Remove o botão do DOM
     */
    destroy() {
        this.element.remove();
    }
}
// Factory function para criar botões rapidamente
export function createButton(props) {
    return new Button(props).getElement();
}
// Preset buttons
export const ButtonPresets = {
    play: (onClick) => new Button({
        text: 'Jogar',
        icon: '▶',
        variant: 'primary',
        size: 'lg',
        onClick
    }),
    back: (onClick) => new Button({
        text: 'Voltar',
        icon: '←',
        variant: 'ghost',
        onClick
    }),
    cancel: (onClick) => new Button({
        text: 'Cancelar',
        variant: 'secondary',
        onClick
    }),
    save: (onClick) => new Button({
        text: 'Salvar',
        variant: 'primary',
        onClick
    }),
    apply: (onClick) => new Button({
        text: 'Aplicar',
        variant: 'primary',
        onClick
    })
};
