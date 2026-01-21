// =========================
// Utilidades Gerais do Tellstones
// =========================

// Gera um código aleatório para a sala (6 caracteres, letras e números)
function gerarCodigoSala() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Notification functions moved to NotificationManager.js

// Audio functions moved to AudioManager.js

// Garante que o valor seja um array (Firebase pode converter para objeto)
function garantirArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;

    // Tratamento robusto para objetos esparsos (Firebase)
    // Se chaves são inteiros, reconstrói array respeitando índices
    const keys = Object.keys(val).map(Number).filter(k => !isNaN(k) && Number.isInteger(k));
    if (keys.length > 0) {
        const maxKey = Math.max(...keys);
        // Heurística: Se maxKey é razoável (ex: < 50), trata como array
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
