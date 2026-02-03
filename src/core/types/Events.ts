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
    BOT_SPEECH = 'BOT:SPEECH',

    // PvE Mode Specific
    PVE_GAME_INIT = 'PVE:GAME:INIT',
    PVE_STATE_PERSIST = 'PVE:STATE:PERSIST',
    PVE_SWAP_ANIMATION_COMPLETE = 'PVE:SWAP:ANIMATION:COMPLETE',
    PVE_RENDER_REQUEST = 'PVE:RENDER:REQUEST',

    // Multiplayer Mode Specific
    MULTIPLAYER_STATE_UPDATE = 'MULTIPLAYER:STATE:UPDATE',
    MULTIPLAYER_ROOM_JOIN = 'MULTIPLAYER:ROOM:JOIN',
    MULTIPLAYER_LOBBY_UPDATE = 'MULTIPLAYER:LOBBY:UPDATE',
    MULTIPLAYER_VICTORY = 'MULTIPLAYER:VICTORY',
    MULTIPLAYER_GAME_START = 'MULTIPLAYER:GAME:START',

    // Room Management
    ROOM_FETCH_STATE = 'ROOM:FETCH:STATE',
    ROOM_LIST_UPDATE = 'ROOM:LIST:UPDATE',
    ROOM_CREATED = 'ROOM:CREATED',

    // Tutorial
    TUTORIAL_START = 'TUTORIAL:START',
    TUTORIAL_END = 'TUTORIAL:END',
    TUTORIAL_STEP_START = 'TUTORIAL:STEP:START',
    TUTORIAL_STEP_COMPLETE = 'TUTORIAL:STEP:COMPLETE',
    TUTORIAL_HINT = 'TUTORIAL:HINT',
    TUTORIAL_RESTRICTION = 'TUTORIAL:RESTRICTION',

    // Audio
    AUDIO_MUTE_CHANGED = 'AUDIO:MUTE:CHANGED',
    AUDIO_MUSIC_VOLUME = 'AUDIO:MUSIC:VOLUME',
    AUDIO_SFX_VOLUME = 'AUDIO:SFX:VOLUME',
    AUDIO_PLAY_CLICK = 'AUDIO:PLAY:CLICK',
    AUDIO_PLAY_PRESS = 'AUDIO:PLAY:PRESS',

    // Notifications
    NOTIFICATION_SHOW = 'NOTIFICATION:SHOW',

    // Autenticação
    AUTH_LOGIN_SUCCESS = 'AUTH:LOGIN:SUCCESS',
    AUTH_LOGIN_ERROR = 'AUTH:LOGIN:ERROR',
    AUTH_LOGOUT = 'AUTH:LOGOUT',
    AUTH_GUEST_ENTER = 'AUTH:GUEST:ENTER',
    AUTH_STATE_CHANGED = 'AUTH:STATE:CHANGED',

    // Room/Lobby
    ROOM_PLAYERS_UPDATE = 'ROOM:PLAYERS:UPDATE',
    ROOM_SPECTATORS_UPDATE = 'ROOM:SPECTATORS:UPDATE',
    ROOM_START = 'ROOM:START',
    ROOM_LEAVE = 'ROOM:LEAVE',

    // Idioma
    LANGUAGE_CHANGE = 'LANGUAGE:CHANGE',
}

/**
 * Dados de cada tipo de evento
 */
export interface EventData {
    // Audio Events
    [EventType.AUDIO_MUTE_CHANGED]: { isMuted: boolean };
    [EventType.AUDIO_MUSIC_VOLUME]: { volume: number };
    [EventType.AUDIO_SFX_VOLUME]: { volume: number };
    [EventType.AUDIO_PLAY_CLICK]: {};
    [EventType.AUDIO_PLAY_PRESS]: {};

    // Notification Events
    [EventType.NOTIFICATION_SHOW]: { message: string; type?: 'info' | 'success' | 'error' | 'warning' };

    // Auth Events
    [EventType.AUTH_LOGIN_SUCCESS]: { user: { uid: string; email: string; displayName: string; isAnonymous: boolean } };
    [EventType.AUTH_LOGIN_ERROR]: { error: string };
    [EventType.AUTH_LOGOUT]: {};
    [EventType.AUTH_GUEST_ENTER]: {};
    [EventType.AUTH_STATE_CHANGED]: { isLoggedIn: boolean; user: any | null };

    // Room Events
    [EventType.ROOM_PLAYERS_UPDATE]: { players: any[] };
    [EventType.ROOM_SPECTATORS_UPDATE]: { spectators: any[] };
    [EventType.ROOM_START]: { roomCode: string };
    [EventType.ROOM_LEAVE]: {};

    // Screen Events
    [EventType.SCREEN_CHANGE]: { from: string; to: string };
    [EventType.SCREEN_SHOW]: { screen: string };
    [EventType.SCREEN_HIDE]: { screen: string };

    // Game Events
    [EventType.GAME_START]: { mode: 'tutorial' | 'pve' | 'campaign' | 'online' };
    [EventType.GAME_END]: { winner: { id: string; nome: string } | null; reason: string };
    [EventType.GAME_PAUSE]: {};
    [EventType.GAME_RESUME]: {};

    // Turn Events
    [EventType.TURN_START]: { playerIndex: number; playerName: string };
    [EventType.TURN_END]: { playerIndex: number };
    [EventType.TURN_ADVANCE]: {};

    // Action Events
    [EventType.ACTION_PLACE]: { slot: number; stoneName: string };
    [EventType.ACTION_FLIP]: { slot: number };
    [EventType.ACTION_SWAP]: { from: number; to: number };
    [EventType.ACTION_PEEK]: { slot: number };
    [EventType.ACTION_CHALLENGE]: { slot: number; guess: string };
    [EventType.ACTION_BOAST]: {};

    // State Events
    [EventType.STATE_UPDATE]: { state: any; reason: string };
    [EventType.STATE_SAVE]: {};
    [EventType.STATE_LOAD]: {};

    // Settings Events
    [EventType.SETTINGS_UPDATE]: { key: string; value: any };
    [EventType.SETTINGS_SAVE]: {};
    [EventType.SETTINGS_LOAD]: {};

    // Theme Events
    [EventType.THEME_CHANGE]: { theme: string };
    [EventType.THEME_LOAD]: { theme: string };

    // UI Events
    [EventType.UI_UPDATE]: { component: string; data: any };
    [EventType.UI_NOTIFICATION]: { message: string; type: 'info' | 'success' | 'error' | 'warning' };
    [EventType.UI_ANIMATION]: { animation: string; target: string };

    // Economy Events
    [EventType.CURRENCY_CHANGE]: { amount: number; reason: string };
    [EventType.SHOP_PURCHASE]: { item: string; cost: number };
    [EventType.REWARD_EARNED]: { type: string; amount: number };

    // Bot Events
    [EventType.BOT_THINKING]: { thinking: boolean };
    [EventType.BOT_ACTION]: { action: any };
    [EventType.BOT_RESPONSE]: { response: any };
    [EventType.BOT_SPEECH]: { message: string; duration?: number };

    // PvE Events
    [EventType.PVE_GAME_INIT]: { players: { nome: string; id: string; pontos: number }[] };
    [EventType.PVE_STATE_PERSIST]: {};
    [EventType.PVE_SWAP_ANIMATION_COMPLETE]: { from: number; to: number; player: string };
    [EventType.PVE_RENDER_REQUEST]: { components: string[] };

    // Multiplayer Events
    [EventType.MULTIPLAYER_STATE_UPDATE]: { state: any };
    [EventType.MULTIPLAYER_ROOM_JOIN]: { roomCode: string; playerName: string; type: 'jogador' | 'espectador' };
    [EventType.MULTIPLAYER_LOBBY_UPDATE]: { roomCode: string; players: any[]; spectators: any[] };
    [EventType.MULTIPLAYER_VICTORY]: { winner: any; isLocalPlayer: boolean };
    [EventType.MULTIPLAYER_GAME_START]: { roomCode: string; players: any[]; spectators: any[] };

    // Room Management Events
    [EventType.ROOM_FETCH_STATE]: { roomCode: string };
    [EventType.ROOM_LIST_UPDATE]: { rooms: any[] };
    [EventType.ROOM_CREATED]: { roomCode: string; config: any };

    // Tutorial Events
    [EventType.TUTORIAL_START]: {};
    [EventType.TUTORIAL_END]: { completed: boolean; reason?: string };
    [EventType.TUTORIAL_STEP_START]: { step: number; title: string; description?: string };
    [EventType.TUTORIAL_STEP_COMPLETE]: { step: number; success: boolean };
    [EventType.TUTORIAL_HINT]: { hint: string; step: number };
    [EventType.TUTORIAL_RESTRICTION]: { allowed: string[]; blocked: string[] };

    // Language Events
    [EventType.LANGUAGE_CHANGE]: { language: 'pt-BR' | 'en-US' };
}

/**
 * Listener de evento
 */
export type EventListener<T extends EventType> = (data: EventData[T]) => void;
