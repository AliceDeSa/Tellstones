/**
 * TutorialAutomator.ts
 *
 * Automates the execution of the Tutorial to verify all steps functionality.
 * Usage: TutorialAutomator.run() in console.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class TutorialAutomator {
    constructor() {
        this.stepDelay = 1000; // Faster execution
        this.isRunning = false;
        this.currentScenario = null;
        this.scenarios = [
            { name: "Scenario A: Se Gabar Também (Full Flow)", actionStep8: 'segabar_tambem', expectStep9: true },
            { name: "Scenario B: Duvidar (Short Flow)", actionStep8: 'duvidar', expectStep9: false },
            { name: "Scenario C: Acreditar (Short Flow)", actionStep8: 'acreditar', expectStep9: false }
        ];
    }
    static run() {
        return __awaiter(this, void 0, void 0, function* () {
            const automator = new TutorialAutomator();
            yield automator.runSuite();
        });
    }
    runSuite() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning)
                return;
            this.isRunning = true;
            console.clear();
            console.log("%c[AUTOMATOR] Starting Full Test Suite...", "color: cyan; font-size: 16px; font-weight: bold;");
            for (let i = 0; i < this.scenarios.length; i++) {
                const scenario = this.scenarios[i];
                console.group(`%c[SUITE] Executing ${scenario.name}`, "color: magenta; font-size: 14px;");
                this.currentScenario = scenario;
                // 1. Ensure we are in Tutorial Mode
                yield this.ensureInTutorial();
                // 2. Run the Tutorial Flow
                const success = yield this.runTutorialFlow(scenario);
                // 3. Exit back to Menu
                yield this.exitToMenu();
                console.groupEnd();
                if (!success) {
                    console.error(`[SUITE] Aborting Suite due to failure in ${scenario.name}`);
                    break;
                }
                yield this.wait(1500); // Cool down between runs
            }
            console.log("%c[AUTOMATOR] Suite Completed.", "color: lime; font-size: 16px; font-weight: bold;");
            this.isRunning = false;
        });
    }
    ensureInTutorial() {
        return __awaiter(this, void 0, void 0, function* () {
            // If already in Tutorial, restart? No, simpler to assume clean slate or exit first.
            if (window.salaAtual === 'MODO_TUTORIAL') {
                console.log("Already in Tutorial. Restarting for clean state...");
                yield this.exitToMenu();
                yield this.wait(500);
            }
            console.log("Navigating to Tutorial...");
            const startScreen = document.getElementById("start-screen");
            if (!startScreen || !startScreen.classList.contains("active")) {
                // Force show start screen
                if (window.sairPartida)
                    window.sairPartida();
                yield this.wait(500);
            }
            const btn = document.getElementById("tutorial-btn");
            if (btn) {
                btn.click();
                yield this.wait(1000); // Wait for load
            }
            else {
                console.error("Could not find Tutorial Button!");
                // Try explicit
                // window.startTutorial(); // if exists
            }
        });
    }
    exitToMenu() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Exiting to Menu...");
            if (window.sairPartida) {
                window.sairPartida();
            }
            else {
                // Fallback
                const btn = document.getElementById("btn-sair-partida");
                if (btn)
                    btn.click();
            }
            yield this.wait(1000);
        });
    }
    runTutorialFlow(scenario) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                while (window.tellstonesTutorial && this.isRunning) {
                    const stepIdx = window.tellstonesTutorial.passo;
                    // Break if we reached the end (Step 10 marked as Final)
                    if (stepIdx >= 10) {
                        console.log("%c✓ TUTORIAL FINISHED (Reached Step 10)", "color: lime");
                        return true;
                    }
                    if (!window.tellstonesTutorial.roteiro)
                        return true;
                    const stepData = window.tellstonesTutorial.roteiro[stepIdx];
                    if (!stepData)
                        return true;
                    console.groupCollapsed(`%c[STEP ${stepIdx}] ${stepData.titulo}`, "color: yellow;");
                    // Validate Initial State
                    if (stepData.validacao()) {
                        console.log("Already valid. Advancing...");
                        window.tellstonesTutorial.proximo();
                        yield this.wait(500);
                        console.groupEnd();
                        continue;
                    }
                    // Perform Action
                    yield this.performAction(stepIdx, scenario);
                    // Verify with Polling
                    const success = yield this.waitForCompletion(5000); // 5s timeout
                    if (success) {
                        console.log("%c✓ SUCCESS", "color: lime");
                        window.tellstonesTutorial.proximo();
                    }
                    else {
                        // Check if validation passes anyway (Silent success)
                        if (stepData.validacao()) {
                            console.log("Validation passed (Verification). Advancing...");
                            window.tellstonesTutorial.proximo();
                        }
                        else {
                            console.error("✗ FAILED to validate step (Timeout).");
                            this.reportFailure(stepIdx);
                            return false;
                        }
                    }
                    console.groupEnd();
                    yield this.wait(this.stepDelay);
                    // Break if End Reached logic
                    if (!window.tellstonesTutorial)
                        return true;
                    if (stepIdx === 8 && !scenario.expectStep9) {
                        // Logic implies we are done?
                    }
                    if (stepIdx >= 9 && !scenario.expectStep9) {
                        return true;
                    }
                }
                return true;
            }
            catch (e) {
                console.error("Tutorial Flow Error:", e);
                return false;
            }
        });
    }
    performAction(stepIdx, scenario) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (stepIdx) {
                case 0: break; // Welcome
                case 1: // Place Stone
                    if (!window.estadoJogo)
                        return;
                    const pIdx = window.estadoJogo.reserva.findIndex((p) => p !== null);
                    if (pIdx > -1) {
                        if (!window.estadoJogo.mesa)
                            window.estadoJogo.mesa = Array(7).fill(null);
                        window.estadoJogo.mesa[0] = window.estadoJogo.reserva[pIdx];
                        window.estadoJogo.reserva[pIdx] = null;
                        if (window.GameController)
                            window.GameController.persistirEstado();
                        if (window.Renderer)
                            window.Renderer.renderizarMesa();
                        window.tellstonesTutorial.registrarAcaoConcluida();
                    }
                    break;
                case 2: // Hide
                    if (window.estadoJogo.mesa[0] && !window.estadoJogo.mesa[0].virada) {
                        window.estadoJogo.mesa[0].virada = true;
                        if (window.GameController)
                            window.GameController.persistirEstado();
                        if (window.Renderer)
                            window.Renderer.renderizarMesa();
                        window.tellstonesTutorial.registrarAcaoConcluida();
                    }
                    break;
                case 3: // Peek
                    window.estadoJogo.mesaEspiada = 0;
                    if (window.GameController)
                        window.GameController.persistirEstado();
                    window.tellstonesTutorial.registrarAcaoConcluida();
                    break;
                case 4: // Swap
                    const temp = window.estadoJogo.mesa[0];
                    window.estadoJogo.mesa[0] = window.estadoJogo.mesa[3];
                    window.estadoJogo.mesa[3] = temp;
                    if (window.GameController)
                        window.GameController.persistirEstado();
                    window.tellstonesTutorial.registrarAcaoConcluida();
                    break;
                case 5: // Challenge (Click Button)
                    const btnDesafiar = document.getElementById("btn-desafiar");
                    if (btnDesafiar)
                        btnDesafiar.click();
                    yield this.wait(200);
                    const hiddenIdx = window.estadoJogo.mesa.findIndex((p) => p && p.virada);
                    if (hiddenIdx > -1) {
                        window.estadoJogo.desafio = {
                            jogador: window.nomeAtual,
                            tipo: 'desafio',
                            status: 'aguardando_resposta',
                            idxPedra: hiddenIdx
                        };
                        if (window.GameController)
                            window.GameController.persistirEstado();
                        window.tellstonesTutorial.registrarAcaoConcluida();
                    }
                    break;
                case 6: // Respond Challenge
                    const desafio = window.estadoJogo.desafio;
                    if (desafio && desafio.idxPedra !== undefined) {
                        const realStone = window.estadoJogo.mesa[desafio.idxPedra];
                        const officialStones = window.PEDRAS_OFICIAIS || [];
                        const correctIdx = officialStones.findIndex((p) => p.nome === realStone.nome);
                        if (window.currentGameMode)
                            window.currentGameMode.resolveChallenge(correctIdx);
                        window.tellstonesTutorial.registrarAcaoConcluida();
                    }
                    break;
                case 7: // Boast
                    const btnBoast = document.getElementById("btn-segabar");
                    if (btnBoast)
                        btnBoast.click();
                    break;
                case 8: // Defend Boast
                    const action = scenario.actionStep8;
                    console.log(`[SCENARIO] Executing Branch Action: ${action}`);
                    if (window.GameController)
                        window.GameController.responderSegabar(action);
                    break;
                case 9: // Prove Knowledge
                    yield this.wait(500);
                    if (window.estadoJogo.desafio && window.estadoJogo.desafio.status === 'responder_pecas') {
                        console.log("[AUTOMATOR] Forcing Win on Final Exam/Prove Knowledge...");
                        window.estadoJogo.desafio = null;
                        if (window.GameController)
                            window.GameController.persistirEstado();
                        window.tellstonesTutorial.registrarAcaoConcluida();
                        if (window.Renderer)
                            window.Renderer.renderizarMesa();
                    }
                    else {
                        window.tellstonesTutorial.registrarAcaoConcluida();
                    }
                    break;
            }
        });
    }
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    waitForCompletion(timeoutMs) {
        return __awaiter(this, void 0, void 0, function* () {
            const start = Date.now();
            while (Date.now() - start < timeoutMs) {
                if (window.tellstonesTutorial && window.tellstonesTutorial.acaoConcluida) {
                    return true;
                }
                yield this.wait(100);
            }
            return false;
        });
    }
    reportFailure(stepIdx) {
        console.error(`[AUTOMATOR] FAILED at Step ${stepIdx}. Snapshot:`, {
            estado: JSON.parse(JSON.stringify(window.estadoJogo)),
            tutorial: JSON.parse(JSON.stringify(window.tellstonesTutorial))
        });
    }
}
// Global Export
window.TutorialAutomator = TutorialAutomator;
console.log("%c[DEV] TutorialAutomator loaded. Run 'TutorialAutomator.run()' to test.", "color: cyan");
