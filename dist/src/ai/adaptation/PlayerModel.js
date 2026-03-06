/**
 * PlayerModel.ts - Modelagem do Oponente Humano
 *
 * Rastreia padrões do jogador e adapta estratégia.
 */
import { Logger } from "../../utils/Logger.js";
export class PlayerModel {
    constructor() {
        this.pattern = {
            challengeCount: 0,
            challengeSuccessCount: 0,
            slotInteractions: new Map(),
            boastCount: 0,
            boastHonestCount: 0,
            earlyGameAggression: 0.5,
            lateGameAggression: 0.5
        };
        this.turnCount = 0;
        Logger.ai("[PlayerModel] Inicializado");
    }
    /**
     * Registra um desafio do jogador
     */
    recordChallenge(success) {
        this.pattern.challengeCount++;
        if (success)
            this.pattern.challengeSuccessCount++;
        this.updateAggressionMetrics();
    }
    /**
     * Registra um boast do jogador
     */
    recordBoast(wasHonest) {
        this.pattern.boastCount++;
        if (wasHonest)
            this.pattern.boastHonestCount++;
    }
    /**
     * Registra interação com um slot
     */
    recordSlotInteraction(slot) {
        const current = this.pattern.slotInteractions.get(slot) || 0;
        this.pattern.slotInteractions.set(slot, current + 1);
    }
    /**
     * Avança turno
     */
    nextTurn() {
        this.turnCount++;
    }
    /**
     * Retorna frequência de desafios (0-1)
     */
    getChallengeFrequency() {
        if (this.turnCount === 0)
            return 0.5;
        return Math.min(this.pattern.challengeCount / this.turnCount, 1.0);
    }
    /**
     * Retorna taxa de acerto em desafios (0-1)
     */
    getChallengeAccuracy() {
        if (this.pattern.challengeCount === 0)
            return 0.5;
        return this.pattern.challengeSuccessCount / this.pattern.challengeCount;
    }
    /**
     * Retorna honestidade em boasts (0-1)
     */
    getBoastHonesty() {
        if (this.pattern.boastCount === 0)
            return 0.5;
        return this.pattern.boastHonestCount / this.pattern.boastCount;
    }
    /**
     * Retorna slots mais interagidos
     */
    getPreferredSlots() {
        const sorted = [...this.pattern.slotInteractions.entries()]
            .sort((a, b) => b[1] - a[1]);
        return sorted.slice(0, 3).map(([slot]) => slot);
    }
    /**
     * Sugere contra-estratégia
     */
    suggestCounterStrategy() {
        return {
            avoidSlots: this.getPreferredSlots(),
            swapMore: this.getChallengeFrequency() > 0.6,
            callBluffs: this.getBoastHonesty() < 0.4
        };
    }
    updateAggressionMetrics() {
        // Calcular agressividade baseada em desafios
        const freq = this.getChallengeFrequency();
        if (this.turnCount < 5) {
            this.pattern.earlyGameAggression = freq;
        }
        else {
            this.pattern.lateGameAggression = freq;
        }
    }
}
// Exportar globalmente
window.PlayerModel = PlayerModel;
