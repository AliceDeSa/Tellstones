/**
 * BeliefState.ts - Sistema de Crenças Probabilísticas
 *
 * Rastreia a probabilidade de cada pedra estar em cada slot da mesa.
 * Usa eliminação bayesiana e histórico de observações.
 */
import { Logger } from "../../utils/Logger.js";
// Lista oficial de pedras
const STONES = ['Espada', 'Escudo', 'Coroa', 'Martelo', 'Bandeira', 'Balança', 'Cavalo'];
export class BeliefState {
    constructor() {
        // Taxa de decay por turno (memória enfraquece)
        this.DECAY_RATE = 0.85;
        // Threshold para considerar "esquecido"
        this.FORGET_THRESHOLD = 0.05;
        this.slots = new Map();
        this.confirmed = new Map();
        this.observations = [];
        this.currentTurn = 0;
        // Inicializar todos os slots com probabilidades uniformes
        this.reset();
        Logger.ai("[BeliefState] Inicializado");
    }
    /**
     * Reset completo do estado
     */
    reset() {
        this.slots.clear();
        this.confirmed.clear();
        this.observations = [];
        this.currentTurn = 0;
        // Inicializar probabilidades uniformes (1/7 para cada pedra)
        for (let slot = 0; slot < 7; slot++) {
            const probs = new Map();
            STONES.forEach(stone => probs.set(stone, 1 / 7));
            this.slots.set(slot, probs);
        }
        Logger.ai("[BeliefState] Reset completo");
    }
    /**
     * Avança o turno e aplica decay
     */
    nextTurn() {
        this.currentTurn++;
        this.applyDecay();
    }
    /**
     * Observa uma pedra sendo colocada
     */
    observePlacement(slot, stone) {
        this.observations.push({ type: 'place', slot, stone, turn: this.currentTurn });
        // Certeza absoluta neste slot
        this.setConfirmed(slot, stone);
        // Eliminar esta pedra de todos os outros slots
        this.eliminateStoneFromOtherSlots(stone, slot);
        Logger.ai(`[BeliefState] Colocação: Slot ${slot} = ${stone} (100%)`);
    }
    /**
     * Observa uma pedra sendo revelada (virada de escondida para visível)
     */
    observeReveal(slot, stone) {
        this.observations.push({ type: 'reveal', slot, stone, turn: this.currentTurn });
        // Atualizar com certeza
        this.setConfirmed(slot, stone);
        this.eliminateStoneFromOtherSlots(stone, slot);
        Logger.ai(`[BeliefState] Revelação: Slot ${slot} = ${stone}`);
    }
    /**
     * Observa uma pedra sendo escondida (virada de visível para escondida)
     */
    observeHide(slot) {
        this.observations.push({ type: 'hide', slot, turn: this.currentTurn });
        // Manter a crença mas marcar como não mais confirmada visualmente
        const confirmed = this.confirmed.get(slot);
        if (confirmed) {
            // Reduzir confiança levemente (ainda lembramos, mas não vemos)
            // IMPORTANTE: Devemos baixar para < 0.80 para não triggar bloqueio de 'peek' e 'boast' precoce.
            // O limite para saber completamente sem ver é ~0.75-0.79 se acabou de esconder
            const probs = this.slots.get(slot);
            probs.forEach((prob, stone) => {
                if (stone === confirmed.stone) {
                    probs.set(stone, 0.78);
                }
                else {
                    probs.set(stone, 0.22 / 6); // Distribui o restante entre as outras 6
                }
            });
            this.normalize(slot);
            // Remove the hard confirmation since it's hidden now
            this.confirmed.delete(slot);
        }
        Logger.ai(`[BeliefState] Escondida: Slot ${slot}`);
    }
    /**
     * Observa uma troca entre dois slots
     */
    observeSwap(from, to) {
        this.observations.push({ type: 'swap', from, to, turn: this.currentTurn });
        // Trocar as distribuições de probabilidade
        const fromProbs = this.slots.get(from);
        const toProbs = this.slots.get(to);
        // Clonar para evitar referência
        const tempFrom = new Map(fromProbs);
        this.slots.set(from, new Map(toProbs));
        this.slots.set(to, tempFrom);
        // Atualizar confirmações se existirem
        const confirmedFrom = this.confirmed.get(from);
        const confirmedTo = this.confirmed.get(to);
        if (confirmedFrom)
            this.confirmed.set(to, confirmedFrom);
        if (confirmedTo)
            this.confirmed.set(from, confirmedTo);
        Logger.ai(`[BeliefState] Troca: Slot ${from} <-> Slot ${to}`);
    }
    /**
     * Observa espiar uma pedra (peek)
     */
    observePeek(slot, stone) {
        this.observations.push({ type: 'peek', slot, stone, turn: this.currentTurn });
        // Confirmar com certeza
        this.setConfirmed(slot, stone);
        this.eliminateStoneFromOtherSlots(stone, slot);
        Logger.ai(`[BeliefState] Espiar: Slot ${slot} = ${stone}`);
    }
    /**
     * Retorna a pedra mais provável em um slot
     */
    getMostLikelyStone(slot) {
        const probs = this.slots.get(slot);
        if (!probs)
            return { stone: STONES[0], probability: 0 };
        let maxStone = STONES[0];
        let maxProb = 0;
        probs.forEach((prob, stone) => {
            if (prob > maxProb) {
                maxProb = prob;
                maxStone = stone;
            }
        });
        return { stone: maxStone, probability: maxProb };
    }
    /**
     * Retorna todas as probabilidades de um slot
     */
    getSlotProbabilities(slot) {
        return new Map(this.slots.get(slot) || new Map());
    }
    /**
     * Retorna confiança geral em um slot (0-1)
     */
    getConfidence(slot) {
        const { probability } = this.getMostLikelyStone(slot);
        return probability;
    }
    /**
     * Retorna lista de pedras que ainda não foram vistas
     */
    getUnseenStones() {
        const seen = new Set();
        this.confirmed.forEach(({ stone }) => seen.add(stone));
        return STONES.filter(stone => !seen.has(stone));
    }
    /**
     * Retorna slots com alta confiança (> threshold)
     */
    getKnownSlots(minConfidence = 0.7) {
        const known = [];
        for (let slot = 0; slot < 7; slot++) {
            if (this.getConfidence(slot) >= minConfidence) {
                known.push(slot);
            }
        }
        return known;
    }
    /**
     * Debug: retorna estado atual
     */
    getDebugState() {
        const entries = [];
        for (let slot = 0; slot < 7; slot++) {
            const { stone, probability } = this.getMostLikelyStone(slot);
            const conf = Math.round(probability * 100);
            entries.push(`S${slot}:${stone}(${conf}%)`);
        }
        return entries.join(', ');
    }
    // ==================== MÉTODOS PRIVADOS ====================
    /**
     * Define certeza absoluta em um slot
     */
    setConfirmed(slot, stone) {
        const probs = this.slots.get(slot);
        STONES.forEach(s => {
            probs.set(s, s === stone ? 1.0 : 0.0);
        });
        this.confirmed.set(slot, { stone, turn: this.currentTurn });
    }
    /**
     * Elimina uma pedra de todos os outros slots
     */
    eliminateStoneFromOtherSlots(stone, exceptSlot) {
        for (let slot = 0; slot < 7; slot++) {
            if (slot === exceptSlot)
                continue;
            const probs = this.slots.get(slot);
            probs.set(stone, 0.0);
            this.normalize(slot);
        }
    }
    /**
     * Normaliza probabilidades de um slot para somar 1.0
     */
    normalize(slot) {
        const probs = this.slots.get(slot);
        let sum = 0;
        probs.forEach(prob => sum += prob);
        if (sum > 0) {
            probs.forEach((prob, stone) => {
                probs.set(stone, prob / sum);
            });
        }
    }
    /**
     * Aplica decay de memória (esquecimento natural)
     */
    applyDecay() {
        // Apenas aplicar decay em slots não confirmados recentemente
        for (let slot = 0; slot < 7; slot++) {
            const confirmed = this.confirmed.get(slot);
            // Se foi confirmado há menos de 2 turnos, não aplicar decay
            if (confirmed && (this.currentTurn - confirmed.turn) < 2) {
                continue;
            }
            const probs = this.slots.get(slot);
            // Aplicar decay e tender para distribuição uniforme
            probs.forEach((prob, stone) => {
                const decayed = prob * this.DECAY_RATE;
                const uniform = 1 / 7;
                const newProb = decayed + (uniform * (1 - this.DECAY_RATE));
                probs.set(stone, newProb);
            });
            this.normalize(slot);
            // Remover confirmação se confiança caiu muito
            if (confirmed && this.getConfidence(slot) < 0.5) {
                this.confirmed.delete(slot);
            }
        }
    }
}
// Exportar globalmente para compatibilidade
window.BeliefState = BeliefState;
