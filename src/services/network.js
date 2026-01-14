// =========================
// Network Service (Firebase + LocalDB Abstraction)
// =========================

// Configuração do Firebase
const firebaseConfig = window.firebaseSecrets || {};

// Inicializa Firebase se disponível
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
} else {
    console.error("Firebase SDK not loaded!");
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
        console.log(`[LocalDB SET] ${this.path} = ${logVal}`);
        this._setVal(val);
        this._trigger("value");
    }
    update(val) {
        const logVal = (typeof val === 'object' && val !== null) ? JSON.stringify(val).substring(0, 100) + (JSON.stringify(val).length > 100 ? "..." : "") : val;
        console.log(`[LocalDB UPDATE] ${this.path} += ${logVal}`);
        let current = this._getVal() || {};
        Object.assign(current, val);
        this._setVal(current);
        this._trigger("value");
    }
    remove() {
        console.log(`[LocalDB REMOVE] ${this.path}`);
        this._setVal(null);
        this._trigger("value");
    }
    push() {
        const id = "local_" + Math.random().toString(36).substring(2, 7);
        return new LocalRef(this.path + "/" + id);
    }
    on(event, callback) {
        if (!localListeners[this.path]) localListeners[this.path] = [];
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
            if (onComplete) onComplete(null, true, { val: () => newVal });
        } else {
            if (onComplete) onComplete(null, false, null);
        }
    }
    _getVal() {
        const parts = this.path.split("/").filter(p => p);
        let curr = window.localData;
        for (const p of parts) {
            if (!curr) return null;
            curr = curr[p];
        }
        return curr === undefined ? null : curr;
    }
    _setVal(val) {
        const parts = this.path.split("/").filter(p => p);
        let curr = window.localData;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!curr[parts[i]]) curr[parts[i]] = {};
            curr = curr[parts[i]];
        }
        if (parts.length > 0) {
            curr[parts[parts.length - 1]] = val;
        } else {
            window.localData = val;
        }
    }
    _trigger(event) {
        const parts = this.path.split("/");
        let currentPath = "";
        const pathsToNotify = [];
        parts.forEach(p => {
            if (currentPath) currentPath += "/";
            currentPath += p;
            pathsToNotify.push(currentPath);
        });

        console.log(`[LocalDB TRIGGER] Disparando '${event}' para paths:`, pathsToNotify);
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
                            console.error(`[LocalDB ERROR] Erro no listener de ${notifyPath}:`, err);
                        }
                    }
                });
            }
        });
    }
}

function getDBRef(path) {
    if (window.isLocalMode || (window.salaAtual && window.salaAtual.startsWith("MODO_"))) {
        return new LocalRef(path);
    }
    if (!db) return null;
    return db.ref(path);
}

window.getDBRef = getDBRef;
window.isLocalMode = isLocalMode;
window.setIsLocalMode = (val) => { isLocalMode = val; }; // helper if needed
window.clearLocalData = (path) => {
    if (!path) {
        window.localData = {};
    } else {
        const parts = path.split("/").filter(p => p);
        let curr = window.localData;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!curr[parts[i]]) return;
            curr = curr[parts[i]];
        }
        delete curr[parts[parts.length - 1]];
    }
};
