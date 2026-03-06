// =========================
// BotMemory - Sistema de Memória do Bot
// =========================
// Lembra posição das pedras na mesa
import { Logger } from "../utils/Logger.js";
export class BotMemory {
    constructor() {
        this.slots = new Map();
        this.playerSlots = new Map(); // Nova memória do Oponente
        this.turnoAtual = 0;
        this.baseDecayRate = 0.02; // Base fixa de 2% (o resto escala com a mesa)
        Logger.ai("[Memory] Inicializado (Bot + Player Tracker)");
    }
    /**
     * Limpa toda a memória
     */
    reset() {
        this.slots.clear();
        this.playerSlots.clear();
        this.turnoAtual = 0;
        Logger.ai("[Memory] Reset completo");
    }
    /**
     * Avança o contador de turnos e aplica decay dinâmico escalável
     */
    nextTurn(state) {
        this.turnoAtual++;
        this.applyDecay(state);
    }
    /**
     * Registra uma pedra colocada
     * Se estiver visível, jogador também vê.
     */
    recordPlacement(slot, nome, visibleToPlayer = true) {
        this.slots.set(slot, {
            nome,
            confianca: 1.0,
            turnoVisto: this.turnoAtual
        });
        if (visibleToPlayer) {
            this.playerSlots.set(slot, {
                confianca: 1.0,
                turnoVisto: this.turnoAtual
            });
        }
        Logger.ai(`[Memory] Gravou: Slot ${slot} = ${nome} (100%)`);
    }
    /**
     * Registra que o jogador "espiou" uma pedra fechada.
     * Portanto, a confiança dele sobre este slot sobe para 100%.
     */
    recordPlayerPeek(slot) {
        this.playerSlots.set(slot, {
            confianca: 1.0,
            turnoVisto: this.turnoAtual
        });
        Logger.ai(`[Memory] Jogador espiou: Slot ${slot} agora tem 100% na PlayerMemory`);
    }
    /**
     * Registra uma troca entre dois slots (Para Bot e Jogador)
     */
    recordSwap(from, to) {
        // --- BOT MEMORY ---
        const memFrom = this.slots.get(from);
        const memTo = this.slots.get(to);
        if (memFrom && memTo) {
            // Se conhece as DUAS pedras, cruzar elas de lugar causa maior confusão
            this.slots.set(from, Object.assign(Object.assign({}, memTo), { confianca: memTo.confianca * 0.85 }));
            this.slots.set(to, Object.assign(Object.assign({}, memFrom), { confianca: memFrom.confianca * 0.85 }));
        }
        else if (memFrom) {
            // Se conhece SÓ UMA, é mais fácil manter o olho nela (-5% de penalidade)
            this.slots.set(to, Object.assign(Object.assign({}, memFrom), { confianca: memFrom.confianca * 0.95 }));
            this.slots.delete(from);
        }
        else if (memTo) {
            this.slots.set(from, Object.assign(Object.assign({}, memTo), { confianca: memTo.confianca * 0.95 }));
            this.slots.delete(to);
        }
        // --- PLAYER MEMORY ---
        // O jogador está vendo a troca acontecer, então a memória dele se move (com penalidades idênticas)
        const pMemFrom = this.playerSlots.get(from);
        const pMemTo = this.playerSlots.get(to);
        if (pMemFrom && pMemTo) {
            this.playerSlots.set(from, Object.assign(Object.assign({}, pMemTo), { confianca: pMemTo.confianca * 0.85 }));
            this.playerSlots.set(to, Object.assign(Object.assign({}, pMemFrom), { confianca: pMemFrom.confianca * 0.85 }));
        }
        else if (pMemFrom) {
            this.playerSlots.set(to, Object.assign(Object.assign({}, pMemFrom), { confianca: pMemFrom.confianca * 0.95 }));
            this.playerSlots.delete(from);
        }
        else if (pMemTo) {
            this.playerSlots.set(from, Object.assign(Object.assign({}, pMemTo), { confianca: pMemTo.confianca * 0.95 }));
            this.playerSlots.delete(to);
        }
        Logger.ai(`[Memory] Swap registrado: ${from} <-> ${to}`);
    }
    /**
     * Registra quando uma pedra é virada (agora visível para ambos)
     */
    recordReveal(slot, nome) {
        this.slots.set(slot, {
            nome,
            confianca: 1.0,
            turnoVisto: this.turnoAtual
        });
        // Se ficou visível, o jogador está vendo
        this.playerSlots.set(slot, {
            confianca: 1.0,
            turnoVisto: this.turnoAtual
        });
    }
    /**
     * Registra quando pedra é escondida (agora sem penalidade instantânea massiva,
     * pois o decay natural por turno cuidará disso).
     */
    recordHide(slot) {
        const mem = this.slots.get(slot);
        if (mem) {
            // Removemos a penalidade instantânea. Virar a pedra não tira
            // a memória do que ela é *agora*, apenas deixa de ser garantida no futuro.
        }
        const pMem = this.playerSlots.get(slot);
        if (pMem) {
            // Mesma regra para o jogador.
        }
    }
    /**
     * Retorna confiança do bot sobre um slot
     */
    getConfidence(slot) {
        var _a, _b;
        return (_b = (_a = this.slots.get(slot)) === null || _a === void 0 ? void 0 : _a.confianca) !== null && _b !== void 0 ? _b : 0;
    }
    /**
     * Retorna o que o bot ACHA que é a confiança do JOGADOR sobre um slot
     */
    getPlayerConfidence(slot) {
        var _a, _b;
        return (_b = (_a = this.playerSlots.get(slot)) === null || _a === void 0 ? void 0 : _a.confianca) !== null && _b !== void 0 ? _b : 0;
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
     * Retorna a confiança média do bot nos slots passados (ex: somente os virados).
     * Retorna 0 se a lista for vazia.
     */
    getAverageConfidence(slots) {
        if (slots.length === 0)
            return 0;
        const total = slots.reduce((sum, slot) => { var _a, _b; return sum + ((_b = (_a = this.slots.get(slot)) === null || _a === void 0 ? void 0 : _a.confianca) !== null && _b !== void 0 ? _b : 0); }, 0);
        return total / slots.length;
    }
    /**
     * Retorna a confiança média do JOGADOR nos slots passados.
     */
    getPlayerAverageConfidence(slots) {
        if (slots.length === 0)
            return 0;
        const total = slots.reduce((sum, slot) => { var _a, _b; return sum + ((_b = (_a = this.playerSlots.get(slot)) === null || _a === void 0 ? void 0 : _a.confianca) !== null && _b !== void 0 ? _b : 0); }, 0);
        return total / slots.length;
    }
    /**
     * Aplica decay dinâmico de memória para Bot E Jogador (chamado a cada turno)
     */
    applyDecay(state) {
        let currentDecay = this.baseDecayRate;
        // Fator Escalonável (Mesa mais complexa = mais rápido esquecer)
        if (state && state.mesa) {
            const tableStones = state.mesa.filter((p) => p !== null).length;
            const hiddenStones = state.mesa.filter((p) => p && p.virada).length;
            // 2% (base) + 0.5% (por pedra na mesa) + 1.5% (por pedra escondida)
            currentDecay = 0.02 + (tableStones * 0.005) + (hiddenStones * 0.015);
        }
        // Decay do Bot
        this.slots.forEach((mem, slot) => {
            mem.confianca *= (1 - currentDecay);
            if (mem.confianca < 0.1) {
                this.slots.delete(slot);
            }
        });
        // Decay do Jogador
        this.playerSlots.forEach((mem, slot) => {
            mem.confianca *= (1 - currentDecay);
            if (mem.confianca < 0.1) {
                this.playerSlots.delete(slot);
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
        const pEntries = [];
        this.playerSlots.forEach((mem, slot) => {
            pEntries.push(`S${slot}:Plyr(${Math.round(mem.confianca * 100)}%)`);
        });
        const botState = entries.join(', ') || 'vazia';
        const plyState = pEntries.join(', ') || 'vazia';
        return `[BOT] ${botState} | [PLAYER] ${plyState}`;
    }
    /**
     * Helper para o Dev Mode visual (#bot-memory-debug)
     * Retorna a memória crua do bot para um slot
     */
    getRawMemoryState(slot) {
        return this.slots.get(slot);
    }
    /**
     * Helper para o Dev Mode visual (#bot-memory-debug)
     * Retorna a memória crua do jogador para um slot
     */
    getRawPlayerMemoryState(slot) {
        return this.playerSlots.get(slot);
    }
}
// Exportar globalmente
window.BotMemory = BotMemory;
