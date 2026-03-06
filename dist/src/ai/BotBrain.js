// =========================
// BotBrain - IA do Bot (v5.0 Clean)
// =========================
// Recriado do zero - arquitetura limpa
import { Logger } from "../utils/Logger.js";
import { BotMemory } from "./BotMemory.js";
// Lista de todas as pedras do jogo
const PEDRAS = ['Espada', 'Escudo', 'Coroa', 'Martelo', 'Bandeira', 'Balança', 'Cavalo'];
// =========================
// CLASSE PRINCIPAL
// =========================
export class BotBrain {
    constructor(profileName = "default") {
        this.memory = new BotMemory();
        this.profile = { name: "Stratega" };
        Logger.ai(`[BotBrain v5.0] Inicializado`);
    }
    // =========================
    // INTERFACE PÚBLICA
    // =========================
    /**
     * Decide a próxima jogada do bot
     */
    decideMove(state) {
        const validMoves = this.getValidMoves(state);
        if (validMoves.length === 0) {
            Logger.ai("[Bot] Nenhuma jogada válida - fallback place");
            return { type: 'place', target: 3 };
        }
        // Pontuar cada jogada
        const scored = validMoves.map(move => ({
            move,
            score: this.scoreMove(move, state)
        }));
        // Ordenar por pontuação
        scored.sort((a, b) => b.score - a.score);
        // Leve aleatoriedade entre top 3
        const topMoves = scored.slice(0, Math.min(3, scored.length));
        const chosen = topMoves[Math.floor(Math.random() * topMoves.length)];
        Logger.ai(`[Bot] Decidiu: ${chosen.move.type} (score: ${chosen.score.toFixed(1)})`);
        return chosen.move;
    }
    /**
     * Calcula tempo de "pensar" (1-3s)
     */
    calculateThinkTime(state, decision) {
        const base = 1000;
        const complexity = decision.type === 'challenge' ? 800 :
            decision.type === 'swap' ? 600 : 400;
        return base + Math.floor(Math.random() * complexity);
    }
    /**
     * Prediz qual pedra está em um slot (para desafios)
     */
    predictStone(slot, state) {
        // Primeiro tenta usar memória diretamenta para este slot
        const guess = this.memory.getBestGuess(slot);
        if (guess && this.memory.getConfidence(slot) > 0.5) {
            Logger.ai(`[Bot] Palpite por memória: ${guess} (${Math.round(this.memory.getConfidence(slot) * 100)}%)`);
            return guess;
        }
        // Sem memória conclusiva para este slot:
        // 1. O que não pode ser? (Pedras visíveis + pedras de alta confiança + pedras na reserva)
        const excludedStones = new Set(this.getVisibleStones(state));
        // Adiciona pedras na reserva (se elas não foram jogadas, não podem estar no slot alvo)
        if (state.reserva && state.reserva.length > 0) {
            state.reserva.forEach(p => excludedStones.add(p.nome));
            Logger.ai(`[Bot] ${state.reserva.length} pedras na reserva excluídas dos palpites.`);
        }
        for (let i = 0; i < 7; i++) {
            if (i === slot)
                continue; // Ignora o slot alvo atual
            const otherGuess = this.memory.getBestGuess(i);
            const conf = this.memory.getConfidence(i);
            // Se ele tem boa certeza que uma pedra X está no slot Y, X não está no slot alvo
            if (otherGuess && conf > 0.6) {
                excludedStones.add(otherGuess);
                Logger.ai(`[Bot] Acredita que ${otherGuess} está no slot ${i} -> Excluído das opções`);
            }
        }
        const possibleStones = PEDRAS.filter(p => !excludedStones.has(p));
        if (possibleStones.length > 0) {
            const choice = possibleStones[Math.floor(Math.random() * possibleStones.length)];
            Logger.ai(`[Bot] Palpite por eliminação: ${choice} (Sobraram ${possibleStones.length} opções)`);
            return choice;
        }
        // Fallback total
        const fallback = PEDRAS[Math.floor(Math.random() * PEDRAS.length)];
        Logger.ai(`[Bot] Palpite aleatório falha lógica: ${fallback}`);
        return fallback;
    }
    /**
     * Decide resposta a segabar (acreditar ou duvidar).
     * Lógica: se há poucas pedras viradas o jogador consegue lembrá-las facilmente,
     * então o bot deve se gabar também (counter-boast = empate ou ponto garantido).
     * Com muitas pedras escondidas e bot sem memória = arriscar é ruim → acreditar.
     */
    decideBoastResponse(state) {
        const hiddenSlots = state.mesa
            .map((p, i) => ({ p, i }))
            .filter(({ p }) => p && p.virada)
            .map(({ i }) => i);
        const hiddenCount = hiddenSlots.length;
        // REGRA: Com < 3 pedras viradas o jogador lembra trivialmente → counter-boast seguro
        if (hiddenCount < 3) {
            Logger.ai(`[Bot] Segabar response: duvidar (< 3 viradas — contra-segabar garantido)`);
            return 'duvidar';
        }
        // Com muitas pedras viradas: avaliar memória do bot
        const avgConfidence = this.memory.getAverageConfidence(hiddenSlots);
        // Alta confiança do bot → também sabe as pedras → duvidar vale a pena
        // Baixa confiança + muitas pedras → jogador provavelmente sabe mais → acreditar
        const doubtChance = hiddenCount >= 6 ? 0.25 + avgConfidence * 0.5
            : hiddenCount >= 4 ? 0.35 + avgConfidence * 0.4
                : 0.45 + avgConfidence * 0.35; // 3-4 pedras
        const decision = Math.random() < doubtChance ? 'duvidar' : 'acreditar';
        Logger.ai(`[Bot] Segabar response: ${decision} (${hiddenCount} viradas, confiança média: ${(avgConfidence * 100).toFixed(0)}%)`);
        return decision;
    }
    /**
     * Observa ações do jogo para atualizar memória
     */
    observe(action, state) {
        if (!action)
            return;
        switch (action.tipo) {
            case 'colocar':
                if (action.destino !== undefined && action.pedra) {
                    this.memory.recordPlacement(action.destino, action.pedra.nome);
                }
                break;
            case 'trocar':
                if (action.origem !== undefined && action.destino !== undefined) {
                    this.memory.recordSwap(action.origem, action.destino);
                }
                break;
            case 'virar':
                if (action.origem !== undefined) {
                    const pedra = state.mesa[action.origem];
                    if (pedra && !pedra.virada) {
                        this.memory.recordReveal(action.origem, pedra.nome);
                    }
                    else if (pedra) {
                        this.memory.recordHide(action.origem);
                    }
                }
                break;
            case 'peek':
                // Oponente espiou uma pedra
                if (action.origem !== undefined && action.jogador !== 'Bot') {
                    this.memory.recordPlayerPeek(action.origem);
                }
                break;
            case 'turn_end':
                this.memory.nextTurn(state);
                Logger.ai(`[Bot] Fim de turno. Memória: ${this.memory.getDebugState()}`);
                break;
        }
    }
    /**
     * Atualiza memória diretamente
     */
    updateMemory(slot, nome, confianca) {
        this.memory.recordPlacement(slot, nome);
    }
    /**
     * Retorna frase do bot (simplificado)
     */
    getChatter(event) {
        const phrases = {
            win_point: ["Interessante.", "Hmm.", "Bom jogo."],
            lose_point: ["Bem jogado.", "Impressionante.", "Não esperava isso."],
            challenge: ["Vamos ver...", "Prove.", "Mostre-me."],
            boast: ["Verdade?", "Curioso...", "Veremos."]
        };
        const options = phrases[event] || phrases.win_point;
        return options[Math.floor(Math.random() * options.length)];
    }
    /**
     * Debug stats
     */
    getDebugStats() {
        return `Memória: ${this.memory.getDebugState()}`;
    }
    // =========================
    // LÓGICA INTERNA
    // =========================
    /**
     * Lista todas as jogadas válidas
     */
    getValidMoves(state) {
        const moves = [];
        const mesa = state.mesa;
        // 1. PLACE - Colocar pedra em slot adjacente vazio
        const placeSlots = this.getAdjacentEmptySlots(mesa);
        const usedStones = mesa.filter(p => p).length;
        if (usedStones < 7) { // Ainda tem pedras pra colocar
            placeSlots.forEach(slot => {
                moves.push({ type: 'place', target: slot });
            });
        }
        // 2. FLIP - Virar qualquer pedra na mesa
        mesa.forEach((pedra, idx) => {
            if (pedra) {
                moves.push({ type: 'flip', target: idx });
            }
        });
        // 3. SWAP - Trocar duas pedras adjacentes
        for (let i = 0; i < 6; i++) {
            if (mesa[i] && mesa[i + 1]) {
                moves.push({ type: 'swap', targets: { from: i, to: i + 1 } });
            }
        }
        // 4. PEEK - Espiar pedra virada (escondida)
        mesa.forEach((pedra, idx) => {
            if (pedra && pedra.virada) {
                moves.push({ type: 'peek', target: idx });
            }
        });
        // 5. CHALLENGE - Desafiar pedra virada
        mesa.forEach((pedra, idx) => {
            if (pedra && pedra.virada) {
                moves.push({ type: 'challenge', target: idx });
            }
        });
        // 6. BOAST - Segabar (sempre disponível se tem 3+ pedras)
        if (usedStones >= 3) {
            moves.push({ type: 'boast' });
        }
        return moves;
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
    /**
     * Pontua uma jogada (maior = melhor)
     */
    scoreMove(move, state) {
        switch (move.type) {
            case 'place':
                return this.scorePlace(move.target, state);
            case 'flip':
                return this.scoreFlip(move.target, state);
            case 'swap':
                return this.scoreSwap(move.targets.from, move.targets.to, state);
            case 'peek':
                return this.scorePeek(move.target, state);
            case 'challenge':
                return this.scoreChallenge(move.target, state);
            case 'boast':
                return this.scoreBoast(state);
            default:
                return 0;
        }
    }
    // ==========================
    // HELPERS DE ESTADO DO BOARD
    // ==========================
    /** Índices das pedras viradas para baixo (ocultas) na mesa */
    getHiddenSlots(state) {
        return state.mesa
            .map((p, i) => ({ p, i }))
            .filter(({ p }) => p && p.virada)
            .map(({ i }) => i);
    }
    // ==========================
    // SCORING INDIVIDUAL
    // ==========================
    scorePlace(slot, state) {
        // Preferir centro e slots adjacentes ocupados
        let score = 30;
        if (slot === 3)
            score += 10;
        if (slot === 2 || slot === 4)
            score += 5;
        return score;
    }
    scoreFlip(slot, state) {
        const pedra = state.mesa[slot];
        if (!pedra)
            return 0;
        // Virar pedra de visível para escondida
        if (!pedra.virada) {
            return 25; // Bom para confundir
        }
        // Virar de escondida para visível
        return 15; // Menos interessante
    }
    scoreSwap(from, to, state) {
        const pFrom = state.mesa[from];
        const pTo = state.mesa[to];
        // REGRA: Trocar duas pedras VISÍVEIS (viradas para CIMA) é inútil —
        // o jogador simplesmente vê a nova posição. Penalizar fortemente.
        if (pFrom && !pFrom.virada && pTo && !pTo.virada) {
            return 2;
        }
        // Trocar envolve ao menos uma pedra oculta → confunde o jogador
        const hiddenCount = this.getHiddenSlots(state).length;
        // Mais pedras ocultas → troca tem mais valor (confusão maior)
        return 12 + hiddenCount * 4;
    }
    scorePeek(slot, state) {
        const confidence = this.memory.getConfidence(slot);
        // REGRA: Se bot já sabe o que está neste slot, espiar é desperdício.
        if (confidence > 0.7)
            return 3;
        // REGRA: Suprimir peek se a média de confiança nas pedras viradas já é alta —
        // o bot já sabe a maioria, não precisa gastar ação espiando.
        const hiddenSlots = this.getHiddenSlots(state);
        const avgConfOnHidden = this.memory.getAverageConfidence(hiddenSlots);
        if (avgConfOnHidden > 0.65)
            return 5; // Bot já sabe o suficiente
        // Slot desconhecido + memória geral fraca → espiar tem alto valor
        return 35;
    }
    scoreChallenge(slot, state) {
        const hiddenSlots = this.getHiddenSlots(state);
        // REGRA: Com menos de 3 pedras viradas é trivial para o jogador adivinhar.
        // Não valer a pena desafiar — suprimir completamente.
        if (hiddenSlots.length < 3)
            return 0;
        // REGRA NOVA: O bot deve desafiar pedras baseando-se especificamente
        // no que ele ACHA que o JOGADOR sabe (usando o PlayerMemory Tracker).
        const botConfidence = this.memory.getConfidence(slot);
        const playerConfidence = this.memory.getPlayerConfidence(slot);
        // Target ideal: bot conhece muito bem a pedra (para acertar caso perca o desafio)
        // MAS o jogador tem baixíssima confiança nela (movida há muito tempo / não viu recente).
        if (playerConfidence > 0.8)
            return 5; // Jogador acabou de olhar pra ela! Muito arriscado desafiar.
        if (playerConfidence < 0.4 && botConfidence > 0.7) {
            // Cenário perfeito: Bot acha que o jogador não sabe, mas bot tem certeza!
            return 60;
        }
        if (playerConfidence < 0.6 && botConfidence > 0.5)
            return 30; // Cenário "Bom"
        return 8; // Ambos não sabem, ou jogador sabe -> arriscado
    }
    scoreBoast(state) {
        const hiddenSlots = this.getHiddenSlots(state);
        const hiddenCount = hiddenSlots.length;
        // REGRA: Com menos de 3 pedras viradas é fácil demais para o jogador
        // contra-segabar (lembra todas). Proibir segabar.
        if (hiddenCount < 3)
            return 0;
        // Avaliar confiança na memória: bot deve segabar apenas quando conhece bem as pedras
        const avgConf = this.memory.getAverageConfidence(hiddenSlots);
        // Muitas pedras viradas + bot conhece bem → bom blefe estratégico
        if (hiddenCount >= 5 && avgConf > 0.6)
            return 45;
        if (hiddenCount >= 5)
            return 28; // Muitas, mas bot não lembra bem
        if (hiddenCount >= 3 && avgConf > 0.7)
            return 35; // Sabe as poucas que há
        return 12; // Arriscado
    }
    /**
     * Retorna lista de pedras visíveis na mesa
     */
    getVisibleStones(state) {
        return state.mesa
            .filter(p => p && !p.virada)
            .map(p => p.nome);
    }
}
// Exportar globalmente
window.BotBrain = BotBrain;
