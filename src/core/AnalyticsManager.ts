// =========================
// AnalyticsManager - Google Analytics 4 Wrapper
// =========================

declare var gtag: any;

interface IAnalyticsManager {
    initialized: boolean;
    init(): void;
    logEvent(eventName: string, params?: any): void;
    logGameStart(mode: string, roomId: string, playerCount: number): void;
    logGameEnd(mode: string, winner: string, durationSeconds: number): void;
    logTutorialStep(stepIndex: number, stepName: string): void;
    logAction(actionType: string, details?: any): void;
    logError(errorMessage: string, stack?: string): void;
    logTutorialStart(): void;
    logTutorialComplete(): void;
    logPvEChallenge(initiator: string, success: boolean, type: string, stoneName: string): void;
    logPvEBoast(initiator: string): void;
    logPvEWin(winnerName: string, scoreBot: number, scorePlayer: number): void;
}

const AnalyticsManager: IAnalyticsManager = {
    initialized: false,

    init: function () {
        if (typeof gtag !== 'function') {
            console.warn("[AnalyticsManager] GA4 (gtag) not found.");
            return;
        }
        this.initialized = true;
        console.log("[AnalyticsManager] Initialized.");
    },

    logEvent: function (eventName: string, params: any = {}) {
        if (!this.initialized) return;

        // Debug Log (Development Only via Logger)
        const logger = (window as any).Logger;
        if (logger) {
            logger.debug('Analytics', `Event: ${eventName}`, params);
        }

        try {
            gtag('event', eventName, params);
        } catch (err) {
            if (logger) logger.warn('Analytics', "Failed to log event:", err);
        }
    },

    // --- Convenience Methods ---

    logGameStart: function (mode: string, roomId: string, playerCount: number) {
        this.logEvent('game_start', {
            game_mode: mode,
            room_id: roomId,
            player_count: playerCount
        });
    },

    logGameEnd: function (mode: string, winner: string, durationSeconds: number) {
        this.logEvent('game_end', {
            game_mode: mode,
            winner_name: winner,
            duration: durationSeconds
        });
    },

    logTutorialStep: function (stepIndex: number, stepName: string) {
        this.logEvent('tutorial_step', {
            step: stepIndex,
            step_name: stepName
        });
    },

    logAction: function (actionType: string, details: any = {}) {
        // actionType: 'challenge', 'boast', 'place_stone', 'peek'
        this.logEvent('player_action', {
            action_type: actionType,
            ...details
        });
    },

    logError: function (errorMessage: string, stack: string = "") {
        this.logEvent('exception', {
            description: errorMessage,
            fatal: false, // We assume caught errors are non-fatal for now
            stack: stack.substring(0, 500) // Truncate to avoid limits
        });
    },

    // --- Enhanced Analytics for Funnel/Tree ---

    logTutorialStart: function () {
        this.logEvent('tutorial_start', {
            timestamp: new Date().toISOString()
        });
    },

    logTutorialComplete: function () {
        this.logEvent('tutorial_complete', {
            timestamp: new Date().toISOString()
        });
    },

    logPvEChallenge: function (initiator: string, success: boolean, type: string, stoneName: string) {
        this.logEvent('pve_challenge_result', {
            initiator: initiator,
            success: success, // Did the initiator Win?
            challenge_type: type,
            stone_name: stoneName
        });
    },

    logPvEBoast: function (initiator: string) {
        this.logEvent('pve_boast_event', {
            initiator: initiator
        });
    },

    logPvEWin: function (winnerName: string, scoreBot: number, scorePlayer: number) {
        this.logEvent('pve_game_end', {
            winner: winnerName,
            score_bot: scoreBot,
            score_player: scorePlayer
        });
    }
};

// Initialize manually or auto-init when ready
if (typeof gtag === 'function') {
    AnalyticsManager.init();
} else {
    // If loaded before gtag, wait for window load
    window.addEventListener('load', () => {
        if (typeof gtag === 'function') {
            AnalyticsManager.init();
        } else {
            console.error("[AnalyticsManager] GA4 Failed to Load.");
        }
    });
}

// Expose globally
(window as any).AnalyticsManager = AnalyticsManager;


