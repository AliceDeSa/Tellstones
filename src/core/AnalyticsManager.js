// =========================
// AnalyticsManager - Google Analytics 4 Wrapper
// =========================

const AnalyticsManager = {
    initialized: false,

    init: function () {
        if (typeof gtag !== 'function') {
            console.warn("[AnalyticsManager] GA4 (gtag) not found.");
            return;
        }
        this.initialized = true;
        console.log("[AnalyticsManager] Initialized.");
    },

    logEvent: function (eventName, params = {}) {
        if (!this.initialized) return;

        // Debug Log (Development Only via Logger)
        if (window.Logger) {
            window.Logger.debug('Analytics', `Event: ${eventName}`, params);
        }

        try {
            gtag('event', eventName, params);
        } catch (err) {
            if (window.Logger) window.Logger.warn('Analytics', "Failed to log event:", err);
        }
    },

    // --- Convenience Methods ---

    logGameStart: function (mode, roomId, playerCount) {
        this.logEvent('game_start', {
            game_mode: mode,
            room_id: roomId,
            player_count: playerCount
        });
    },

    logGameEnd: function (mode, winner, durationSeconds) {
        this.logEvent('game_end', {
            game_mode: mode,
            winner_name: winner,
            duration: durationSeconds
        });
    },

    logTutorialStep: function (stepIndex, stepName) {
        this.logEvent('tutorial_step', {
            step: stepIndex,
            step_name: stepName
        });
    },

    logAction: function (actionType, details = {}) {
        // actionType: 'challenge', 'boast', 'place_stone', 'peek'
        this.logEvent('player_action', {
            action_type: actionType,
            ...details
        });
    },

    logError: function (errorMessage, stack = "") {
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

    logPvEChallenge: function (initiator, success, type, stoneName) {
        this.logEvent('pve_challenge_result', {
            initiator: initiator,
            success: success, // Did the initiator Win?
            challenge_type: type,
            stone_name: stoneName
        });
    },

    logPvEBoast: function (initiator) {
        this.logEvent('pve_boast_event', {
            initiator: initiator
        });
    },

    logPvEWin: function (winnerName, scoreBot, scorePlayer) {
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
window.AnalyticsManager = AnalyticsManager;


