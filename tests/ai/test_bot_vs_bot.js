
const { BotBrain, MentalModel, PROFILES } = require('../../src/ai/BotBrain.js');

// Mock Game State
class MockState {
    constructor() {
        this.mesa = Array(7).fill(null);
        this.reserva = [
            { nome: "Coroa" }, { nome: "Espada" }, { nome: "Escudo" },
            { nome: "Bandeira" }, { nome: "Martelo" }, { nome: "Balança" }, { nome: "Cavalo" }
        ];
        this.jogadores = [
            { id: "p1", pontos: 0 },
            { id: "p2", pontos: 0 }
        ];
        this.vez = 0; // 0=Bot1, 1=Bot2
        this.turnCount = 0;
    }
}

function runMatch(p1Profile, p2Profile) {
    const state = new MockState();
    const bot1 = new BotBrain(p1Profile);
    const bot2 = new BotBrain(p2Profile);

    // Override Bot2 to think it is Player 2 (Bot context usually assumes Player 2)
    // Actually BotBrain assumes "I am the Bot". 
    // In Bot vs Bot, both think they are "The Bot" vs "The Human".
    // We need to mirror state for them? Or just be careful.
    // BotBrain.decideMove uses state.vez=1 as "My Turn".
    // So for Bot 1 (Player 0), we need to trick it or adapt it.
    // Simpler: Just ask "What would you do?" passing state where vez=1 (always my turn context).

    let gameOver = false;
    let winner = null;
    let turns = 0;

    while (!gameOver && turns < 200) {
        turns++;
        const activeBot = state.vez === 0 ? bot1 : bot2;
        const opponent = state.vez === 0 ? bot2 : bot1;

        // Context: "It is my turn". 
        // We create a view of state where vez=1 for the active bot ??
        // BotBrain checks: const isBotTurn = state && state.vez === 1;
        // So if we pass state with vez=1, it thinks it's its turn.

        const contextState = JSON.parse(JSON.stringify(state));
        contextState.vez = 1; // Force "My Turn" perspective

        // 1. Decide
        const decision = activeBot.decideMove(contextState);

        // 2. Execute (Update Mock State)
        applyMove(state, decision, activeBot, opponent);

        // 3. Observe
        // Both bots observe the move.
        // Active bot observes its own move.
        // Opponent observes "Player" move.

        // We need to map the action to the perspective.
        // If Bot 1 acted.
        // Bot 1 observes: { player: 'bot', ... }
        // Bot 2 observes: { player: 'human', ... }

        // Simplified Observation for test:
        // just update state.

        // Check Win
        if (state.jogadores[0].pontos >= 3) { winner = "p1"; gameOver = true; }
        if (state.jogadores[1].pontos >= 3) { winner = "p2"; gameOver = true; }

        // Toggle Turn
        state.vez = 1 - state.vez;
    }

    return winner ? winner : "draw";
}

function applyMove(state, decision, actor, opponent) {
    // Simplified Logic
    if (decision.type === 'place') {
        if (decision.target !== -1) {
            // Find stone
            const stoneIdx = state.reserva.findIndex(p => p !== null);
            if (stoneIdx !== -1) {
                state.mesa[decision.target] = state.reserva[stoneIdx];
                state.mesa[decision.target].virada = false;
                state.reserva[stoneIdx] = null;
            }
        }
    }
    // ... complete logic skipped for brevity, focused on compilation and basic flow ...
    // Note: Full logic is complex to mock.
    // For now, this script just verifies BotBrain imports and basic execution without crashing.
}

console.log("--- BOT VS BOT SIMULATION ---");
try {
    const b = new BotBrain('logical');
    console.log("BotBrain instantiated successfully.");
    console.log("Profile:", b.profile.name);
    console.log("Opening Strategy:", b.config.opening);

    const state = new MockState();
    state.vez = 1;
    const decision = b.decideMove(state);
    console.log("Sample Decision (Turn 1):", decision);

    if (decision.type === 'place') {
        console.log("TEST PASSED: Bot made a valid opening move.");
    } else {
        console.warn("TEST WARNING: Bot did not place?", decision);
    }

} catch (e) {
    console.error("TEST FAILED:", e);
    process.exit(1);
}
console.log("--- SIMULATION COMPLETE ---");
