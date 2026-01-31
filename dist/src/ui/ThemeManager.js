/**
 * ThemeManager.ts - Gerenciador de temas visuais
 * Fase 6: Sistema de Personalização
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
import { EventType } from '../core/types/Events.js';
export class ThemeManager {
    constructor() {
        this.themes = new Map();
        this.loadDefaultThemes();
        this.currentTheme = this.themes.get('default');
    }
    static getInstance() {
        if (!ThemeManager.instance) {
            ThemeManager.instance = new ThemeManager();
        }
        return ThemeManager.instance;
    }
    /**
     * Carrega temas padrão do jogo
     */
    loadDefaultThemes() {
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
    getAvailableThemes() {
        return Array.from(this.themes.values());
    }
    /**
     * Retorna tema atual
     */
    getCurrentTheme() {
        return this.currentTheme;
    }
    /**
     * Busca tema por ID
     */
    getThemeById(id) {
        return this.themes.get(id);
    }
    /**
     * Carrega e aplica tema
     */
    loadTheme(themeId) {
        return __awaiter(this, void 0, void 0, function* () {
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
            yield this.applyTheme(theme);
            // Salvar preferência
            this.savePreference(themeId);
            // Emitir evento
            EventBus.emit(EventType.STATE_UPDATE, {
                state: { preferences: { theme: themeId } },
                reason: 'THEME_LOADED'
            });
            console.log(`[ThemeManager] Tema "${theme.name}" aplicado!`);
        });
    }
    /**
     * Aplica tema visualmente ao jogo
     */
    applyTheme(theme) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Atualizar tabuleiro
            const tabuleiroImg = document.getElementById('tabuleiro');
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
            if (window.PEDRAS_OFICIAIS) {
                const pedras = window.PEDRAS_OFICIAIS;
                pedras.forEach((pedra) => {
                    // Substituir pasta de pedras
                    pedra.url = pedra.url.replace(/\/stones\/(demacia|new_set|tellstones|tavern|cyberpunk)\//, `/stones/${theme.assets.stones.set}/`);
                });
                console.log('[ThemeManager] Pedras oficiais atualizadas para:', theme.assets.stones.set);
            }
            // 4. Re-renderizar mesa se em jogo
            if (window.Renderer && window.Renderer.renderizarMesa) {
                setTimeout(() => {
                    window.Renderer.renderizarMesa();
                    console.log('[ThemeManager] Mesa re-renderizada');
                }, 100);
            }
            // 5. Re-renderizar pedras de reserva se em jogo
            if (window.Renderer && window.Renderer.renderizarPedrasReserva) {
                setTimeout(() => {
                    window.Renderer.renderizarPedrasReserva();
                    console.log('[ThemeManager] Reserva re-renderizada');
                }, 150);
            }
        });
    }
    /**
     * Salva preferência no GameStateManager
     */
    savePreference(themeId) {
        if (window.gameStateManager) {
            window.gameStateManager.update({
                preferences: { theme: themeId }
            }, 'THEME_PREFERENCE');
            console.log('[ThemeManager] Preferência salva:', themeId);
        }
    }
    /**
     * Carrega preferência salva do localStorage
     */
    loadSavedPreference() {
        var _a;
        if (window.gameStateManager) {
            const state = window.gameStateManager.get();
            const savedTheme = (_a = state.preferences) === null || _a === void 0 ? void 0 : _a.theme;
            if (savedTheme && this.themes.has(savedTheme)) {
                console.log('[ThemeManager] Carregando preferência salva:', savedTheme);
                this.loadTheme(savedTheme);
            }
            else {
                console.log('[ThemeManager] Nenhuma preferência salva, usando tema padrão');
            }
        }
    }
    /**
     * Registra novo tema (para expansões futuras)
     */
    registerTheme(theme) {
        if (this.themes.has(theme.id)) {
            console.warn(`[ThemeManager] Tema já existe: ${theme.id}`);
            return;
        }
        this.themes.set(theme.id, theme);
        console.log(`[ThemeManager] Tema registrado: ${theme.name}`);
    }
}
// Global Export
window.ThemeManager = ThemeManager;
