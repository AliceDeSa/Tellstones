// =========================
// Events - Definição de Tipos de Eventos
// =========================

/**
 * Tipos de eventos disponíveis no EventBus
 */
export enum EventType {
    // Navegação de Telas
    SCREEN_CHANGE = 'SCREEN:CHANGE',
    SCREEN_SHOW = 'SCREEN:SHOW',
    SCREEN_HIDE = 'SCREEN:HIDE',

    // Fluxo de Jogo
    GAME_START = 'GAME:START',
    GAME_END = 'GAME:END',
    GAME_PAUSE = 'GAME:PAUSE',
    GAME_RESUME = 'GAME:RESUME',

    // Turnos
    TURN_START = 'TURN:START',
    TURN_END = 'TURN:END',
    TURN_ADVANCE = 'TURN:ADVANCE',

    // Ações de Jogo
    ACTION_PLACE = 'ACTION:PLACE',
    ACTION_FLIP = 'ACTION:FLIP',
    ACTION_SWAP = 'ACTION:SWAP',
    ACTION_PEEK = 'ACTION:PEEK',
    ACTION_CHALLENGE = 'ACTION:CHALLENGE',
    ACTION_BOAST = 'ACTION:BOAST',

    // Estado
    STATE_UPDATE = 'STATE:UPDATE',
    STATE_SAVE = 'STATE:SAVE',
    STATE_LOAD = 'STATE:LOAD',

    // Configurações
    SETTINGS_UPDATE = 'SETTINGS:UPDATE',
    SETTINGS_SAVE = 'SETTINGS:SAVE',
    SETTINGS_LOAD = 'SETTINGS:LOAD',

    // Tema
    THEME_CHANGE = 'THEME:CHANGE',
    THEME_LOAD = 'THEME:LOAD',

    // UI
    UI_UPDATE = 'UI:UPDATE',
    UI_NOTIFICATION = 'UI:NOTIFICATION',
    UI_ANIMATION = 'UI:ANIMATION',

    // Economia
    CURRENCY_CHANGE = 'CURRENCY:CHANGE',
    SHOP_PURCHASE = 'SHOP:PURCHASE',
    REWARD_EARNED = 'REWARD:EARNED',

    // Bot/AI
    BOT_THINKING = 'BOT:THINKING',
    BOT_ACTION = 'BOT:ACTION',
    BOT_RESPONSE = 'BOT:RESPONSE',

    // Tutorial
    TUTORIAL_START = 'TUTORIAL:START',
    TUTORIAL_END = 'TUTORIAL:END',
    TUTORIAL_STEP_START = 'TUTORIAL:STEP:START',
    TUTORIAL_STEP_COMPLETE = 'TUTORIAL:STEP:COMPLETE',
    TUTORIAL_HINT = 'TUTORIAL:HINT',
    TUTORIAL_RESTRICTION = 'TUTORIAL:RESTRICTION',

    // Audio
    AUDIO_MUTE_CHANGED = 'AUDIO:MUTE:CHANGED',

    // Idioma
    LANGUAGE_CHANGE = 'LANGUAGE:CHANGE',
}

/**
 * Dados de cada tipo de evento
 */
export interface EventData {
    [EventType.AUDIO_MUTE_CHANGED]: { isMuted: boolean };

    [EventType.SCREEN_CHANGE]: { from: string; to: string };
    [EventType.SCREEN_SHOW]: { screen: string };
    [EventType.SCREEN_HIDE]: { screen: string };

    [EventType.GAME_START]: { mode: 'tutorial' | 'pve' | 'campaign' | 'online' };
    [EventType.GAME_END]: { winner: { id: string; nome: string } | null; reason: string };
    [EventType.GAME_PAUSE]: {};
    [EventType.GAME_RESUME]: {};

    [EventType.TURN_START]: { playerIndex: number; playerName: string };
    [EventType.TURN_END]: { playerIndex: number };
    [EventType.TURN_ADVANCE]: {};

    [EventType.ACTION_PLACE]: { slot: number; stoneName: string };
    [EventType.ACTION_FLIP]: { slot: number };
    [EventType.ACTION_SWAP]: { from: number; to: number };
    [EventType.ACTION_PEEK]: { slot: number };
    [EventType.ACTION_CHALLENGE]: { slot: number; guess: string };
    [EventType.ACTION_BOAST]: {};

    [EventType.STATE_UPDATE]: { state: any; reason: string };
    [EventType.STATE_SAVE]: {};
    [EventType.STATE_LOAD]: {};

    [EventType.SETTINGS_UPDATE]: { key: string; value: any };
    [EventType.SETTINGS_SAVE]: {};
    [EventType.SETTINGS_LOAD]: {};

    [EventType.THEME_CHANGE]: { theme: string };
    [EventType.THEME_LOAD]: { theme: string };

    [EventType.UI_UPDATE]: { component: string; data: any };
    [EventType.UI_NOTIFICATION]: { message: string; type: 'info' | 'success' | 'error' };
    [EventType.UI_ANIMATION]: { animation: string; target: string };

    [EventType.CURRENCY_CHANGE]: { amount: number; reason: string };
    [EventType.SHOP_PURCHASE]: { item: string; cost: number };
    [EventType.REWARD_EARNED]: { type: string; amount: number };

    [EventType.BOT_THINKING]: { thinking: boolean };
    [EventType.BOT_ACTION]: { action: any };
    [EventType.BOT_RESPONSE]: { response: any };

    [EventType.TUTORIAL_START]: {};
    [EventType.TUTORIAL_END]: { completed: boolean; reason?: string };
    [EventType.TUTORIAL_STEP_START]: { step: number; title: string; description?: string };
    [EventType.TUTORIAL_STEP_COMPLETE]: { step: number; success: boolean };
    [EventType.TUTORIAL_HINT]: { hint: string; step: number };
    [EventType.TUTORIAL_RESTRICTION]: { allowed: string[]; blocked: string[] };

    [EventType.LANGUAGE_CHANGE]: { language: 'pt-BR' | 'en-US' };
}

/**
 * Listener de evento
 */
export type EventListener<T extends EventType> = (data: EventData[T]) => void;
