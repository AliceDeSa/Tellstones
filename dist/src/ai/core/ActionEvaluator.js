/**
 * ActionEvaluator.ts - Sistema de Avaliação de Ações
 *
 * Calcula o valor de cada ação possível baseado em:
 * - Ganho de informação
 * - Probabilidade de vitória
 * - Fator de risco
 * - Modificadores de personalidade
 */
import { Logger } from "../../utils/Logger.js";
export class ActionEvaluator {
    constructor(beliefState) {
        this.beliefState = beliefState;
        Logger.ai("[ActionEvaluator] Inicializado");
    }
    /**
     * Avalia todas as ações válidas e retorna ordenadas por score
     */
    evaluateActions(state, validActions) {
        const scored = validActions.map(action => ({
            action,
            score: this.scoreAction(action, state),
            breakdown: this.getScoreBreakdown(action, state)
        }));
        // Ordenar por score (maior primeiro)
        scored.sort((a, b) => b.score - a.score);
        return scored;
    }
    /**
     * Calcula score total de uma ação
     */
    scoreAction(action, state) {
        const breakdown = this.getScoreBreakdown(action, state);
        return breakdown.baseValue
            + breakdown.informationGain
            + breakdown.winProbability
            - breakdown.riskFactor;
    }
    /**
     * Retorna breakdown detalhado do score
     */
    getScoreBreakdown(action, state) {
        switch (action.type) {
            case 'place':
                return this.evaluatePlace(action.target, state);
            case 'flip':
                return this.evaluateFlip(action.target, state);
            case 'swap':
                return this.evaluateSwap(action.targets.from, action.targets.to, state);
            case 'peek':
                return this.evaluatePeek(action.target, state);
            case 'challenge':
                return this.evaluateChallenge(action.target, state);
            case 'boast':
                return this.evaluateBoast(state);
            default:
                return { baseValue: 0, informationGain: 0, winProbability: 0, riskFactor: 0 };
        }
    }
    // ==================== AVALIADORES POR TIPO ====================
    evaluatePlace(slot, state) {
        let baseValue = 25;
        // Preferir centro
        if (slot === 3)
            baseValue += 10;
        if (slot === 2 || slot === 4)
            baseValue += 5;
        // Preferir slots adjacentes a pedras existentes
        const hasLeftNeighbor = slot > 0 && state.mesa[slot - 1];
        const hasRightNeighbor = slot < 6 && state.mesa[slot + 1];
        if (hasLeftNeighbor || hasRightNeighbor)
            baseValue += 5;
        return {
            baseValue,
            informationGain: 0, // Não ganha informação
            winProbability: 0, // Não ganha ponto diretamente
            riskFactor: 0 // Sem risco
        };
    }
    evaluateFlip(slot, state) {
        const pedra = state.mesa[slot];
        if (!pedra)
            return { baseValue: 0, informationGain: 0, winProbability: 0, riskFactor: 0 };
        // Virar de visível para escondida (esconder)
        if (!pedra.virada) {
            const confidence = this.beliefState.getConfidence(slot);
            return {
                baseValue: 30,
                informationGain: 0,
                winProbability: 0,
                riskFactor: confidence * 10 // Risco de esconder pedra que oponente já sabe
            };
        }
        // Virar de escondida para visível (revelar)
        return {
            baseValue: 15,
            informationGain: 5, // Oponente ganha info
            winProbability: 0,
            riskFactor: 5 // Dar informação ao oponente
        };
    }
    evaluateSwap(from, to, state) {
        const hiddenCount = state.mesa.filter(p => p && p.virada).length;
        // Trocar é mais valioso quando há muitas pedras escondidas
        const baseValue = 20 + (hiddenCount * 3);
        // Ganho de informação: confunde oponente
        const informationGain = hiddenCount * 2;
        return {
            baseValue,
            informationGain,
            winProbability: 0,
            riskFactor: 0
        };
    }
    evaluatePeek(slot, state) {
        const confidence = this.beliefState.getConfidence(slot);
        // Se o bot já sabe qual é a pedra com alta certeza, espiar é inútil
        if (confidence >= 0.8) {
            return {
                baseValue: 0,
                informationGain: 0,
                winProbability: 0,
                riskFactor: 5000 // Penalidade extrema para suprimir peek
            };
        }
        // Espiar é valioso apenas se não sabemos o que está lá
        const uncertainty = 1 - confidence;
        const informationGain = uncertainty * 60; // Aumentar o ganho baseado na dúvida
        return {
            baseValue: 30, // Reduz base value para depender mais do ganho real de informação
            informationGain,
            winProbability: 0,
            riskFactor: confidence * 20 // Aumenta risco suavemente
        };
    }
    evaluateChallenge(slot, state) {
        const pedra = state.mesa[slot];
        if (!pedra || !pedra.virada) {
            return { baseValue: 0, informationGain: 0, winProbability: 0, riskFactor: 300 }; // Impede desafio de pedras visíveis
        }
        // ADD: Only evaluate challenges if there are at least 3 hidden stones
        const hiddenCount = state.mesa.filter(p => p && p.virada).length;
        if (hiddenCount < 3) {
            return { baseValue: 0, informationGain: 0, winProbability: 0, riskFactor: 300 }; // Impede desafio no início
        }
        const confidence = this.beliefState.getConfidence(slot);
        // Win probability baseada na confiança
        const winProbability = confidence * 60;
        // Risco de perder ponto
        const riskFactor = (1 - confidence) * 50;
        return {
            baseValue: 50,
            informationGain: 0,
            winProbability,
            riskFactor
        };
    }
    evaluateBoast(state) {
        const pedrasViradas = state.mesa.map((p, i) => ({ exists: !!p, hidden: p && p.virada, idx: i })).filter(x => x.exists);
        const hiddenCount = pedrasViradas.filter(x => x.hidden).length;
        // Block Boast if there are less than 2 hidden stones (Game Rule Validation)
        // Also block boast if only 2 stones are on the board at all.
        if (hiddenCount < 2 || pedrasViradas.length < 3) {
            return { baseValue: 0, informationGain: 0, winProbability: 0, riskFactor: 3000 };
        }
        // Segabar é mais valioso com MUITAS pedras escondidas
        const hiddenRatio = hiddenCount / pedrasViradas.length;
        // Base value só sobe agressivamente se tiver muitas escondidas
        const baseValue = 20 + (hiddenRatio * 30);
        // Quantas das pedras ESCONDIDAS nós conhecemos? (Threshold > 0.85)
        let knownHidden = 0;
        pedrasViradas.filter(x => x.hidden).forEach(h => {
            if (this.beliefState.getConfidence(h.idx) > 0.85)
                knownHidden++;
        });
        // Se o bot não conhece todas as escondidas, o risco é ABSURDO (Evita chutes perigosos)
        const knowAllHiddenRatio = hiddenCount > 0 ? (knownHidden / hiddenCount) : 0;
        if (knowAllHiddenRatio < 1.0) {
            return {
                baseValue,
                informationGain: 0,
                winProbability: 0,
                riskFactor: 2000 // Penalidade imensa: Não se gabe se não souber tudo.
            };
        }
        // Sabemos todas as pedras escondidas: É hora de brilhar.
        const winProbability = 80;
        const riskFactor = 5;
        return {
            baseValue,
            informationGain: 0,
            winProbability,
            riskFactor
        };
    }
    /**
     * Retorna ações válidas dado o estado atual
     */
    getValidActions(state) {
        const actions = [];
        const mesa = state.mesa;
        const usedStones = mesa.filter(p => p).length;
        // 1. PLACE - Colocar pedra em slot adjacente vazio
        if (usedStones < 7) {
            const placeSlots = this.getAdjacentEmptySlots(mesa);
            placeSlots.forEach(slot => {
                actions.push({ type: 'place', target: slot });
            });
        }
        // 2. FLIP - Virar qualquer pedra na mesa
        mesa.forEach((pedra, idx) => {
            if (pedra) {
                actions.push({ type: 'flip', target: idx });
            }
        });
        // 3. SWAP - Trocar duas pedras adjacentes
        for (let i = 0; i < 6; i++) {
            if (mesa[i] && mesa[i + 1]) {
                actions.push({ type: 'swap', targets: { from: i, to: i + 1 } });
            }
        }
        // 4. PEEK - Espiar pedra virada (escondida)
        mesa.forEach((pedra, idx) => {
            if (pedra && pedra.virada) {
                actions.push({ type: 'peek', target: idx });
            }
        });
        // 5. CHALLENGE - Desafiar pedra virada
        mesa.forEach((pedra, idx) => {
            if (pedra && pedra.virada) {
                actions.push({ type: 'challenge', target: idx });
            }
        });
        // 6. BOAST - Segabar (sempre disponível se tem 3+ pedras)
        if (usedStones >= 3) {
            actions.push({ type: 'boast' });
        }
        return actions;
    }
    /**
     * Retorna slots vazios adjacentes a pedras existentes
     */
    getAdjacentEmptySlots(mesa) {
        const valid = [];
        for (let i = 0; i < 7; i++) {
            if (mesa[i])
                continue; // Já ocupado
            // Centro sempre válido se vazio
            if (i === 3) {
                valid.push(i);
                continue;
            }
            // Verificar adjacência
            const leftOccupied = i > 0 && mesa[i - 1];
            const rightOccupied = i < 6 && mesa[i + 1];
            if (leftOccupied || rightOccupied) {
                valid.push(i);
            }
        }
        return valid;
    }
}
// Exportar globalmente
window.ActionEvaluator = ActionEvaluator;
