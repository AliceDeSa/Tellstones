// =========================
// DummyBot - Bot Simples para Testes (Compilado)
// =========================

import { Logger } from "../utils/Logger.js";

export class DummyBot {
    constructor(profile = "dummy") {
        this.profile = {
            name: "Dummy",
            description: "Bot de teste - jogadas aleatórias"
        };

        this.memory = {
            getSlotMemory: () => null
        };

        Logger.ai("DummyBot inicializado (sem IA complexa)");
    }

    decideMove(state) {
        const validMoves = this.getValidMoves(state);

        if (validMoves.length === 0) {
            Logger.warn("[DummyBot] Nenhuma jogada válida!");
            return { type: 'place', target: 2 };
        }

        const move = validMoves[Math.floor(Math.random() * validMoves.length)];
        Logger.ai(`[DummyBot] Decidiu: ${move.type} (aleatório)`);
        return move;
    }

    calculateThinkTime(state, decision) {
        return 1000;
    }

    observe(action, state) {
        // Dummy não aprende
    }

    updateMemory(slot, name, confidence) {
        // Dummy não tem memória
    }

    predictStone(slot, state) {
        const stones = ['Espada', 'Escudo', 'Coroa', 'Martelo', 'Bandeira', 'Balança', 'Cavalo'];
        return stones[Math.floor(Math.random() * stones.length)];
    }

    decideBoastResponse(state) {
        const options = ['acreditar', 'duvidar'];
        return options[Math.floor(Math.random() * options.length)];
    }

    getChatter(event) {
        const phrases = ["Hmm...", "Interessante.", "Vamos ver.", "Certo."];
        return phrases[Math.floor(Math.random() * phrases.length)];
    }

    getDebugStats() {
        return "DummyBot (sem stats)";
    }

    getValidMoves(state) {
        const moves = [];

        // PLACE
        const placeSlots = this.getValidPlaceSlots(state.mesa);
        placeSlots.forEach(slot => {
            moves.push({ type: 'place', target: slot });
        });

        // FLIP
        state.mesa.forEach((pedra, idx) => {
            if (pedra && !pedra.virada) {
                moves.push({ type: 'flip', target: idx });
            }
        });

        // SWAP
        for (let i = 0; i < 7; i++) {
            if (state.mesa[i] && state.mesa[i + 1]) {
                moves.push({ type: 'swap', targets: { from: i, to: i + 1 } });
            }
        }

        // PEEK
        state.mesa.forEach((pedra, idx) => {
            if (pedra && pedra.virada) {
                moves.push({ type: 'peek', target: idx });
            }
        });

        return moves;
    }

    getValidPlaceSlots(mesa) {
        const valid = [];

        for (let i = 0; i < 7; i++) {
            if (mesa[i]) continue;

            const leftOccupied = i > 0 && mesa[i - 1];
            const rightOccupied = i < 6 && mesa[i + 1];
            const centerOccupied = mesa[3];

            if (i === 3) {
                valid.push(i);
            } else if (leftOccupied || rightOccupied || (i === 2 || i === 4) && centerOccupied) {
                valid.push(i);
            }
        }

        return valid;
    }
}

window.DummyBot = DummyBot;
