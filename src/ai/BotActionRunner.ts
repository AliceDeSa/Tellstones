/**
 * BotActionRunner.ts
 * 
 * Máquina de estados formal para o controle estrutural das ações do Bot.
 * Elimina o bug catastrófico de múltiplas ações não mapeadas por turno.
 */

import { Logger, LogCategory } from "../utils/Logger.js";

export enum BotActionState {
    IDLE = 'IDLE',               // Aguardando turno do Bot
    DECIDING = 'DECIDING',       // Calculando a jogada
    VALIDATING = 'VALIDATING',   // Validando a ação com PvETurnManager
    EXECUTING = 'EXECUTING',     // Executando ação
    RESPONDING = 'RESPONDING',   // Reação (ex: Segabar/Boast de oponente)
    DONE = 'DONE'                // Ação acabada, solicitando passar o turno
}

// Transições arquiteturais estritas permitidas:
const VALID_TRANSITIONS: Record<BotActionState, BotActionState[]> = {
    [BotActionState.IDLE]: [BotActionState.DECIDING, BotActionState.RESPONDING],
    [BotActionState.DECIDING]: [BotActionState.VALIDATING, BotActionState.IDLE], // IDLE on fallback
    [BotActionState.VALIDATING]: [BotActionState.EXECUTING, BotActionState.IDLE], // IDLE se Ação Inválida
    [BotActionState.EXECUTING]: [BotActionState.DONE, BotActionState.IDLE],       // IDLE em erro crasso
    [BotActionState.RESPONDING]: [BotActionState.IDLE],                           // Volta pro IDLE ao finalizar resposta
    [BotActionState.DONE]: [BotActionState.IDLE]                                  // EventBus confirma encerramento
};

export class BotActionRunner {
    private state: BotActionState = BotActionState.IDLE;

    constructor() {
        Logger.ai(`[BotActionRunner] Máquina de Estados de Arquitetura Inicializada no estado ${this.state}`);
    }

    /**
     * Muta o estado de forma controlada via pipe de transição arquitetural.
     */
    public transition(nextState: BotActionState): boolean {
        if (!VALID_TRANSITIONS[this.state].includes(nextState)) {
            Logger.error(LogCategory.AI, `[BotActionRunner] TRANSIÇÃO BLOQUEADA (Violação): ${this.state} -> ${nextState}. Fluxo abortado preventivamente.`);
            return false;
        }

        Logger.ai(`[BotActionRunner] State Flow: ${this.state} -> ${nextState}`);
        this.state = nextState;
        return true;
    }

    /**
     * Confirmação segura de que a IA não está fazendo algo ativamente.
     */
    public is(state: BotActionState): boolean {
        return this.state === state;
    }

    public getState(): BotActionState {
        return this.state;
    }

    public isThinking(): boolean {
        return this.state !== BotActionState.IDLE;
    }

    /**
     * Reset de emergência do Workflow
     */
    public forceReset(): void {
        Logger.warn(LogCategory.AI, `[BotActionRunner] Force Reset executado.`);
        this.state = BotActionState.IDLE;
    }
}
