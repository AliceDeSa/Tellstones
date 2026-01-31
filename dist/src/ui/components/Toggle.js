/**
 * Toggle Component - Tellstones UI
 * Componente de switch on/off reutilizável
 */
export class Toggle {
    constructor(props) {
        this.props = Object.assign({ checked: false, labelPosition: 'left' }, props);
        this.element = this.create();
        this.input = this.element.querySelector('.ui-toggle__input');
    }
    create() {
        const container = document.createElement('label');
        container.className = 'ui-toggle';
        if (this.props.checked) {
            container.classList.add('ui-toggle--active');
        }
        // Hidden input
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'ui-toggle__input';
        input.checked = this.props.checked;
        // Label text
        const label = document.createElement('span');
        label.className = 'ui-toggle__label';
        label.textContent = this.props.label;
        // Switch visual
        const switchEl = document.createElement('span');
        switchEl.className = 'ui-toggle__switch';
        // Event listener
        input.addEventListener('change', () => {
            this.props.checked = input.checked;
            container.classList.toggle('ui-toggle--active', input.checked);
            if (this.props.onChange) {
                this.props.onChange(input.checked);
            }
            // Play click sound if available
            if (window.audioManager) {
                window.audioManager.playClick();
            }
        });
        // Mount order based on label position
        if (this.props.labelPosition === 'left') {
            container.appendChild(label);
            container.appendChild(switchEl);
        }
        else {
            container.appendChild(switchEl);
            container.appendChild(label);
        }
        container.appendChild(input);
        return container;
    }
    /**
     * Retorna o elemento DOM
     */
    getElement() {
        return this.element;
    }
    /**
     * Anexa ao container
     */
    appendTo(container) {
        container.appendChild(this.element);
    }
    /**
     * Obtém o estado atual
     */
    isChecked() {
        return this.input.checked;
    }
    /**
     * Define o estado
     */
    setChecked(checked) {
        this.props.checked = checked;
        this.input.checked = checked;
        this.element.classList.toggle('ui-toggle--active', checked);
    }
    /**
     * Remove do DOM
     */
    destroy() {
        this.element.remove();
    }
}
// Factory function
export function createToggle(props) {
    return new Toggle(props).getElement();
}
