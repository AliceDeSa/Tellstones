export interface GameLayoutConfig {
    STONE_SIZE: number;
    SLOT_COUNT: number;
    RADIUS_HORIZONTAL: number;
    RADIUS_VERTICAL: number;
    Y_OFFSET_RATIO: number;
    Y_OFFSET_FIXED: number;
}

export interface AnimationConfig {
    SWAP_DURATION: number;
    EASING: string;
    ARC_HEIGHT: number;
    SAFETY_TIMEOUT: number;
}

export interface ZIndexConfig {
    BASE: number;
    HOVER: number;
    DRAGGING: number;
    MODAL: number;
    ANIMATION_OVERLAY: number;
    CLONE: number;
}

export interface IGameConfig {
    LAYOUT: GameLayoutConfig;
    ANIMATION: AnimationConfig;
    Z_INDEX: ZIndexConfig;
}

/**
 * Configuração Global do Jogo
 * Centraliza constantes de layout, animação e z-index.
 */
export const GameConfig: IGameConfig = {
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

// Backwards compatibility for legacy JS code
(window as any).GameConfig = GameConfig;
