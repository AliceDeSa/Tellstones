// =========================
// TutorialState - Interface do Estado do Tutorial
// =========================

export interface TutorialState {
    // Progresso
    currentStep: number;
    maxStep: number;
    completed: boolean;

    // Restrições de Ações
    allowedActions: string[];
    restrictions: {
        canPlace: boolean;
        canFlip: boolean;
        canSwap: boolean;
        canChallenge: boolean;
        canBoast: boolean;
    };

    // Feedback e Ajuda
    hints: string[];
    currentHint: string | null;

    // Metadados
    startedAt: number;
    completedAt: number | null;
}

export function createDefaultTutorialState(): TutorialState {
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
