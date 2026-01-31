// =========================
// EventBus - Sistema de Mensageria Central
// =========================
// Permite comunicação entre módulos sem dependências diretas

import { EventType, EventData, EventListener } from './types/Events.js';
import { Logger, LogCategory } from '../utils/Logger.js';

class EventBusClass {
    private listeners: Map<EventType, Set<EventListener<any>>> = new Map();
    private eventHistory: Array<{ type: EventType; data: any; timestamp: number }> = [];
    private maxHistorySize = 50;

    /**
     * Registra um listener para um tipo de evento
     */
    on<T extends EventType>(
        eventType: T,
        listener: EventListener<T>
    ): () => void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }

        this.listeners.get(eventType)!.add(listener);

        Logger.info(LogCategory.SYSTEM, `[EventBus] Listener registrado para: ${eventType}`);

        // Retorna função para cancelar
        return () => this.off(eventType, listener);
    }

    /**
     * Remove um listener específico
     */
    off<T extends EventType>(
        eventType: T,
        listener: EventListener<T>
    ): void {
        const listenersSet = this.listeners.get(eventType);
        if (listenersSet) {
            listenersSet.delete(listener);
            Logger.info(LogCategory.SYSTEM, `[EventBus] Listener removido de: ${eventType}`);
        }
    }

    /**
     * Emite um evento com dados
     */
    emit<T extends EventType>(
        eventType: T,
        data: EventData[T]
    ): void {
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

        // Log do evento
        Logger.info(
            LogCategory.SYSTEM,
            `[EventBus] Emitindo: ${eventType}`,
            data
        );

        // Notificar listeners
        const listenersSet = this.listeners.get(eventType);
        if (listenersSet) {
            listenersSet.forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    Logger.error(
                        LogCategory.SYSTEM,
                        `[EventBus] Erro em listener de ${eventType}:`,
                        error
                    );
                }
            });
        }
    }

    /**
     * Remove todos os listeners de um tipo de evento
     */
    clearListeners(eventType: EventType): void {
        this.listeners.delete(eventType);
        Logger.info(LogCategory.SYSTEM, `[EventBus] Todos os listeners removidos de: ${eventType}`);
    }

    /**
     * Remove TODOS os listeners de TODOS os eventos
     */
    clearAll(): void {
        this.listeners.clear();
        Logger.warn(LogCategory.SYSTEM, '[EventBus] Todos os listeners removidos!');
    }

    /**
     * Retorna o histórico de eventos recentes
     */
    getHistory(): Array<{ type: EventType; data: any; timestamp: number }> {
        return [...this.eventHistory];
    }

    /**
     * Debug: mostra listeners registrados
     */
    getDebugInfo(): string {
        const info: string[] = [];
        this.listeners.forEach((listeners, eventType) => {
            info.push(`${eventType}: ${listeners.size} listener(s)`);
        });
        return info.join('\n') || 'Nenhum listener registrado';
    }
}

// Exportar instância global (singleton)
export const EventBus = new EventBusClass();

// Expor globalmente para debug
(window as any).EventBus = EventBus;

Logger.sys('[EventBus] Sistema de mensageria inicializado');
