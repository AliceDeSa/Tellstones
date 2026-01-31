// =========================
// Events - Definição de Tipos de Eventos
// =========================
/**
 * Tipos de eventos disponíveis no EventBus
 */
export var EventType;
(function (EventType) {
    // Navegação de Telas
    EventType["SCREEN_CHANGE"] = "SCREEN:CHANGE";
    EventType["SCREEN_SHOW"] = "SCREEN:SHOW";
    EventType["SCREEN_HIDE"] = "SCREEN:HIDE";
    // Fluxo de Jogo
    EventType["GAME_START"] = "GAME:START";
    EventType["GAME_END"] = "GAME:END";
    EventType["GAME_PAUSE"] = "GAME:PAUSE";
    EventType["GAME_RESUME"] = "GAME:RESUME";
    // Turnos
    EventType["TURN_START"] = "TURN:START";
    EventType["TURN_END"] = "TURN:END";
    EventType["TURN_ADVANCE"] = "TURN:ADVANCE";
    // Ações de Jogo
    EventType["ACTION_PLACE"] = "ACTION:PLACE";
    EventType["ACTION_FLIP"] = "ACTION:FLIP";
    EventType["ACTION_SWAP"] = "ACTION:SWAP";
    EventType["ACTION_PEEK"] = "ACTION:PEEK";
    EventType["ACTION_CHALLENGE"] = "ACTION:CHALLENGE";
    EventType["ACTION_BOAST"] = "ACTION:BOAST";
    // Estado
    EventType["STATE_UPDATE"] = "STATE:UPDATE";
    EventType["STATE_SAVE"] = "STATE:SAVE";
    EventType["STATE_LOAD"] = "STATE:LOAD";
    // Configurações
    EventType["SETTINGS_UPDATE"] = "SETTINGS:UPDATE";
    EventType["SETTINGS_SAVE"] = "SETTINGS:SAVE";
    EventType["SETTINGS_LOAD"] = "SETTINGS:LOAD";
    // Tema
    EventType["THEME_CHANGE"] = "THEME:CHANGE";
    EventType["THEME_LOAD"] = "THEME:LOAD";
    // UI
    EventType["UI_UPDATE"] = "UI:UPDATE";
    EventType["UI_NOTIFICATION"] = "UI:NOTIFICATION";
    EventType["UI_ANIMATION"] = "UI:ANIMATION";
    // Economia
    EventType["CURRENCY_CHANGE"] = "CURRENCY:CHANGE";
    EventType["SHOP_PURCHASE"] = "SHOP:PURCHASE";
    EventType["REWARD_EARNED"] = "REWARD:EARNED";
    // Bot/AI
    EventType["BOT_THINKING"] = "BOT:THINKING";
    EventType["BOT_ACTION"] = "BOT:ACTION";
    EventType["BOT_RESPONSE"] = "BOT:RESPONSE";
    // Tutorial
    EventType["TUTORIAL_START"] = "TUTORIAL:START";
    EventType["TUTORIAL_END"] = "TUTORIAL:END";
    EventType["TUTORIAL_STEP_START"] = "TUTORIAL:STEP:START";
    EventType["TUTORIAL_STEP_COMPLETE"] = "TUTORIAL:STEP:COMPLETE";
    EventType["TUTORIAL_HINT"] = "TUTORIAL:HINT";
    EventType["TUTORIAL_RESTRICTION"] = "TUTORIAL:RESTRICTION";
    // Audio
    EventType["AUDIO_MUTE_CHANGED"] = "AUDIO:MUTE:CHANGED";
    // Idioma
    EventType["LANGUAGE_CHANGE"] = "LANGUAGE:CHANGE";
})(EventType || (EventType = {}));
