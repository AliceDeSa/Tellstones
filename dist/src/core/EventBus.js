// =========================
// EventBus - Sistema de Mensageria Central
// =========================
// Permite comunicação entre módulos sem dependências diretas
import { Logger, LogCategory } from '../utils/Logger.js';
class EventBusClass {
    constructor() {
        this.listeners = new Map();
        this.eventHistory = [];
        this.maxHistorySize = 50;
    }
    /**
     * Registra um listener para um tipo de evento
     */
    on(eventType, listener) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType).add(listener);
        Logger.debug(LogCategory.SYSTEM, `[EventBus] Listener registrado para: ${eventType}`);
        // Retorna função para cancelar
        return () => this.off(eventType, listener);
    }
    /**
     * Remove um listener específico
     */
    off(eventType, listener) {
        const listenersSet = this.listeners.get(eventType);
        if (listenersSet) {
            listenersSet.delete(listener);
            Logger.debug(LogCategory.SYSTEM, `[EventBus] Listener removido de: ${eventType}`);
        }
    }
    /**
     * Emite um evento com dados
     */
    emit(eventType, data) {
        // Adicionar ao histórico
        this.eventHistory.push({
            type: eventType,
            data,
            timestamp: Date.now()
        });
        // Limitar tamanho do histórico
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
        // Log do evento (apenas eventos críticos em INFO)
        const criticalEvents = [
            'GAME:START', 'GAME:END', 'MULTIPLAYER:VICTORY',
            'AUTH:STATE:CHANGED', 'AUTH:LOGIN:SUCCESS', 'AUTH:LOGIN:ERROR'
        ];
        if (criticalEvents.includes(eventType)) {
            Logger.info(LogCategory.SYSTEM, `[EventBus] Emitindo: ${eventType}`, data);
        }
        else {
            Logger.debug(LogCategory.SYSTEM, `[EventBus] ${eventType}`);
        }
        // Notificar listeners
        const listenersSet = this.listeners.get(eventType);
        if (listenersSet) {
            listenersSet.forEach(listener => {
                try {
                    listener(data);
                }
                catch (error) {
                    Logger.error(LogCategory.SYSTEM, `[EventBus] Erro em listener de ${eventType}:`, error);
                }
            });
        }
    }
    /**
     * Remove todos os listeners de um tipo de evento
     */
    clearListeners(eventType) {
        this.listeners.delete(eventType);
        Logger.debug(LogCategory.SYSTEM, `[EventBus] Listeners removidos de: ${eventType}`);
    }
    /**
     * Remove TODOS os listeners de TODOS os eventos
     */
    clearAll() {
        this.listeners.clear();
        Logger.warn(LogCategory.SYSTEM, '[EventBus] Todos os listeners removidos!');
    }
    /**
     * Retorna o histórico de eventos recentes
     */
    getHistory() {
        return [...this.eventHistory];
    }
    /**
     * Debug: mostra listeners registrados
     */
    getDebugInfo() {
        const info = [];
        this.listeners.forEach((listeners, eventType) => {
            info.push(`${eventType}: ${listeners.size} listener(s)`);
        });
        return info.join('\n') || 'Nenhum listener registrado';
    }
}
// Exportar instância global (singleton)
export const EventBus = new EventBusClass();
// Expor globalmente para debug
window.EventBus = EventBus;
Logger.sys('[EventBus] Sistema de mensageria inicializado');
