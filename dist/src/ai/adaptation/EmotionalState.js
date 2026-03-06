/**
 * EmotionalState.ts - Simulação de Estado Emocional
 *
 * Bot tem "emoções" que afetam comportamento de forma sutil.
 */
import { Logger } from "../../utils/Logger.js";
export class EmotionalState {
    constructor() {
        this.metrics = {
            confidence: 0.7,
            frustration: 0.0,
            focus: 1.0
        };
        this.consecutiveLosses = 0;
        this.turnsSinceLastPoint = 0;
        Logger.ai("[EmotionalState] Inicializado");
    }
    /**
     * Registra vitória de ponto
     */
    recordWin() {
        this.metrics.confidence = Math.min(this.metrics.confidence + 0.15, 1.0);
        this.metrics.frustration = Math.max(this.metrics.frustration - 0.2, 0.0);
        this.consecutiveLosses = 0;
        this.turnsSinceLastPoint = 0;
    }
    /**
     * Registra perda de ponto
     */
    recordLoss() {
        this.metrics.confidence = Math.max(this.metrics.confidence - 0.1, 0.2);
        this.metrics.frustration = Math.min(this.metrics.frustration + 0.15, 1.0);
        this.consecutiveLosses++;
        this.turnsSinceLastPoint = 0;
    }
    /**
     * Avança turno
     */
    nextTurn() {
        this.turnsSinceLastPoint++;
        // Foco diminui se jogo demora
        if (this.turnsSinceLastPoint > 8) {
            this.metrics.focus = Math.max(this.metrics.focus - 0.05, 0.5);
        }
    }
    /**
     * Retorna métricas atuais
     */
    getMetrics() {
        return Object.assign({}, this.metrics);
    }
    /**
     * Retorna modificador de erro baseado em frustração
     * Alta frustração = mais erros (simula "tilt")
     */
    getErrorModifier() {
        return 1.0 + (this.metrics.frustration * 0.3);
    }
    /**
     * Retorna modificador de agressividade
     */
    getAggressionModifier() {
        // Baixa confiança = menos agressivo
        // Alta frustração = mais agressivo (desesperado)
        return this.metrics.confidence * 0.7 + this.metrics.frustration * 0.3;
    }
    /**
     * Retorna modificador de memória
     * Baixo foco = esquece mais
     */
    getMemoryModifier() {
        return this.metrics.focus;
    }
    /**
     * Reset emocional
     */
    reset() {
        this.metrics = {
            confidence: 0.7,
            frustration: 0.0,
            focus: 1.0
        };
        this.consecutiveLosses = 0;
        this.turnsSinceLastPoint = 0;
    }
}
// Exportar globalmente
window.EmotionalState = EmotionalState;
