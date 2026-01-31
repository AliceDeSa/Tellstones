/**
 * LocaleManager.ts - Gerenciador de Idiomas (i18n)
 * Responsável por carregar e aplicar traduções
 */
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
import { Logger, LogCategory } from '../utils/Logger.js';
export class LocaleManager {
    constructor() {
        this.currentLocale = 'pt-BR';
        this.translations = {};
        this.fallbackTranslations = {}; // pt-BR como fallback
        this.isReady = false;
        this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSavedLocale();
            this.isReady = true;
        });
    }
    static getInstance() {
        if (!LocaleManager.instance) {
            LocaleManager.instance = new LocaleManager();
        }
        return LocaleManager.instance;
    }
    /**
     * Retorna uma Promise que resolve quando o LocaleManager está pronto
     */
    waitForReady() {
        return __awaiter(this, void 0, void 0, function* () {
            while (!this.isReady) {
                yield new Promise(resolve => setTimeout(resolve, 50));
            }
        });
    }
    /**
     * Carrega idioma salvo do localStorage
     */
    loadSavedLocale() {
        return __awaiter(this, void 0, void 0, function* () {
            const saved = localStorage.getItem('tellstones_locale');
            if (saved && (saved === 'pt-BR' || saved === 'en-US')) {
                this.currentLocale = saved;
            }
            yield this.loadTranslations(this.currentLocale);
        });
    }
    /**
     * Carrega arquivo de traduções
     */
    loadTranslations(locale) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[LocaleManager.loadTranslations] Carregando ${locale}...`);
            try {
                const response = yield fetch(`src/i18n/${locale}.json?v=${Date.now()}`);
                if (!response.ok) {
                    throw new Error(`Failed to load ${locale}.json`);
                }
                this.translations = yield response.json();
                console.log(`[LocaleManager.loadTranslations] ${locale} carregado com sucesso:`, Object.keys(this.translations));
                // Sempre carrega pt-BR como fallback
                if (locale !== 'pt-BR') {
                    const fallbackResponse = yield fetch(`src/i18n/pt-BR.json?v=${Date.now()}`);
                    this.fallbackTranslations = yield fallbackResponse.json();
                    console.log(`[LocaleManager.loadTranslations] Fallback pt-BR carregado`);
                }
                else {
                    this.fallbackTranslations = this.translations;
                    console.log(`[LocaleManager.loadTranslations] Usando pt-BR como fallback`);
                }
                Logger.info(LogCategory.UI, `[LocaleManager] Idioma carregado: ${locale}`);
            }
            catch (error) {
                console.error(`[LocaleManager.loadTranslations] ERRO ao carregar ${locale}:`, error);
                Logger.error(LogCategory.UI, `[LocaleManager] Erro ao carregar ${locale}:`, error);
            }
        });
    }
    /**
     * Traduz uma chave usando notação de ponto (ex: 'menu.play')
     */
    t(key) {
        console.log(`[LocaleManager.t] Buscando: "${key}", Idioma atual: ${this.currentLocale}, isReady: ${this.isReady}`);
        const keys = key.split('.');
        let value = this.translations;
        // Navega pela estrutura aninhada
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            }
            else {
                // Tenta fallback
                value = this.fallbackTranslations;
                for (const fk of keys) {
                    if (value && typeof value === 'object' && fk in value) {
                        value = value[fk];
                    }
                    else {
                        // Se nem no fallback tem, retorna a chave
                        Logger.warn(LogCategory.UI, `[LocaleManager] Tradução não encontrada: ${key}`);
                        console.log(`[LocaleManager.t] Tradução NÃO encontrada: "${key}"`);
                        return key;
                    }
                }
                break;
            }
        }
        const result = typeof value === 'string' ? value : key;
        console.log(`[LocaleManager.t] Resultado para "${key}": "${result}"`);
        return result;
    }
    /**
     * Muda o idioma atual
     */
    setLocale(locale) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.currentLocale === locale)
                return;
            this.currentLocale = locale;
            localStorage.setItem('tellstones_locale', locale);
            yield this.loadTranslations(locale);
            // Emitir evento para UI atualizar (usando string diretamente)
            EventBus.emit('LOCALE:CHANGE', { locale });
            Logger.info(LogCategory.UI, `[LocaleManager] Idioma alterado para: ${locale}`);
        });
    }
    /**
     * Retorna idioma atual
     */
    getCurrentLocale() {
        return this.currentLocale;
    }
    /**
     * Retorna nome legível do idioma
     */
    getLocaleName(locale) {
        const loc = locale || this.currentLocale;
        return loc === 'pt-BR' ? 'Português (Brasil)' : 'English (US)';
    }
}
// Exportar instância global
window.LocaleManager = LocaleManager.getInstance();
export default LocaleManager.getInstance();
