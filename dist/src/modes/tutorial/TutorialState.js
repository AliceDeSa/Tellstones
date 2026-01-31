// =========================
// TutorialState - Interface do Estado do Tutorial
// =========================
export function createDefaultTutorialState() {
    return {
        currentStep: 0,
        maxStep: 10,
        completed: false,
        allowedActions: [],
        restrictions: {
            canPlace: false,
            canFlip: false,
            canSwap: false,
            canChallenge: false,
            canBoast: false
        },
        hints: [],
        currentHint: null,
        startedAt: Date.now(),
        completedAt: null
    };
}
