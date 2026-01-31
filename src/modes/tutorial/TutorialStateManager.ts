// =========================
// TutorialStateManager - Gerenciador do Estado do Tutorial
// =========================

import { EventBus } from '../../core/EventBus.js';
import { EventType } from '../../core/types/Events.js';
import { TutorialState, createDefaultTutorialState } from './TutorialState.js';

class TutorialStateManagerClass {
    private state: TutorialState;
    private listeners: Set<(state: TutorialState) => void> = new Set();

    constructor() {
        this.state = createDefaultTutorialState();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Listen to tutorial events
        EventBus.on(EventType.TUTORIAL_START, () => {
            this.resetState();
        });

        EventBus.on(EventType.TUTORIAL_END, (data) => {
            this.state.completed = data.completed;
            this.state.completedAt = Date.now();
            this.notifyListeners();
        });

        EventBus.on(EventType.TUTORIAL_STEP_START, (data) => {
            this.setCurrentStep(data.step);
            this.state.currentHint = data.description || null;
            this.notifyListeners();
        });

        EventBus.on(EventType.TUTORIAL_STEP_COMPLETE, (data) => {
            if (data.success) {
                this.advanceStep();
            }
        });

        EventBus.on(EventType.TUTORIAL_HINT, (data) => {
            this.addHint(data.hint);
        });

        EventBus.on(EventType.TUTORIAL_RESTRICTION, (data) => {
            this.setAllowedActions(data.allowed);
        });
    }

    // State Management
    resetState(): void {
        this.state = createDefaultTutorialState();
        this.notifyListeners();
    }

    getState(): TutorialState {
        return { ...this.state }; // Immutable copy
    }

    // Step Control
    setCurrentStep(step: number): void {
        this.state.currentStep = step;
        this.notifyListeners();

        // Emit event
        EventBus.emit(EventType.STATE_UPDATE, {
            state: this.getState(),
            reason: 'TUTORIAL_STEP_CHANGE'
        });
    }

    advanceStep(): void {
        if (this.state.currentStep < this.state.maxStep) {
            this.state.currentStep++;
            this.notifyListeners();
        }
    }

    // Action Restrictions
    setAllowedActions(actions: string[]): void {
        this.state.allowedActions = actions;

        // Update restrictions based on allowed actions
        this.state.restrictions = {
            canPlace: actions.includes('place'),
            canFlip: actions.includes('flip'),
            canSwap: actions.includes('swap'),
            canChallenge: actions.includes('challenge'),
            canBoast: actions.includes('boast')
        };

        this.notifyListeners();
    }

    canPerformAction(action: string): boolean {
        return this.state.allowedActions.includes(action);
    }

    // Hints
    addHint(hint: string): void {
        if (!this.state.hints.includes(hint)) {
            this.state.hints.push(hint);
            this.state.currentHint = hint;
            this.notifyListeners();
        }
    }

    clearHints(): void {
        this.state.hints = [];
        this.state.currentHint = null;
        this.notifyListeners();
    }

    // Progress Tracking
    getProgress(): number {
        return (this.state.currentStep / this.state.maxStep) * 100;
    }

    isCompleted(): boolean {
        return this.state.completed;
    }

    getDuration(): number {
        if (this.state.completedAt) {
            return this.state.completedAt - this.state.startedAt;
        }
        return Date.now() - this.state.startedAt;
    }

    // Observers Pattern
    subscribe(listener: (state: TutorialState) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners(): void {
        const state = this.getState();
        this.listeners.forEach(listener => listener(state));
    }

    // Debug
    getDebugInfo(): string {
        const state = this.state;
        return `
=== Tutorial State Manager ===
Step: ${state.currentStep}/${state.maxStep} (${this.getProgress().toFixed(1)}%)
Completed: ${state.completed}
Allowed Actions: ${state.allowedActions.join(', ') || 'none'}
Current Hint: ${state.currentHint || 'none'}
Duration: ${(this.getDuration() / 1000).toFixed(1)}s
Listeners: ${this.listeners.size}
        `.trim();
    }
}

// Singleton Instance
export const TutorialStateManager = new TutorialStateManagerClass();

// Global Export for Debug
(window as any).TutorialStateManager = TutorialStateManager;
