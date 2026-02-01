import { ptBR } from './pt-BR.js';
import { enUS } from './en-US.js';
import { EventBus } from '../core/EventBus.js';
import { Logger, LogCategory } from '../utils/Logger.js';
export class I18nManager {
    constructor() {
        this.currentLang = 'pt-BR';
        this.translations = ptBR;
        this.loadLanguage();
    }
    static getInstance() {
        if (!I18nManager.instance) {
            I18nManager.instance = new I18nManager();
        }
        return I18nManager.instance;
    }
    setLanguage(lang) {
        if (this.currentLang === lang)
            return;
        this.currentLang = lang;
        this.translations = lang === 'pt-BR' ? ptBR : enUS;
        localStorage.setItem('tellstones_language', lang);
        Logger.info(LogCategory.SYS, `[I18n] Idioma alterado para ${lang}`);
        EventBus.emit('LANGUAGE:CHANGE', { language: lang });
    }
    getLanguage() {
        return this.currentLang;
    }
    loadLanguage() {
        const saved = localStorage.getItem('tellstones_language');
        if (saved && (saved === 'pt-BR' || saved === 'en-US')) {
            this.setLanguage(saved);
        }
        else {
            // Default is pt-BR
            this.setLanguage('pt-BR');
        }
    }
    /**
     * Traduz uma chave.
     * Ex: t('settings.music')
     */
    t(key) {
        const keys = key.split('.');
        let current = this.translations;
        for (const k of keys) {
            if (current[k] === undefined) {
                Logger.warn(LogCategory.SYS, `[I18n] Chave não encontrada: ${key}`);
                return key;
            }
            current = current[k];
        }
        return current;
    }
}
