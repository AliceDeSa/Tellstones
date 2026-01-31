// =========================
// BotMemory - Sistema de Memória do Bot
// =========================
// Lembra posição das pedras na mesa

import { Logger } from "../utils/Logger.js";

interface MemorySlot {
    nome: string;
    confianca: number;  // 0.0 a 1.0
    turnoVisto: number;
}

export class BotMemory {
    private slots: Map<number, MemorySlot> = new Map();
    private turnoAtual: number = 0;
    private decayRate: number = 0.15; // Reduz 15% por turno

    constructor() {
        Logger.ai("[Memory] Inicializado");
    }

    /**
     * Limpa toda a memória
     */
    reset(): void {
        this.slots.clear();
        this.turnoAtual = 0;
        Logger.ai("[Memory] Reset completo");
    }

    /**
     * Avança o contador de turnos e aplica decay
     */
    nextTurn(): void {
        this.turnoAtual++;
        this.applyDecay();
    }

    /**
     * Registra uma pedra colocada (confiança 100%)
     */
    recordPlacement(slot: number, nome: string): void {
        this.slots.set(slot, {
            nome,
            confianca: 1.0,
            turnoVisto: this.turnoAtual
        });
        Logger.ai(`[Memory] Gravou: Slot ${slot} = ${nome} (100%)`);
    }

    /**
     * Registra uma troca entre dois slots
     */
    recordSwap(from: number, to: number): void {
        const memFrom = this.slots.get(from);
        const memTo = this.slots.get(to);

        // Trocar memórias
        if (memFrom && memTo) {
            this.slots.set(from, { ...memTo, confianca: memTo.confianca * 0.9 });
            this.slots.set(to, { ...memFrom, confianca: memFrom.confianca * 0.9 });
        } else if (memFrom) {
            this.slots.set(to, { ...memFrom, confianca: memFrom.confianca * 0.8 });
            this.slots.delete(from);
        } else if (memTo) {
            this.slots.set(from, { ...memTo, confianca: memTo.confianca * 0.8 });
            this.slots.delete(to);
        }
        Logger.ai(`[Memory] Swap registrado: ${from} <-> ${to}`);
    }

    /**
     * Registra quando uma pedra é virada (agora visível)
     */
    recordReveal(slot: number, nome: string): void {
        this.slots.set(slot, {
            nome,
            confianca: 1.0,
            turnoVisto: this.turnoAtual
        });
    }

    /**
     * Registra quando pedra é escondida (reduz confiança)
     */
    recordHide(slot: number): void {
        const mem = this.slots.get(slot);
        if (mem) {
            mem.confianca *= 0.7; // Reduz 30%
        }
    }

    /**
     * Retorna confiança de um slot (0 se desconhecido)
     */
    getConfidence(slot: number): number {
        return this.slots.get(slot)?.confianca ?? 0;
    }

    /**
     * Retorna melhor palpite para um slot
     */
    getBestGuess(slot: number): string | null {
        return this.slots.get(slot)?.nome ?? null;
    }

    /**
     * Lista slots que o bot conhece com alta confiança
     */
    getKnownSlots(minConfidence: number = 0.5): number[] {
        const known: number[] = [];
        this.slots.forEach((mem, slot) => {
            if (mem.confianca >= minConfidence) {
                known.push(slot);
            }
        });
        return known;
    }

    /**
     * Aplica decay de memória (chamado a cada turno)
     */
    private applyDecay(): void {
        this.slots.forEach((mem, slot) => {
            mem.confianca *= (1 - this.decayRate);
            if (mem.confianca < 0.1) {
                this.slots.delete(slot);
            }
        });
    }

    /**
     * Debug: retorna estado da memória
     */
    getDebugState(): string {
        const entries: string[] = [];
        this.slots.forEach((mem, slot) => {
            entries.push(`S${slot}:${mem.nome}(${Math.round(mem.confianca * 100)}%)`);
        });
        return entries.join(', ') || 'vazia';
    }
}

// Exportar globalmente
(window as any).BotMemory = BotMemory;
