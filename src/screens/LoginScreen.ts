// =========================
// LoginScreen - Tela de Login/Registro (com Google, Confirmação de Senha, Recuperação)
// =========================

import { Screen } from './ScreenManager.js';
import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';
import { Logger, LogCategory } from '../utils/Logger.js';
import LocaleManager from '../data/LocaleManager.js';
import { AuthManager } from '../core/AuthManager.js';

declare var firebase: any;

type LoginMode = 'login' | 'register';

export class LoginScreen implements Screen {
    private container: HTMLDivElement | null = null;
    private isVisible: boolean = false;
    private currentMode: LoginMode = 'login';

    // Elementos do formulário
    private formContainer: HTMLDivElement | null = null;
    private emailInput: HTMLInputElement | null = null;
    private passwordInput: HTMLInputElement | null = null;
    private confirmPasswordInput: HTMLInputElement | null = null;
    private displayNameInput: HTMLInputElement | null = null;
    private submitButton: HTMLButtonElement | null = null;
    private toggleModeButton: HTMLButtonElement | null = null;
    private guestButton: HTMLButtonElement | null = null;
    private googleButton: HTMLButtonElement | null = null;
    private forgotPasswordButton: HTMLButtonElement | null = null;
    private closeButton: HTMLButtonElement | null = null;
    private errorMessage: HTMLDivElement | null = null;
    private titleElement: HTMLHeadingElement | null = null;

    constructor() {
        this.registerEventListeners();
        Logger.info(LogCategory.UI, '[LoginScreen] Tela de login inicializada');
    }

    /**
     * Registra listeners do EventBus
     */
    private registerEventListeners(): void {
        // Atualizar traduções quando idioma mudar
        EventBus.on(EventType.LANGUAGE_CHANGE, () => {
            this.updateTranslations();
        });

        // Login bem-sucedido
        EventBus.on(EventType.AUTH_LOGIN_SUCCESS, () => {
            this.hide();
            EventBus.emit(EventType.NOTIFICATION_SHOW, {
                message: LocaleManager.t('auth.loginSuccess'),
                type: 'success'
            });
        });

        // Erro de login
        EventBus.on(EventType.AUTH_LOGIN_ERROR, (data) => {
            this.showError(data.error);
        });

        // Convidado entrou
        EventBus.on(EventType.AUTH_GUEST_ENTER, () => {
            this.hide();
            EventBus.emit(EventType.NOTIFICATION_SHOW, {
                message: LocaleManager.t('auth.guestEnter'),
                type: 'info'
            });
        });

        // Estado de autenticação mudou (Fecha modal se usuário logado)
        EventBus.on(EventType.AUTH_STATE_CHANGED, (data) => {
            if (data && data.user && this.isVisible) {
                Logger.info(LogCategory.UI, '[LoginScreen] Usuário detectado, fechando modal');
                this.hide();
                EventBus.emit(EventType.NOTIFICATION_SHOW, {
                    message: LocaleManager.t('auth.loginSuccess'),
                    type: 'success'
                });
            }
        });

        Logger.info(LogCategory.UI, '[LoginScreen] EventBus listeners registrados');
    }

    /**
     * Renderiza a tela de login
     */
    private render(): void {
        if (this.container) return; // Já renderizado

        // Container principal
        this.container = document.createElement('div');
        this.container.id = 'login-screen';
        this.container.className = 'screen modal-overlay';
        this.container.style.display = 'none';

        // Modal interno
        const modal = document.createElement('div');
        modal.className = 'login-modal';

        // Botão fechar
        this.closeButton = document.createElement('button');
        this.closeButton.className = 'close-btn';
        this.closeButton.innerHTML = '×';
        this.closeButton.onclick = () => this.handleClose();
        modal.appendChild(this.closeButton);

        // Título
        this.titleElement = document.createElement('h2');
        this.titleElement.className = 'login-title';
        this.titleElement.textContent = LocaleManager.t('auth.loginTitle');
        modal.appendChild(this.titleElement);

        // Container do formulário
        this.formContainer = document.createElement('div');
        this.formContainer.className = 'login-form';

        // Campo de email
        const emailGroup = this.createInputGroup(
            'email',
            LocaleManager.t('auth.email'),
            'email'
        );
        this.emailInput = emailGroup.querySelector('input') as HTMLInputElement;
        this.formContainer.appendChild(emailGroup);

        // Campo de senha
        const passwordGroup = this.createInputGroup(
            'password',
            LocaleManager.t('auth.password'),
            'password'
        );
        this.passwordInput = passwordGroup.querySelector('input') as HTMLInputElement;
        this.formContainer.appendChild(passwordGroup);

        // Campo de confirmação de senha (só no registro)
        const confirmPasswordGroup = this.createInputGroup(
            'confirmPassword',
            LocaleManager.t('auth.confirmPassword'),
            'password'
        );
        this.confirmPasswordInput = confirmPasswordGroup.querySelector('input') as HTMLInputElement;
        confirmPasswordGroup.style.display = 'none';
        confirmPasswordGroup.setAttribute('data-mode', 'register');
        this.formContainer.appendChild(confirmPasswordGroup);

        // Campo de nome (só no registro)
        const displayNameGroup = this.createInputGroup(
            'displayName',
            LocaleManager.t('auth.displayName'),
            'text'
        );
        this.displayNameInput = displayNameGroup.querySelector('input') as HTMLInputElement;
        displayNameGroup.style.display = 'none';
        displayNameGroup.setAttribute('data-mode', 'register');
        this.formContainer.appendChild(displayNameGroup);

        // Botão "Esqueceu a senha?" (só no login)
        this.forgotPasswordButton = document.createElement('button');
        this.forgotPasswordButton.className = 'btn-link forgot-password';
        this.forgotPasswordButton.textContent = LocaleManager.t('auth.forgotPassword');
        this.forgotPasswordButton.onclick = () => this.handleForgotPassword();
        this.forgotPasswordButton.style.marginTop = '-8px';
        this.forgotPasswordButton.style.marginBottom = '8px';
        this.forgotPasswordButton.setAttribute('data-mode', 'login');
        this.formContainer.appendChild(this.forgotPasswordButton);

        // Mensagem de erro
        this.errorMessage = document.createElement('div');
        this.errorMessage.className = 'login-error';
        this.errorMessage.style.display = 'none';
        this.formContainer.appendChild(this.errorMessage);

        // Botão submit
        this.submitButton = document.createElement('button');
        this.submitButton.className = 'btn-primary login-submit';
        this.submitButton.textContent = LocaleManager.t('auth.loginButton');
        this.submitButton.onclick = () => this.handleSubmit();
        this.formContainer.appendChild(this.submitButton);

        // Botão trocar modo (login/registro)
        this.toggleModeButton = document.createElement('button');
        this.toggleModeButton.className = 'btn-link login-toggle';
        this.toggleModeButton.textContent = LocaleManager.t('auth.switchToRegister');
        this.toggleModeButton.onclick = () => this.toggleMode();
        this.formContainer.appendChild(this.toggleModeButton);

        // Divisor
        const divider = document.createElement('div');
        divider.className = 'login-divider';
        divider.textContent = LocaleManager.t('common.or');
        this.formContainer.appendChild(divider);

        // Botão Google Login
        this.googleButton = document.createElement('button');
        this.googleButton.className = 'btn-secondary login-google';
        this.googleButton.innerHTML = `
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style="margin-right:8px; vertical-align:middle;">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#$FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            ${LocaleManager.t('auth.loginWithGoogle')}
        `;
        this.googleButton.onclick = () => this.handleGoogleLogin();
        this.formContainer.appendChild(this.googleButton);

        // Botão convidado
        this.guestButton = document.createElement('button');
        this.guestButton.className = 'btn-secondary login-guest';
        this.guestButton.textContent = LocaleManager.t('auth.continueAsGuest');
        this.guestButton.onclick = () => this.handleGuestLogin();
        this.formContainer.appendChild(this.guestButton);

        modal.appendChild(this.formContainer);
        this.container.appendChild(modal);

        // Adicionar ao body
        document.body.appendChild(this.container);

        Logger.info(LogCategory.UI, '[LoginScreen] Tela renderizada');
    }

    /**
     * Cria um grupo de input (label + input)
     */
    private createInputGroup(id: string, label: string, type: string): HTMLDivElement {
        const group = document.createElement('div');
        group.className = 'input-group';

        const labelElement = document.createElement('label');
        labelElement.htmlFor = `login-${id}`;
        labelElement.textContent = label;
        labelElement.setAttribute('data-i18n', `auth.${id}`);

        const input = document.createElement('input');
        input.id = `login-${id}`;
        input.type = type;
        input.required = true;

        group.appendChild(labelElement);
        group.appendChild(input);

        return group;
    }

    /**
     * Exibe a tela
     */
    show(): void {
        if (!this.container) {
            this.render();
        }

        if (this.container) {
            this.container.style.display = 'flex';
            this.isVisible = true;
            this.clearForm();
            this.updateTranslations();
            Logger.info(LogCategory.UI, '[LoginScreen] Tela exibida');
        }
    }

    /**
     * Esconde a tela
     */
    hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
            this.isVisible = false;
            this.clearForm();
            Logger.info(LogCategory.UI, '[LoginScreen] Tela escondida');
        }
    }

    /**
     * Atualiza a tela (não usado)
     */
    update(): void {
        // LoginScreen é estática
    }

    /**
     * Destrói a tela
     */
    destroy(): void {
        this.container?.remove();
        this.container = null;
        Logger.info(LogCategory.UI, '[LoginScreen] Tela destruída');
    }

    /**
     * Alterna entre login e registro
     */
    private toggleMode(): void {
        this.currentMode = this.currentMode === 'login' ? 'register' : 'login';
        this.updateMode();
        this.clearError();

        // Som de click
        EventBus.emit(EventType.AUDIO_PLAY_CLICK, {});
    }

    /**
     * Atualiza UI baseado no modo atual
     */
    private updateMode(): void {
        if (!this.formContainer) return;

        // Mostrar/esconder campos específicos do modo
        const registerOnlyFields = this.formContainer.querySelectorAll('[data-mode="register"]') as NodeListOf<HTMLElement>;
        registerOnlyFields.forEach(field => {
            field.style.display = this.currentMode === 'register' ? 'block' : 'none';
        });

        const loginOnlyFields = this.formContainer.querySelectorAll('[data-mode="login"]') as NodeListOf<HTMLElement>;
        loginOnlyFields.forEach(field => {
            field.style.display = this.currentMode === 'login' ? 'block' : 'none';
        });

        // Atualizar textos
        if (this.titleElement) {
            this.titleElement.textContent = LocaleManager.t(
                this.currentMode === 'login' ? 'auth.loginTitle' : 'auth.registerTitle'
            );
        }

        if (this.submitButton) {
            this.submitButton.textContent = LocaleManager.t(
                this.currentMode === 'login' ? 'auth.loginButton' : 'auth.registerButton'
            );
        }

        if (this.toggleModeButton) {
            this.toggleModeButton.textContent = LocaleManager.t(
                this.currentMode === 'login' ? 'auth.switchToRegister' : 'auth.switchToLogin'
            );
        }
    }

    /**
     * Handler do submit
     */
    private async handleSubmit(): Promise<void> {
        if (!this.emailInput || !this.passwordInput) return;

        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;

        this.clearError();

        // Som de press
        EventBus.emit(EventType.AUDIO_PLAY_PRESS, {});

        try {
            if (this.currentMode === 'login') {
                await AuthManager.loginWithEmail(email, password);
            } else {
                // Registro: validar confirmação de senha
                if (!this.confirmPasswordInput || !this.displayNameInput) return;

                const confirmPassword = this.confirmPasswordInput.value;
                const displayName = this.displayNameInput.value.trim();

                // Validar senhas
                if (password !== confirmPassword) {
                    this.showError(LocaleManager.t('auth.passwordMismatch'));
                    return;
                }

                await AuthManager.registerWithEmail(email, password, displayName);
            }
        } catch (error: any) {
            // Erro já tratado pelo listener AUTH_LOGIN_ERROR
        }
    }

    /**
     * Handler do login com Google
     */
    private async handleGoogleLogin(): Promise<void> {
        this.clearError();
        EventBus.emit(EventType.AUDIO_PLAY_CLICK, {});

        try {
            if (typeof firebase === 'undefined' || !firebase.auth) {
                this.showError('Firebase não inicializado');
                return;
            }

            const provider = new firebase.auth.GoogleAuthProvider();
            await firebase.auth().signInWithPopup(provider);

            Logger.info(LogCategory.SYSTEM, '[LoginScreen] Login com Google bem-sucedido');
            // onAuthStateChanged do AuthManager irá lidar com o resto
        } catch (error: any) {
            Logger.error(LogCategory.SYSTEM, '[LoginScreen] Erro no login com Google:', error);
            this.showError(error.message || 'Erro ao fazer login com Google');
        }
    }

    /**
     * Handler do login como convidado
     */
    private async handleGuestLogin(): Promise<void> {
        this.clearError();

        // Som de click
        EventBus.emit(EventType.AUDIO_PLAY_CLICK, {});

        try {
            await AuthManager.loginAsGuest();
        } catch (error: any) {
            // Erro já tratado pelo listener AUTH_LOGIN_ERROR
        }
    }

    /**
     * Handler do "Esqueceu a senha?"
     */
    private async handleForgotPassword(): Promise<void> {
        EventBus.emit(EventType.AUDIO_PLAY_CLICK, {});

        const email = this.emailInput?.value.trim();
        if (!email) {
            this.showError('Digite seu e-mail para recuperar a senha');
            return;
        }

        try {
            if (typeof firebase === 'undefined' || !firebase.auth) {
                this.showError('Firebase não inicializado');
                return;
            }

            await firebase.auth().sendPasswordResetEmail(email);

            EventBus.emit(EventType.NOTIFICATION_SHOW, {
                message: 'E-mail de recuperação enviado! Verifique sua caixa de entrada.',
                type: 'success'
            });

            Logger.info(LogCategory.SYSTEM, `[LoginScreen] E-mail de recuperação enviado para: ${email}`);
        } catch (error: any) {
            Logger.error(LogCategory.SYSTEM, '[LoginScreen] Erro ao enviar e-mail de recuperação:', error);
            this.showError('Erro ao enviar e-mail de recuperação. Verifique o endereço.');
        }
    }

    /**
     * Handler do botão fechar
     */
    private handleClose(): void {
        // Som de click
        EventBus.emit(EventType.AUDIO_PLAY_CLICK, {});

        this.hide();

        // Voltar ao menu principal
        EventBus.emit(EventType.SCREEN_CHANGE, { from: 'login', to: 'main-menu' });
    }

    /**
     * Mostra mensagem de erro
     */
    private showError(message: string): void {
        if (!this.errorMessage) return;

        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';

        Logger.warn(LogCategory.UI, `[LoginScreen] Erro: ${message}`);
    }

    /**
     * Limpa mensagem de erro
     */
    private clearError(): void {
        if (this.errorMessage) {
            this.errorMessage.textContent = '';
            this.errorMessage.style.display = 'none';
        }
    }

    /**
     * Limpa formulário
     */
    private clearForm(): void {
        if (this.emailInput) this.emailInput.value = '';
        if (this.passwordInput) this.passwordInput.value = '';
        if (this.confirmPasswordInput) this.confirmPasswordInput.value = '';
        if (this.displayNameInput) this.displayNameInput.value = '';
        this.clearError();
    }

    /**
     * Atualiza traduções
     */
    private updateTranslations(): void {
        this.updateMode();

        // Atualizar labels
        if (this.formContainer) {
            const labels = this.formContainer.querySelectorAll('[data-i18n]');
            labels.forEach((label) => {
                const key = label.getAttribute('data-i18n');
                if (key) {
                    label.textContent = LocaleManager.t(key);
                }
            });
        }

        // Atualizar botões
        if (this.guestButton) {
            this.guestButton.textContent = LocaleManager.t('auth.continueAsGuest');
        }

        if (this.googleButton) {
            // Manter o ícone SVG e atualizar apenas o texto
            const svgIcon = this.googleButton.querySelector('svg');
            this.googleButton.textContent = '';
            if (svgIcon) this.googleButton.appendChild(svgIcon);
            this.googleButton.appendChild(document.createTextNode(' ' + LocaleManager.t('auth.loginWithGoogle')));
        }

        if (this.forgotPasswordButton) {
            this.forgotPasswordButton.textContent = LocaleManager.t('auth.forgotPassword');
        }

        // Atualizar divisor
        const divider = this.formContainer?.querySelector('.login-divider');
        if (divider) {
            divider.textContent = LocaleManager.t('common.or');
        }

        Logger.info(LogCategory.UI, '[LoginScreen] Traduções atualizadas');
    }

    /**
     * Verifica se a tela está ativa
     */
    isActive(): boolean {
        return this.isVisible;
    }
}
