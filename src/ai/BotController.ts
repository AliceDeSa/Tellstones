/**
 * BotController.ts - Controlador Principal do Bot AI v2.0
 * 
 * Integra todos os componentes:
 * - BeliefState (memória probabilística)
 * - DecisionEngine (decisões estratégicas)
 * - MaestroProfile (personalidade)
 * - SkillLadder (dificuldade)
 * - PlayerModel (adaptação)
 * - EmotionalState (emoções)
 * 
 * Substitui o antigo BotBrain.ts
 */

import { Logger } from "../utils/Logger.js";
import { BeliefState } from "./core/BeliefState.js";
import { DecisionEngine, GamePhase } from "./core/DecisionEngine.js";
import { ActionEvaluator, BotAction, GameState } from "./core/ActionEvaluator.js";
import { MaestroProfile, getContextualPhrase } from "./personality/MaestroProfile.js";
import { VIGILANTE } from "./personality/Vigilante.js";
import { FANTASMA } from "./personality/Fantasma.js";
import { APOSTADOR } from "./personality/Apostador.js";
import { SkillLadder, SkillLevel } from "./adaptation/SkillLadder.js";
import { PlayerModel } from "./adaptation/PlayerModel.js";
import { EmotionalState } from "./adaptation/EmotionalState.js";
import { IBotAgent, BotContext, BotObservation, BotAgentConfig, DebugSlotData } from "./IBotAgent.js";

const MAESTROS: Record<string, MaestroProfile> = {
    'vigilante': VIGILANTE,
    'fantasma': FANTASMA,
    'apostador': APOSTADOR
};

export class BotController implements IBotAgent {
    // Componentes principais
    private beliefState: BeliefState;
    private decisionEngine: DecisionEngine;
    private skillLadder: SkillLadder;
    private playerModel: PlayerModel;
    private emotionalState: EmotionalState;

    // Configuração atual
    public profile: MaestroProfile;
    private currentLevel: SkillLevel;

    constructor(profileId: string = 'vigilante', skillLevel: SkillLevel = SkillLevel.VETERANO) {
        // Inicializar componentes
        this.beliefState = new BeliefState();
        this.decisionEngine = new DecisionEngine(this.beliefState);
        this.skillLadder = new SkillLadder(skillLevel);
        this.playerModel = new PlayerModel();
        this.emotionalState = new EmotionalState();

        // Configurar personalidade
        this.profile = MAESTROS[profileId] || VIGILANTE;
        this.currentLevel = skillLevel;

        // Aplicar modificadores de personalidade
        this.decisionEngine.setPersonalityModifiers(this.profile.modifiers);

        Logger.ai(`[BotController v2.0] Construído - ${this.profile.name} (${this.skillLadder.getLevelName()})`);
    }

    /**
     * Inicialização baseada no novo contrato IBotAgent
     */
    init(config: BotAgentConfig): void {
        this.profile = MAESTROS[config.profileId] || VIGILANTE;
        this.currentLevel = config.skillLevel;
        this.skillLadder = new SkillLadder(this.currentLevel);

        this.decisionEngine.setPersonalityModifiers(this.profile.modifiers);

        Logger.ai(`[BotController v2.0] Inicializado via IBotAgent - ${this.profile.name} (${this.skillLadder.getLevelName()})`);
    }

    // ==================== INTERFACE PÚBLICA ====================

    /**
     * Decide a próxima jogada do bot
     */
    decideMove(ctx: BotContext): BotAction | null {
        const action = this.decisionEngine.decideAction(ctx.state);

        if (!action) return null;

        // Log com frase contextual
        const phrase = this.getContextualPhrase(action.type as any);
        if (phrase) {
            Logger.ai(`[${this.profile.name}] "${phrase}"`);
        }

        return action;
    }

    /**
     * Calcula tempo de "pensar" (1-3s)
     */
    calculateThinkTime(state: GameState, decision: BotAction): number {
        return this.decisionEngine.calculateThinkTime(decision);
    }

    /**
     * Prediz qual pedra está em um slot (para desafios)
     */
    predictStone(slot: number, ctx: BotContext): string {
        const probabilities = this.beliefState.getSlotProbabilities(slot);

        // Zera as probabilidades das pedras já excluídas (usado em segabar múltiplos chutes)
        ctx.usedGuesses.forEach(stone => probabilities.set(stone, 0));

        let maxStone = 'Espada';
        let maxProb = -1;
        probabilities.forEach((prob, stone) => {
            if (prob > maxProb) {
                maxProb = prob;
                maxStone = stone;
            }
        });

        const probability = maxProb === -1 ? 0 : maxProb;
        let finalGuess = maxStone;

        // Se a probabilidade for > 0, aplica imperfeições da IA
        if (probability > 0) {
            finalGuess = this.skillLadder.applyImperfection(maxStone, probabilities);

            // Aplicar modificador emocional
            const errorMod = this.emotionalState.getErrorModifier();
            if (Math.random() < (errorMod - 1.0)) {
                // Erro adicional por frustração
                const sorted = [...probabilities.entries()].sort((a, b) => b[1] - a[1]);
                finalGuess = sorted[2]?.[0] || finalGuess;
            }
        } else {
            // Fallback caso todas sumam
            const pedras = ['Espada', 'Escudo', 'Coroa', 'Martelo', 'Bandeira', 'Balança', 'Cavalo'];
            const available = pedras.filter(p => !ctx.usedGuesses.includes(p));
            if (available.length > 0) finalGuess = available[0];
        }

        Logger.ai(`[${this.profile.name}] Palpite: ${finalGuess} (confiança: ${Math.round(probability * 100)}%)`);
        return finalGuess;
    }

    /**
     * Decide resposta a segabar (acreditar ou duvidar)
     */
    decideBoastResponse(ctx: BotContext): 'acreditar' | 'duvidar' {
        const counterStrategy = this.playerModel.suggestCounterStrategy();

        // Se jogador blefa muito, sempre duvidar
        if (counterStrategy.callBluffs) {
            Logger.ai(`[${this.profile.name}] Duvidar (jogador blefa muito)`);
            return 'duvidar';
        }

        // Baseado em pedras escondidas
        const hiddenCount = ctx.state.mesa.filter(p => p && p.virada).length;
        const doubtChance = hiddenCount > 4 ? 0.7 : hiddenCount > 2 ? 0.5 : 0.3;

        const decision = Math.random() < doubtChance ? 'duvidar' : 'acreditar';
        Logger.ai(`[${this.profile.name}] ${decision} (${hiddenCount} pedras escondidas)`);
        return decision;
    }

    /**
     * Observa ações do jogo para atualizar memória utilizando tipagem estrita
     */
    observe(event: BotObservation): void {
        if (!event) return;

        switch (event.type) {
            case 'placement':
                this.beliefState.observePlacement(event.slot, event.stone);
                this.playerModel.recordSlotInteraction(event.slot);
                break;
            case 'swap':
                this.beliefState.observeSwap(event.from, event.to);
                break;
            case 'reveal':
                this.beliefState.observeReveal(event.slot, event.stone);
                break;
            case 'hide':
                this.beliefState.observeHide(event.slot);
                break;
            case 'peek':
                this.beliefState.observePeek(event.slot, event.stone);
                break;
            case 'turn_end':
                this.beliefState.nextTurn();
                this.playerModel.nextTurn();
                this.emotionalState.nextTurn();
                break;
            case 'challenge_result':
                if (event.botWon) {
                    this.emotionalState.recordWin();
                } else {
                    this.emotionalState.recordLoss();
                    this.playerModel.recordChallenge(true);
                }
                break;
        }
    }

    /**
     * Retorna frase do bot (simplificado)
     */
    getChatter(event: string): string | null {
        const eventMap: Record<string, keyof typeof this.profile.phrases> = {
            'win_point': 'winPoint',
            'lose_point': 'losePoint',
            'challenge': 'challenge',
            'boast': 'boast',
            'winning': 'confident',
            'losing': 'frustrated'
        };

        const phraseKey = eventMap[event];
        if (!phraseKey) return null;

        return getContextualPhrase(this.profile, phraseKey);
    }

    /**
     * Debug stats
     */
    getDebugStats(): string {
        const belief = this.beliefState.getDebugState();
        const emotion = this.emotionalState.getMetrics();
        return `${belief} | Conf:${Math.round(emotion.confidence * 100)}% Frust:${Math.round(emotion.frustration * 100)}%`;
    }

    /**
     * Helper para o Dev Mode visual (#bot-memory-debug)
     */
    getDebugUIData(slot: number): DebugSlotData {
        const belief = this.beliefState.getMostLikelyStone(slot);

        return {
            bot: {
                confianca: belief.probability,
                nome: belief.stone
            },
            // AI v2.0 does not track expected player memory per-slot natively anymore.
            ply: null
        };
    }

    /**
     * Reset completo
     */
    reset(): void {
        this.beliefState.reset();
        this.emotionalState.reset();
        Logger.ai(`[BotController] Reset completo`);
    }

    // ==================== MÉTODOS PRIVADOS ====================

    private getContextualPhrase(actionType: keyof typeof this.profile.phrases): string | null {
        try {
            return getContextualPhrase(this.profile, actionType);
        } catch {
            return null;
        }
    }
}

// Exportar globalmente para compatibilidade com código legado
(window as any).BotBrain = BotController; // Alias para compatibilidade
(window as any).BotController = BotController;
