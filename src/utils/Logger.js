// =========================
// Logger Utility
// Centraliza logs e controla verbosidade (Dev vs Prod)
// =========================

const Logger = {
    // Config: Altere para false em Produção ou use URL param ?debug=true
    isDev: window.location.hostname === 'localhost' || window.location.search.includes('debug=true') || window.location.search.includes('dev=true'),

    info: function (context, message, ...args) {
        console.log(`%c[${context}]`, 'color: #3498db; font-weight: bold;', message, ...args);
    },

    success: function (context, message, ...args) {
        console.log(`%c[${context}]`, 'color: #2ecc71; font-weight: bold;', message, ...args);
    },

    warn: function (context, message, ...args) {
        console.warn(`[${context}] ⚠️`, message, ...args);
    },

    error: function (context, message, ...args) {
        console.error(`[${context}] ❌`, message, ...args);
    },

    // Apenas aparece se estiver em modo DEV
    debug: function (context, message, ...args) {
        if (!this.isDev) return;
        // Debug cinza/diminuido para não poluir
        console.log(`%c[${context}][DEBUG]`, 'color: #95a5a6;', message, ...args);
    }
};

window.Logger = Logger;
window.IS_DEV = Logger.isDev; // Alias global
