// BotBrain.js - Refactored for Personalities

const PROFILES = {
    logical: {
        name: "Lógico",
        desc: "Prioriza certeza e defesa. Desafia o que você esqueceu.",
        memory: { retention: 0.95, swapPenalty: 0.3 }, // High memory
        weights: { 
            place: 0.4, 
            swap: 0.1, 
            challenge: 0.2, 
            peek: 0.3 // High Peek priority
        },
        params: {
            confidenceToPeek: 0.85, // Peeks if < 85% sure of something
            challengeThreshold: 0.7, // Only challenges if reasonably sure Player doesn't know (simulated)
            blindChallenge: false
        }
    },
    trickster: {
        name: "Trapaceiro",
        desc: "Prioriza caos e ocultação.",
        memory: { retention: 0.8, swapPenalty: 0.0 }, // Immunue to swap confusion
        weights: { 
            place: 0.2, 
            swap: 0.5, // Loves Swaps
            challenge: 0.15, 
            peek: 0.15 
        },
        params: {
            preferredHiddenCount: 5, // WANTS hidden stones
            challengeThreshold: 0.5,
            blindChallenge: false
        }
    },
    aggressive: {
        name: "Agressivo",
        desc: "Pura pressão. Desafia sem saber.",
        memory: { retention: 0.85, swapPenalty: 0.5 },
        weights: { 
            place: 0.3, 
            swap: 0.1, 
            challenge: 0.6, // LOVES Challenge
            peek: 0.0 // Hates Peeking
        },
        params: {
            confidenceToPeek: 0.0, // Almost never peeks
            challengeThreshold: 0.0,
            blindChallenge: true // CHALLENGES BLINDLY
        }
    }
};

class BotBrain {
    constructor(profileName = "logical") {
        this.profile = PROFILES[profileName] || PROFILES.logical;
        this.memory = {}; 
        console.log(`[BotBrain] Initialized with Personality: ${this.profile.name}`);
    }
    // ... Implement logic using this.profile.weights & params ...
}
