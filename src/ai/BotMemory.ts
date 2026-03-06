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

interface PlayerMemorySlot {
    confianca: number;  // 0.0 a 1.0 (o que o bot ACHA que o jogador sabe sobre este slot)
    turnoVisto: number;
}

export class BotMemory {
    private slots: Map<number, MemorySlot> = new Map();
    private playerSlots: Map<number, PlayerMemorySlot> = new Map(); // Nova memória do Oponente
    private turnoAtual: number = 0;
    private baseDecayRate: number = 0.02; // Base fixa de 2% (o resto escala com a mesa)

    constructor() {
        Logger.ai("[Memory] Inicializado (Bot + Player Tracker)");
    }

    /**
     * Limpa toda a memória
     */
    reset(): void {
        this.slots.clear();
        this.playerSlots.clear();
        this.turnoAtual = 0;
        Logger.ai("[Memory] Reset completo");
    }

    /**
     * Avança o contador de turnos e aplica decay dinâmico escalável
     */
    nextTurn(state?: any): void {
        this.turnoAtual++;
        this.applyDecay(state);
    }

    /**
     * Registra uma pedra colocada
     * Se estiver visível, jogador também vê.
     */
    recordPlacement(slot: number, nome: string, visibleToPlayer: boolean = true): void {
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
    recordPlayerPeek(slot: number): void {
        this.playerSlots.set(slot, {
            confianca: 1.0,
            turnoVisto: this.turnoAtual
        });
        Logger.ai(`[Memory] Jogador espiou: Slot ${slot} agora tem 100% na PlayerMemory`);
    }

    /**
     * Registra uma troca entre dois slots (Para Bot e Jogador)
     */
    recordSwap(from: number, to: number): void {
        // --- BOT MEMORY ---
        const memFrom = this.slots.get(from);
        const memTo = this.slots.get(to);

        if (memFrom && memTo) {
            // Se conhece as DUAS pedras, cruzar elas de lugar causa maior confusão
            this.slots.set(from, { ...memTo, confianca: memTo.confianca * 0.85 });
            this.slots.set(to, { ...memFrom, confianca: memFrom.confianca * 0.85 });
        } else if (memFrom) {
            // Se conhece SÓ UMA, é mais fácil manter o olho nela (-5% de penalidade)
            this.slots.set(to, { ...memFrom, confianca: memFrom.confianca * 0.95 });
            this.slots.delete(from);
        } else if (memTo) {
            this.slots.set(from, { ...memTo, confianca: memTo.confianca * 0.95 });
            this.slots.delete(to);
        }

        // --- PLAYER MEMORY ---
        // O jogador está vendo a troca acontecer, então a memória dele se move (com penalidades idênticas)
        const pMemFrom = this.playerSlots.get(from);
        const pMemTo = this.playerSlots.get(to);

        if (pMemFrom && pMemTo) {
            this.playerSlots.set(from, { ...pMemTo, confianca: pMemTo.confianca * 0.85 });
            this.playerSlots.set(to, { ...pMemFrom, confianca: pMemFrom.confianca * 0.85 });
        } else if (pMemFrom) {
            this.playerSlots.set(to, { ...pMemFrom, confianca: pMemFrom.confianca * 0.95 });
            this.playerSlots.delete(from);
        } else if (pMemTo) {
            this.playerSlots.set(from, { ...pMemTo, confianca: pMemTo.confianca * 0.95 });
            this.playerSlots.delete(to);
        }

        Logger.ai(`[Memory] Swap registrado: ${from} <-> ${to}`);
    }

    /**
     * Registra quando uma pedra é virada (agora visível para ambos)
     */
    recordReveal(slot: number, nome: string): void {
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
    recordHide(slot: number): void {
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
    getConfidence(slot: number): number {
        return this.slots.get(slot)?.confianca ?? 0;
    }

    /**
     * Retorna o que o bot ACHA que é a confiança do JOGADOR sobre um slot
     */
    getPlayerConfidence(slot: number): number {
        return this.playerSlots.get(slot)?.confianca ?? 0;
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
     * Retorna a confiança média do bot nos slots passados (ex: somente os virados).
     * Retorna 0 se a lista for vazia.
     */
    getAverageConfidence(slots: number[]): number {
        if (slots.length === 0) return 0;
        const total = slots.reduce((sum, slot) => sum + (this.slots.get(slot)?.confianca ?? 0), 0);
        return total / slots.length;
    }

    /**
     * Retorna a confiança média do JOGADOR nos slots passados.
     */
    getPlayerAverageConfidence(slots: number[]): number {
        if (slots.length === 0) return 0;
        const total = slots.reduce((sum, slot) => sum + (this.playerSlots.get(slot)?.confianca ?? 0), 0);
        return total / slots.length;
    }

    /**
     * Aplica decay dinâmico de memória para Bot E Jogador (chamado a cada turno)
     */
    private applyDecay(state?: any): void {
        let currentDecay = this.baseDecayRate;

        // Fator Escalonável (Mesa mais complexa = mais rápido esquecer)
        if (state && state.mesa) {
            const tableStones = state.mesa.filter((p: any) => p !== null).length;
            const hiddenStones = state.mesa.filter((p: any) => p && p.virada).length;

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
    getDebugState(): string {
        const entries: string[] = [];
        this.slots.forEach((mem, slot) => {
            entries.push(`S${slot}:${mem.nome}(${Math.round(mem.confianca * 100)}%)`);
        });
        const pEntries: string[] = [];
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
    getRawMemoryState(slot: number): MemorySlot | undefined {
        return this.slots.get(slot);
    }

    /**
     * Helper para o Dev Mode visual (#bot-memory-debug)
     * Retorna a memória crua do jogador para um slot
     */
    getRawPlayerMemoryState(slot: number): PlayerMemorySlot | undefined {
        return this.playerSlots.get(slot);
    }
}

// Exportar globalmente
(window as any).BotMemory = BotMemory;
