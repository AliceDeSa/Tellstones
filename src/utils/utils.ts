// =========================
// Utilidades Gerais do Tellstones
// =========================
export const safeStorage = {
    getItem(key: string): string | null {
        try {
            return localStorage.getItem(key);
        }
        catch (e) {
            console.warn("localStorage access denied:", e);
            return null;
        }
    },
    setItem(key: string, value: string): void {
        try {
            localStorage.setItem(key, value);
        }
        catch (e) {
            console.warn("localStorage write failed:", e);
        }
    },
    removeItem(key: string): void {
        try {
            localStorage.removeItem(key);
        }
        catch (e) {
            console.warn("localStorage remove failed:", e);
        }
    }
};
// Gera um código aleatório para a sala (6 caracteres, letras e números)
export function gerarCodigoSala(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}
// Garante que o valor seja um array (Firebase pode converter para objeto)
export function garantirArray(val: any): any[] {
    if (!val)
        return [];
    if (Array.isArray(val))
        return val;
    if (typeof val === 'object') {
        const keys = Object.keys(val).map(Number).filter(k => !isNaN(k) && Number.isInteger(k));
        if (keys.length > 0) {
            const maxKey = Math.max(...keys);
            if (maxKey < 50) {
                const arr = new Array(maxKey + 1).fill(null);
                Object.entries(val).forEach(([k, v]) => {
                    arr[parseInt(k)] = v;
                });
                return arr;
            }
        }
        return Object.values(val);
    }
    return [];
}
// Backwards compatibility for legacy JS code
(window as any).safeStorage = safeStorage;
(window as any).gerarCodigoSala = gerarCodigoSala;
(window as any).garantirArray = garantirArray;
