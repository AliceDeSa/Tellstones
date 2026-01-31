// =========================
// TutorialStateManager - Gerenciador do Estado do Tutorial
// =========================
import { EventBus } from '../../core/EventBus.js';
import { EventType } from '../../core/types/Events.js';
import { createDefaultTutorialState } from './TutorialState.js';
class TutorialStateManagerClass {
    constructor() {
        this.listeners = new Set();
        this.state = createDefaultTutorialState();
        this.setupEventListeners();
    }
    setupEventListeners() {
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
    resetState() {
        this.state = createDefaultTutorialState();
        this.notifyListeners();
    }
    getState() {
        return Object.assign({}, this.state); // Immutable copy
    }
    // Step Control
    setCurrentStep(step) {
        this.state.currentStep = step;
        this.notifyListeners();
        // Emit event
        EventBus.emit(EventType.STATE_UPDATE, {
            state: this.getState(),
            reason: 'TUTORIAL_STEP_CHANGE'
        });
    }
    advanceStep() {
        if (this.state.currentStep < this.state.maxStep) {
            this.state.currentStep++;
            this.notifyListeners();
        }
    }
    // Action Restrictions
    setAllowedActions(actions) {
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
    canPerformAction(action) {
        return this.state.allowedActions.includes(action);
    }
    // Hints
    addHint(hint) {
        if (!this.state.hints.includes(hint)) {
            this.state.hints.push(hint);
            this.state.currentHint = hint;
            this.notifyListeners();
        }
    }
    clearHints() {
        this.state.hints = [];
        this.state.currentHint = null;
        this.notifyListeners();
    }
    // Progress Tracking
    getProgress() {
        return (this.state.currentStep / this.state.maxStep) * 100;
    }
    isCompleted() {
        return this.state.completed;
    }
    getDuration() {
        if (this.state.completedAt) {
            return this.state.completedAt - this.state.startedAt;
        }
        return Date.now() - this.state.startedAt;
    }
    // Observers Pattern
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    notifyListeners() {
        const state = this.getState();
        this.listeners.forEach(listener => listener(state));
    }
    // Debug
    getDebugInfo() {
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
window.TutorialStateManager = TutorialStateManager;
