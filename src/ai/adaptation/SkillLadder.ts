/**
 * SkillLadder.ts - Sistema de Dificuldade com Imperfeição Controlada
 * 
 * Define 5 níveis de habilidade com taxas de erro simuladas.
 * Erros são naturais e críveis, não aleatórios.
 */

import { Logger } from "../../utils/Logger.js";

export enum SkillLevel {
    APRENDIZ = 1,   // 40% erro
    PRATICANTE = 2, // 25% erro
    VETERANO = 3,   // 15% erro
    MESTRE = 4,     // 5% erro
    LENDA = 5       // 2% erro
}

export interface SkillConfig {
    level: SkillLevel;
    name: string;
    errorRate: number;
    description: string;
    behaviors: {
        forgetsSwaps: boolean;      // Esquece trocas antigas
        ignoresElimination: boolean; // Ignora lógica de eliminação
        hasMemoryDecay: boolean;    // Memória decai mais rápido
        makesRiskyMoves: boolean;   // Faz jogadas arriscadas
    };
}

export const SKILL_CONFIGS: Record<SkillLevel, SkillConfig> = {
    [SkillLevel.APRENDIZ]: {
        level: SkillLevel.APRENDIZ,
        name: "Aprendiz",
        errorRate: 0.40,
        description: "Ainda aprendendo. Comete erros básicos.",
        behaviors: {
            forgetsSwaps: true,
            ignoresElimination: true,
            hasMemoryDecay: true,
            makesRiskyMoves: false
        }
    },
    [SkillLevel.PRATICANTE]: {
        level: SkillLevel.PRATICANTE,
        name: "Praticante",
        errorRate: 0.25,
        description: "Competente mas ocasionalmente erra.",
        behaviors: {
            forgetsSwaps: true,
            ignoresElimination: false,
            hasMemoryDecay: true,
            makesRiskyMoves: false
        }
    },
    [SkillLevel.VETERANO]: {
        level: SkillLevel.VETERANO,
        name: "Veterano",
        errorRate: 0.15,
        description: "Experiente. Raramente erra.",
        behaviors: {
            forgetsSwaps: false,
            ignoresElimination: false,
            hasMemoryDecay: false,
            makesRiskyMoves: false
        }
    },
    [SkillLevel.MESTRE]: {
        level: SkillLevel.MESTRE,
        name: "Mestre",
        errorRate: 0.05,
        description: "Quase perfeito. Pressiona psicologicamente.",
        behaviors: {
            forgetsSwaps: false,
            ignoresElimination: false,
            hasMemoryDecay: false,
            makesRiskyMoves: true
        }
    },
    [SkillLevel.LENDA]: {
        level: SkillLevel.LENDA,
        name: "Lenda",
        errorRate: 0.02,
        description: "Adaptativo. Contra-estratégia ativa.",
        behaviors: {
            forgetsSwaps: false,
            ignoresElimination: false,
            hasMemoryDecay: false,
            makesRiskyMoves: true
        }
    }
};

export class SkillLadder {
    private currentLevel: SkillLevel;
    private config: SkillConfig;

    constructor(level: SkillLevel = SkillLevel.VETERANO) {
        this.currentLevel = level;
        this.config = SKILL_CONFIGS[level];
        Logger.ai(`[SkillLadder] Nível: ${this.config.name} (${Math.round(this.config.errorRate * 100)}% erro)`);
    }

    /**
     * Define novo nível de habilidade
     */
    setLevel(level: SkillLevel): void {
        this.currentLevel = level;
        this.config = SKILL_CONFIGS[level];
        Logger.ai(`[SkillLadder] Mudou para: ${this.config.name}`);
    }

    /**
     * Retorna configuração atual
     */
    getConfig(): SkillConfig {
        return this.config;
    }

    /**
     * Aplica erro natural a uma predição
     * 
     * Em vez de escolher aleatório, escolhe segunda/terceira opção mais provável
     */
    applyImperfection(
        bestGuess: string,
        probabilities: Map<string, number>
    ): string {
        // Verificar se deve errar
        if (Math.random() >= this.config.errorRate) {
            return bestGuess; // Acertou
        }

        // Ordenar por probabilidade
        const sorted = [...probabilities.entries()]
            .sort((a, b) => b[1] - a[1]);

        // Escolher segunda ou terceira opção (erro natural)
        const errorIndex = 1 + Math.floor(Math.random() * 2); // 1 ou 2

        if (sorted[errorIndex]) {
            Logger.ai(`[SkillLadder] Erro natural: ${bestGuess} -> ${sorted[errorIndex][0]}`);
            return sorted[errorIndex][0];
        }

        // Fallback se não houver opções suficientes
        return bestGuess;
    }

    /**
     * Decide se deve esquecer uma troca antiga
     */
    shouldForgetSwap(turnsAgo: number): boolean {
        if (!this.config.behaviors.forgetsSwaps) return false;

        // Quanto mais turnos atrás, maior chance de esquecer
        const forgetChance = Math.min(turnsAgo * 0.15, 0.8);
        return Math.random() < forgetChance;
    }

    /**
     * Decide se deve ignorar lógica de eliminação
     */
    shouldIgnoreElimination(): boolean {
        return this.config.behaviors.ignoresElimination && Math.random() < 0.3;
    }

    /**
     * Retorna multiplicador de decay de memória
     */
    getMemoryDecayMultiplier(): number {
        if (!this.config.behaviors.hasMemoryDecay) return 1.0;

        // Níveis baixos esquecem mais rápido
        return 1.0 + (0.3 * (5 - this.currentLevel) / 4);
    }

    /**
     * Decide se deve fazer jogada arriscada
     */
    shouldMakeRiskyMove(): boolean {
        return this.config.behaviors.makesRiskyMoves && Math.random() < 0.4;
    }

    /**
     * Retorna taxa de erro atual
     */
    getErrorRate(): number {
        return this.config.errorRate;
    }

    /**
     * Retorna nome do nível
     */
    getLevelName(): string {
        return this.config.name;
    }
}

// Exportar globalmente
(window as any).SkillLadder = SkillLadder;
(window as any).SkillLevel = SkillLevel;
