/**
 * IBotAgent.ts
 * 
 * Contrato universal de comunicação entre o Motor do Jogo e o Cérebro do Bot.
 * Garante tipagem estrita e imutabilidade de contexto para prevenir bugs de fronteira.
 */

import { BotAction, GameState } from "./core/ActionEvaluator.js";
import { SkillLevel } from "./adaptation/SkillLadder.js";

// ==========================================
// 1. CONFIGURAÇÃO (Para calibrar bots de campanha)
// ==========================================
export interface BotAgentConfig {
    profileId: string;           // 'vigilante', 'fantasma', 'apostador', etc.
    skillLevel: SkillLevel;
    errorRate: number;           // Modificador de erro base (0.0 a 1.0)
    memoryDecayRate: number;     // Decaimento de memória por turno (0.0 a 1.0)
    peekPenalty: number;         // Quão punitivo é espiar pedras já conhecidas
    aggressionBias: number;      // Multiplicador de propensão a desafiar/segabar
}

// ==========================================
// 2. CONTEXTO DE DECISÃO (Read-only Snapshot)
// ==========================================
export interface BotContext {
    state: GameState;
    turn: number;
    myIndex: number;
    opponentIndex: number;
    usedGuesses: string[];       // Chutes já utilizados nesta ação (ex: provas múltiplas de Segabar)
    gamePhase: 'opening' | 'midgame' | 'endgame';
}

// ==========================================
// 3. OBSERVAÇÕES (Eventos estritos para memória passiva)
// ==========================================
export type BotObservation =
    | { type: 'placement'; slot: number; stone: string }
    | { type: 'hide'; slot: number }
    | { type: 'swap'; from: number; to: number }
    | { type: 'peek'; slot: number; stone: string }
    | { type: 'reveal'; slot: number; stone: string }
    | { type: 'turn_start'; turn: number }
    | { type: 'turn_end'; turn: number }
    | { type: 'challenge_result'; botWon: boolean };

// ==========================================
// 4. DEBUG UTILS
// ==========================================
export interface DebugSlotData {
    bot: { confianca: number; nome: string } | null;
    ply: { confianca: number } | null;
}

// ==========================================
// 5. O CONTRATO PRINCIPAL
// ==========================================
export interface IBotAgent {
    // Ciclo de Vida
    init(config: BotAgentConfig): void;
    reset(): void;

    // Decisão Proativa (O que fazer no meu turno?)
    decideMove(ctx: BotContext): BotAction | null;

    // Ações Reativas (Como responder a eventos no turno inimigo?)
    predictStone(slot: number, ctx: BotContext): string;
    decideBoastResponse(ctx: BotContext): 'acreditar' | 'duvidar';

    // Percepção (Memória)
    observe(event: BotObservation): void;

    // Diagnósticos
    getDebugUIData(slot: number): DebugSlotData;
    getChatter(event: string): string | null;
}
