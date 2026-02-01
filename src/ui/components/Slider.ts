/**
 * Slider Component - Tellstones UI
 * Componente de controle deslizante reutilizável
 */

export interface SliderProps {
    label: string;
    min?: number;
    max?: number;
    value?: number;
    step?: number;
    showValue?: boolean;
    suffix?: string;
    onChange?: (value: number) => void;
}

export class Slider {
    private element: HTMLDivElement;
    private input: HTMLInputElement;
    private valueDisplay: HTMLSpanElement | null = null;
    private props: Required<Omit<SliderProps, 'onChange'>> & Pick<SliderProps, 'onChange'>;

    constructor(props: SliderProps) {
        this.props = {
            min: 0,
            max: 100,
            value: 50,
            step: 1,
            showValue: true,
            suffix: '%',
            ...props
        };
        this.element = this.create();
        this.input = this.element.querySelector('.ui-slider__input') as HTMLInputElement;
    }

    private create(): HTMLDivElement {
        const container = document.createElement('div');
        container.className = 'ui-slider';

        // Header com label e valor
        const header = document.createElement('div');
        header.className = 'ui-slider__header';

        const label = document.createElement('span');
        label.className = 'ui-slider__label';
        label.textContent = this.props.label;
        header.appendChild(label);

        if (this.props.showValue) {
            this.valueDisplay = document.createElement('span');
            this.valueDisplay.className = 'ui-slider__value';
            this.valueDisplay.textContent = `${this.props.value}${this.props.suffix}`;
            header.appendChild(this.valueDisplay);
        }

        container.appendChild(header);

        // Input range
        const input = document.createElement('input');
        input.type = 'range';
        input.className = 'ui-slider__input';
        input.min = String(this.props.min);
        input.max = String(this.props.max);
        input.value = String(this.props.value);
        input.step = String(this.props.step);

        // Update value on input
        input.addEventListener('input', () => {
            const newValue = Number(input.value);
            this.props.value = newValue;

            if (this.valueDisplay) {
                this.valueDisplay.textContent = `${newValue}${this.props.suffix}`;
            }

            if (this.props.onChange) {
                this.props.onChange(newValue);
            }
        });

        container.appendChild(input);

        return container;
    }

    /**
     * Retorna o elemento DOM
     */
    getElement(): HTMLDivElement {
        return this.element;
    }

    /**
     * Anexa ao container
     */
    appendTo(container: HTMLElement): void {
        container.appendChild(this.element);
    }

    /**
     * Obtém o valor atual
     */
    getValue(): number {
        return Number(this.input.value);
    }

    /**
     * Define o valor
     */
    setValue(value: number): void {
        this.props.value = value;
        this.input.value = String(value);

        if (this.valueDisplay) {
            this.valueDisplay.textContent = `${value}${this.props.suffix}`;
        }
    }

    /**
     * Define o texto do label
     */
    setLabel(label: string): void {
        const labelElement = this.element.querySelector('.ui-slider__label');
        if (labelElement) {
            labelElement.textContent = label;
        }
    }

    /**
     * Remove do DOM
     */
    destroy(): void {
        this.element.remove();
    }
}

// Factory function
export function createSlider(props: SliderProps): HTMLDivElement {
    return new Slider(props).getElement();
}
