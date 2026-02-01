/**
 * TabNavigation Component - Tellstones UI
 * Sistema de navegação por abas reutilizável
 */
export class TabNavigation {
    constructor(props) {
        var _a;
        this.tabs = new Map();
        this.panels = new Map();
        this.props = props;
        this.activeTabId = props.activeTab || ((_a = props.tabs[0]) === null || _a === void 0 ? void 0 : _a.id) || '';
        this.element = this.create();
        this.header = this.element.querySelector('.ui-tabs__header');
        this.contentContainer = this.element.querySelector('.ui-tabs__content');
    }
    create() {
        const container = document.createElement('div');
        container.className = 'ui-tabs';
        // Header (abas)
        const header = document.createElement('div');
        header.className = 'ui-tabs__header';
        this.props.tabs.forEach(tab => {
            const tabBtn = this.createTabButton(tab);
            this.tabs.set(tab.id, tabBtn);
            header.appendChild(tabBtn);
        });
        container.appendChild(header);
        // Content container
        const content = document.createElement('div');
        content.className = 'ui-tabs__content';
        this.props.tabs.forEach(tab => {
            const panel = this.createTabPanel(tab);
            this.panels.set(tab.id, panel);
            content.appendChild(panel);
        });
        container.appendChild(content);
        return container;
    }
    createTabButton(tab) {
        const btn = document.createElement('button');
        btn.className = 'ui-tabs__tab';
        btn.dataset.tabId = tab.id;
        if (tab.id === this.activeTabId) {
            btn.classList.add('ui-tabs__tab--active');
        }
        if (tab.icon) {
            const icon = document.createElement('span');
            icon.className = 'ui-tabs__tab-icon';
            icon.textContent = tab.icon;
            btn.appendChild(icon);
        }
        const label = document.createElement('span');
        label.className = 'ui-tabs__tab-label';
        label.textContent = tab.label;
        btn.appendChild(label);
        btn.addEventListener('click', () => {
            this.setActiveTab(tab.id);
        });
        return btn;
    }
    createTabPanel(tab) {
        const panel = document.createElement('div');
        panel.className = 'ui-tabs__panel';
        panel.dataset.tabId = tab.id;
        if (tab.id === this.activeTabId) {
            panel.classList.add('ui-tabs__panel--active');
        }
        // Render content if provided
        if (tab.content) {
            if (typeof tab.content === 'function') {
                panel.appendChild(tab.content());
            }
            else {
                panel.appendChild(tab.content);
            }
        }
        return panel;
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
     * Define a aba ativa
     */
    setActiveTab(tabId) {
        if (tabId === this.activeTabId)
            return;
        // Play click sound
        if (window.audioManager) {
            window.audioManager.playClick();
        }
        // Update tabs
        this.tabs.forEach((btn, id) => {
            btn.classList.toggle('ui-tabs__tab--active', id === tabId);
        });
        // Update panels
        this.panels.forEach((panel, id) => {
            panel.classList.toggle('ui-tabs__panel--active', id === tabId);
        });
        this.activeTabId = tabId;
        // Callback
        if (this.props.onTabChange) {
            this.props.onTabChange(tabId);
        }
    }
    /**
     * Obtém a aba ativa
     */
    getActiveTab() {
        return this.activeTabId;
    }
    /**
     * Obtém o painel de uma aba
     */
    getPanel(tabId) {
        return this.panels.get(tabId);
    }
    /**
     * Define conteúdo de uma aba
     */
    setTabContent(tabId, content) {
        const panel = this.panels.get(tabId);
        if (panel) {
            panel.innerHTML = '';
            panel.appendChild(content);
        }
    }
    /**
     * Remove do DOM
     */
    destroy() {
        this.element.remove();
    }
}
// Factory function
export function createTabNavigation(props) {
    return new TabNavigation(props).getElement();
}
