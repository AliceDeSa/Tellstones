/**
 * DecisionEngine.ts - Motor Central de Decisões
 *
 * Combina BeliefState e ActionEvaluator para tomar decisões estratégicas.
 * Aplica modificadores de personalidade e fase de jogo.
 */
import { Logger, LogCategory } from "../../utils/Logger.js";
import { ActionEvaluator } from "./ActionEvaluator.js";
export var GamePhase;
(function (GamePhase) {
    GamePhase["OPENING"] = "opening";
    GamePhase["MIDGAME"] = "midgame";
    GamePhase["ENDGAME"] = "endgame"; // 6-7 pedras
})(GamePhase || (GamePhase = {}));
export class DecisionEngine {
    constructor(beliefState) {
        this.beliefState = beliefState;
        this.evaluator = new ActionEvaluator(beliefState);
        // Modificadores neutros por padrão
        this.personalityModifiers = {
            place: 1.0,
            flip: 1.0,
            swap: 1.0,
            peek: 1.0,
            challenge: 1.0,
            boast: 1.0
        };
        Logger.ai("[DecisionEngine] Inicializado");
    }
    /**
     * Define modificadores de personalidade
     */
    setPersonalityModifiers(modifiers) {
        this.personalityModifiers = Object.assign(Object.assign({}, this.personalityModifiers), modifiers);
        Logger.ai(`[DecisionEngine] Personalidade aplicada:`, modifiers);
    }
    /**
     * Decide a melhor ação dado o estado atual
     */
    decideAction(state) {
        // 1. Obter ações válidas
        const validActions = this.evaluator.getValidActions(state);
        if (validActions.length === 0) {
            Logger.warn(LogCategory.AI, "[DecisionEngine] Nenhuma ação válida!");
            return null;
        }
        // 2. Avaliar ações
        let scoredActions = this.evaluator.evaluateActions(state, validActions);
        // 3. Aplicar modificadores de personalidade
        scoredActions = this.applyPersonalityModifiers(scoredActions);
        // 4. Aplicar modificadores de fase de jogo
        const phase = this.getGamePhase(state);
        scoredActions = this.applyPhaseModifiers(scoredActions, phase);
        // 5. Aplicar modificadores de diferença de pontos
        scoredActions = this.applyScoreDifferentialModifiers(scoredActions, state);
        // 6. Re-ordenar após modificadores
        scoredActions.sort((a, b) => b.score - a.score);
        // 7. Adicionar aleatoriedade entre top 3 (evita jogo mecânico)
        const topActions = scoredActions.slice(0, Math.min(3, scoredActions.length));
        const chosen = topActions[Math.floor(Math.random() * topActions.length)];
        Logger.ai(`[DecisionEngine] Escolheu: ${chosen.action.type} (score: ${chosen.score.toFixed(1)}, fase: ${phase})`);
        return chosen.action;
    }
    /**
     * Detecta fase atual do jogo
     */
    getGamePhase(state) {
        const stonesPlaced = state.mesa.filter(p => p).length;
        if (stonesPlaced <= 3)
            return GamePhase.OPENING;
        if (stonesPlaced <= 5)
            return GamePhase.MIDGAME;
        return GamePhase.ENDGAME;
    }
    /**
     * Aplica modificadores de personalidade
     */
    applyPersonalityModifiers(actions) {
        return actions.map(scored => (Object.assign(Object.assign({}, scored), { score: scored.score * (this.personalityModifiers[scored.action.type] || 1.0) })));
    }
    /**
     * Aplica modificadores de fase de jogo
     */
    applyPhaseModifiers(actions, phase) {
        const modifiers = {
            [GamePhase.OPENING]: {
                place: 1.3, // Priorizar colocar pedras
                flip: 1.2, // Esconder cedo
                peek: 0.8, // Não desperdiçar turno espiando
                challenge: 0.5 // Evitar desafiar cedo
            },
            [GamePhase.MIDGAME]: {
                peek: 1.4, // Coletar informação
                swap: 1.3, // Confundir oponente
                flip: 1.1,
                challenge: 0.9
            },
            [GamePhase.ENDGAME]: {
                challenge: 1.5, // Pressionar para ganhar pontos
                boast: 1.3,
                peek: 0.7, // Menos tempo para espiar
                place: 0.5 // Provavelmente já colocou todas
            }
        };
        const phaseModifiers = modifiers[phase];
        return actions.map(scored => (Object.assign(Object.assign({}, scored), { score: scored.score * (phaseModifiers[scored.action.type] || 1.0) })));
    }
    /**
     * Aplica modificadores baseados em diferença de pontos
     */
    applyScoreDifferentialModifiers(actions, state) {
        const players = Array.isArray(state.jogadores) ? state.jogadores : Object.values(state.jogadores);
        const bot = players.find((p) => p.nome === 'Bot');
        const player = players.find((p) => p.nome !== 'Bot');
        if (!bot || !player)
            return actions;
        const differential = bot.pontos - player.pontos;
        // Bot perdendo: aumentar agressividade
        if (differential < 0) {
            return actions.map(scored => {
                if (scored.action.type === 'challenge' || scored.action.type === 'boast') {
                    return Object.assign(Object.assign({}, scored), { score: scored.score * 1.3 });
                }
                return scored;
            });
        }
        // Bot ganhando: jogar defensivo
        if (differential > 0) {
            return actions.map(scored => {
                if (scored.action.type === 'swap' || scored.action.type === 'flip') {
                    return Object.assign(Object.assign({}, scored), { score: scored.score * 1.2 });
                }
                if (scored.action.type === 'challenge') {
                    return Object.assign(Object.assign({}, scored), { score: scored.score * 0.8 });
                }
                return scored;
            });
        }
        return actions;
    }
    /**
     * Calcula tempo de "pensar" baseado na complexidade da decisão
     */
    calculateThinkTime(action) {
        const base = 1000;
        const complexity = {
            place: 400,
            flip: 500,
            swap: 600,
            peek: 700,
            challenge: 900,
            boast: 800
        };
        const actionComplexity = complexity[action.type] || 500;
        return base + Math.floor(Math.random() * actionComplexity);
    }
}
// Exportar globalmente
window.DecisionEngine = DecisionEngine;
