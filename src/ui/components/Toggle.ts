/**
 * Toggle Component - Tellstones UI
 * Componente de switch on/off reutilizável
 */

export interface ToggleProps {
    label: string;
    checked?: boolean;
    labelPosition?: 'left' | 'right';
    onChange?: (checked: boolean) => void;
}

export class Toggle {
    private element: HTMLLabelElement;
    private input: HTMLInputElement;
    private props: Required<Omit<ToggleProps, 'onChange'>> & Pick<ToggleProps, 'onChange'>;

    constructor(props: ToggleProps) {
        this.props = {
            checked: false,
            labelPosition: 'left',
            ...props
        };
        this.element = this.create();
        this.input = this.element.querySelector('.ui-toggle__input') as HTMLInputElement;
    }

    private create(): HTMLLabelElement {
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
            if ((window as any).audioManager) {
                (window as any).audioManager.playClick();
            }
        });

        // Mount order based on label position
        if (this.props.labelPosition === 'left') {
            container.appendChild(label);
            container.appendChild(switchEl);
        } else {
            container.appendChild(switchEl);
            container.appendChild(label);
        }
        container.appendChild(input);

        return container;
    }

    /**
     * Retorna o elemento DOM
     */
    getElement(): HTMLLabelElement {
        return this.element;
    }

    /**
     * Anexa ao container
     */
    appendTo(container: HTMLElement): void {
        container.appendChild(this.element);
    }

    /**
     * Obtém o estado atual
     */
    isChecked(): boolean {
        return this.input.checked;
    }

    /**
     * Define o estado
     */
    setChecked(checked: boolean): void {
        this.props.checked = checked;
        this.input.checked = checked;
        this.element.classList.toggle('ui-toggle--active', checked);
    }

    /**
     * Remove do DOM
     */
    destroy(): void {
        this.element.remove();
    }
}

// Factory function
export function createToggle(props: ToggleProps): HTMLLabelElement {
    return new Toggle(props).getElement();
}
