"use strict";
import { Logger, LogCategory } from "../utils/Logger.js";
const PROFILES = {
    logical: {
        name: "Lógico",
        memory: { retention: 0.95, swapPenalty: 0.3 },
        weights: { place: 0.4, swap: 0.1, challenge: 0.2, peek: 0.3 },
        params: {
            confidenceToPeek: 0.85,
            challengeStrategy: "oldest_hidden",
            opening: "compact"
        }
    },
    trickster: {
        name: "Trapaceiro",
        memory: { retention: 0.8, swapPenalty: 0.0 },
        weights: { place: 0.2, swap: 0.5, challenge: 0.15, peek: 0.15 },
        params: {
            preferredHiddenCount: 5,
            challengeStrategy: "chaos",
            opening: "spread"
        }
    },
    aggressive: {
        name: "Agressivo",
        memory: { retention: 0.92, swapPenalty: 0.2 },
        weights: { place: 0.3, swap: 0.1, challenge: 0.6, peek: 0.0 },
        params: {
            confidenceToPeek: 0.0,
            challengeStrategy: "pressure_smart",
            opening: "pressure"
        }
    }
};
class MentalModel {
    constructor() {
        this.playerConfidence = 0.5;
        this.playerKnowledge = {};
        this.lastActionTime = Date.now();
        this.actionHistory = [];
    }
    observePlayerAction(action, state) {
        const now = Date.now();
        const delta = (now - this.lastActionTime) / 1000;
        this.lastActionTime = now;
        if (action.tipo !== 'turn_end') {
            if (delta < 1.5)
                this.playerConfidence = Math.min(1.0, this.playerConfidence + 0.1);
            else if (delta > 8.0)
                this.playerConfidence = Math.max(0.0, this.playerConfidence - 0.2);
            else
                this.playerConfidence = Math.max(0.0, this.playerConfidence - 0.05);
        }
        if (action.tipo === 'espiar' || action.tipo === 'colocar') {
            const slot = action.origem;
            if (slot !== undefined)
                this.playerKnowledge[slot] = { confidence: 1.0, time: now };
        }
        // Memory decay for player knowledge
        Object.keys(this.playerKnowledge).forEach(k => {
            const key = parseInt(k);
            if (Date.now() - this.playerKnowledge[key].time > 45000) {
                delete this.playerKnowledge[key];
            }
        });
    }
    getPlayerMetric() {
        return { confidence: this.playerConfidence, likelyKnownCount: Object.keys(this.playerKnowledge).length };
    }
}
export class BotBrain {
    constructor(profileName = "logical") {
        this.lastChatter = "";
        this.profile = PROFILES[profileName] || PROFILES.logical;
        this.config = this.profile.params;
        this.memory = {};
        this.mentalModel = new MentalModel();
        this.myActionHistory = [];
        this.placedCount = 0;
        Logger.ai(`Inicializado com Personalidade: ${this.profile.name} (v4.0 Super-Grandmaster)`);
    }
    calculateThinkTime(state, decision) {
        let base = 1500;
        if (decision.type === 'place' || decision.type === 'boast')
            return 800 + Math.random() * 500;
        let conf = 0.5;
        if (decision.type === 'challenge' && decision.target !== undefined) {
            conf = this.memory[decision.target] ? this.memory[decision.target].confidence : 0;
            if (conf > 0.9)
                return 600 + Math.random() * 400;
        }
        if (decision.type === 'swap')
            base = 3000;
        if (decision.type === 'peek')
            base = 2500;
        return base + (Math.random() * 2000);
    }
    observe(action, state) {
        const isBotTurn = state && state.vez === 1;
        const isPlayerTurn = state && state.vez === 0;
        if (action.player === 'bot' || (isBotTurn && action.tipo !== 'turn_end')) {
            this.myActionHistory.push(Object.assign(Object.assign({ type: action.tipo }, action), { time: Date.now() }));
            if (this.myActionHistory.length > 10)
                this.myActionHistory.shift();
        }
        if (action.player === 'human' || (isPlayerTurn && action.tipo !== 'turn_end')) {
            if (this.mentalModel)
                this.mentalModel.observePlayerAction(action, state);
        }
        if (action.tipo === 'turn_end') {
            this.decayMemory(state);
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
        }
        else if (action.tipo === 'trocar') {
            const idxA = action.origem;
            const idxB = action.destino;
            const memA = this.memory[idxA] ? Object.assign({}, this.memory[idxA]) : null;
            const memB = this.memory[idxB] ? Object.assign({}, this.memory[idxB]) : null;
            if (memA)
                this.memory[idxB] = memA;
            else
                delete this.memory[idxB];
            if (memB)
                this.memory[idxA] = memB;
            else
                delete this.memory[idxA];
            let drop = 1.0 - this.profile.memory.swapPenalty;
            const isHiddenA = state && state.mesa[idxA] && state.mesa[idxA].virada;
            const isHiddenB = state && state.mesa[idxB] && state.mesa[idxB].virada;
            if (isHiddenA && isHiddenB) {
                drop *= 0.6;
            }
            if (this.memory[idxA])
                this.memory[idxA].confidence *= drop;
            if (this.memory[idxB])
                this.memory[idxB].confidence *= drop;
        }
    }
    decayMemory(state) {
        let retention = this.profile.memory.retention;
        let hiddenCount = 0;
        if (state && state.mesa) {
            hiddenCount = state.mesa.filter((p) => p && p.virada).length;
        }
        else {
            hiddenCount = Object.keys(this.memory).length;
        }
        retention -= (hiddenCount * 0.005);
        if (retention < 0.5)
            retention = 0.5;
        Object.keys(this.memory).forEach((slotKey) => {
            const slot = parseInt(slotKey);
            const mem = this.memory[slot];
            if (!mem)
                return;
            const age = Date.now() - mem.lastSeen;
            const agePenalty = age > 30000 ? 0.9 : 1.0;
            mem.confidence *= (retention * agePenalty);
            if (mem.confidence <= 0.1) {
                delete this.memory[slot];
            }
        });
    }
    applyInference(state) {
        const allStones = ["Coroa", "Espada", "Escudo", "Bandeira", "Martelo", "Balança", "Cavalo"];
        const knownStones = new Set();
        const unknownSlots = [];
        state.mesa.forEach((p, i) => {
            if (p) {
                if (!p.virada)
                    knownStones.add(p.nome);
                else if (this.memory[i] && this.memory[i].confidence > 0.8)
                    knownStones.add(this.memory[i].stoneName);
                else
                    unknownSlots.push(i);
            }
        });
        if (state.reserva)
            state.reserva.forEach((p) => {
                if (p)
                    knownStones.add(p.nome);
            });
        const remainingStones = allStones.filter(s => !knownStones.has(s));
        if (remainingStones.length === 1 && unknownSlots.length === 1) {
            const slot = unknownSlots[0];
            const stone = remainingStones[0];
            Logger.ai(`Inferência: Slot ${slot} DEVE ser ${stone}`);
            this.updateMemory(slot, stone, 0.95);
        }
    }
    updateMemory(slot, name, confidence) {
        this.memory[slot] = {
            stoneName: name,
            confidence: confidence,
            lastSeen: Date.now(),
            history: []
        };
    }
    getChatter(event, context) {
        const profile = this.profile.name;
        const playerMetric = this.mentalModel.getPlayerMetric();
        if (!this.lastChatter)
            this.lastChatter = "";
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
        if (playerMetric.confidence < 0.3 && Math.random() > 0.6) {
            const slowLines = msgs['player_slow'][profile];
            if (slowLines)
                return slowLines[Math.floor(Math.random() * slowLines.length)];
        }
        const list = msgs[event] ? msgs[event][profile] : null;
        if (list && list.length > 0) {
            const available = list.filter((m) => m !== this.lastChatter);
            if (available.length === 0)
                return null;
            const msg = available[Math.floor(Math.random() * available.length)];
            this.lastChatter = msg;
            return msg;
        }
        return null;
    }
    decideMove(state) {
        var _a, _b;
        if (!state || !state.mesa) {
            Logger.error(LogCategory.AI, "Estado inválido passado para decideMove");
            return { type: 'pass' };
        }
        const hiddenStones = state.mesa.filter((p) => p && p.virada).length;
        const visibleStones = state.mesa.filter((p) => p && !p.virada).length;
        const handStones = state.reserva && state.reserva.some((p) => p !== null);
        const myScore = ((_a = state.jogadores.find((j) => j.id === 'p2')) === null || _a === void 0 ? void 0 : _a.pontos) || 0;
        const oppScore = ((_b = state.jogadores.find((j) => j.id === 'p1')) === null || _b === void 0 ? void 0 : _b.pontos) || 0;
        const isDesperate = (oppScore >= 2);
        const actions = {
            place: 0, swap: 0, flip: 0, challenge: 0, peek: 0, boast: 0, pass: 0
        };
        Object.assign(actions, this.profile.weights);
        if (handStones && visibleStones < 7) {
            actions.place += 0.5;
        }
        if (isDesperate) {
            Logger.ai("MODO DESESPERO ATIVO!");
            actions.challenge += 0.5;
            actions.boast += 0.3;
            actions.swap += 0.2;
            actions.peek = 0;
        }
        const signatureMove = this.checkSignatureMove(state);
        if (signatureMove)
            return signatureMove;
        if (!handStones)
            actions.place = 0;
        if (visibleStones === 0)
            actions.flip = 0;
        if (hiddenStones <= 2) {
            actions.challenge = 0;
            actions.boast = 0;
            if (visibleStones > 0)
                actions.flip += 0.3;
        }
        if (this.profile.name === "Lógico") {
            const unsure = this.findUnsureHiddenStone(state);
            if (unsure !== -1)
                actions.peek += 0.5;
        }
        let unknownHidden = 0;
        state.mesa.forEach((p, i) => {
            if (p && p.virada) {
                const mem = this.memory[i];
                if (!mem || mem.confidence < 0.4)
                    unknownHidden++;
            }
        });
        if (unknownHidden > 1) {
            actions.peek += (unknownHidden * 0.2);
        }
        let attempts = 0;
        let decision = null;
        while (attempts < 3) {
            const selectedType = this.weightedRandom(actions);
            decision = { type: selectedType };
            if (selectedType === 'place')
                decision.target = this.choosePlaceTarget(state);
            else if (selectedType === 'swap')
                decision.targets = this.chooseSwapTargets(state);
            else if (selectedType === 'flip')
                decision.target = this.chooseFlipTarget(state);
            else if (selectedType === 'peek')
                decision.target = this.choosePeekTarget(state);
            else if (selectedType === 'challenge')
                decision.target = this.chooseChallengeTarget(state);
            let valid = true;
            if (selectedType === 'peek' && decision.target === -1)
                valid = false;
            if (selectedType === 'place' && decision.target === -1)
                valid = false;
            if (selectedType === 'swap' && !decision.targets)
                valid = false;
            if (selectedType === 'flip' && decision.target === -1)
                valid = false;
            if (selectedType === 'challenge' && decision.target === -1)
                valid = false;
            if (valid)
                return decision;
            actions[selectedType] = 0;
            attempts++;
        }
        return { type: 'pass' };
    }
    choosePlaceTarget(state) {
        var _c;
        const strategy = this.config.opening;
        // ✅ CORREÇÃO: Usar GameRules.calcularSlotsValidos() em vez de apenas verificar null
        // Isso garante que apenas slots ADJACENTES à pedra central sejam considerados
        const validSlots = ((_c = window.GameRules) === null || _c === void 0 ? void 0 : _c.calcularSlotsValidos(state.mesa)) || [];
        Logger.ai(`[choosePlaceTarget] Slots válidos (adjacentes): ${JSON.stringify(validSlots)}`);
        if (validSlots.length === 0) {
            Logger.warn(LogCategory.AI, "[choosePlaceTarget] Nenhum slot válido disponível!");
            return -1;
        }
        // Aplicar estratégia de abertura, mas apenas entre slots válidos
        if (strategy === 'compact') {
            const preferences = [3, 2, 4, 1, 5, 0, 6];
            for (let p of preferences) {
                if (validSlots.includes(p)) {
                    Logger.ai(`[choosePlaceTarget] Estratégia 'compact' escolheu slot ${p}`);
                    return p;
                }
            }
        }
        if (strategy === 'spread') {
            const preferences = [0, 6, 3, 1, 5, 2, 4];
            for (let p of preferences) {
                if (validSlots.includes(p)) {
                    Logger.ai(`[choosePlaceTarget] Estratégia 'spread' escolheu slot ${p}`);
                    return p;
                }
            }
        }
        // Fallback: escolher aleatoriamente entre slots válidos
        const chosen = validSlots[Math.floor(Math.random() * validSlots.length)];
        Logger.ai(`[choosePlaceTarget] Escolha aleatória: slot ${chosen}`);
        return chosen;
    }
    chooseSwapTargets(state) {
        const indices = state.mesa.map((p, i) => p ? i : -1).filter((i) => i !== -1);
        if (indices.length < 2)
            return null;
        const hiddenCount = state.mesa.filter((p) => p && p.virada).length;
        if (hiddenCount === 0)
            return null;
        if (this.mentalModel) {
            const knownToPlayer = Object.keys(this.mentalModel.playerKnowledge).map(k => parseInt(k));
            if (knownToPlayer.length > 0) {
                const targetA = knownToPlayer[0];
                const others = indices.filter((i) => i !== targetA);
                if (others.length > 0) {
                    const targetB = others[Math.floor(Math.random() * others.length)];
                    Logger.ai(`Troca Contra-Jogada: Movendo slot conhecido ${targetA} para ${targetB}`);
                    return { from: targetA, to: targetB };
                }
            }
        }
        const visible = indices.filter((i) => state.mesa[i] && !state.mesa[i].virada);
        const hidden = indices.filter((i) => state.mesa[i] && state.mesa[i].virada);
        let idxA, idxB;
        if (visible.length > 0 && hidden.length > 0 && Math.random() > 0.3) {
            idxA = visible[Math.floor(Math.random() * visible.length)];
            idxB = hidden[Math.floor(Math.random() * hidden.length)];
        }
        else {
            idxA = indices[Math.floor(Math.random() * indices.length)];
            idxB = indices[Math.floor(Math.random() * indices.length)];
            while (idxA === idxB) {
                idxB = indices[Math.floor(Math.random() * indices.length)];
            }
        }
        return { from: idxA, to: idxB };
    }
    chooseFlipTarget(state) {
        const visibleIndices = state.mesa.map((p, i) => (p && !p.virada) ? i : -1).filter((i) => i !== -1);
        if (visibleIndices.length === 0)
            return -1;
        return visibleIndices[Math.floor(Math.random() * visibleIndices.length)];
    }
    choosePeekTarget(state) {
        const hiddenIndices = state.mesa.map((p, i) => (p && p.virada) ? i : -1).filter((i) => i !== -1);
        if (hiddenIndices.length === 0)
            return -1;
        let knownCount = 0;
        for (let idx of hiddenIndices) {
            const mem = this.memory[idx];
            if (mem && mem.confidence > 0.9)
                knownCount++;
        }
        if (knownCount === hiddenIndices.length) {
            return -1;
        }
        const candidates = [];
        const now = Date.now();
        for (let idx of hiddenIndices) {
            const mem = this.memory[idx];
            if (mem && (now - mem.lastSeen < 15000))
                continue;
            if (!mem || mem.confidence < (this.config.confidenceToPeek || 0.85)) {
                candidates.push(idx);
            }
        }
        if (candidates.length > 0) {
            return candidates[Math.floor(Math.random() * candidates.length)];
        }
        return -1;
    }
    chooseChallengeTarget(state) {
        const hiddenIndices = state.mesa.map((p, i) => (p && p.virada) ? i : -1).filter((i) => i !== -1);
        if (hiddenIndices.length === 0)
            return -1;
        const candidates = hiddenIndices.filter((idx) => {
            const mem = this.memory[idx];
            if (mem && (Date.now() - mem.lastSeen < 10000))
                return false;
            return true;
        });
        const pool = candidates.length > 0 ? candidates : hiddenIndices;
        if (this.config.challengeStrategy === "oldest_hidden") {
            return this.findOldestHidden(pool, state);
        }
        return pool[Math.floor(Math.random() * pool.length)];
    }
    decideBoastResponse(state) {
        const avgConf = this.calculateAverageHiddenConfidence(state);
        const hiddenCount = state.mesa.filter((p) => p && p.virada).length;
        if (hiddenCount <= 2) {
            return "acreditar";
        }
        if (this.config.challengeStrategy === 'blind')
            return "duvidar";
        if (this.config.challengeStrategy === 'chaos')
            return Math.random() < 0.5 ? "duvidar" : "acreditar";
        if (avgConf < 0.4)
            return "acreditar";
        if (avgConf > 0.85)
            return "segabar_tambem";
        return "duvidar";
    }
    predictStone(slotIdx) {
        const mem = this.memory[slotIdx];
        const confidence = mem ? mem.confidence : 0;
        if (confidence >= 0.7)
            return mem.stoneName;
        const guess = this.guessByElimination(slotIdx);
        if (confidence > 0.4 && Math.random() < confidence)
            return mem.stoneName;
        return guess;
    }
    checkSignatureMove(state) {
        const profile = this.profile.name;
        if (profile === 'Lógico') {
            const knownCount = Object.values(this.memory).filter((m) => m.confidence > 0.9).length;
            if (knownCount >= 4) {
                const unsure = this.findUnsureHiddenStone(state);
                if (unsure !== -1)
                    return { type: 'peek', target: unsure, signature: "The Audit" };
            }
        }
        if (profile === 'Agressivo') {
            const lastAction = this.myActionHistory[this.myActionHistory.length - 1];
            if (lastAction && lastAction.tipo === 'colocar') {
                const slot = lastAction.origem;
                if (state.mesa[slot] && !state.mesa[slot].virada) {
                    return { type: 'flip', target: slot, signature: "The Bait" };
                }
            }
        }
        if (profile === 'Trapaceiro') {
            const lastAction = this.myActionHistory[this.myActionHistory.length - 1];
            if (lastAction && lastAction.tipo === 'trocar') {
                const pivot = Math.random() < 0.5 ? lastAction.origem : lastAction.destino;
                const others = state.mesa.map((p, i) => i).filter((i) => i !== lastAction.origem && i !== lastAction.destino);
                if (others.length > 0) {
                    const target = others[Math.floor(Math.random() * others.length)];
                    return { type: 'swap', targets: { from: pivot, to: target }, signature: "Chaotic Chain" };
                }
            }
        }
        return null;
    }
    findUnsureHiddenStone(state) {
        const hiddenIndices = state.mesa.map((p, i) => (p && p.virada) ? i : -1).filter((i) => i !== -1);
        for (let idx of hiddenIndices) {
            const mem = this.memory[idx];
            if (!mem || mem.confidence < (this.config.confidenceToPeek || 0.85))
                return idx;
        }
        return -1;
    }
    findOldestHidden(indices, state) {
        const sorted = indices.sort((a, b) => {
            const lastA = this.memory[a] ? this.memory[a].lastSeen : 0;
            const lastB = this.memory[b] ? this.memory[b].lastSeen : 0;
            return lastA - lastB;
        });
        return sorted[0];
    }
    guessByElimination(targetSlot) {
        const estado = window.estadoJogo;
        if (!estado || !estado.mesa)
            return "Coroa";
        const allStones = ["Coroa", "Espada", "Escudo", "Bandeira", "Martelo", "Balança", "Cavalo"];
        const impossible = new Set();
        estado.mesa.forEach((p, i) => {
            if (p && !p.virada && i !== targetSlot)
                impossible.add(p.nome);
        });
        if (estado.reserva)
            estado.reserva.forEach((p) => {
                if (p)
                    impossible.add(p.nome);
            });
        Object.keys(this.memory).forEach((idxStr) => {
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
        const confidences = Object.values(this.memory).map((m) => m.confidence.toFixed(2)).join(', ');
        const playerModel = this.mentalModel ? `PlayerConf=${this.mentalModel.playerConfidence.toFixed(2)}` : "N/A";
        return `Mem: ${memoryCount} stones [${confidences}] | ${playerModel}`;
    }
    weightedRandom(weightsObj) {
        let sum = 0;
        const keys = Object.keys(weightsObj);
        for (let k of keys)
            sum += weightsObj[k];
        let rand = Math.random() * sum;
        for (let k of keys) {
            if (rand < weightsObj[k])
                return k;
            rand -= weightsObj[k];
        }
        return keys[0];
    }
}
// Global Export for Legacy
window.BotBrain = BotBrain;
