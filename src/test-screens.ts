// Teste rápido do ScreenManager
// Adicionar ao final do main.ts temporariamente

import { ScreenManager } from './screens/ScreenManager.js';
import { MainMenu } from './screens/MainMenu.js';
import { Customization } from './screens/Customization.js';
import { Settings } from './screens/Settings.js';
import { GameScreen } from './screens/GameScreen.js';
import { GameModesScreen } from './screens/GameModesScreen.js';
import { LobbyScreen } from './screens/LobbyScreen.js';

// Inicializar telas
function initScreens() {
    const mainMenu = new MainMenu();
    const customization = new Customization();
    const settings = new Settings();
    const gameScreen = new GameScreen();
    const gameModesScreen = new GameModesScreen();
    const lobbyScreen = new LobbyScreen();

    ScreenManager.register('main-menu', mainMenu);
    ScreenManager.register('customization', customization);
    ScreenManager.register('settings', settings);
    ScreenManager.register('game', gameScreen);
    ScreenManager.register('game-modes', gameModesScreen);
    ScreenManager.register('lobby', lobbyScreen);

    // Mostrar menu principal
    ScreenManager.navigateTo('main-menu');

    // Expor globalmente para acesso externo
    (window as any).ScreenManager = ScreenManager;

    console.log('[ScreenManager Test] Initialized');
    // console.log('Try: ScreenManager.navigateTo("customization")');
    console.log('Try: ScreenManager.navigateTo("settings")');
    console.log('Try: ScreenManager.goBack()');
}

// Chamar após DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScreens);
} else {
    initScreens();
}
