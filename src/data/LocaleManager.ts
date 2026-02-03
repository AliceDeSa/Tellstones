/**
 * LocaleManager.ts - Gerenciador de Idiomas (i18n)
 * Responsável por carregar e aplicar traduções
 */

import { EventBus } from '../core/EventBus.js';
import { Logger, LogCategory } from '../utils/Logger.js';

export type SupportedLocale = 'pt-BR' | 'en-US';

interface Translations {
    [key: string]: string | Translations;
}

export class LocaleManager {
    private static instance: LocaleManager;
    private currentLocale: SupportedLocale = 'pt-BR';
    private translations: Translations = {};
    private fallbackTranslations: Translations = {}; // pt-BR como fallback

    private isReady: boolean = false;

    private constructor() {
        this.init();
    }

    private async init(): Promise<void> {
        await this.loadSavedLocale();
        this.isReady = true;
    }

    static getInstance(): LocaleManager {
        if (!LocaleManager.instance) {
            LocaleManager.instance = new LocaleManager();
        }
        return LocaleManager.instance;
    }

    /**
     * Retorna uma Promise que resolve quando o LocaleManager está pronto
     */
    async waitForReady(): Promise<void> {
        while (!this.isReady) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    /**
     * Carrega idioma salvo do localStorage
     */
    private async loadSavedLocale(): Promise<void> {
        const saved = localStorage.getItem('tellstones_locale');
        if (saved && (saved === 'pt-BR' || saved === 'en-US')) {
            this.currentLocale = saved as SupportedLocale;
        }
        await this.loadTranslations(this.currentLocale);
    }

    /**
     * Carrega arquivo de traduções
     */
    private async loadTranslations(locale: SupportedLocale): Promise<void> {
        try {
            const response = await fetch(`src/i18n/${locale}.json?v=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${locale}.json`);
            }
            this.translations = await response.json();

            // Sempre carrega pt-BR como fallback
            if (locale !== 'pt-BR') {
                const fallbackResponse = await fetch(`src/i18n/pt-BR.json?v=${Date.now()}`);
                this.fallbackTranslations = await fallbackResponse.json();
            } else {
                this.fallbackTranslations = this.translations;
            }

            Logger.info(LogCategory.I18N, `[LocaleManager] Idioma carregado: ${locale}`);
        } catch (error) {
            Logger.error(LogCategory.I18N, `[LocaleManager] Erro ao carregar ${locale}:`, error);
        }
    }

    /**
     * Traduz uma chave usando notação de ponto (ex: 'menu.play')
     */
    t(key: string): string {
        const keys = key.split('.');
        let value: any = this.translations;

        // Navega pela estrutura aninhada
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Tenta fallback
                value = this.fallbackTranslations;
                for (const fk of keys) {
                    if (value && typeof value === 'object' && fk in value) {
                        value = value[fk];
                    } else {
                        // Se nem no fallback tem, retorna a chave
                        Logger.debug(LogCategory.I18N, `[LocaleManager] Tradução não encontrada: ${key}`);
                        return key;
                    }
                }
                break;
            }
        }

        return typeof value === 'string' ? value : key;
    }

    /**
     * Muda o idioma atual
     */
    async setLocale(locale: SupportedLocale): Promise<void> {
        if (this.currentLocale === locale) return;

        this.currentLocale = locale;
        localStorage.setItem('tellstones_locale', locale);

        await this.loadTranslations(locale);

        // Emitir evento para UI atualizar
        (EventBus as any).emit('LOCALE:CHANGE', { locale });
        Logger.info(LogCategory.I18N, `[LocaleManager] Idioma alterado: ${locale}`);
    }

    /**
     * Retorna idioma atual
     */
    getCurrentLocale(): SupportedLocale {
        return this.currentLocale;
    }

    /**
     * Retorna nome legível do idioma
     */
    getLocaleName(locale?: SupportedLocale): string {
        const loc = locale || this.currentLocale;
        return loc === 'pt-BR' ? 'Português (Brasil)' : 'English (US)';
    }
}

// Exportar instância global
(window as any).LocaleManager = LocaleManager.getInstance();
export default LocaleManager.getInstance();
