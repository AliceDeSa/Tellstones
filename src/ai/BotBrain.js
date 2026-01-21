
const PROFILES = {
    logical: {
        name: "Lógico",
        // Prioriza certeza e defesa. Desafia o que você esqueceu (peças antigas).
        memory: { retention: 0.95, swapPenalty: 0.3 },
        weights: {
            place: 0.4,
            swap: 0.1,
            challenge: 0.2,
            peek: 0.3 // Alta prioridade em espiar se inseguro
        },
        params: {
            confidenceToPeek: 0.85,
            // Só desafia se razoavelmente seguro que o player não sabe (calculado via tempo)
            // OU se tiver certeza absoluta (segurança).
            challengeStrategy: "oldest_hidden"
        }
    },
    trickster: {
        name: "Trapaceiro",
        // Prioriza caos e ocultação.
        memory: { retention: 0.8, swapPenalty: 0.0 }, // Imune a swap confusion
        weights: {
            place: 0.2,
            swap: 0.5, // Adora trocar
            challenge: 0.15,
            peek: 0.15
        },
        params: {
            preferredHiddenCount: 5,
            challengeStrategy: "chaos" // Desafia peças envolvidas em trocas recentes
        }
    },
    aggressive: {
        name: "Agressivo",
        // Pressão pura, mas agora com memória decente.
        memory: { retention: 0.92, swapPenalty: 0.2 },
        weights: {
            place: 0.3,
            swap: 0.1,
            challenge: 0.6, // Adora desafiar
            peek: 0.0
        },
        params: {
            confidenceToPeek: 0.0,
            challengeStrategy: "pressure_smart" // Desafia com pressão, mas evita suicídio
        }
    }
};

// --- MENTAL MODEL (The "Mind" of the Opponent) ---
class MentalModel {
    constructor() {
        this.playerConfidence = 0.5; // 0.0 (Confused) to 1.0 (Sharp)
        this.playerKnowledge = {}; // What we think the player knows
        this.lastActionTime = Date.now();
        this.actionHistory = [];
    }

    observePlayerAction(action, state) {
        const now = Date.now();
        const delta = (now - this.lastActionTime) / 1000; // Seconds
        this.lastActionTime = now;

        // 1. Analyze Timing (PlayerConfidence)
        // Fast < 1.5s = High Confidence. Slow > 8s = Low Confidence.
        if (action.tipo !== 'turn_end') {
            if (delta < 1.5) this.playerConfidence = Math.min(1.0, this.playerConfidence + 0.1);
            else if (delta > 8.0) this.playerConfidence = Math.max(0.0, this.playerConfidence - 0.2);
            else this.playerConfidence = Math.max(0.0, this.playerConfidence - 0.05); // Valid decay
        }

        // 2. Track Knowledge (What they likely saw)
        if (action.tipo === 'espiar' || action.tipo === 'colocar') {
            const slot = action.origem; // or target
            // Player saw this slot. They know it well now.
            if (slot !== undefined) this.playerKnowledge[slot] = { confidence: 1.0, time: now };
        }

        // Decay Player Knowledge
        Object.keys(this.playerKnowledge).forEach(k => {
            if (Date.now() - this.playerKnowledge[k].time > 45000) { // 45s forgetting curve
                delete this.playerKnowledge[k];
            }
        });
    }

    getPlayerMetric() {
        return { confidence: this.playerConfidence, likelyKnownCount: Object.keys(this.playerKnowledge).length };
    }
}

class BotBrain {
    constructor(profileName = "logical") {
        this.profile = PROFILES[profileName] || PROFILES.logical;
        this.config = this.profile.params;
        this.memory = {}; // Map<slotIndex, {stoneName: string, confidence: number, lastSeen: timestamp}>
        this.mentalModel = new MentalModel(); // NEW: Meta-Reasoning
        this.myActionHistory = []; // Track own moves for combo logic
        console.log(`[BotBrain] Initialized with Personality: ${this.profile.name} (v3.0 Grandmaster)`);
    }

    // --- MEMORY SYSTEM ---

    // --- MEMORY SYSTEM ---

    observe(action, state) {
        // Track Own Actions
        const isBotTurn = state && state.vez === 1;
        const isPlayerTurn = state && state.vez === 0;

        if (action.player === 'bot' || (isBotTurn && action.tipo !== 'turn_end')) {
            this.myActionHistory.push({ type: action.tipo, ...action, time: Date.now() });
            if (this.myActionHistory.length > 10) this.myActionHistory.shift();
        }

        // Pass to Mental Model
        if (action.player === 'human' || (isPlayerTurn && action.tipo !== 'turn_end')) {
            if (this.mentalModel) this.mentalModel.observePlayerAction(action, state);
        }

        if (action.tipo === 'turn_end') {
            this.decayMemory(state); // Pass state for context
            this.applyInference(state);
            if (state && state.mesa) {
                state.mesa.forEach((p, i) => {
                    if (p && !p.virada) {
                        this.updateMemory(i, p.nome, 1.0);
                    }
                });
            }
            return;
        }

        if (action.tipo === 'colocar' || action.tipo === 'virar' || action.tipo === 'espiar' || action.tipo === 'revelar') {
            const slot = action.origem;
            let stoneName = action.pedra ? action.pedra.nome : null;
            if (!stoneName && state && state.mesa[slot]) {
                stoneName = state.mesa[slot].nome;
            }
            if (stoneName && slot !== undefined) {
                this.updateMemory(slot, stoneName, 1.0);

                if (action.tipo === 'revelar' || (action.tipo === 'colocar' && state.mesa[slot] && !state.mesa[slot].virada)) {
                    if (this.mentalModel) {
                        this.mentalModel.playerKnowledge[slot] = { confidence: 1.0, time: Date.now() };
                    }
                }
            }
        } else if (action.tipo === 'trocar') {
            const idxA = action.origem;
            const idxB = action.destino;
            const memA = this.memory[idxA] ? { ...this.memory[idxA] } : null;
            const memB = this.memory[idxB] ? { ...this.memory[idxB] } : null;

            if (memA) this.memory[idxB] = memA;
            else delete this.memory[idxB];

            if (memB) this.memory[idxA] = memB;
            else delete this.memory[idxA];

            // Penalty Logic
            let drop = 1.0 - this.profile.memory.swapPenalty;

            // Extra Penalty if swapping Hidden Stones (Confusion)
            const isHiddenA = state && state.mesa[idxA] && state.mesa[idxA].virada;
            const isHiddenB = state && state.mesa[idxB] && state.mesa[idxB].virada;

            if (isHiddenA && isHiddenB) {
                drop *= 0.6; // Heavy confusion penalty
            }

            if (this.memory[idxA]) this.memory[idxA].confidence *= drop;
            if (this.memory[idxB]) this.memory[idxB].confidence *= drop;
        }
    }

    decayMemory(state) {
        let retention = this.profile.memory.retention;

        // Contextual Decay: More hidden stones = faster decay
        // Count hidden from state if possible, else estimation
        let hiddenCount = 0;
        if (state && state.mesa) {
            hiddenCount = state.mesa.filter(p => p && p.virada).length;
        } else {
            hiddenCount = Object.keys(this.memory).length; // Fallback
        }

        // Dynamic Decay: -2% per hidden stone
        retention -= (hiddenCount * 0.02);
        if (retention < 0.5) retention = 0.5; // Floor

        Object.keys(this.memory).forEach(slot => {
            const mem = this.memory[slot];
            if (!mem) return;

            const age = Date.now() - mem.lastSeen;
            const agePenalty = age > 30000 ? 0.9 : 1.0;

            mem.confidence *= (retention * agePenalty);

            if (mem.confidence <= 0.1) {
                delete this.memory[slot];
            }
        });
    }

    // --- INFERENCE ENGINE ---
    applyInference(state) {
        // Sherlock Holmes Logic: "When you have eliminated the impossible..."
        const allStones = ["Coroa", "Espada", "Escudo", "Bandeira", "Martelo", "Balança", "Cavalo"];
        const knownStones = new Set();
        const unknownSlots = [];

        // 1. Gather what we KNOW
        state.mesa.forEach((p, i) => {
            if (p) {
                if (!p.virada) knownStones.add(p.nome); // Visible
                else if (this.memory[i] && this.memory[i].confidence > 0.8) knownStones.add(this.memory[i].stoneName); // Remembered
                else unknownSlots.push(i);
            }
        });

        // Add Hand/Reserve to known
        if (state.reserva) state.reserva.forEach(p => { if (p) knownStones.add(p.nome); });

        // 2. Determine what remains
        const remainingStones = allStones.filter(s => !knownStones.has(s));

        // 3. Deduction
        // If remaining stones == unknown slots, we KNOW them (if we map 1-to-1? No, we just know the set).
        // BUT, if only 1 unknown slot remains, and 1 stone remains... WE KNOW IT!
        if (remainingStones.length === 1 && unknownSlots.length === 1) {
            const slot = unknownSlots[0];
            const stone = remainingStones[0];
            console.log(`[BotBrain] Inference: Slot ${slot} MUST be ${stone}`);
            this.updateMemory(slot, stone, 0.95); // High confidence deduction
        }
    }

    updateMemory(slot, name, confidence) {
        this.memory[slot] = {
            stoneName: name,
            confidence: confidence,
            lastSeen: Date.now()
        };
    }

    // --- CHATTER SYSTEM ---
    getChatter(event, context) {
        // Context can track: 'winning' (score), 'confused' (time), 'bluff'
        const profile = this.profile.name;
        const playerMetric = this.mentalModel.getPlayerMetric();

        const msgs = {
            'challenge_start': {
                'Lógico': ["Analisando probabilidades...", "Isso parece imprudente.", "Detectei uma falha no sseu raciocínio."],
                'Trapaceiro': ["Certeza absoluta?", "Aposto que você piscou.", "Ei, olhe pra cá!", "Será que troquei?"],
                'Agressivo': ["ERROU!", "Você não aguenta a pressão!", "Duvido que saiba!"]
            },
            'boast_start': {
                'Lógico': ["Minha memória é perfeita.", "O resultado é inevitável.", "Vitória calculada."],
                'Trapaceiro': ["Sou intocável!", "Tente a sorte!", "Nada nessa manga..."],
                'Agressivo': ["Já ganhei!", "Desista enquanto pode!", "Esmagado!"]
            },
            'winning': {
                'Lógico': ["Previsível.", "Eficiência de 100%.", "Correção aplicada."],
                'Trapaceiro': ["Oops!", "Caiu no truque?", "Tava na sua cara!", "Hehehe."],
                'Agressivo': ["FÁCIL!", "Destruído!", "Quem é o mestre?!"]
            },
            'losing': {
                'Lógico': ["Recalculando...", "Amostra insuficiente.", "Interessante..."],
                'Trapaceiro': ["Você trapaceou!", "Sorte de principiante!", "Isso não vale!"],
                'Agressivo': ["Impossível!", "Vou me vingar!", "Grrr!"]
            },
            // NEW: Reacting to Player's Mental State
            'player_slow': {
                'Lógico': ["Sua latência mental está alta.", "Precisa de ajuda?"],
                'Trapaceiro': ["Esqueceu, né?", "O tempo tá passando...", "Tic tac."],
                'Agressivo': ["Que demora!", "Dorme não!", "Acorda!"]
            },
            'signature_audit': {
                'Lógico': ["Auditoria completa.", "Verificando integridade."],
                'Trapaceiro': ["Só conferindo..."],
                'Agressivo': ["O que é isso aqui?"]
            }
        };

        // Inject Dynamic Lines based on Mental Model
        if (playerMetric.confidence < 0.3 && Math.random() > 0.6) {
            const slowLines = msgs['player_slow'][profile];
            if (slowLines) return slowLines[Math.floor(Math.random() * slowLines.length)];
        }

        const list = msgs[event] ? msgs[event][profile] : null;
        if (list && list.length > 0) {
            return list[Math.floor(Math.random() * list.length)];
        }
        return null;
    }

    decideMove(state) {
        if (!state || !state.mesa) {
            console.error("[BotBrain] Invalid state passed to decideMove");
            return { type: 'pass' };
        }

        const hiddenStones = state.mesa.filter(p => p && p.virada).length;
        const visibleStones = state.mesa.filter(p => p && !p.virada).length;
        const handStones = state.reserva && state.reserva.some(p => p !== null);

        // Score Context
        const myScore = state.jogadores.find(j => j.id === 'p2')?.pontos || 0;
        const oppScore = state.jogadores.find(j => j.id === 'p1')?.pontos || 0;
        const isDesperate = (oppScore >= 2);

        const actions = {
            place: 0, swap: 0, flip: 0, challenge: 0, peek: 0, boast: 0, pass: 0
        };

        Object.assign(actions, this.profile.weights);

        // Signature Check
        const signatureMove = this.checkSignatureMove(state);
        if (signatureMove) return signatureMove;

        // State Constraints
        if (!handStones) actions.place = 0;
        if (visibleStones === 0) actions.flip = 0;

        // --- NEW LOGIC: CONSTRAINT ON LOW HIDDEN COUNT ---
        if (hiddenStones <= 2) {
            // User Request: "bot nao deve desafiar se ouver 2 pedras ou menos viradas"
            actions.challenge = 0;
            actions.boast = 0;

            // If few hidden, try to hide more (Flip) or Swap
            if (visibleStones > 0) actions.flip += 0.3;
        }

        // Desperation Override
        if (isDesperate && hiddenStones > 2) {
            actions.challenge += 0.4;
            actions.boast += 0.2;
        }

        // Logic Profile: Peek more if unsure
        if (this.profile.name === "Lógico") {
            const unsure = this.findUnsureHiddenStone(state);
            if (unsure !== -1) actions.peek += 0.5;
        }

        // Peek Recovery Strategy
        // "quanto mais pedras viradas que o bot nao tem memoria sobre ele busca espiar"
        let unknownHidden = 0;
        state.mesa.forEach((p, i) => {
            if (p && p.virada) {
                const mem = this.memory[i];
                if (!mem || mem.confidence < 0.4) unknownHidden++;
            }
        });

        if (unknownHidden > 1) {
            actions.peek += (unknownHidden * 0.2); // Significant boost to recover memory
        }

        // Selection
        const selectedType = this.weightedRandom(actions);
        const decision = { type: selectedType };

        // Targets
        if (selectedType === 'place') decision.target = this.choosePlaceTarget(state);
        else if (selectedType === 'swap') decision.targets = this.chooseSwapTargets(state);
        else if (selectedType === 'flip') decision.target = this.chooseFlipTarget(state);
        else if (selectedType === 'peek') decision.target = this.choosePeekTarget(state);
        else if (selectedType === 'challenge') decision.target = this.chooseChallengeTarget(state);
        else if (selectedType === 'boast') { /* No target needed */ }

        return decision;
    }

    // --- TARGET SELECTION STRATEGIES ---

    choosePlaceTarget(state) {
        // Find all valid empty slots
        const validSlots = [];
        state.mesa.forEach((p, i) => {
            if (p === null) validSlots.push(i);
        });

        if (validSlots.length === 0) return -1;

        // Strategy: Random for now
        return validSlots[Math.floor(Math.random() * validSlots.length)];
    }

    chooseSwapTargets(state) {
        // Default: Random valid swap
        const indices = state.mesa.map((p, i) => p ? i : -1).filter(i => i !== -1);
        if (indices.length < 2) return null;

        // Strategy: 
        // Let's try to swap a "Known/Visible" stone with a "Hidden" one to confuse opponent.
        const visible = indices.filter(i => state.mesa[i] && !state.mesa[i].virada);
        const hidden = indices.filter(i => state.mesa[i] && state.mesa[i].virada);

        let idxA, idxB;

        if (visible.length > 0 && hidden.length > 0 && Math.random() > 0.3) {
            // Swap visible with hidden (Common tactic)
            idxA = visible[Math.floor(Math.random() * visible.length)];
            idxB = hidden[Math.floor(Math.random() * hidden.length)];
        } else {
            // Random pair
            idxA = indices[Math.floor(Math.random() * indices.length)];
            idxB = indices[Math.floor(Math.random() * indices.length)];
            while (idxA === idxB) {
                idxB = indices[Math.floor(Math.random() * indices.length)];
            }
        }
        return { from: idxA, to: idxB };
    }

    chooseFlipTarget(state) {
        const visibleIndices = state.mesa.map((p, i) => (p && !p.virada) ? i : -1).filter(i => i !== -1);
        if (visibleIndices.length === 0) return -1;

        // Strategy: Random acts of hiding.
        return visibleIndices[Math.floor(Math.random() * visibleIndices.length)];
    }

    choosePeekTarget(state) {
        // Prioritize stones with low confidence
        const unsureIdx = this.findUnsureHiddenStone(state);
        if (unsureIdx !== -1) return unsureIdx;

        // Fallback: Random hidden
        const hiddenIndices = state.mesa.map((p, i) => (p && p.virada) ? i : -1).filter(i => i !== -1);
        if (hiddenIndices.length > 0) return hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];

        return -1;
    }

    chooseChallengeTarget(state) {
        const hiddenIndices = state.mesa.map((p, i) => (p && p.virada) ? i : -1).filter(i => i !== -1);
        if (hiddenIndices.length === 0) return -1;

        // Filter Recent (Don't challenge stones just flipped/interacted < 10s)
        const candidates = hiddenIndices.filter(idx => {
            // Look in memory or action history for recent interaction?
            // Memory 'lastSeen' is updated on interaction.
            const mem = this.memory[idx];
            if (mem && (Date.now() - mem.lastSeen < 10000)) return false;
            return true;
        });

        const pool = candidates.length > 0 ? candidates : hiddenIndices;

        if (this.config.challengeStrategy === "oldest_hidden") {
            return this.findOldestHidden(pool, state);
        }

        // Default Random from pool
        return pool[Math.floor(Math.random() * pool.length)];
    }

    decideBoastResponse(state) {
        const avgConf = this.calculateAverageHiddenConfidence(state);
        const hiddenCount = state.mesa.filter(p => p && p.virada).length;

        // User Request: "o bot nao deve aceitrar duvidar de desafio se tiver 2 ou menos pedras viradas."
        // Meaning: If <= 2 hidden, do NOT Doubt (because Player likely knows).
        // So, Acreditar.
        if (hiddenCount <= 2) {
            return "acreditar";
        }

        if (this.config.challengeStrategy === 'blind') return "duvidar";
        if (this.config.challengeStrategy === 'chaos') return Math.random() < 0.5 ? "duvidar" : "acreditar";

        if (avgConf < 0.4) return "acreditar";
        if (avgConf > 0.85) return "segabar_tambem";
        return "duvidar";
    }

    predictStone(slotIdx) {
        // DEFENSE: Relies purely on Memory
        const mem = this.memory[slotIdx];
        const confidence = mem ? mem.confidence : 0;

        if (confidence >= 0.7) return mem.stoneName;

        // Elimination fallback
        const guess = this.guessByElimination(slotIdx);
        // If confidence is modest (0.4 - 0.7), maybe prioritize memory over elimination?
        if (confidence > 0.4 && Math.random() < confidence) return mem.stoneName;

        return guess;
    }

    // --- SIGNATURE MOVES ---
    checkSignatureMove(state) {
        const profile = this.profile.name;

        // 1. "The Audit" (Logical)
        // If I'm confident about most stones (>4), ensuring the last few are known is critical.
        if (profile === 'Lógico') {
            const knownCount = Object.values(this.memory).filter(m => m.confidence > 0.9).length;
            if (knownCount >= 4) {
                const unsure = this.findUnsureHiddenStone(state);
                if (unsure !== -1) return { type: 'peek', target: unsure, signature: "The Audit" };
            }
        }

        // 2. "The Bait" (Aggressive)
        // If I just placed a stone, and it's visible, Flip it immediately to provoke.
        if (profile === 'Agressivo') {
            const lastAction = this.myActionHistory[this.myActionHistory.length - 1];
            if (lastAction && lastAction.type === 'colocar') {
                // Check if it's still visible
                const slot = lastAction.origem; // 'origem' is target slot for 'colocar' in local formatting? verify. 
                // Actually action observer format might vary. Assuming 'origem' holds the slot index.
                if (state.mesa[slot] && !state.mesa[slot].virada) {
                    return { type: 'flip', target: slot, signature: "The Bait" };
                }
            }
        }

        // 3. "Chaotic Chain" (Trickster)
        // If I just swapped A-B, swap B-C now.
        if (profile === 'Trapaceiro') {
            const lastAction = this.myActionHistory[this.myActionHistory.length - 1];
            if (lastAction && lastAction.type === 'trocar') {
                // Swap one of them with a random third
                const pivot = Math.random() < 0.5 ? lastAction.origem : lastAction.destino;
                const others = state.mesa.map((p, i) => i).filter(i => i !== lastAction.origem && i !== lastAction.destino);
                if (others.length > 0) {
                    const target = others[Math.floor(Math.random() * others.length)];
                    return { type: 'trocar', targets: { from: pivot, to: target }, signature: "Chaotic Chain" };
                }
            }
        }

        return null; // No signature move triggered
    }

    // --- HELPERS ---

    findUnsureHiddenStone(state) {
        const hiddenIndices = state.mesa.map((p, i) => (p && p.virada) ? i : -1).filter(i => i !== -1);
        for (let idx of hiddenIndices) {
            const mem = this.memory[idx];
            // If undefined or low confidence
            if (!mem || mem.confidence < this.config.confidenceToPeek) return idx;
        }
        return -1;
    }

    findOldestHidden(indices, state) {
        // Sort by lastSeen (ascending = oldest first)
        // If not in memory, it's effective lastSeen = 0 (infinite old)
        const sorted = indices.sort((a, b) => {
            const lastA = this.memory[a] ? this.memory[a].lastSeen : 0;
            const lastB = this.memory[b] ? this.memory[b].lastSeen : 0;
            return lastA - lastB;
        });
        return sorted[0];
    }

    guessByElimination(targetSlot) {
        const estado = window.estadoJogo;
        if (!estado || !estado.mesa) return "Coroa";

        const allStones = ["Coroa", "Espada", "Escudo", "Bandeira", "Martelo", "Balança", "Cavalo"];
        const impossible = new Set();

        estado.mesa.forEach((p, i) => {
            if (p && !p.virada && i !== targetSlot) impossible.add(p.nome);
        });
        estado.reserva.forEach(p => { if (p) impossible.add(p.nome); });

        Object.keys(this.memory).forEach(idxStr => {
            const idx = parseInt(idxStr);
            if (idx !== targetSlot && this.memory[idx] && this.memory[idx].confidence > 0.9) {
                impossible.add(this.memory[idx].stoneName);
            }
        });

        const candidates = allStones.filter(s => !impossible.has(s));
        return candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)]
            : allStones[Math.floor(Math.random() * allStones.length)];
    }

    calculateAverageHiddenConfidence(state) {
        let total = 0;
        let count = 0;
        state.mesa.forEach((p, i) => {
            if (p && p.virada) {
                count++;
                const mem = this.memory[i];
                total += (mem ? mem.confidence : 0);
            }
        });
        return count === 0 ? 0 : total / count;
    }

    getDebugStats() {
        const memoryCount = Object.keys(this.memory).length;
        const confidences = Object.values(this.memory).map(m => m.confidence.toFixed(2)).join(', ');
        const playerModel = this.mentalModel ? `PlayerConf=${this.mentalModel.playerConfidence.toFixed(2)}` : "N/A";
        return `Mem: ${memoryCount} stones [${confidences}] | ${playerModel}`;
    }

    weightedRandom(weightsObj) {
        let sum = 0;
        const keys = Object.keys(weightsObj);
        for (let k of keys) sum += weightsObj[k];

        let rand = Math.random() * sum;
        for (let k of keys) {
            if (rand < weightsObj[k]) return k;
            rand -= weightsObj[k];
        }
        return keys[0];
    }
}
// Export for Node/Jest environment
if (typeof module !== 'undefined' && module.exports) {
    // Mock window.estadoJogo in tests or handle it
    module.exports = { BotBrain, MentalModel, PROFILES };
} else {
    // Browser
    window.BotBrain = BotBrain;
}
