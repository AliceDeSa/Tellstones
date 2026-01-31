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
        // Primeiro tenta usar memória
        const guess = this.memory.getBestGuess(slot);
        if (guess && this.memory.getConfidence(slot) > 0.5) {
            Logger.ai(`[Bot] Palpite por memória: ${guess} (${Math.round(this.memory.getConfidence(slot) * 100)}%)`);
            return guess;
        }
        // Sem memória - eliminar pedras visíveis
        const visibleStones = this.getVisibleStones(state);
        const possibleStones = PEDRAS.filter(p => !visibleStones.includes(p));
        if (possibleStones.length > 0) {
            const choice = possibleStones[Math.floor(Math.random() * possibleStones.length)];
            Logger.ai(`[Bot] Palpite por eliminação: ${choice}`);
            return choice;
        }
        // Fallback total
        const fallback = PEDRAS[Math.floor(Math.random() * PEDRAS.length)];
        Logger.ai(`[Bot] Palpite aleatório: ${fallback}`);
        return fallback;
    }
    /**
     * Decide resposta a segabar (acreditar ou duvidar)
     */
    decideBoastResponse(state) {
        // Conta pedras escondidas na mesa
        const hiddenCount = state.mesa.filter(p => p && p.virada).length;
        // Mais pedras escondidas = mais chance de duvidar
        const doubtChance = hiddenCount > 4 ? 0.7 :
            hiddenCount > 2 ? 0.5 : 0.3;
        const decision = Math.random() < doubtChance ? 'duvidar' : 'acreditar';
        Logger.ai(`[Bot] Segabar decisão: ${decision} (${hiddenCount} pedras escondidas)`);
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
            case 'turn_end':
                this.memory.nextTurn();
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
        // Trocar é útil quando jogador sabe onde estão as pedras
        const hiddenCount = state.mesa.filter(p => p && p.virada).length;
        return 10 + hiddenCount * 3;
    }
    scorePeek(slot, state) {
        // Valor de espiar depende da confiança na memória
        const confidence = this.memory.getConfidence(slot);
        if (confidence > 0.7)
            return 5; // Já sabe, pouco valor
        return 35; // Não sabe, alto valor
    }
    scoreChallenge(slot, state) {
        // Desafiar é arriscado mas pode ganhar ponto
        const confidence = this.memory.getConfidence(slot);
        if (confidence > 0.8)
            return 50; // Alta confiança = bom desafio
        if (confidence > 0.5)
            return 30;
        return 10; // Baixa confiança = arriscado
    }
    scoreBoast(state) {
        // Segabar é arriscado
        const hiddenCount = state.mesa.filter(p => p && p.virada).length;
        if (hiddenCount >= 5)
            return 40; // Muitas escondidas = pode blefar
        return 15;
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
