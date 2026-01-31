// =========================
// LanguageManager - Sistema de Internacionalização
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
import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';
import { Logger, LogCategory } from '../utils/Logger.js';
export class LanguageManager {
    constructor() {
        this.currentLanguage = 'pt-BR';
        this.translations = new Map();
        this.storageKey = 'tellstones_language';
        this.loadLanguagePreference();
        Logger.info(LogCategory.SYSTEM, `[LanguageManager] Initialized with language: ${this.currentLanguage}`);
    }
    static getInstance() {
        if (!LanguageManager.instance) {
            LanguageManager.instance = new LanguageManager();
        }
        return LanguageManager.instance;
    }
    /**
     * Carrega preferência de idioma do localStorage
     */
    loadLanguagePreference() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved === 'pt-BR' || saved === 'en-US') {
            this.currentLanguage = saved;
            Logger.info(LogCategory.SYSTEM, `[LanguageManager] Loaded preference: ${saved}`);
        }
    }
    /**
     * Salva preferência de idioma no localStorage
     */
    saveLanguagePreference() {
        localStorage.setItem(this.storageKey, this.currentLanguage);
        Logger.info(LogCategory.SYSTEM, `[LanguageManager] Saved preference: ${this.currentLanguage}`);
    }
    /**
     * Carrega arquivo de tradução
     */
    loadTranslations(language) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.translations.has(language)) {
                Logger.info(LogCategory.SYSTEM, `[LanguageManager] Translations for ${language} already loaded`);
                return;
            }
            try {
                const response = yield fetch(`./src/i18n/${language}.json`);
                if (!response.ok) {
                    throw new Error(`Failed to load ${language}.json: ${response.statusText}`);
                }
                const data = yield response.json();
                this.translations.set(language, data);
                Logger.info(LogCategory.SYSTEM, `[LanguageManager] Loaded translations for ${language}`);
            }
            catch (error) {
                Logger.error(LogCategory.SYSTEM, `[LanguageManager] Error loading ${language}:`, error);
                // Fallback para pt-BR se houver erro
                if (language !== 'pt-BR') {
                    this.currentLanguage = 'pt-BR';
                }
            }
        });
    }
    /**
     * Troca o idioma atual
     */
    setLanguage(language) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.currentLanguage === language) {
                Logger.info(LogCategory.SYSTEM, `[LanguageManager] Language already set to ${language}`);
                return;
            }
            // Carregar traduções se necessário
            yield this.loadTranslations(language);
            this.currentLanguage = language;
            this.saveLanguagePreference();
            // Emitir evento para atualizar UI
            EventBus.emit(EventType.LANGUAGE_CHANGE, { language });
            Logger.info(LogCategory.SYSTEM, `[LanguageManager] Language changed to ${language}`);
        });
    }
    /**
     * Obtém o idioma atual
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    /**
     * Traduz uma chave usando dot notation (ex: "ui.menu.play")
     */
    t(key) {
        const translations = this.translations.get(this.currentLanguage);
        if (!translations) {
            Logger.warn(LogCategory.SYSTEM, `[LanguageManager] No translations loaded for ${this.currentLanguage}`);
            return key;
        }
        // Navegar pelo objeto usando dot notation
        const keys = key.split('.');
        let value = translations;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            }
            else {
                Logger.warn(LogCategory.SYSTEM, `[LanguageManager] Translation key not found: ${key}`);
                return key;
            }
        }
        return typeof value === 'string' ? value : key;
    }
    /**
     * Inicializa o sistema carregando as traduções do idioma atual
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadTranslations(this.currentLanguage);
            // Carregar o outro idioma em background para transição rápida
            const otherLanguage = this.currentLanguage === 'pt-BR' ? 'en-US' : 'pt-BR';
            this.loadTranslations(otherLanguage).catch(() => {
                // Silenciar erro de carregamento em background
            });
        });
    }
}
// Expor globalmente para fácil acesso
window.languageManager = LanguageManager.getInstance();
