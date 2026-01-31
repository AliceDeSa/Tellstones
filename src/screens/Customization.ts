/**
 * Customization.ts - Tela de personalização de temas
 * Fase 6: Sistema de Personalização
 */

import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';
import { ThemeManager, Theme } from '../ui/ThemeManager.js';
import LocaleManager from '../data/LocaleManager.js';

export class Customization {
    private container: HTMLDivElement | null = null;
    private themeManager: ThemeManager;
    private titleElement: HTMLElement | null = null;
    private subtitleElement: HTMLElement | null = null;
    private backBtn: HTMLButtonElement | null = null;

    constructor() {
        this.themeManager = ThemeManager.getInstance();

        // Listener para mudança de idioma
        if ((window as any).EventBus) {
            (window as any).EventBus.on('LOCALE:CHANGE', () => {
                this.updateTranslations();
            });
        }
    }

    /**
     * Renderiza a tela de personalização
     */
    render(containerId: string): void {
        const parent = document.getElementById(containerId);
        if (!parent) {
            console.error('[Customization] Container não encontrado:', containerId);
            return;
        }

        this.container = document.createElement('div');
        this.container.id = 'customization-screen';
        this.container.className = 'screen';
        this.container.style.display = 'none'; // Inicialmente oculto

        // Título
        this.titleElement = document.createElement('h2');
        this.titleElement.textContent = LocaleManager.t('menu.customization');
        this.titleElement.className = 'screen-title';
        this.titleElement.setAttribute('data-i18n', 'menu.customization');
        this.container.appendChild(this.titleElement);

        // Subtítulo
        this.subtitleElement = document.createElement('p');
        this.subtitleElement.textContent = LocaleManager.t('customization.subtitle');
        this.subtitleElement.className = 'screen-subtitle';
        this.subtitleElement.setAttribute('data-i18n', 'customization.subtitle');
        this.container.appendChild(this.subtitleElement);

        // Grid de temas
        const grid = this.createThemeGrid();
        this.container.appendChild(grid);

        // Botão voltar
        const backBtn = this.createBackButton();
        this.container.appendChild(backBtn);

        parent.appendChild(this.container);
        console.log('[Customization] Tela renderizada');
    }

    /**
     * Mostra a tela
     */
    show(): void {
        if (this.container) {
            this.container.style.display = 'flex';
            this.refreshThemeGrid(); // Atualizar estado ativo
        }
    }

    /**
     * Esconde a tela
     */
    hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Cria grade de temas disponíveis
     */
    private createThemeGrid(): HTMLDivElement {
        const grid = document.createElement('div');
        grid.className = 'theme-grid';
        grid.id = 'theme-grid-container';

        const themes = this.themeManager.getAvailableThemes();
        const currentTheme = this.themeManager.getCurrentTheme();

        themes.forEach(theme => {
            const card = this.createThemeCard(theme, theme.id === currentTheme.id);
            grid.appendChild(card);
        });

        return grid;
    }

    /**
     * Atualiza grid de temas (re-renderiza cards)
     */
    private refreshThemeGrid(): void {
        const grid = document.getElementById('theme-grid-container');
        if (!grid) return;

        grid.innerHTML = '';

        const themes = this.themeManager.getAvailableThemes();
        const currentTheme = this.themeManager.getCurrentTheme();

        themes.forEach(theme => {
            const card = this.createThemeCard(theme, theme.id === currentTheme.id);
            grid.appendChild(card);
        });
    }

    /**
     * Cria card individual de tema
     */
    private createThemeCard(theme: Theme, isActive: boolean): HTMLDivElement {
        const card = document.createElement('div');
        card.className = `theme-card ${isActive ? 'active' : ''} ${theme.locked ? 'locked' : ''}`;
        card.dataset.themeId = theme.id;

        // Preview (imagem representativa)
        const preview = document.createElement('img');
        preview.src = theme.preview;
        preview.alt = theme.name;
        preview.className = 'theme-preview';
        preview.onerror = () => {
            // Fallback se imagem não carregar
            preview.src = 'assets/img/ui/placeholder-theme.jpg';
        };
        card.appendChild(preview);

        // Nome
        const name = document.createElement('h3');
        name.textContent = theme.name;
        name.className = 'theme-name';
        card.appendChild(name);

        // Descrição
        const desc = document.createElement('p');
        desc.textContent = theme.description;
        desc.className = 'theme-description';
        card.appendChild(desc);

        // Badge de ativo
        if (isActive) {
            const badge = document.createElement('span');
            badge.textContent = `✓ ${LocaleManager.t('customization.active')}`;
            badge.className = 'theme-badge active-badge';
            badge.setAttribute('data-i18n-prefix', '✓ ');
            badge.setAttribute('data-i18n', 'customization.active');
            card.appendChild(badge);
        }

        // Badge de bloqueado
        if (theme.locked) {
            const lockBadge = document.createElement('span');
            lockBadge.innerHTML = `🔒 ${LocaleManager.t('customization.locked')}`;
            lockBadge.className = 'theme-badge locked-badge';
            lockBadge.setAttribute('data-i18n-prefix', '🔒 ');
            lockBadge.setAttribute('data-i18n', 'customization.locked');
            card.appendChild(lockBadge);

            // Desabilitar click se bloqueado
            card.style.cursor = 'not-allowed';
            card.style.opacity = '0.6';
        } else {
            // Click handler apenas se não bloqueado
            card.onclick = () => this.selectTheme(theme.id);

            // Hover effect
            card.onmouseenter = () => {
                if (!isActive && !theme.locked) {
                    card.style.transform = 'translateY(-5px)';
                }
            };
            card.onmouseleave = () => {
                card.style.transform = 'translateY(0)';
            };
        }

        return card;
    }

    /**
     * Seleciona e aplica tema
     */
    private async selectTheme(themeId: string): Promise<void> {
        console.log('[Customization] Selecionando tema:', themeId);

        // Som de click
        if ((window as any).audioManager) {
            (window as any).audioManager.playClick();
        }

        // Aplicar tema via ThemeManager
        await this.themeManager.loadTheme(themeId);

        // Atualizar UI (remover active de todos, adicionar ao selecionado)
        this.refreshThemeGrid();

        // Feedback visual
        const theme = this.themeManager.getThemeById(themeId);
        if (theme) {
            if ((window as any).notificationManager) {
                (window as any).notificationManager.showGlobal(`Tema "${theme.name}" aplicado!`);
            }
        }
    }

    /**
     * Cria botão de voltar
     */
    private createBackButton(): HTMLButtonElement {
        this.backBtn = document.createElement('button');
        this.backBtn.className = 'btn-back customization-back';
        this.backBtn.innerHTML = `&#8617; ${LocaleManager.t('common.back')}`;
        this.backBtn.setAttribute('data-i18n-prefix', '&#8617; ');
        this.backBtn.setAttribute('data-i18n', 'common.back');

        this.backBtn.onclick = () => {
            if ((window as any).audioManager) {
                (window as any).audioManager.playClick();
            }

            // Voltar ao menu principal via EventBus
            EventBus.emit(EventType.SCREEN_CHANGE, { from: 'customization', to: 'main-menu' });
        };

        return this.backBtn;
    }

    /**
     * Atualiza traduções de todos os elementos
     */
    private updateTranslations(): void {
        // Atualizar título e subtítulo
        if (this.titleElement) {
            this.titleElement.textContent = LocaleManager.t('menu.customization');
        }
        if (this.subtitleElement) {
            this.subtitleElement.textContent = LocaleManager.t('customization.subtitle');
        }
        if (this.backBtn) {
            this.backBtn.innerHTML = `&#8617; ${LocaleManager.t('common.back')}`;
        }

        // Atualizar todos os elementos com data-i18n
        if (this.container) {
            const elements = this.container.querySelectorAll('[data-i18n]');
            elements.forEach((el) => {
                const key = el.getAttribute('data-i18n');
                const prefix = el.getAttribute('data-i18n-prefix') || '';
                if (key) {
                    if (el.tagName === 'BUTTON' || el.innerHTML.includes('&#')) {
                        el.innerHTML = prefix + LocaleManager.t(key);
                    } else {
                        el.textContent = prefix + LocaleManager.t(key);
                    }
                }
            });
        }

        // Reatualizar grid de temas para aplicar traduções
        this.refreshThemeGrid();
    }

    /**
     * Limpa a tela
     */
    cleanup(): void {
        this.container?.remove();
        this.container = null;
        console.log('[Customization] Tela limpa');
    }
}

// Global Export
(window as any).Customization = Customization;
