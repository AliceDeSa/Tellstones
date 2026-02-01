import { Logger, LogCategory } from "../utils/Logger.js";
// Configuração do Firebase
const firebaseConfig = window.firebaseSecrets || {};
// Inicializa Firebase se disponível
if (typeof firebase !== 'undefined') {
    if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
}
else {
    Logger.error(LogCategory.NETWORK, "Firebase SDK not loaded!");
}
const db = (typeof firebase !== 'undefined') ? firebase.database() : null;
// =========================
// LocalDB - Abstração para Modo Offline (Tutorial/PvE)
// =========================
let isLocalMode = false;
window.localData = window.localData || {};
let localListeners = {}; // Registro global de listeners
class LocalRef {
    constructor(path) {
        this.path = path;
    }
    set(val) {
        const logVal = (typeof val === 'object' && val !== null) ? JSON.stringify(val).substring(0, 100) + (JSON.stringify(val).length > 100 ? "..." : "") : val;
        Logger.net(`[LocalDB SET] ${this.path}`, logVal);
        this._setVal(val);
        this._trigger("value");
    }
    update(val) {
        const logVal = (typeof val === 'object' && val !== null) ? JSON.stringify(val).substring(0, 100) + (JSON.stringify(val).length > 100 ? "..." : "") : val;
        Logger.net(`[LocalDB UPDATE] ${this.path}`, logVal);
        let current = this._getVal() || {};
        if (typeof current === 'object' && current !== null) {
            Object.assign(current, val);
        }
        else {
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
    child(path) {
        return new LocalRef(this.path + "/" + path);
    }
    on(event, callback) {
        if (!localListeners[this.path])
            localListeners[this.path] = [];
        localListeners[this.path].push({ event, callback });
        // Trigger immediately for 'on'
        this.once(event, callback);
    }
    off() {
        // Simple implementation: remove all listeners for this path
        localListeners[this.path] = [];
    }
    once(event, callback) {
        const val = this._getVal();
        callback({
            val: () => val,
            exists: () => val !== null && val !== undefined,
            ref: this
        });
    }
    transaction(updateFn, onComplete) {
        const current = this._getVal();
        const newVal = updateFn(current);
        if (newVal !== undefined) {
            this.set(newVal);
            if (onComplete)
                onComplete(null, true, { val: () => newVal });
        }
        else {
            if (onComplete)
                onComplete(null, false, null);
        }
    }
    _getVal() {
        const parts = this.path.split("/").filter(p => p);
        let curr = window.localData;
        for (const p of parts) {
            if (!curr)
                return null;
            curr = curr[p];
        }
        return curr === undefined ? null : curr;
    }
    _setVal(val) {
        const parts = this.path.split("/").filter(p => p);
        let curr = window.localData;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!curr[parts[i]])
                curr[parts[i]] = {};
            curr = curr[parts[i]];
        }
        if (parts.length > 0) {
            curr[parts[parts.length - 1]] = val;
        }
        else {
            window.localData = val;
        }
    }
    _trigger(event) {
        const parts = this.path.split("/");
        let currentPath = "";
        const pathsToNotify = [];
        parts.forEach(p => {
            if (currentPath)
                currentPath += "/";
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
                        }
                        catch (err) {
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
            set: (val) => Logger.net(`[LocalDB] onDisconnect().set() registered for ${this.path} (No-op)`),
            update: (val) => Logger.net(`[LocalDB] onDisconnect().update() registered for ${this.path} (No-op)`),
            cancel: () => Logger.net(`[LocalDB] onDisconnect().cancel() called for ${this.path}`)
        };
    }
}
function getDBRef(path) {
    if (window.isLocalMode || (window.salaAtual && window.salaAtual.startsWith("MODO_"))) {
        return new LocalRef(path);
    }
    if (!db)
        return null;
    return db.ref(path);
}
window.getDBRef = getDBRef;
window.isLocalMode = isLocalMode;
window.setIsLocalMode = (val) => { isLocalMode = val; window.isLocalMode = val; };
window.clearLocalData = (path) => {
    if (!path) {
        window.localData = {};
    }
    else {
        const parts = path.split("/").filter(p => p);
        let curr = window.localData;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!curr[parts[i]])
                return;
            curr = curr[parts[i]];
        }
        delete curr[parts[parts.length - 1]];
    }
};
