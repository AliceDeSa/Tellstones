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
        console.log(`[LocaleManager.loadTranslations] Carregando ${locale}...`);
        try {
            const response = await fetch(`src/i18n/${locale}.json?v=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${locale}.json`);
            }
            this.translations = await response.json();
            console.log(`[LocaleManager.loadTranslations] ${locale} carregado com sucesso:`, Object.keys(this.translations));

            // Sempre carrega pt-BR como fallback
            if (locale !== 'pt-BR') {
                const fallbackResponse = await fetch(`src/i18n/pt-BR.json?v=${Date.now()}`);
                this.fallbackTranslations = await fallbackResponse.json();
                console.log(`[LocaleManager.loadTranslations] Fallback pt-BR carregado`);
            } else {
                this.fallbackTranslations = this.translations;
                console.log(`[LocaleManager.loadTranslations] Usando pt-BR como fallback`);
            }

            Logger.info(LogCategory.UI, `[LocaleManager] Idioma carregado: ${locale}`);
        } catch (error) {
            console.error(`[LocaleManager.loadTranslations] ERRO ao carregar ${locale}:`, error);
            Logger.error(LogCategory.UI, `[LocaleManager] Erro ao carregar ${locale}:`, error);
        }
    }

    /**
     * Traduz uma chave usando notação de ponto (ex: 'menu.play')
     */
    t(key: string): string {
        console.log(`[LocaleManager.t] Buscando: "${key}", Idioma atual: ${this.currentLocale}, isReady: ${this.isReady}`);

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
    async setLocale(locale: SupportedLocale): Promise<void> {
        if (this.currentLocale === locale) return;

        this.currentLocale = locale;
        localStorage.setItem('tellstones_locale', locale);

        await this.loadTranslations(locale);

        // Emitir evento para UI atualizar (usando string diretamente)
        (EventBus as any).emit('LOCALE:CHANGE', { locale });
        Logger.info(LogCategory.UI, `[LocaleManager] Idioma alterado para: ${locale}`);
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
