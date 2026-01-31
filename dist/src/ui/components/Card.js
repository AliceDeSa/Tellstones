/**
 * Card Component - Tellstones UI
 * Componente de card de seleção com preview
 */
export class Card {
    constructor(props) {
        this.props = Object.assign({ selected: false, locked: false }, props);
        this.element = this.create();
    }
    create() {
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
                if (window.audioManager) {
                    window.audioManager.playClick();
                }
                this.props.onClick(this.props.id);
            });
        }
        return card;
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
     * Define se está selecionado
     */
    setSelected(selected) {
        this.props.selected = selected;
        this.element.classList.toggle('ui-card--selected', selected);
    }
    /**
     * Verifica se está selecionado
     */
    isSelected() {
        return this.props.selected || false;
    }
    /**
     * Obtém o ID do card
     */
    getId() {
        return this.props.id;
    }
    /**
     * Remove do DOM
     */
    destroy() {
        this.element.remove();
    }
}
// Factory function
export function createCard(props) {
    return new Card(props).getElement();
}
