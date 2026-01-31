const CACHE_NAME = 'tellstones-v6.0.1'; // Bumped for v6.0 ScreenManager
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './assets/css/main.css',
    './assets/css/legacy.css',

    // Scripts Core
    './dist/src/core/RoomManager.js',
    './dist/src/core/GameController.js',
    './dist/src/core/InputHandler.js',
    './dist/src/core/GameRules.js',
    './dist/src/core/AnalyticsManager.js',
    './dist/src/core/constants.js',
    './dist/src/core/Network.js',
    './dist/src/core/EventBus.js', // NEW v6.0
    './dist/src/config/GameConfig.js',
    './dist/src/main.js',

    // Screens (NEW v6.0)
    './dist/src/screens/ScreenManager.js',
    './dist/src/screens/MainMenu.js',
    './dist/src/screens/GameModes.js',

    // Utils
    './dist/src/utils/utils.js',
    './dist/src/utils/Logger.js',
    './dist/src/utils/DebugLoggerUI.js',

    // UI
    './dist/src/ui/Renderer.js',
    './dist/src/ui/NotificationManager.js',
    './dist/src/ui/ChangelogManager.js',
    './dist/src/ui/AnimationManager.js',
    './dist/src/ui/effects/Confetti.js',
    './dist/src/ui/CoinFlip.js',
    './dist/src/ui/AudioManager.js',

    // AI
    './dist/src/ai/BotBrain.js',
    './dist/src/ai/BotMemory.js',

    // Modes
    './dist/src/modes/GameMode.js',
    './dist/src/modes/MultiplayerMode.js',
    './dist/src/modes/PvEMode.js',
    './dist/src/modes/TutorialMode.js',
    './dist/src/modes/TellstonesTutorial.js',

    // Images (Critical)
    './assets/img/ui/logo.webp',
    './assets/img/ui/Desafiar.webp',
    './assets/img/ui/Se_Gabar.webp',
    './assets/img/ui/notification_icon.png',
    './assets/img/ui/card_actions.png',
    './assets/img/ui/Ações.png',
    './assets/img/backgrounds/Fundo.jpg',
    './assets/img/tables/classic/Tabuleiro.jpg',
    './assets/img/coins/classic/Cara.png',
    './assets/img/coins/classic/Coroa.png',
    './assets/img/backgrounds/bg_taverna.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker v6.0] Caching assets...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch((err) => {
                console.error('[Service Worker] Cache failed:', err);
            })
    );
});

self.addEventListener('fetch', (event) => {
    // Network First for API/Firebase, Cache First for assets
    if (event.request.url.includes('firebase') || event.request.url.includes('google') || event.request.url.includes('doubleclick')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((r) => {
                if (r) {
                    return r;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache:', key);
                    return caches.delete(key);
                }
            }));
        }).then(() => {
            console.log('[Service Worker v6.0] Activated');
            return self.clients.claim();
        })
    );
});
