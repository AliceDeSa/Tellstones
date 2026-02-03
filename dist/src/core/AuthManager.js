// =========================
// AuthManager - Gerenciador de Autenticação (Firebase)
// =========================
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { EventBus } from './EventBus.js';
import { EventType } from './types/Events.js';
import { Logger, LogCategory } from '../utils/Logger.js';
/**
 * Gerenciador de autenticação Firebase
 */
class AuthManagerClass {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.firebaseAuth = null;
        this.init();
    }
    /**
     * Inicializa o AuthManager com Firebase
     */
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Aguardar Firebase estar disponível
                yield this.waitForFirebase();
                // Obter instância do Firebase Auth
                this.firebaseAuth = firebase.auth();
                // Listener para mudanças de autenticação
                this.firebaseAuth.onAuthStateChanged((firebaseUser) => {
                    this.handleAuthStateChange(firebaseUser);
                });
                this.isInitialized = true;
                Logger.info(LogCategory.SYSTEM, '[AuthManager] Inicializado com Firebase Auth');
            }
            catch (error) {
                Logger.error(LogCategory.SYSTEM, '[AuthManager] Erro na inicialização:', error);
                // Fallback: carregar do LocalStorage se Firebase falhar
                this.loadUserFromStorage();
                this.isInitialized = true;
            }
        });
    }
    /**
     * Aguarda Firebase estar disponível
     */
    waitForFirebase() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                let attempts = 0;
                const maxAttempts = 50; // 5 segundos
                const checkFirebase = setInterval(() => {
                    if (typeof firebase !== 'undefined' && firebase.auth) {
                        clearInterval(checkFirebase);
                        resolve();
                    }
                    else if (attempts >= maxAttempts) {
                        clearInterval(checkFirebase);
                        reject(new Error('Firebase não carregou a tempo'));
                    }
                    attempts++;
                }, 100);
            });
        });
    }
    /**
     * Handler para mudanças de estado do Firebase Auth
     */
    handleAuthStateChange(firebaseUser) {
        var _a;
        if (firebaseUser) {
            // Usuário logado
            this.currentUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || ((_a = firebaseUser.email) === null || _a === void 0 ? void 0 : _a.split('@')[0]) || 'Usuário',
                isAnonymous: firebaseUser.isAnonymous,
                isPremium: false // TODO: Verificar com Firestore custom claims
            };
            // Salvar no LocalStorage para cache
            this.saveUserToStorage();
            Logger.info(LogCategory.SYSTEM, `[AuthManager] Usuário autenticado: ${this.currentUser.displayName}`);
        }
        else {
            // Usuário deslogado
            this.currentUser = null;
            localStorage.removeItem('tellstones_user');
            Logger.info(LogCategory.SYSTEM, '[AuthManager] Usuário deslogado');
        }
        // Emitir evento de mudança de estado
        this.emitAuthStateChange();
    }
    /**
     * Carrega usuário do LocalStorage (fallback)
     */
    loadUserFromStorage() {
        var _a;
        try {
            const savedUser = localStorage.getItem('tellstones_user');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                Logger.info(LogCategory.SYSTEM, `[AuthManager] Usuário carregado do cache: ${(_a = this.currentUser) === null || _a === void 0 ? void 0 : _a.displayName}`);
            }
        }
        catch (error) {
            Logger.error(LogCategory.SYSTEM, '[AuthManager] Erro ao carregar usuário:', error);
        }
    }
    /**
     * Salva usuário no LocalStorage
     */
    saveUserToStorage() {
        try {
            if (this.currentUser) {
                localStorage.setItem('tellstones_user', JSON.stringify(this.currentUser));
            }
        }
        catch (error) {
            Logger.error(LogCategory.SYSTEM, '[AuthManager] Erro ao salvar usuário:', error);
        }
    }
    /**
     * Login com email e senha (Firebase Auth)
     */
    loginWithEmail(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validação básica
                if (!email || !password) {
                    throw new Error('Email e senha são obrigatórios');
                }
                if (!this.firebaseAuth) {
                    throw new Error('Firebase Auth não inicializado');
                }
                // Login via Firebase
                const userCredential = yield this.firebaseAuth.signInWithEmailAndPassword(email, password);
                Logger.info(LogCategory.SYSTEM, `[AuthManager] Login bem-sucedido: ${email}`);
                // Evento de sucesso será emitido automaticamente pelo onAuthStateChanged
            }
            catch (error) {
                Logger.error(LogCategory.SYSTEM, '[AuthManager] Erro no login:', error);
                // Traduzir erros do Firebase
                const errorMessage = this.translateFirebaseError(error.code);
                EventBus.emit(EventType.AUTH_LOGIN_ERROR, { error: errorMessage });
                throw new Error(errorMessage);
            }
        });
    }
    /**
     * Registro de novo usuário (Firebase Auth)
     */
    registerWithEmail(email, password, displayName) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const userCredential = yield this.firebaseAuth.createUserWithEmailAndPassword(email, password);
                // Atualizar perfil com display name
                if (userCredential.user) {
                    yield userCredential.user.updateProfile({
                        displayName: displayName
                    });
                }
                Logger.info(LogCategory.SYSTEM, `[AuthManager] Registro bem-sucedido: ${email}`);
                // Evento de sucesso será emitido automaticamente pelo onAuthStateChanged
            }
            catch (error) {
                Logger.error(LogCategory.SYSTEM, '[AuthManager] Erro no registro:', error);
                // Traduzir erros do Firebase
                const errorMessage = this.translateFirebaseError(error.code);
                EventBus.emit(EventType.AUTH_LOGIN_ERROR, { error: errorMessage });
                throw new Error(errorMessage);
            }
        });
    }
    /**
     * Login como convidado (Firebase Anonymous Auth)
     */
    loginAsGuest() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                if (!this.firebaseAuth) {
                    throw new Error('Firebase Auth não inicializado');
                }
                // Login anônimo via Firebase
                const userCredential = yield this.firebaseAuth.signInAnonymously();
                Logger.info(LogCategory.SYSTEM, `[AuthManager] Login como convidado: ${(_a = this.currentUser) === null || _a === void 0 ? void 0 : _a.displayName}`);
                // Emitir evento de convidado
                EventBus.emit(EventType.AUTH_GUEST_ENTER, {});
            }
            catch (error) {
                Logger.error(LogCategory.SYSTEM, '[AuthManager] Erro no login como convidado:', error);
                const errorMessage = this.translateFirebaseError(error.code);
                EventBus.emit(EventType.AUTH_LOGIN_ERROR, { error: errorMessage });
                throw new Error(errorMessage);
            }
        });
    }
    /**
     * Logout (Firebase Auth)
     */
    logout() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.firebaseAuth) {
                    throw new Error('Firebase Auth não inicializado');
                }
                yield this.firebaseAuth.signOut();
                Logger.info(LogCategory.SYSTEM, '[AuthManager] Logout realizado');
                // Emitir evento de logout
                EventBus.emit(EventType.AUTH_LOGOUT, {});
            }
            catch (error) {
                Logger.error(LogCategory.SYSTEM, '[AuthManager] Erro ao fazer logout:', error);
                throw error;
            }
        });
    }
    /**
     * Verifica se usuário está logado
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }
    /**
     * Verifica se usuário é anônimo
     */
    isAnonymous() {
        var _a;
        return ((_a = this.currentUser) === null || _a === void 0 ? void 0 : _a.isAnonymous) || false;
    }
    /**
     * Verifica se usuário é premium
     */
    isPremium() {
        var _a;
        return ((_a = this.currentUser) === null || _a === void 0 ? void 0 : _a.isPremium) || false;
    }
    /**
     * Obtém usuário atual
     */
    getCurrentUser() {
        return this.currentUser;
    }
    /**
     * Emite evento de mudança de estado
     */
    emitAuthStateChange() {
        EventBus.emit(EventType.AUTH_STATE_CHANGED, {
            isLoggedIn: this.isLoggedIn(),
            user: this.currentUser
        });
    }
    /**
     * Traduz erros do Firebase para mensagens amigáveis
     */
    translateFirebaseError(errorCode) {
        const errors = {
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
    waitForReady() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isInitialized)
                return;
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (this.isInitialized) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 50);
            });
        });
    }
}
// Exportar instância singleton
export const AuthManager = new AuthManagerClass();
// Expor globalmente para compatibilidade
window.AuthManager = AuthManager;
Logger.sys('[AuthManager] Sistema de autenticação inicializado (Firebase)');
