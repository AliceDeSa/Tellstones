// =========================
// ScreenManager - Gerenciador de Telas
// =========================
// Controla qual tela está ativa e transições entre elas

import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';
import { Logger, LogCategory } from '../utils/Logger.js';

/**
 * Interface que toda tela deve implementar
 */
export interface Screen {
    show(): void;
    hide(): void;
    update?(): void;
    destroy?(): void;
}

/**
 * Gerenciador central de navegação entre telas
 */
class ScreenManagerClass {
    private screens: Map<string, Screen> = new Map();
    private currentScreen: string | null = null;
    private history: string[] = [];
    private maxHistorySize = 10;

    constructor() {
        this.init();
    }

    private init() {
        // Escutar eventos de navegação
        EventBus.on(EventType.SCREEN_CHANGE, (data) => {
            this.navigateTo(data.to);
        });

        Logger.sys('[ScreenManager] Inicializado');
    }

    /**
     * Registra uma nova tela
     */
    register(name: string, screen: Screen): void {
        this.screens.set(name, screen);
        Logger.info(LogCategory.SYSTEM, `[ScreenManager] Tela registrada: ${name}`);
    }

    /**
     * Remove uma tela do registro
     */
    unregister(name: string): void {
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
    navigateTo(screenName: string, addToHistory: boolean = true): void {
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

            Logger.info(
                LogCategory.SYSTEM,
                `[ScreenManager] ${from || 'N/A'} → ${screenName}`
            );
        }
    }

    /**
     * Volta para a tela anterior no histórico
     */
    goBack(): boolean {
        if (this.history.length === 0) {
            Logger.warn(LogCategory.SYSTEM, '[ScreenManager] Histórico vazio - não pode voltar');
            return false;
        }

        const previous = this.history.pop()!;
        this.navigateTo(previous, false);
        return true;
    }

    /**
     * Limpa o histórico de navegação
     */
    clearHistory(): void {
        this.history = [];
        Logger.info(LogCategory.SYSTEM, '[ScreenManager] Histórico limpo');
    }

    /**
     * Retorna a tela atual
     */
    getCurrentScreen(): string | null {
        return this.currentScreen;
    }

    /**
     * Retorna o histórico
     */
    getHistory(): string[] {
        return [...this.history];
    }

    /**
     * Debug: mostra estado atual
     */
    getDebugInfo(): string {
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
(window as any).ScreenManager = ScreenManager;
