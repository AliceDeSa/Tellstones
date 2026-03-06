/**
 * BotActionRunner.ts
 *
 * Máquina de estados formal para o controle estrutural das ações do Bot.
 * Elimina o bug catastrófico de múltiplas ações não mapeadas por turno.
 */
import { Logger, LogCategory } from "../utils/Logger.js";
export var BotActionState;
(function (BotActionState) {
    BotActionState["IDLE"] = "IDLE";
    BotActionState["DECIDING"] = "DECIDING";
    BotActionState["VALIDATING"] = "VALIDATING";
    BotActionState["EXECUTING"] = "EXECUTING";
    BotActionState["RESPONDING"] = "RESPONDING";
    BotActionState["DONE"] = "DONE"; // Ação acabada, solicitando passar o turno
})(BotActionState || (BotActionState = {}));
// Transições arquiteturais estritas permitidas:
const VALID_TRANSITIONS = {
    [BotActionState.IDLE]: [BotActionState.DECIDING, BotActionState.RESPONDING],
    [BotActionState.DECIDING]: [BotActionState.VALIDATING, BotActionState.IDLE], // IDLE on fallback
    [BotActionState.VALIDATING]: [BotActionState.EXECUTING, BotActionState.IDLE], // IDLE se Ação Inválida
    [BotActionState.EXECUTING]: [BotActionState.DONE, BotActionState.IDLE], // IDLE em erro crasso
    [BotActionState.RESPONDING]: [BotActionState.IDLE], // Volta pro IDLE ao finalizar resposta
    [BotActionState.DONE]: [BotActionState.IDLE] // EventBus confirma encerramento
};
export class BotActionRunner {
    constructor() {
        this.state = BotActionState.IDLE;
        Logger.ai(`[BotActionRunner] Máquina de Estados de Arquitetura Inicializada no estado ${this.state}`);
    }
    /**
     * Muta o estado de forma controlada via pipe de transição arquitetural.
     */
    transition(nextState) {
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
    is(state) {
        return this.state === state;
    }
    getState() {
        return this.state;
    }
    isThinking() {
        return this.state !== BotActionState.IDLE;
    }
    /**
     * Reset de emergência do Workflow
     */
    forceReset() {
        Logger.warn(LogCategory.AI, `[BotActionRunner] Force Reset executado.`);
        this.state = BotActionState.IDLE;
    }
}
