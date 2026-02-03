// =========================
// Settings - Tela de Opções/Configurações
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
import { GameStateManager } from '../state/GameStateManager.js';
import { Slider } from '../ui/components/Slider.js';
import LocaleManager from '../data/LocaleManager.js';
export class Settings {
    constructor() {
        this.container = null;
        this.isVisible = false;
        // Componentes de configuração
        this.musicSlider = null;
        this.sfxSlider = null;
        // Armazenar última posição válida para restaurar
        this.lastMusicVol = 80;
        this.lastSfxVol = 100;
        this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            // Aguardar LocaleManager estar pronto
            yield LocaleManager.waitForReady();
            this.createContainer();
            // Atualizar traduções assim que o container for criado
            setTimeout(() => this.updateTranslations(), 100);
            // Listener para Mute Externo (ex: Botão Global)
            EventBus.on(EventType.AUDIO_MUTE_CHANGED, (data) => {
                // Apenas Música deve ser afetada pelo Mute Global
                if (data.isMuted) {
                    // Salvar antes de zerar
                    if (this.musicSlider)
                        this.lastMusicVol = this.musicSlider.getValue() || 50;
                    // Zerar visualmente apenas a música
                    if (this.musicSlider)
                        this.musicSlider.setValue(0);
                }
                else {
                    // Restaurar apenas música
                    if (this.musicSlider && this.musicSlider.getValue() === 0) {
                        this.musicSlider.setValue(this.lastMusicVol);
                    }
                }
            });
            // Listener para mudança de idioma
            EventBus.on(EventType.LANGUAGE_CHANGE, () => {
                this.updateTranslations();
            });
            Logger.info(LogCategory.UI, '[Settings] Tela de configurações inicializada');
        });
    }
    createContainer() {
        // Verificar se já existe
        if (document.getElementById('settings-screen')) {
            this.container = document.getElementById('settings-screen');
            return;
        }
        // Criar container da tela (Overlay Escuro)
        this.container = document.createElement('div');
        this.container.id = 'settings-screen';
        this.container.className = 'ui-screen';
        this.container.style.display = 'none';
        // Wrapper do Painel (O Quadro que escala)
        const panelWrapper = document.createElement('div');
        panelWrapper.id = 'settings-panel-wrapper';
        this.container.appendChild(panelWrapper);
        // Botão Fechar (X) - Agora dentro do wrapper
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn-medieval';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => this.goBack();
        panelWrapper.appendChild(closeBtn);
        // Criar Pôsteres da Taverna (Draggable)
        this.createPosters(panelWrapper);
        // Criar Bandeiras de Idioma (Draggable e Clicáveis)
        this.createLanguageFlags(panelWrapper);
        // Corpo da tela (Sliders)
        const body = document.createElement('div');
        body.className = 'ui-screen__body';
        // Adicionar controles de áudio
        const audioContent = this.createAudioControls();
        body.appendChild(audioContent);
        panelWrapper.appendChild(body);
        // Adicionar ao DOM
        document.body.appendChild(this.container);
    }
    createAudioControls() {
        var _a, _b;
        const content = document.createElement('div');
        content.className = 'settings-audio-content';
        content.style.cssText = 'display: flex; flex-direction: column; gap: 25px;';
        // Carregar configurações salvas
        const settings = GameStateManager.getSettings();
        const musicVolume = (_a = settings === null || settings === void 0 ? void 0 : settings.musicVolume) !== null && _a !== void 0 ? _a : 80;
        const sfxVolume = (_b = settings === null || settings === void 0 ? void 0 : settings.sfxVolume) !== null && _b !== void 0 ? _b : 100;
        // Slider de música
        this.musicSlider = new Slider({
            label: LocaleManager.t('settings.music'),
            min: 0,
            max: 100,
            value: musicVolume,
            suffix: '%',
            onChange: (value) => {
                this.setMusicVolume(value);
            }
        });
        content.appendChild(this.musicSlider.getElement());
        // Slider de efeitos
        this.sfxSlider = new Slider({
            label: LocaleManager.t('settings.sfx'),
            min: 0,
            max: 100,
            value: sfxVolume,
            suffix: '%',
            onChange: (value) => {
                this.setSfxVolume(value);
            }
        });
        content.appendChild(this.sfxSlider.getElement());
        return content;
    }
    createPosters(wrapper) {
        // Layout Configurado pelo Usuário (Extraído dos Logs)
        const savedLayout = {
            'mapa1.png': { left: '-76px', top: '10px', width: '350px' },
            'mapa2.png': { left: '1124px', top: '19px', width: '240px' },
            'noticias1.png': { left: '732px', top: '-14px', width: '149px' },
            'noticias3.png': { left: '1109px', top: '398px', width: '211px' },
            'poster_1.png': { left: '1187px', top: '335px', width: '120px' },
            'poster_2.png': { left: '22px', top: '18px', width: '130px' },
            'poster_3.png': { left: '1124px', top: '5px', width: '130px' },
            'quest1.png': { left: '878px', top: '139px', width: '136px' },
            'quest2.png': { left: '882px', top: '222px', width: '131px' },
            'quest3.png': { left: '358px', top: '190px', width: '131px' },
            'quest6.png': { left: '354px', top: '453px', width: '93px' },
            'quest7.png': { left: '691px', top: '465px', width: '100px' },
            'Rumores1.png': { left: '1226px', top: '418px', width: '122px' },
            'tesouro1.png': { left: '981px', top: '288px', width: '99px' },
            'tesouro2.png': { left: '986px', top: '475px', width: '90px' },
            'tesouro3.png': { left: '451px', top: '432px', width: '100px' },
            'tesouro4.png': { left: '553px', top: '444px', width: '100px' },
            'tesouro5.png': { left: '701px', top: '441px', width: '100px' },
            'tesouro6.png': { left: '338px', top: '386px', width: '120px' },
            'tesouro7.png': { left: '331px', top: '325px', width: '82px' },
            'Venda3.png': { left: '1178px', top: '271px', width: '212px' },
            'mapa_do_tesouro.png': { left: '32px', top: '259px', width: '140px' },
            'Venda1.png': { left: '922px', top: '313px', width: '160px' }
        };
        // Separar Posters (Background) do resto
        const postersFiles = ['poster_1.png', 'poster_2.png', 'poster_3.png'];
        const otherFiles = [
            'mapa1.png', 'mapa2.png', 'mapa_do_tesouro.png',
            'Rumores1.png',
            'Venda1.png', 'Venda2.png', 'Venda3.png',
            'noticias1.png', 'noticias2.png', 'noticias3.png', 'noticias4.png', 'noticias5.png', 'noticias6.png',
            'quest1.png', 'quest2.png', 'quest3.png', 'quest4.png', 'quest5.png', 'quest6.png', 'quest7.png',
            'tesouro1.png', 'tesouro2.png', 'tesouro3.png', 'tesouro4.png', 'tesouro5.png', 'tesouro6.png', 'tesouro7.png'
        ];
        // Embaralhar apenas os "outros" para variedade visual entre eles
        otherFiles.sort(() => Math.random() - 0.5);
        // Concatenar: Posters PRIMEIRO no array (processados primeiro) = Atrás no DOM se não houvesse z-index
        // Mas vamos usar z-index explícito para garantir.
        const headerFiles = [...postersFiles, ...otherFiles];
        headerFiles.forEach((file) => {
            const img = document.createElement('img');
            img.src = `assets/img/ui/tavern/${file}`;
            img.className = 'tavern-poster';
            img.draggable = false;
            img.style.pointerEvents = 'auto';
            // Definir Camadas (Layers)
            const isPoster = file.startsWith('poster');
            const baseZIndex = isPoster ? '5' : '10';
            img.style.zIndex = baseZIndex;
            img.dataset.zIndexBase = baseZIndex; // Salvar para restaurar após drag
            // 1. Usar layout salvo se existir
            const saved = savedLayout[file];
            if (saved) {
                img.style.left = saved.left;
                img.style.top = saved.top;
                img.style.width = saved.width;
                if (!isPoster) { // Posters geralmente ficam melhor alinhados ou rotação muito sutil
                    img.style.transform = `rotate(${-5 + Math.random() * 10}deg)`;
                }
                else {
                    img.style.transform = 'rotate(0deg)'; // Posters "base" retos
                }
            }
            else {
                // 2. Posicionamento seguro (Margens)
                // Ajustado para evitar que saiam da tela (max 85% em vez de 100%)
                const zones = ['top', 'bottom', 'left', 'right'];
                const zone = zones[Math.floor(Math.random() * zones.length)];
                let rTop = 0, rLeft = 0;
                switch (zone) {
                    case 'top':
                        rTop = 2 + Math.random() * 13;
                        rLeft = 5 + Math.random() * 80;
                        break; // Top: 2-15% | Left: 5-85%
                    case 'bottom':
                        rTop = 75 + Math.random() * 10;
                        rLeft = 5 + Math.random() * 80;
                        break; // Bottom: 75-85%
                    case 'left':
                        rTop = 10 + Math.random() * 70;
                        rLeft = 2 + Math.random() * 8;
                        break; // Left: 2-10% | Top: 10-80%
                    case 'right':
                        rTop = 10 + Math.random() * 70;
                        rLeft = 82 + Math.random() * 8;
                        break; // Right: 82-90%
                }
                const rRot = -15 + Math.random() * 30;
                const rWidth = 80 + Math.random() * 50;
                img.style.top = `${rTop}%`;
                img.style.left = `${rLeft}%`;
                img.style.width = `${rWidth}px`;
                img.style.transform = `rotate(${rRot}deg)`;
            }
            this.makeDraggable(img);
            wrapper.appendChild(img);
        });
    }
    makeDraggable(element) {
        let isDragging = false;
        let startX = 0, startY = 0;
        let startLeft = 0, startTop = 0;
        // Pointer Events: Funciona para Mouse, Touch e Caneta
        element.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Garante que não propague para o overlay
            console.log('[Settings] PointerDown on:', element.getAttribute('src'));
            // Captura o ponteiro para receber eventos de move/up mesmo fora do elemento
            element.setPointerCapture(e.pointerId);
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            // Pega posição atual computada (px) para iniciar o arraste relativo
            // Importante: offsetLeft/Top são relativos ao pai posicionado (o wrapper)
            startLeft = element.offsetLeft;
            startTop = element.offsetTop;
            // Converter % para px e preparar visual
            element.style.left = `${startLeft}px`;
            element.style.top = `${startTop}px`;
            element.style.zIndex = '1000'; // Trazer para frente ao arrastar
            element.style.cursor = 'grabbing';
            element.style.transform = 'scale(1.05)';
        });
        element.addEventListener('pointermove', (e) => {
            if (!isDragging)
                return;
            e.preventDefault();
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            element.style.left = `${startLeft + dx}px`;
            element.style.top = `${startTop + dy}px`;
        });
        element.addEventListener('pointerup', (e) => {
            if (isDragging) {
                isDragging = false;
                element.releasePointerCapture(e.pointerId);
                // Restaurar Z-Index original (Prioridade de camada)
                element.style.zIndex = element.dataset.zIndexBase || '10';
                element.style.cursor = 'grab';
                element.style.transform = 'scale(1)';
                console.log('[Settings] Dropped at:', element.style.left, element.style.top);
            }
        });
        // Feature: Scroll para Redimensionar (Quick Scale)
        element.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Determinar direção
            const delta = Math.sign(e.deltaY) * -1; // Cima = Aumentar, Baixo = Diminuir
            const step = 10; // Pixels por scroll
            // Obter largura atual
            let currentWidth = parseInt(element.style.width || '100');
            if (isNaN(currentWidth))
                currentWidth = 100;
            // Calcular nova largura (Limites: 50px a 500px)
            const newWidth = Math.max(50, Math.min(500, currentWidth + (delta * step)));
            element.style.width = `${newWidth}px`;
            console.log(`[Settings] Resized ${element.getAttribute('src')} to ${newWidth}px`);
        });
    }
    createLanguageFlags(wrapper) {
        const flags = [
            { locale: 'pt-BR', file: 'flag_br.svg', defaultPos: { left: '386px', top: '160px', width: '30px' } },
            { locale: 'en-US', file: 'flag_us.svg', defaultPos: { left: '422px', top: '160px', width: '30px' } }
        ];
        const currentLocale = LocaleManager.getCurrentLocale();
        flags.forEach((flag) => {
            const img = document.createElement('img');
            img.src = `assets/img/ui/${flag.file}`;
            img.className = 'language-flag';
            img.draggable = false;
            img.style.pointerEvents = 'auto';
            img.style.cursor = 'pointer';
            img.style.zIndex = '20'; // Acima dos pôsteres
            img.dataset.locale = flag.locale;
            // Posição fixa
            img.style.left = flag.defaultPos.left;
            img.style.top = flag.defaultPos.top;
            img.style.width = flag.defaultPos.width;
            // Indicador de seleção (borda dourada)
            if (flag.locale === currentLocale) {
                img.style.border = '3px solid #ffd700';
                img.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)';
            }
            else {
                img.style.border = '2px solid rgba(255,255,255,0.3)';
            }
            // Click para mudar idioma
            img.addEventListener('click', (e) => __awaiter(this, void 0, void 0, function* () {
                e.stopPropagation();
                const locale = img.dataset.locale;
                console.log('[Settings] Clicou na bandeira:', locale);
                console.log('[Settings] Idioma atual antes:', LocaleManager.getCurrentLocale());
                yield LocaleManager.setLocale(locale);
                console.log('[Settings] Idioma atual depois:', LocaleManager.getCurrentLocale());
                // Atualizar bordas de todas as bandeiras
                wrapper.querySelectorAll('.language-flag').forEach((f) => {
                    const flagEl = f;
                    if (flagEl.dataset.locale === locale) {
                        flagEl.style.border = '3px solid #ffd700';
                        flagEl.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)';
                    }
                    else {
                        flagEl.style.border = '2px solid rgba(255,255,255,0.3)';
                        flagEl.style.boxShadow = 'none';
                    }
                });
                Logger.info(LogCategory.UI, `[Settings] Idioma alterado para: ${locale}`);
            }));
            wrapper.appendChild(img);
        });
    }
    setMusicVolume(value) {
        this.checkUnmuteIfSliderMoved(value);
        // Emitir evento para AudioManager
        EventBus.emit(EventType.AUDIO_MUSIC_VOLUME, { volume: value / 100 });
        Logger.info(LogCategory.UI, `[Settings] Volume música: ${value}%`);
        this.autoSaveSettings();
    }
    setSfxVolume(value) {
        this.checkUnmuteIfSliderMoved(value);
        // Emitir evento para AudioManager
        EventBus.emit(EventType.AUDIO_SFX_VOLUME, { volume: value / 100 });
        Logger.info(LogCategory.UI, `[Settings] Volume efeitos: ${value}%`);
        this.autoSaveSettings();
    }
    // Helper para desmutar se usuário mexer no slider
    checkUnmuteIfSliderMoved(value) {
        if (value > 0 && window.isMuted) {
            EventBus.emit(EventType.AUDIO_MUTE_CHANGED, { isMuted: false });
        }
    }
    autoSaveSettings() {
        var _a, _b, _c, _d;
        const settings = {
            musicVolume: (_b = (_a = this.musicSlider) === null || _a === void 0 ? void 0 : _a.getValue()) !== null && _b !== void 0 ? _b : 80,
            sfxVolume: (_d = (_c = this.sfxSlider) === null || _c === void 0 ? void 0 : _c.getValue()) !== null && _d !== void 0 ? _d : 100
        };
        GameStateManager.saveSettings(settings);
        Logger.info(LogCategory.UI, '[Settings] Auto-saved', settings);
    }
    goBack() {
        EventBus.emit(EventType.SCREEN_CHANGE, { from: 'settings', to: 'main-menu' });
    }
    updateTranslations() {
        console.log('[Settings] Atualizando traduções...');
        // Atualizar sliders usando o método setLabel
        if (this.musicSlider) {
            this.musicSlider.setLabel(LocaleManager.t('settings.music'));
        }
        if (this.sfxSlider) {
            this.sfxSlider.setLabel(LocaleManager.t('settings.sfx'));
        }
        console.log('[Settings] Traduções atualizadas!');
    }
    show() {
        if (this.container) {
            this.container.style.display = 'flex';
            this.isVisible = true;
            Logger.info(LogCategory.UI, '[Settings] Tela exibida');
        }
    }
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            this.isVisible = false;
            Logger.info(LogCategory.UI, '[Settings] Tela escondida');
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
