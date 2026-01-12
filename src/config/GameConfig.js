/**
 * Configuração Global do Jogo
 * Centraliza constantes de layout, animação e z-index.
 */
const GameConfig = {
    // Layout
    LAYOUT: {
        STONE_SIZE: 68.39, // pixels
        SLOT_COUNT: 7,
        RADIUS_HORIZONTAL: 260, // raio aproximado (elipse)
        RADIUS_VERTICAL: 60,
        Y_OFFSET_RATIO: 0.15, // Porcentagem da altura do wrapper
        Y_OFFSET_FIXED: 40 // px
    },

    // Animação
    ANIMATION: {
        SWAP_DURATION: 1200, // ms
        EASING: "ease-in-out",
        ARC_HEIGHT: 80, // px (altura do arco da troca)
        SAFETY_TIMEOUT: 2500 // ms
    },

    // Z-Indices
    Z_INDEX: {
        BASE: 10,
        HOVER: 100,
        DRAGGING: 1000,
        MODAL: 100000,
        ANIMATION_OVERLAY: 999999,
        CLONE: 1000000
    }
};

window.GameConfig = GameConfig;
