
import { EventBus } from './EventBus.js';
import { EventType } from './types/Events.js';
import { AuthManager } from './AuthManager.js';
import { Logger, LogCategory } from '../utils/Logger.js';

class StatsManagerClass {
    constructor() {
        this.init();
    }

    private init() {
        EventBus.on(EventType.MULTIPLAYER_VICTORY, (data) => {
            if (data.isLocalPlayer) {
                this.recordVictory();
            } else {
                this.recordDefeat();
            }
        });
    }

    private recordVictory() {
        if (AuthManager.isAnonymous()) {
            Logger.info(LogCategory.GAME, '[Stats] Guest victory ignored for global stats');
            EventBus.emit(EventType.UI_NOTIFICATION, {
                message: "Crie uma conta para salvar suas vitórias!",
                type: 'warning'
            });
            return;
        }

        const user = AuthManager.getCurrentUser();
        if (!user) return;

        this.updateStats(user.uid, 'wins');
    }

    private recordDefeat() {
        if (AuthManager.isAnonymous()) return;

        const user = AuthManager.getCurrentUser();
        if (!user) return;

        this.updateStats(user.uid, 'losses');
    }

    private updateStats(uid: string, field: 'wins' | 'losses') {
        if (!(window as any).getDBRef) return;

        const ref = (window as any).getDBRef(`users/${uid}/stats/${field}`);
        ref.transaction((current: number) => {
            return (current || 0) + 1;
        }, (error: any, committed: boolean) => {
            if (committed) {
                Logger.sys(`[Stats] Identificado ${field} +1 para ${uid}`);
            } else {
                Logger.error(LogCategory.NETWORK, '[Stats] Failed to update stats', error);
            }
        });
    }
}

export const StatsManager = new StatsManagerClass();
(window as any).StatsManager = StatsManager;
