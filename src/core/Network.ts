import { Logger, LogCategory } from "../utils/Logger.js";

declare var firebase: any;

interface LocalListener {
    event: string;
    callback: Function;
}

// Configuração do Firebase
const firebaseConfig = (window as any).firebaseSecrets || {};

// Inicializa Firebase se disponível
if (typeof firebase !== 'undefined') {
    if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
} else {
    Logger.error(LogCategory.NETWORK, "Firebase SDK not loaded!");
}

const db = (typeof firebase !== 'undefined') ? firebase.database() : null;

// =========================
// LocalDB - Abstração para Modo Offline (Tutorial/PvE)
// =========================
let isLocalMode = false;
(window as any).localData = (window as any).localData || {};
let localListeners: { [path: string]: LocalListener[] } = {}; // Registro global de listeners

class LocalRef {
    path: string;

    constructor(path: string) {
        this.path = path;
    }

    set(val: any) {
        const logVal = (typeof val === 'object' && val !== null) ? JSON.stringify(val).substring(0, 100) + (JSON.stringify(val).length > 100 ? "..." : "") : val;
        Logger.net(`[LocalDB SET] ${this.path}`, logVal);
        this._setVal(val);
        this._trigger("value");
    }

    update(val: any) {
        const logVal = (typeof val === 'object' && val !== null) ? JSON.stringify(val).substring(0, 100) + (JSON.stringify(val).length > 100 ? "..." : "") : val;
        Logger.net(`[LocalDB UPDATE] ${this.path}`, logVal);
        let current = this._getVal() || {};
        if (typeof current === 'object' && current !== null) {
            Object.assign(current, val);
        } else {
            current = val;
        }
        this._setVal(current);
        this._trigger("value");
    }

    remove() {
        Logger.net(`[LocalDB REMOVE] ${this.path}`);
        this._setVal(null);
        this._trigger("value");
    }

    push() {
        const id = "local_" + Math.random().toString(36).substring(2, 7);
        return new LocalRef(this.path + "/" + id);
    }

    child(path: string) {
        return new LocalRef(this.path + "/" + path);
    }

    on(event: string, callback: Function) {
        if (!localListeners[this.path]) localListeners[this.path] = [];
        localListeners[this.path].push({ event, callback });
        // Trigger immediately for 'on'
        this.once(event, callback);
    }

    off() {
        // Simple implementation: remove all listeners for this path
        localListeners[this.path] = [];
    }

    once(event: string, callback: Function) {
        const val = this._getVal();
        callback({
            val: () => val,
            exists: () => val !== null && val !== undefined,
            ref: this
        });
    }

    transaction(updateFn: Function, onComplete?: Function) {
        const current = this._getVal();
        const newVal = updateFn(current);
        if (newVal !== undefined) {
            this.set(newVal);
            if (onComplete) onComplete(null, true, { val: () => newVal });
        } else {
            if (onComplete) onComplete(null, false, null);
        }
    }

    private _getVal() {
        const parts = this.path.split("/").filter(p => p);
        let curr = (window as any).localData;
        for (const p of parts) {
            if (!curr) return null;
            curr = curr[p];
        }
        return curr === undefined ? null : curr;
    }

    private _setVal(val: any) {
        const parts = this.path.split("/").filter(p => p);
        let curr = (window as any).localData;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!curr[parts[i]]) curr[parts[i]] = {};
            curr = curr[parts[i]];
        }
        if (parts.length > 0) {
            curr[parts[parts.length - 1]] = val;
        } else {
            (window as any).localData = val;
        }
    }

    private _trigger(event: string) {
        const parts = this.path.split("/");
        let currentPath = "";
        const pathsToNotify: string[] = [];
        parts.forEach(p => {
            if (currentPath) currentPath += "/";
            currentPath += p;
            pathsToNotify.push(currentPath);
        });

        // Logger.net(`[LocalDB TRIGGER] Disparando '${event}' para paths:`, pathsToNotify);
        pathsToNotify.forEach(notifyPath => {
            if (localListeners[notifyPath]) {
                const ref = new LocalRef(notifyPath);
                const val = ref._getVal();
                localListeners[notifyPath].forEach(l => {
                    if (l.event === event) {
                        try {
                            l.callback({
                                val: () => val,
                                exists: () => val !== null && val !== undefined,
                                ref: ref,
                                key: notifyPath.split("/").pop()
                            });
                        } catch (err) {
                            Logger.error(LogCategory.NETWORK, `[LocalDB ERROR] Erro no listener de ${notifyPath}:`, err);
                        }
                    }
                });
            }
        });
    }

    onDisconnect() {
        return {
            remove: () => Logger.net(`[LocalDB] onDisconnect().remove() registered for ${this.path} (No-op)`),
            set: (val: any) => Logger.net(`[LocalDB] onDisconnect().set() registered for ${this.path} (No-op)`),
            update: (val: any) => Logger.net(`[LocalDB] onDisconnect().update() registered for ${this.path} (No-op)`),
            cancel: () => Logger.net(`[LocalDB] onDisconnect().cancel() called for ${this.path}`)
        };
    }
}

function getDBRef(path: string): any {
    if ((window as any).isLocalMode || ((window as any).salaAtual && (window as any).salaAtual.startsWith("MODO_"))) {
        return new LocalRef(path);
    }
    if (!db) return null;
    return db.ref(path);
}

(window as any).getDBRef = getDBRef;
(window as any).isLocalMode = isLocalMode;
(window as any).setIsLocalMode = (val: boolean) => { isLocalMode = val; (window as any).isLocalMode = val; };
(window as any).clearLocalData = (path?: string) => {
    if (!path) {
        (window as any).localData = {};
    } else {
        const parts = path.split("/").filter(p => p);
        let curr = (window as any).localData;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!curr[parts[i]]) return;
            curr = curr[parts[i]];
        }
        delete curr[parts[parts.length - 1]];
    }
};
