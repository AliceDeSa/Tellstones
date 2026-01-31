// =========================
// MainMenu - Tela do Menu Principal
// =========================
import { Logger, LogCategory } from '../utils/Logger.js';
import LocaleManager from '../data/LocaleManager.js';
export class MainMenu {
    constructor() {
        this.container = null;
        this.originalDisplay = '';
        this.container = document.getElementById('start-screen');
        if (!this.container) {
            Logger.error(LogCategory.SYSTEM, '[MainMenu] Container #start-screen não encontrado!');
        }
        else {
            // Salvar display original
            this.originalDisplay = window.getComputedStyle(this.container).display;
        }
        // Listener para mudança de idioma
        if (window.EventBus) {
            window.EventBus.on('LOCALE:CHANGE', () => {
                this.updateTranslations();
            });
        }
    }
    show() {
        if (this.container) {
            // Restaurar display original ou usar block como fallback
            this.container.style.display = this.originalDisplay || 'block';
            this.container.style.visibility = 'visible';
            this.container.style.opacity = '1';
            // Garantir que menu online está escondido
            const onlineMenu = document.getElementById('online-menu');
            if (onlineMenu) {
                onlineMenu.style.display = 'none';
            }
            // Garantir que botões principais estão visíveis
            const mainMenuBtns = document.getElementById('main-menu-btns');
            if (mainMenuBtns) {
                mainMenuBtns.style.display = 'flex';
            }
            Logger.info(LogCategory.UI, '[MainMenu] Tela exibida');
        }
    }
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            Logger.info(LogCategory.UI, '[MainMenu] Tela escondida');
        }
    }
    update() {
        // Atualizar conteúdo se necessário
    }
    updateTranslations() {
        // Atualizar todos os elementos com data-i18n no container
        if (this.container) {
            const elements = this.container.querySelectorAll('[data-i18n]');
            elements.forEach((el) => {
                const key = el.getAttribute('data-i18n');
                if (key) {
                    el.textContent = LocaleManager.t(key);
                }
            });
        }
        // Também atualizar elementos globais (fora do container)
        const globalElements = document.querySelectorAll('[data-i18n]');
        globalElements.forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (key) {
                el.textContent = LocaleManager.t(key);
            }
        });
    }
    destroy() {
        // Cleanup se necessário
    }
}
