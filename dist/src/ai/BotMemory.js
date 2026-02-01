// =========================
// BotMemory - Sistema de Memória do Bot
// =========================
// Lembra posição das pedras na mesa
import { Logger } from "../utils/Logger.js";
export class BotMemory {
    constructor() {
        this.slots = new Map();
        this.turnoAtual = 0;
        this.decayRate = 0.15; // Reduz 15% por turno
        Logger.ai("[Memory] Inicializado");
    }
    /**
     * Limpa toda a memória
     */
    reset() {
        this.slots.clear();
        this.turnoAtual = 0;
        Logger.ai("[Memory] Reset completo");
    }
    /**
     * Avança o contador de turnos e aplica decay
     */
    nextTurn() {
        this.turnoAtual++;
        this.applyDecay();
    }
    /**
     * Registra uma pedra colocada (confiança 100%)
     */
    recordPlacement(slot, nome) {
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
    recordSwap(from, to) {
        const memFrom = this.slots.get(from);
        const memTo = this.slots.get(to);
        // Trocar memórias
        if (memFrom && memTo) {
            this.slots.set(from, Object.assign(Object.assign({}, memTo), { confianca: memTo.confianca * 0.9 }));
            this.slots.set(to, Object.assign(Object.assign({}, memFrom), { confianca: memFrom.confianca * 0.9 }));
        }
        else if (memFrom) {
            this.slots.set(to, Object.assign(Object.assign({}, memFrom), { confianca: memFrom.confianca * 0.8 }));
            this.slots.delete(from);
        }
        else if (memTo) {
            this.slots.set(from, Object.assign(Object.assign({}, memTo), { confianca: memTo.confianca * 0.8 }));
            this.slots.delete(to);
        }
        Logger.ai(`[Memory] Swap registrado: ${from} <-> ${to}`);
    }
    /**
     * Registra quando uma pedra é virada (agora visível)
     */
    recordReveal(slot, nome) {
        this.slots.set(slot, {
            nome,
            confianca: 1.0,
            turnoVisto: this.turnoAtual
        });
    }
    /**
     * Registra quando pedra é escondida (reduz confiança)
     */
    recordHide(slot) {
        const mem = this.slots.get(slot);
        if (mem) {
            mem.confianca *= 0.7; // Reduz 30%
        }
    }
    /**
     * Retorna confiança de um slot (0 se desconhecido)
     */
    getConfidence(slot) {
        var _a, _b;
        return (_b = (_a = this.slots.get(slot)) === null || _a === void 0 ? void 0 : _a.confianca) !== null && _b !== void 0 ? _b : 0;
    }
    /**
     * Retorna melhor palpite para um slot
     */
    getBestGuess(slot) {
        var _a, _b;
        return (_b = (_a = this.slots.get(slot)) === null || _a === void 0 ? void 0 : _a.nome) !== null && _b !== void 0 ? _b : null;
    }
    /**
     * Lista slots que o bot conhece com alta confiança
     */
    getKnownSlots(minConfidence = 0.5) {
        const known = [];
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
    applyDecay() {
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
    getDebugState() {
        const entries = [];
        this.slots.forEach((mem, slot) => {
            entries.push(`S${slot}:${mem.nome}(${Math.round(mem.confianca * 100)}%)`);
        });
        return entries.join(', ') || 'vazia';
    }
}
// Exportar globalmente
window.BotMemory = BotMemory;
