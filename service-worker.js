const CACHE_NAME = 'tellstones-v5.1.0';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './assets/css/main.css',
    './assets/css/legacy_style.css',

    // Scripts Core
    './src/core/RoomManager.js',
    './src/core/GameController.js',
    './src/core/InputHandler.js',
    './src/core/GameRules.js',
    './src/core/AnalyticsManager.js',
    './src/core/constants.js',
    './src/core/Network.js',

    // Utils
    './src/utils/utils.js',
    './src/utils/Logger.js',

    // UI
    './src/ui/Renderer.js',
    './src/ui/NotificationManager.js',
    './src/ui/ChangelogManager.js',
    './src/ui/AnimationManager.js',
    './src/ui/effects/Confetti.js',
    './src/ui/AudioManager.js',

    // AI
    './src/ai/BotBrain.js',

    // Modes
    './src/modes/GameMode.js',
    './src/modes/MultiplayerMode.js',
    './src/modes/PvEMode.js',
    './src/modes/TutorialMode.js',

    // Images (Critical)
    './assets/img/logo.webp',
    './assets/img/Fundo.jpg',
    './assets/img/Tabuleiro.jpg',
    './assets/img/Cara.png',
    './assets/img/Coroa.png',
    './assets/img/bg_taverna.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching all: app shell and content');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', (event) => {
    // Network First for API/Firebase, Cache First for assets
    if (event.request.url.includes('firebase') || event.request.url.includes('google')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((r) => {
                // Cache hit - return response
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
                    return caches.delete(key);
                }
            }));
        })
    );
});
