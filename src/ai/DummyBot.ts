// =========================
// DummyBot - Bot Simples para Testes
// =========================
// Bot super simples que faz apenas jogadas aleatórias válidas
// SEM lógica de IA complexa - ideal para testar sistema de turnos

import { Logger } from "../utils/Logger.js";

/**
 * DummyBot - Faz jogadas aleatórias válidas
 * Usa APENAS para testar sistema de turnos
 */
export class DummyBot {
    profile: any;
    memory: any;

    constructor(profile: string = "dummy") {
        this.profile = {
            name: "Dummy",
            description: "Bot de teste - jogadas aleatórias"
        };

        // Memory vazio - não usa
        this.memory = {
            getSlotMemory: () => null
        };

        Logger.ai("DummyBot inicializado (sem IA complexa)");
    }

    // ========================================
    // MÉTODOS REQUERIDOS PELA INTERFACE
    // ========================================

    /**
     * Decide próxima jogada - ALEATÓRIA
     */
    decideMove(state: any): any {
        const validMoves = this.getValidMoves(state);

        if (validMoves.length === 0) {
            Logger.ai("[DummyBot] Nenhuma jogada válida!");
            return { type: 'place', target: 2 }; // Fallback
        }

        // Escolher aleatoriamente
        const move = validMoves[Math.floor(Math.random() * validMoves.length)];
        Logger.ai(`[DummyBot] Decidiu: ${move.type} (aleatório)`);
        return move;
    }

    /**
     * Calcula tempo de pensamento - FIXO
     */
    calculateThinkTime(state: any, decision: any): number {
        return 1000; // 1 segundo fixo
    }

    /**
     * Observa ação - NÃO FAZ NADA
     */
    observe(action: any, state: any): void {
        // Dummy não aprende
    }

    /**
     * Atualiza memória - NÃO FAZ NADA
     */
    updateMemory(slot: number, name: string, confidence: number): void {
        // Dummy não tem memória
    }

    /**
     * Prediz pedra - ALEATÓRIO
     */
    predictStone(slot: number, state?: any): string {
        const stones = ['Espada', 'Escudo', 'Coroa', 'Martelo', 'Bandeira', 'Balança', 'Cavalo'];
        return stones[Math.floor(Math.random() * stones.length)];
    }

    /**
     * Decide resposta ao segabar - ALEATÓRIO
     */
    decideBoastResponse(state: any): string {
        const options = ['acreditar', 'duvidar'];
        return options[Math.floor(Math.random() * options.length)];
    }

    /**
     * Retorna frase - GENÉRICA
     */
    getChatter(event: string): string | null {
        const phrases = [
            "Hmm...",
            "Interessante.",
            "Vamos ver.",
            "Certo."
        ];
        return phrases[Math.floor(Math.random() * phrases.length)];
    }

    /**
     * Debug stats - VAZIO
     */
    getDebugStats(): string {
        return "DummyBot (sem stats)";
    }

    // ========================================
    // LÓGICA DE JOGADAS VÁLIDAS
    // ========================================

    private getValidMoves(state: any): any[] {
        const moves: any[] = [];

        // 1. PLACE - Colocar pedra adjacente
        const placeSlots = this.getValidPlaceSlots(state.mesa);
        placeSlots.forEach(slot => {
            moves.push({ type: 'place', target: slot });
        });

        // 2. FLIP - Virar qualquer pedra não virada
        state.mesa.forEach((pedra: any, idx: number) => {
            if (pedra && !pedra.virada) {
                moves.push({ type: 'flip', target: idx });
            }
        });

        // 3. SWAP - Trocar duas pedras adjacentes
        for (let i = 0; i < 7; i++) {
            if (state.mesa[i] && state.mesa[i + 1]) {
                moves.push({ type: 'swap', targets: { from: i, to: i + 1 } });
            }
        }

        // 4. PEEK - Espiar pedra virada
        state.mesa.forEach((pedra: any, idx: number) => {
            if (pedra && pedra.virada) {
                moves.push({ type: 'peek', target: idx });
            }
        });

        return moves;
    }

    private getValidPlaceSlots(mesa: any[]): number[] {
        const valid: number[] = [];

        for (let i = 0; i < 7; i++) {
            if (mesa[i]) continue; // Já ocupado

            // Verificar se é adjacente a alguma pedra
            const leftOccupied = i > 0 && mesa[i - 1];
            const rightOccupied = i < 6 && mesa[i + 1];
            const centerOccupied = mesa[3]; // Pedra central

            if (i === 3) {
                valid.push(i); // Centro sempre válido se vazio
            } else if (leftOccupied || rightOccupied || (i === 2 || i === 4) && centerOccupied) {
                valid.push(i);
            }
        }

        return valid;
    }
}

// Exportar globalmente
(window as any).DummyBot = DummyBot;
