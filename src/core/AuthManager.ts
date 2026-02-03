// =========================
// AuthManager - Gerenciador de Autenticação (Firebase)
// =========================

import { EventBus } from './EventBus.js';
import { EventType } from './types/Events.js';
import { Logger, LogCategory } from '../utils/Logger.js';

declare var firebase: any;

/**
 * Interface de usuário
 */
export interface User {
    uid: string;
    email: string;
    displayName: string;
    isAnonymous: boolean;
    isPremium: boolean;
}

/**
 * Gerenciador de autenticação Firebase
 */
class AuthManagerClass {
    private currentUser: User | null = null;
    private isInitialized: boolean = false;
    private firebaseAuth: any = null;

    constructor() {
        this.init();
    }

    /**
     * Inicializa o AuthManager com Firebase
     */
    private async init(): Promise<void> {
        try {
            // Aguardar Firebase estar disponível
            await this.waitForFirebase();

            // Obter instância do Firebase Auth
            this.firebaseAuth = firebase.auth();

            // Listener para mudanças de autenticação
            this.firebaseAuth.onAuthStateChanged((firebaseUser: any) => {
                this.handleAuthStateChange(firebaseUser);
            });

            this.isInitialized = true;
            Logger.info(LogCategory.AUTH, '[AuthManager] Inicializado com Firebase Auth');

        } catch (error) {
            Logger.error(LogCategory.AUTH, '[AuthManager] Erro na inicialização:', error);

            // Fallback: carregar do LocalStorage se Firebase falhar
            this.loadUserFromStorage();
            this.isInitialized = true;
        }
    }

    /**
     * Aguarda Firebase estar disponível
     */
    private async waitForFirebase(): Promise<void> {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 segundos

            const checkFirebase = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.auth) {
                    clearInterval(checkFirebase);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkFirebase);
                    reject(new Error('Firebase não carregou a tempo'));
                }
                attempts++;
            }, 100);
        });
    }

    /**
     * Handler para mudanças de estado do Firebase Auth
     */
    private handleAuthStateChange(firebaseUser: any): void {
        if (firebaseUser) {
            // Usuário logado
            this.currentUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
                isAnonymous: firebaseUser.isAnonymous,
                isPremium: false // TODO: Verificar com Firestore custom claims
            };

            // Salvar no LocalStorage para cache
            this.saveUserToStorage();

            Logger.info(LogCategory.AUTH, `[AuthManager] Usuário autenticado: ${this.currentUser.displayName}`);
        } else {
            // Usuário deslogado
            this.currentUser = null;
            localStorage.removeItem('tellstones_user');
            Logger.info(LogCategory.AUTH, '[AuthManager] Usuário deslogado');
        }

        // Emitir evento de mudança de estado
        this.emitAuthStateChange();
    }

    /**
     * Carrega usuário do LocalStorage (fallback)
     */
    private loadUserFromStorage(): void {
        try {
            const savedUser = localStorage.getItem('tellstones_user');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                Logger.info(LogCategory.AUTH, `[AuthManager] Usuário carregado do cache: ${this.currentUser?.displayName}`);
            }
        } catch (error) {
            Logger.error(LogCategory.AUTH, '[AuthManager] Erro ao carregar usuário:', error);
        }
    }

    /**
     * Salva usuário no LocalStorage
     */
    private saveUserToStorage(): void {
        try {
            if (this.currentUser) {
                localStorage.setItem('tellstones_user', JSON.stringify(this.currentUser));
            }
        } catch (error) {
            Logger.error(LogCategory.AUTH, '[AuthManager] Erro ao salvar usuário:', error);
        }
    }

    /**
     * Login com email e senha (Firebase Auth)
     */
    async loginWithEmail(email: string, password: string): Promise<void> {
        try {
            // Validação básica
            if (!email || !password) {
                throw new Error('Email e senha são obrigatórios');
            }

            if (!this.firebaseAuth) {
                throw new Error('Firebase Auth não inicializado');
            }

            // Login via Firebase
            const userCredential = await this.firebaseAuth.signInWithEmailAndPassword(email, password);

            Logger.info(LogCategory.AUTH, `[AuthManager] Login bem-sucedido: ${email}`);

            // Evento de sucesso será emitido automaticamente pelo onAuthStateChanged

        } catch (error: any) {
            Logger.error(LogCategory.AUTH, '[AuthManager] Erro no login:', error);

            // Traduzir erros do Firebase
            const errorMessage = this.translateFirebaseError(error.code);
            EventBus.emit(EventType.AUTH_LOGIN_ERROR, { error: errorMessage });
            throw new Error(errorMessage);
        }
    }

    /**
     * Registro de novo usuário (Firebase Auth)
     */
    async registerWithEmail(email: string, password: string, displayName: string): Promise<void> {
        try {
            // Validação básica
            if (!email || !password || !displayName) {
                throw new Error('Todos os campos são obrigatórios');
            }

            if (password.length < 6) {
                throw new Error('Senha deve ter pelo menos 6 caracteres');
            }

            if (displayName.length < 3) {
                throw new Error('Nome deve ter pelo menos 3 caracteres');
            }

            if (!this.firebaseAuth) {
                throw new Error('Firebase Auth não inicializado');
            }

            // Criar usuário via Firebase
            const userCredential = await this.firebaseAuth.createUserWithEmailAndPassword(email, password);

            // Atualizar perfil com display name
            if (userCredential.user) {
                await userCredential.user.updateProfile({
                    displayName: displayName
                });
            }

            Logger.info(LogCategory.AUTH, `[AuthManager] Registro bem-sucedido: ${email}`);

            // Evento de sucesso será emitido automaticamente pelo onAuthStateChanged

        } catch (error: any) {
            Logger.error(LogCategory.AUTH, '[AuthManager] Erro no registro:', error);

            // Traduzir erros do Firebase
            const errorMessage = this.translateFirebaseError(error.code);
            EventBus.emit(EventType.AUTH_LOGIN_ERROR, { error: errorMessage });
            throw new Error(errorMessage);
        }
    }

    /**
     * Login como convidado (Firebase Anonymous Auth)
     */
    async loginAsGuest(): Promise<void> {
        try {
            if (!this.firebaseAuth) {
                throw new Error('Firebase Auth não inicializado');
            }

            // Login anônimo via Firebase
            const userCredential = await this.firebaseAuth.signInAnonymously();

            Logger.info(LogCategory.AUTH, `[AuthManager] Login como convidado: ${this.currentUser?.displayName}`);

            // Emitir evento de convidado
            EventBus.emit(EventType.AUTH_GUEST_ENTER, {});

        } catch (error: any) {
            Logger.error(LogCategory.AUTH, '[AuthManager] Erro no login como convidado:', error);

            const errorMessage = this.translateFirebaseError(error.code);
            EventBus.emit(EventType.AUTH_LOGIN_ERROR, { error: errorMessage });
            throw new Error(errorMessage);
        }
    }

    /**
     * Logout (Firebase Auth)
     */
    async logout(): Promise<void> {
        try {
            if (!this.firebaseAuth) {
                throw new Error('Firebase Auth não inicializado');
            }

            await this.firebaseAuth.signOut();

            Logger.info(LogCategory.AUTH, '[AuthManager] Logout realizado');

            // Emitir evento de logout
            EventBus.emit(EventType.AUTH_LOGOUT, {});

        } catch (error: any) {
            Logger.error(LogCategory.AUTH, '[AuthManager] Erro ao fazer logout:', error);
            throw error;
        }
    }

    /**
     * Verifica se usuário está logado
     */
    isLoggedIn(): boolean {
        return this.currentUser !== null;
    }

    /**
     * Verifica se usuário é anônimo
     */
    isAnonymous(): boolean {
        return this.currentUser?.isAnonymous || false;
    }

    /**
     * Verifica se usuário é premium
     */
    isPremium(): boolean {
        return this.currentUser?.isPremium || false;
    }

    /**
     * Obtém usuário atual
     */
    getCurrentUser(): User | null {
        return this.currentUser;
    }

    /**
     * Emite evento de mudança de estado
     */
    private emitAuthStateChange(): void {
        EventBus.emit(EventType.AUTH_STATE_CHANGED, {
            isLoggedIn: this.isLoggedIn(),
            user: this.currentUser
        });
    }

    /**
     * Traduz erros do Firebase para mensagens amigáveis
     */
    private translateFirebaseError(errorCode: string): string {
        const errors: Record<string, string> = {
            'auth/email-already-in-use': 'Este email já está em uso',
            'auth/invalid-email': 'Email inválido',
            'auth/operation-not-allowed': 'Operação não permitida',
            'auth/weak-password': 'Senha muito fraca',
            'auth/user-disabled': 'Usuário desabilitado',
            'auth/user-not-found': 'Usuário não encontrado',
            'auth/wrong-password': 'Senha incorreta',
            'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
            'auth/network-request-failed': 'Erro de conexão. Verifique sua internet'
        };

        return errors[errorCode] || 'Erro desconhecido. Tente novamente';
    }

    /**
     * Aguarda inicialização
     */
    async waitForReady(): Promise<void> {
        if (this.isInitialized) return;

        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.isInitialized) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 50);
        });
    }
}

// Exportar instância singleton
export const AuthManager = new AuthManagerClass();

// Expor globalmente para compatibilidade
(window as any).AuthManager = AuthManager;

Logger.sys('[AuthManager] Sistema de autenticação inicializado (Firebase)');
