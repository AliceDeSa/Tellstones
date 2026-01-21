
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
            this.decayMemory();
            this.applyInference(state); // NEW: Elimination Logic at end of turn
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
                // If it's revealed/placed face up, confidence is 1.0
                // 'virar' usually means Hide (Face Down) -> Verify state.mesa[slot].virada
                // Actually 'observe' receives the action, but state might be post-action.
                // If 'revelar', it is definitely KNOWN.
                this.updateMemory(slot, stoneName, 1.0);

                // If revealed, Player also knows it
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

            // Penalty relies on Personality
            const drop = 1.0 - this.profile.memory.swapPenalty;
            if (this.memory[idxA]) this.memory[idxA].confidence *= drop;
            if (this.memory[idxB]) this.memory[idxB].confidence *= drop;
        }
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

    decayMemory() {
        // Retention factor applied per turn
        let retention = this.profile.memory.retention;

        // Contextual Decay: If many stones are hidden, memory struggles more
        const hiddenCount = Object.keys(this.memory).length;
        if (hiddenCount > 3) retention -= 0.05; // Overloaded

        Object.keys(this.memory).forEach(slot => {
            const mem = this.memory[slot];
            if (!mem) return;

            // Age based decay: Older memories fade faster
            const age = Date.now() - mem.lastSeen;
            const agePenalty = age > 30000 ? 0.9 : 1.0; // Punishment for > 30s old

            mem.confidence *= (retention * agePenalty);

            if (mem.confidence <= 0.1) { // Threshold de esquecimento completo
                delete this.memory[slot];
            }
        });
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

    // --- DECISION MAKING ---

    decideMove(state) {
        if (!state || !state.mesa) {
            console.error("[BotBrain] Invalid state passed to decideMove");
            return { type: 'pass' };
        }

        // --- CONTEXT ANALYSIS ---
        const hiddenStones = state.mesa.filter(p => p && p.virada).length;
        const visibleStones = state.mesa.filter(p => p && !p.virada).length;
        const totalStones = state.mesa.filter(p => p).length;
        const handStones = state.reserva && state.reserva.some(p => p !== null);

        // Dynamic Difficulty: Check Score Variance
        const myScore = state.jogadores.find(j => j.id === 'p2')?.pontos || 0; // Bot
        const oppScore = state.jogadores.find(j => j.id === 'p1')?.pontos || 0; // Human
        const isLosing = (oppScore > myScore);
        const isDesperate = (oppScore >= 2); // Opponent match point

        const actions = {
            place: 0,
            swap: 0,
            flip: 0,
            challenge: 0,
            peek: 0,
            boast: 0,
            pass: 0
        };

        // 1. Assign Base Weights from Profile
        Object.assign(actions, this.profile.weights);

        // 0. SIGNATURE MOVES (High Priority Overrides)
        const signatureMove = this.checkSignatureMove(state);
        if (signatureMove) {
            console.log(`[BotBrain] Executing Signature Move: ${signatureMove.signature}`);
            return signatureMove;
        }

        // 2. Modifiers based on Game State
        if (!handStones) actions.place = 0;
        if (visibleStones === 0) actions.flip = 0;

        // Rules Check
        if (hiddenStones < 1) {
            actions.peek = 0;
            actions.swap = 0; // Can't swap hidden with visible effectively if none hidden? No, swap is valid if 2 total.
            // But usually you swap hidden. If 0 hidden, swap might be allowed but maybe useless for Bot logic?
            // Bot logic 'chooseSwapTargets' expects visible/hidden pairs often.
            // Let's leave swap alone unless < 2 total.
            actions.challenge = 0;
            actions.boast = 0;
        }
        if (hiddenStones < 2) {
            actions.swap *= 0.1; // Reduce swap chance if few hidden
        }

        // --- ADVANCED STRATEGY MODIFIERS ---

        // A. Desperation Mode (If Player is about to win)
        if (isDesperate) {
            actions.challenge += 0.4; // Aggressively try to stop them
            actions.boast += 0.2; // Risky play
            if (this.profile.name === "Trapaceiro") actions.swap += 0.3; // Confuse them
        }

        // B. Winning Assurance (If Bot is winning)
        if (myScore >= 2) {
            actions.boast = 0; // Don't risk boasting if 1 point is enough via challenge
            actions.peek += 0.2; // Play safe, verify info
        }

        // C. Profile Specifics
        if (this.profile.name === "Lógico") {
            const unsure = this.findUnsureHiddenStone(state);
            if (unsure !== -1) {
                actions.peek += 0.5;
            }
        }

        if (this.profile.name === "Trapaceiro") {
            if (visibleStones > 2) actions.flip += 0.4;
            // Blind Bluff: If nothing to do, swap to annoy
            if (actions.place === 0 && actions.challenge < 0.2) actions.swap += 0.3;
        }

        if (this.profile.name === "Agressivo") {
            // Se poucas pedras ocultas, não seja suicida
            if (hiddenStones < 3 && !isDesperate) {
                actions.challenge -= 0.5; // Drastic reduction (0.6 -> 0.1)
                if (actions.challenge < 0) actions.challenge = 0.05;
            }

            // SMART CHECK: Don't challenge if Player likely knows everything
            const hiddenIndices = state.mesa.map((p, i) => (p && p.virada) ? i : -1).filter(i => i !== -1);
            let vulnerableTargets = 0;
            hiddenIndices.forEach(idx => {
                // If Player doesn't know it (not in playerKnowledge), it's a target
                if (!this.mentalModel.playerKnowledge[idx]) vulnerableTargets++;
            });

            if (vulnerableTargets === 0 && !isDesperate) {
                actions.challenge = 0; // Don't suicide if player knows all
            }
        }

        // D. Calculate Confidence for Boasting
        const hiddenIndices = state.mesa.map((p, i) => (p && p.virada) ? i : -1).filter(i => i !== -1);
        if (hiddenIndices.length >= 3) {
            const avgConf = this.calculateAverageHiddenConfidence(state);
            // Verify if we actually know majority
            if (avgConf > 0.9) {
                actions.boast += 0.5; // High confidence boast
            } else if (this.profile.name === "Trapaceiro" && Math.random() < 0.3) {
                actions.boast += 0.4; // Pure Bluff
            }
        }

        // Select Action
        const selectedType = this.weightedRandom(actions);
        const decision = { type: selectedType };

        // Enrich decision with Specific Targets
        if (selectedType === 'place') {
            decision.target = this.choosePlaceTarget(state);
        } else if (selectedType === 'swap') {
            decision.targets = this.chooseSwapTargets(state);
        } else if (selectedType === 'flip') {
            decision.target = this.chooseFlipTarget(state);
        } else if (selectedType === 'peek') {
            decision.target = this.choosePeekTarget(state);
        } else if (selectedType === 'challenge') {
            decision.target = this.chooseChallengeTarget(state);
        }

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

        // Strategy:
        // Random is generally good to avoid patterns.
        // Lógico might prefer filling sequentially or edges first?
        // Let's stick to Random for now to avoid predictability.
        return validSlots[Math.floor(Math.random() * validSlots.length)];
    }

    chooseSwapTargets(state) {
        // Default: Random valid swap
        const indices = state.mesa.map((p, i) => p ? i : -1).filter(i => i !== -1);
        if (indices.length < 2) return null; // Should not happen if filtered before

        // Strategy: 
        // Lógico/Defensivo: Hide a visible stone by swapping it with a hidden one? 
        // Or swap two hidden ones to confuse memory?

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
        // Pick a visible stone to flip face down? Or face up?
        // Game rules: "Virar" usually means Flip Face Down (Hide) if it's up? 
        // Or Flip Face Up (Show) if it's down?
        // Wait, Tellstones standard action 'Place' puts it Face Up. 
        // Then you turn it Face Down ('Virar').
        // You can't turn it Face Up again unless challenged/peeked?
        // Actually, usually you 'Hide' a stone. 
        // Let's assume 'flip' means turning a visible stone to hidden (Face Down).

        const visibleIndices = state.mesa.map((p, i) => (p && !p.virada) ? i : -1).filter(i => i !== -1);
        if (visibleIndices.length === 0) return -1;

        // Strategy: Hide the one I know best? Or the one I want to save?
        // For now, random acts of hiding.
        return visibleIndices[Math.floor(Math.random() * visibleIndices.length)];
    }

    choosePeekTarget(state) {
        // Logic already existed partially in 'findUnsureHiddenStone'
        // Prioritize stones with low confidence
        const unsureIdx = this.findUnsureHiddenStone(state);
        if (unsureIdx !== -1) return unsureIdx;

        // Fallback: Random hidden
        const hiddenIndices = state.mesa.map((p, i) => (p && p.virada) ? i : -1).filter(i => i !== -1);
        if (hiddenIndices.length > 0) return hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];

        return -1;
    }

    // --- DECISION RESPONSE ---

    decideBoastResponse(state) {
        const avgConf = this.calculateAverageHiddenConfidence(state);

        // 1. Agressivo: Duvida quase sempre (Pressiona para provar)
        if (this.config.challengeStrategy === 'blind') { // Agressivo flag
            return "duvidar";
        }

        // 2. Trapaceiro: Imprevisível
        if (this.config.challengeStrategy === 'chaos') {
            return Math.random() < 0.5 ? "duvidar" : "acreditar";
        }

        // 3. Lógico: Baseado na confiança
        // Se eu não sei nada (< 40%), acredito (dou 1 ponto, evito perder o jogo se ele souber)
        // Se eu sei muito (> 85%), eu me gabo também (roubo a vez/pontos)
        // Se eu sei mais ou menos (> 50%), eu duvido
        if (avgConf < 0.4) return "acreditar";
        if (avgConf > 0.85) return "segabar_tambem";
        return "duvidar";
    }

    // --- ACTION LOGIC ---

    chooseChallengeTarget(state) {
        const hiddenIndices = state.mesa.map((p, i) => (p && p.virada) ? i : -1).filter(i => i !== -1);
        if (hiddenIndices.length === 0) return -1;

        // Strategy dependent
        if (this.config.challengeStrategy === "oldest_hidden") {
            // Find stone with oldest 'lastSeen' timestamp (or unknown)
            // Simulating "Player likely forgot this one"
            return this.findOldestHidden(hiddenIndices, state);
        }

        if (this.config.challengeStrategy === "chaos") {
            // Random is chaos enough? Or prefer recently manipulated?
            // For now, random
            return hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
        }

        if (this.config.challengeStrategy === "pressure_smart") {
            // 1. Filter out stones Player likely knows (via Mental Model)
            const smartCandidates = hiddenIndices.filter(idx => {
                // If player knows this slot, avoid challenging it
                if (this.mentalModel.playerKnowledge[idx]) return false;

                // Also verify my own memory so I don't challenge if *I* strictly know it? 
                // No, Aggressive challenges what YOU don't know, doesn't matter if I know (I just need to know to verify).
                // Actually, if I challenge, I need to know the answer to win the point immediately if they accept?
                // Rules: Challenger asks "What is this?". Defender answers.
                // If Defender is right, Challenger loses point.
                // So I should only challenge if I think Defender is WRONG.
                // Which means I assume they don't know.

                return true;
            });

            // 2. If valid candidates exist, pick random.
            if (smartCandidates.length > 0) {
                return smartCandidates[Math.floor(Math.random() * smartCandidates.length)];
            } else {
                // All are known by player. 
                // Fallback: If function called, I MUST return target.
                // Pick oldest hidden from my perspective (maybe player forgot oldest?)
                return this.findOldestHidden(hiddenIndices, state);
            }
        }

        // Default / Blind
        return hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
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
