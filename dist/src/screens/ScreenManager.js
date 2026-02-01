// =========================
// ScreenManager - Gerenciador de Telas
// =========================
// Controla qual tela está ativa e transições entre elas
import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';
import { Logger, LogCategory } from '../utils/Logger.js';
/**
 * Gerenciador central de navegação entre telas
 */
class ScreenManagerClass {
    constructor() {
        this.screens = new Map();
        this.currentScreen = null;
        this.history = [];
        this.maxHistorySize = 10;
        this.init();
    }
    init() {
        // Escutar eventos de navegação
        EventBus.on(EventType.SCREEN_CHANGE, (data) => {
            this.navigateTo(data.to);
        });
        Logger.sys('[ScreenManager] Inicializado');
    }
    /**
     * Registra uma nova tela
     */
    register(name, screen) {
        this.screens.set(name, screen);
        Logger.info(LogCategory.SYSTEM, `[ScreenManager] Tela registrada: ${name}`);
    }
    /**
     * Remove uma tela do registro
     */
    unregister(name) {
        const screen = this.screens.get(name);
        if (screen && screen.destroy) {
            screen.destroy();
        }
        this.screens.delete(name);
        Logger.info(LogCategory.SYSTEM, `[ScreenManager] Tela removida: ${name}`);
    }
    /**
     * Navega para uma tela
     */
    navigateTo(screenName, addToHistory = true) {
        // Validar se tela existe
        if (!this.screens.has(screenName)) {
            Logger.error(LogCategory.SYSTEM, `[ScreenManager] Tela não encontrada: ${screenName}`);
            return;
        }
        const from = this.currentScreen;
        // Esconder tela atual
        if (this.currentScreen) {
            const current = this.screens.get(this.currentScreen);
            if (current) {
                current.hide();
            }
            // Adicionar ao histórico
            if (addToHistory && from) {
                this.history.push(from);
                if (this.history.length > this.maxHistorySize) {
                    this.history.shift();
                }
            }
        }
        // Mostrar nova tela
        const newScreen = this.screens.get(screenName);
        if (newScreen) {
            newScreen.show();
            this.currentScreen = screenName;
            // Emitir evento de mudança
            EventBus.emit(EventType.SCREEN_SHOW, { screen: screenName });
            Logger.info(LogCategory.SYSTEM, `[ScreenManager] ${from || 'N/A'} → ${screenName}`);
        }
    }
    /**
     * Volta para a tela anterior no histórico
     */
    goBack() {
        if (this.history.length === 0) {
            Logger.warn(LogCategory.SYSTEM, '[ScreenManager] Histórico vazio - não pode voltar');
            return false;
        }
        const previous = this.history.pop();
        this.navigateTo(previous, false);
        return true;
    }
    /**
     * Limpa o histórico de navegação
     */
    clearHistory() {
        this.history = [];
        Logger.info(LogCategory.SYSTEM, '[ScreenManager] Histórico limpo');
    }
    /**
     * Retorna a tela atual
     */
    getCurrentScreen() {
        return this.currentScreen;
    }
    /**
     * Retorna o histórico
     */
    getHistory() {
        return [...this.history];
    }
    /**
     * Debug: mostra estado atual
     */
    getDebugInfo() {
        return `
Current: ${this.currentScreen || 'none'}
History: [${this.history.join(' → ')}]
Registered: ${Array.from(this.screens.keys()).join(', ')}
        `.trim();
    }
}
// Exportar instância global (singleton)
export const ScreenManager = new ScreenManagerClass();
// Expor globalmente para debug
window.ScreenManager = ScreenManager;
