
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
        // Pressão pura. 
        memory: { retention: 0.85, swapPenalty: 0.5 },
        weights: {
            place: 0.3,
            swap: 0.1,
            challenge: 0.6, // Adora desafiar
            peek: 0.0
        },
        params: {
            confidenceToPeek: 0.0,
            challengeStrategy: "blind" // Desafia aleatoriamente para pressionar
        }
    }
};

class BotBrain {
    constructor(profileName = "logical") {
        this.profile = PROFILES[profileName] || PROFILES.logical;
        this.config = this.profile.params;
        this.memory = {}; // Map<slotIndex, {stoneName: string, confidence: number, lastSeen: timestamp}>
        console.log(`[BotBrain] Initialized with Personality: ${this.profile.name}`);
    }

    // --- MEMORY SYSTEM ---

    observe(action, state) {
        if (action.tipo === 'turn_end') {
            this.decayMemory();
            if (state && state.mesa) {
                state.mesa.forEach((p, i) => {
                    if (p && !p.virada) {
                        this.updateMemory(i, p.nome, 1.0);
                    }
                });
            }
            return;
        }

        if (action.tipo === 'colocar' || action.tipo === 'virar' || action.tipo === 'espiar') {
            const slot = action.origem;
            let stoneName = action.pedra ? action.pedra.nome : null;
            if (!stoneName && state && state.mesa[slot]) {
                stoneName = state.mesa[slot].nome;
            }
            if (stoneName && slot !== undefined) {
                this.updateMemory(slot, stoneName, 1.0);
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

    decayMemory() {
        // Retention factor applied per turn
        // confidence *= retention
        const retention = this.profile.memory.retention;

        Object.keys(this.memory).forEach(slot => {
            const mem = this.memory[slot];
            if (!mem) return;

            mem.confidence *= retention;

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

    // --- DECISION MAKING ---

    decideMove(state) {
        if (!state || !state.mesa) {
            console.error("[BotBrain] Invalid state passed to decideMove");
            return { type: 'pass' };
        }
        const hiddenStones = state.mesa.filter(p => p && p.virada).length;
        const visibleStones = state.mesa.filter(p => p && !p.virada).length;
        const totalStones = state.mesa.filter(p => p).length;
        const handStones = state.reserva && state.reserva.some(p => p !== null);

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

        // 2. Modifiers based on Game State
        if (!handStones) actions.place = 0;
        if (visibleStones === 0) actions.flip = 0; // Can't flip down if none up (assuming flip means Hide)

        // Rules Check
        if (hiddenStones < 2) {
            actions.swap = 0;
            actions.challenge = 0;
            actions.boast = 0;
        }

        // Logic Tweaks
        // If Logical and unsure about a hidden stone -> Boost Peek
        if (this.profile.name === "Lógico") {
            const unsure = this.findUnsureHiddenStone(state);
            if (unsure !== -1) {
                actions.peek += 0.5; // Huge urge to peek
            }
        }

        // If Trickster and too many visible -> Boost Flip (Hide)
        if (this.profile.name === "Trapaceiro" && visibleStones > 2) {
            actions.flip += 0.4;
        }

        // Select Action
        const selectedType = this.weightedRandom(actions);
        return { type: selectedType };
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

        const allStones = ["Coroa", "Espada", "Escudo", "Bandeira", "Martelo", "Balança", "Cavaleiro"];
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
