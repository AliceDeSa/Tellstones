/**
 * Card Component - Tellstones UI
 * Componente de card de seleção com preview
 */

export interface CardProps {
    id: string;
    title: string;
    description?: string;
    preview?: string;
    selected?: boolean;
    locked?: boolean;
    onClick?: (id: string) => void;
}

export class Card {
    private element: HTMLDivElement;
    private props: CardProps;

    constructor(props: CardProps) {
        this.props = {
            selected: false,
            locked: false,
            ...props
        };
        this.element = this.create();
    }

    private create(): HTMLDivElement {
        const card = document.createElement('div');
        card.className = 'ui-card';
        card.dataset.id = this.props.id;

        if (this.props.selected) {
            card.classList.add('ui-card--selected');
        }
        if (this.props.locked) {
            card.classList.add('ui-card--locked');
        }

        // Preview image
        if (this.props.preview) {
            const img = document.createElement('img');
            img.className = 'ui-card__preview';
            img.src = this.props.preview;
            img.alt = this.props.title;
            img.loading = 'lazy';

            // Fallback for missing image
            img.onerror = () => {
                img.style.display = 'none';
            };

            card.appendChild(img);
        }

        // Content
        const content = document.createElement('div');
        content.className = 'ui-card__content';

        const title = document.createElement('h3');
        title.className = 'ui-card__title';
        title.textContent = this.props.title;
        content.appendChild(title);

        if (this.props.description) {
            const desc = document.createElement('p');
            desc.className = 'ui-card__description';
            desc.textContent = this.props.description;
            content.appendChild(desc);
        }

        card.appendChild(content);

        // Click event
        if (!this.props.locked && this.props.onClick) {
            card.addEventListener('click', () => {
                if ((window as any).audioManager) {
                    (window as any).audioManager.playClick();
                }
                this.props.onClick!(this.props.id);
            });
        }

        return card;
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
     * Define se está selecionado
     */
    setSelected(selected: boolean): void {
        this.props.selected = selected;
        this.element.classList.toggle('ui-card--selected', selected);
    }

    /**
     * Verifica se está selecionado
     */
    isSelected(): boolean {
        return this.props.selected || false;
    }

    /**
     * Obtém o ID do card
     */
    getId(): string {
        return this.props.id;
    }

    /**
     * Remove do DOM
     */
    destroy(): void {
        this.element.remove();
    }
}

// Factory function
export function createCard(props: CardProps): HTMLDivElement {
    return new Card(props).getElement();
}
