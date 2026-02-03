// =========================
// Login Integration - Integração do sistema de login
// =========================

import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';
import { AuthManager } from '../core/AuthManager.js';
import { LoginScreen } from '../screens/LoginScreen.js';

// Esperar DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    // Instanciar LoginScreen
    const loginScreen = new LoginScreen();

    // Elementos do DOM
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');
    const userDisplayName = document.getElementById('user-display-name');
    const logoutBtn = document.getElementById('logout-btn');

    if (!loginBtn || !userInfo || !userDisplayName || !logoutBtn) {
        console.error('[LoginIntegration] Elementos do DOM não encontrados');
        return;
    }

    /**
     * Atualiza UI baseado no estado de autenticação
     */
    function updateAuthUI() {
        if (!loginBtn || !userInfo || !userDisplayName) return;

        const user = AuthManager.getCurrentUser();

        if (user) {
            // Usuário logado
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';
            userDisplayName.textContent = user.displayName;

            // Adicionar ícone se for convidado
            if (user.isAnonymous) {
                userDisplayName.innerHTML = `👤 ${user.displayName}`;
            } else {
                userDisplayName.innerHTML = `✅ ${user.displayName}`;
            }
        } else {
            // Usuário não logado
            loginBtn.style.display = 'block';
            userInfo.style.display = 'none';
        }
    }

    // Listener para mudanças de estado
    EventBus.on(EventType.AUTH_STATE_CHANGED, () => {
        updateAuthUI();
    });

    // Click no botão de login
    loginBtn.addEventListener('click', () => {
        EventBus.emit(EventType.AUDIO_PLAY_CLICK, {});
        loginScreen.show();
    });

    // Click no botão de logout
    logoutBtn.addEventListener('click', async () => {
        EventBus.emit(EventType.AUDIO_PLAY_CLICK, {});

        try {
            await AuthManager.logout();
            EventBus.emit(EventType.NOTIFICATION_SHOW, {
                message: 'Logout realizado com sucesso',
                type: 'success'
            });
        } catch (error) {
            console.error('[LoginIntegration] Erro ao fazer logout:', error);
        }
    });

    // Inicializar UI
    setTimeout(() => {
        updateAuthUI();
    }, 500); // Aguardar AuthManager inicializar

    console.log('[LoginIntegration] Sistema de login integrado');
});
