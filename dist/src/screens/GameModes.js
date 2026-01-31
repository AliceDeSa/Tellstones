// =========================
// GameModes - Tela de Seleção de Modos de Jogo
// =========================
import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';
import { Logger, LogCategory } from '../utils/Logger.js';
import { Button } from '../ui/components/Button.js';
import LocaleManager from '../data/LocaleManager.js';
export class GameModes {
    constructor() {
        this.container = null;
        this.isVisible = false;
        this.createContainer();
        // Listener para mudança de idioma
        EventBus.on('LOCALE:CHANGE', () => {
            this.updateTranslations();
        });
        Logger.info(LogCategory.UI, '[GameModes] Tela de modos de jogo inicializada');
    }
    createContainer() {
        // Verificar se já existe
        if (document.getElementById('game-modes-screen')) {
            this.container = document.getElementById('game-modes-screen');
            return;
        }
        // Criar container da tela
        this.container = document.createElement('div');
        this.container.id = 'game-modes-screen';
        this.container.className = 'ui-screen';
        this.container.style.display = 'none';
        // Header
        const header = document.createElement('div');
        header.className = 'ui-screen__header';
        // Botão voltar
        const backBtn = new Button({
            text: 'Voltar',
            icon: '←',
            variant: 'ghost',
            onClick: () => this.goBack()
        });
        header.appendChild(backBtn.getElement());
        // Título
        const title = document.createElement('h1');
        title.className = 'ui-screen__title';
        title.id = 'game-modes-title'; // ID para atualizar tradução
        title.textContent = LocaleManager.t('menu.gameModes');
        header.appendChild(title);
        // Espaçador para centralizar título
        const spacer = document.createElement('div');
        spacer.style.width = '100px';
        header.appendChild(spacer);
        this.container.appendChild(header);
        // Corpo da tela com os modos
        const body = document.createElement('div');
        body.className = 'ui-screen__body';
        body.style.cssText = 'display: flex; flex-direction: column; gap: var(--space-lg); max-width: 500px; margin: 0 auto; padding: var(--space-2xl);';
        // Criar botões dos modos
        this.createModeButtons(body);
        this.container.appendChild(body);
        // Adicionar ao DOM
        document.body.appendChild(this.container);
    }
    createModeButtons(container) {
        // Tutorial
        const tutorialBtn = new Button({
            text: 'Tutorial',
            icon: '📖',
            variant: 'primary',
            size: 'lg',
            onClick: () => this.startTutorial()
        });
        const tutorialDesc = document.createElement('p');
        tutorialDesc.style.cssText = 'color: var(--ui-text-muted); text-align: center; margin: 0 0 var(--space-lg) 0; font-size: var(--text-sm);';
        tutorialDesc.textContent = LocaleManager.t('menu.tutorialDesc');
        const tutorialContainer = document.createElement('div');
        tutorialContainer.appendChild(tutorialBtn.getElement());
        tutorialContainer.appendChild(tutorialDesc);
        container.appendChild(tutorialContainer);
        // PvE (Bot)
        const pveBtn = new Button({
            text: 'Jogar vs Bot',
            icon: '🤖',
            variant: 'primary',
            size: 'lg',
            onClick: () => this.startPvE()
        });
        const pveDesc = document.createElement('p');
        pveDesc.style.cssText = 'color: var(--ui-text-muted); text-align: center; margin: 0 0 var(--space-lg) 0; font-size: var(--text-sm);';
        pveDesc.textContent = LocaleManager.t('menu.pveDesc');
        const pveContainer = document.createElement('div');
        pveContainer.appendChild(pveBtn.getElement());
        pveContainer.appendChild(pveDesc);
        container.appendChild(pveContainer);
        // Online
        const onlineBtn = new Button({
            text: 'Online',
            icon: '🌐',
            variant: 'primary',
            size: 'lg',
            onClick: () => this.startOnline()
        });
        const onlineDesc = document.createElement('p');
        onlineDesc.style.cssText = 'color: var(--ui-text-muted); text-align: center; margin: 0 0 var(--space-lg) 0; font-size: var(--text-sm);';
        onlineDesc.textContent = LocaleManager.t('menu.onlineDesc');
        const onlineContainer = document.createElement('div');
        onlineContainer.appendChild(onlineBtn.getElement());
        onlineContainer.appendChild(onlineDesc);
        container.appendChild(onlineContainer);
        // Campanha (placeholder)
        const campaignBtn = new Button({
            text: 'Campanha',
            icon: '⚔️',
            variant: 'secondary',
            size: 'lg',
            disabled: true,
            onClick: () => this.startCampaign()
        });
        const campaignDesc = document.createElement('p');
        campaignDesc.style.cssText = 'color: var(--ui-text-muted); text-align: center; margin: 0; font-size: var(--text-sm);';
        campaignDesc.textContent = LocaleManager.t('menu.campaignDesc');
        const campaignContainer = document.createElement('div');
        campaignContainer.appendChild(campaignBtn.getElement());
        campaignContainer.appendChild(campaignDesc);
        container.appendChild(campaignContainer);
        // Salvar referências para atualizar traduções
        this.translationElements = {
            tutorialBtn, tutorialDesc,
            pveBtn, pveDesc,
            onlineBtn, onlineDesc,
            campaignBtn, campaignDesc
        };
    }
    startTutorial() {
        Logger.info(LogCategory.UI, '[GameModes] Iniciando Tutorial');
        // Esconder a tela de modos
        this.hide();
        // Disparar evento para iniciar tutorial
        EventBus.emit(EventType.GAME_START, {
            mode: 'tutorial'
        });
        // Iniciar tutorial via código legado
        if (window.iniciarTutorial) {
            window.iniciarTutorial();
        }
    }
    startPvE() {
        Logger.info(LogCategory.UI, '[GameModes] Iniciando PvE');
        // Esconder a tela de modos
        this.hide();
        // Disparar evento para iniciar PvE
        EventBus.emit(EventType.GAME_START, {
            mode: 'pve'
        });
        // Iniciar PvE via código legado
        if (window.iniciarPvE) {
            window.iniciarPvE();
        }
    }
    startOnline() {
        Logger.info(LogCategory.UI, '[GameModes] Abrindo menu Online');
        // Mostrar menu online (código legado)
        const onlineMenu = document.getElementById('online-menu');
        const mainMenuBtns = document.getElementById('main-menu-btns');
        if (onlineMenu && mainMenuBtns) {
            mainMenuBtns.style.display = 'none';
            onlineMenu.style.display = 'flex';
        }
        // Voltar ao menu principal
        this.goBack();
    }
    startCampaign() {
        Logger.info(LogCategory.UI, '[GameModes] Campanha ainda não disponível');
        // Futuro: abrir tela de campanha
    }
    goBack() {
        EventBus.emit(EventType.SCREEN_CHANGE, { from: 'game-modes', to: 'main-menu' });
    }
    show() {
        if (this.container) {
            this.container.style.display = 'flex';
            this.isVisible = true;
            Logger.info(LogCategory.UI, '[GameModes] Tela exibida');
        }
    }
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            this.isVisible = false;
            Logger.info(LogCategory.UI, '[GameModes] Tela escondida');
        }
    }
    updateTranslations() {
        var _a, _b, _c, _d;
        // Atualizar título
        const title = document.getElementById('game-modes-title');
        if (title) {
            title.textContent = LocaleManager.t('menu.gameModes');
        }
        // Atualizar botões e descrições
        const elements = this.translationElements;
        if (elements) {
            (_a = elements.tutorialBtn) === null || _a === void 0 ? void 0 : _a.setText(LocaleManager.t('menu.tutorial'));
            elements.tutorialDesc && (elements.tutorialDesc.textContent = LocaleManager.t('menu.tutorialDesc'));
            (_b = elements.pveBtn) === null || _b === void 0 ? void 0 : _b.setText(LocaleManager.t('menu.pve'));
            elements.pveDesc && (elements.pveDesc.textContent = LocaleManager.t('menu.pveDesc'));
            (_c = elements.onlineBtn) === null || _c === void 0 ? void 0 : _c.setText(LocaleManager.t('menu.online'));
            elements.onlineDesc && (elements.onlineDesc.textContent = LocaleManager.t('menu.onlineDesc'));
            (_d = elements.campaignBtn) === null || _d === void 0 ? void 0 : _d.setText(LocaleManager.t('menu.campaign'));
            elements.campaignDesc && (elements.campaignDesc.textContent = LocaleManager.t('menu.campaignDesc'));
        }
    }
    update() {
        // Atualizar conteúdo se necessário
    }
    destroy() {
        if (this.container) {
            this.container.remove();
        }
    }
}
