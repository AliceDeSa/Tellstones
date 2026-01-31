/**
 * ThemeManager.ts - Gerenciador de temas visuais
 * Fase 6: Sistema de Personalização
 */

import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';

export interface Theme {
    id: string;
    name: string;
    description: string;
    preview: string;
    assets: ThemeAssets;
    locked?: boolean; // Para futuras expansões
}

export interface ThemeAssets {
    table: string;
    background: string;
    optionsPanel: string; // Novo: Background do painel de opções
    stones: StonesConfig;
}

export interface StonesConfig {
    folder: string;
    set: string;
}

export class ThemeManager {
    private static instance: ThemeManager;
    private themes: Map<string, Theme>;
    private currentTheme: Theme;

    private constructor() {
        this.themes = new Map();
        this.loadDefaultThemes();
        this.currentTheme = this.themes.get('default')!;
    }

    static getInstance(): ThemeManager {
        if (!ThemeManager.instance) {
            ThemeManager.instance = new ThemeManager();
        }
        return ThemeManager.instance;
    }

    /**
     * Carrega temas padrão do jogo
     */
    private loadDefaultThemes(): void {
        // Tema Tellstones (Padrão - Completo)
        this.themes.set('default', {
            id: 'default',
            name: 'Tellstones',
            description: 'O tema original clássico do jogo',
            preview: 'assets/themes/tellstones/preview.jpg',
            assets: {
                table: 'assets/themes/tellstones/table.png',
                background: 'assets/themes/tellstones/background.jpg',
                optionsPanel: 'assets/img/ui/options_panel_bg.png', // Padrão
                stones: {
                    folder: 'assets/themes/tellstones/stones',
                    set: 'tellstones'
                }
            },
            locked: false
        });

        // Tema Taberna Medieval (Parcial - Em Desenvolvimento)
        this.themes.set('tavern', {
            id: 'tavern',
            name: 'Taberna Medieval',
            description: 'Ambiente rústico com madeira, velas e atmosfera acolhedora',
            preview: 'assets/themes/tavern/preview.jpg',
            assets: {
                table: 'assets/themes/tavern/table.png',
                background: 'assets/themes/tavern/background.jpg',
                optionsPanel: 'assets/img/ui/options_panel_bg.png', // Personalizado
                stones: {
                    folder: 'assets/themes/tavern/stones',
                    set: 'tavern'
                }
            },
            locked: false
        });

        // NOTA: Outros temas (CyberPunk, Coliseum, Arcane) ainda em produção
        // Serão adicionados quando os assets estiverem prontos

        console.log('[ThemeManager] Temas carregados:', this.themes.size);
    }

    /**
     * Retorna todos os temas disponíveis
     */
    getAvailableThemes(): Theme[] {
        return Array.from(this.themes.values());
    }

    /**
     * Retorna tema atual
     */
    getCurrentTheme(): Theme {
        return this.currentTheme;
    }

    /**
     * Busca tema por ID
     */
    getThemeById(id: string): Theme | undefined {
        return this.themes.get(id);
    }

    /**
     * Carrega e aplica tema
     */
    async loadTheme(themeId: string): Promise<void> {
        const theme = this.themes.get(themeId);
        if (!theme) {
            console.error(`[ThemeManager] Tema não encontrado: ${themeId}`);
            return;
        }

        if (theme.locked) {
            console.warn(`[ThemeManager] Tema "${theme.name}" está bloqueado`);
            return;
        }

        console.log(`[ThemeManager] Carregando tema: ${theme.name}`);

        // Atualizar tema atual
        this.currentTheme = theme;

        // Aplicar assets
        await this.applyTheme(theme);

        // Salvar preferência
        this.savePreference(themeId);

        // Emitir evento
        EventBus.emit(EventType.STATE_UPDATE, {
            state: { preferences: { theme: themeId } },
            reason: 'THEME_LOADED'
        });

        console.log(`[ThemeManager] Tema "${theme.name}" aplicado!`);
    }

    /**
     * Aplica tema visualmente ao jogo
     */
    private async applyTheme(theme: Theme): Promise<void> {
        // 1. Atualizar tabuleiro
        const tabuleiroImg = document.getElementById('tabuleiro') as HTMLImageElement;
        if (tabuleiroImg) {
            tabuleiroImg.src = theme.assets.table;
            console.log('[ThemeManager] Tabuleiro atualizado:', theme.assets.table);
        }

        // 2. Atualizar background
        const body = document.body;
        body.style.backgroundImage = `url('${theme.assets.background}')`;
        body.style.backgroundSize = 'cover';
        body.style.backgroundPosition = 'center';
        body.style.backgroundRepeat = 'no-repeat';
        body.style.backgroundAttachment = 'fixed';
        console.log('[ThemeManager] Background atualizado:', theme.assets.background);

        // 3. Atualizar Painel de Opções (Novo)
        const settingsScreen = document.getElementById('settings-screen');
        if (settingsScreen) {
            settingsScreen.style.backgroundImage = `url('${theme.assets.optionsPanel}')`;
            console.log('[ThemeManager] Painel de opções atualizado:', theme.assets.optionsPanel);
        }

        // 3. Atualizar pedras oficiais (se disponível)
        if ((window as any).PEDRAS_OFICIAIS) {
            const pedras = (window as any).PEDRAS_OFICIAIS;
            pedras.forEach((pedra: any) => {
                // Substituir pasta de pedras
                pedra.url = pedra.url.replace(
                    /\/stones\/(demacia|new_set|tellstones|tavern|cyberpunk)\//,
                    `/stones/${theme.assets.stones.set}/`
                );
            });
            console.log('[ThemeManager] Pedras oficiais atualizadas para:', theme.assets.stones.set);
        }

        // 4. Re-renderizar mesa se em jogo
        if ((window as any).Renderer && (window as any).Renderer.renderizarMesa) {
            setTimeout(() => {
                (window as any).Renderer.renderizarMesa();
                console.log('[ThemeManager] Mesa re-renderizada');
            }, 100);
        }

        // 5. Re-renderizar pedras de reserva se em jogo
        if ((window as any).Renderer && (window as any).Renderer.renderizarPedrasReserva) {
            setTimeout(() => {
                (window as any).Renderer.renderizarPedrasReserva();
                console.log('[ThemeManager] Reserva re-renderizada');
            }, 150);
        }
    }

    /**
     * Salva preferência no GameStateManager
     */
    private savePreference(themeId: string): void {
        if ((window as any).gameStateManager) {
            (window as any).gameStateManager.update({
                preferences: { theme: themeId }
            }, 'THEME_PREFERENCE');
            console.log('[ThemeManager] Preferência salva:', themeId);
        }
    }

    /**
     * Carrega preferência salva do localStorage
     */
    loadSavedPreference(): void {
        if ((window as any).gameStateManager) {
            const state = (window as any).gameStateManager.get();
            const savedTheme = state.preferences?.theme;

            if (savedTheme && this.themes.has(savedTheme)) {
                console.log('[ThemeManager] Carregando preferência salva:', savedTheme);
                this.loadTheme(savedTheme);
            } else {
                console.log('[ThemeManager] Nenhuma preferência salva, usando tema padrão');
            }
        }
    }

    /**
     * Registra novo tema (para expansões futuras)
     */
    registerTheme(theme: Theme): void {
        if (this.themes.has(theme.id)) {
            console.warn(`[ThemeManager] Tema já existe: ${theme.id}`);
            return;
        }

        this.themes.set(theme.id, theme);
        console.log(`[ThemeManager] Tema registrado: ${theme.name}`);
    }
}

// Global Export
(window as any).ThemeManager = ThemeManager;
