// =========================
// Settings - Tela de Opções/Configurações
// =========================

import { Screen } from './ScreenManager.js';
import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';
import { Logger, LogCategory } from '../utils/Logger.js';
import { GameStateManager } from '../state/GameStateManager.js';
import { Slider } from '../ui/components/Slider.js';
import LocaleManager from '../data/LocaleManager.js';

export class Settings implements Screen {
    private container: HTMLElement | null = null;
    private isVisible: boolean = false;

    // Componentes de configuração
    private musicSlider: Slider | null = null;
    private sfxSlider: Slider | null = null;



    // Armazenar última posição válida para restaurar
    private lastMusicVol = 80;
    private lastSfxVol = 100;

    constructor() {
        this.init();
    }

    private async init(): Promise<void> {
        // Aguardar LocaleManager estar pronto
        await LocaleManager.waitForReady();

        this.createContainer();

        // Atualizar traduções assim que o container for criado
        setTimeout(() => this.updateTranslations(), 100);

        // Listener para Mute Externo (ex: Botão Global)
        EventBus.on(EventType.AUDIO_MUTE_CHANGED, (data) => {
            // Apenas Música deve ser afetada pelo Mute Global
            if (data.isMuted) {
                // Salvar antes de zerar
                if (this.musicSlider) this.lastMusicVol = this.musicSlider.getValue() || 50;

                // Zerar visualmente apenas a música
                if (this.musicSlider) this.musicSlider.setValue(0);
            } else {
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
    }

    private createContainer(): void {
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
        // Essencial para porcentagem: simular o tamanho do ::before no JS/CSS Inline para ser a âncora dos childs
        panelWrapper.style.position = 'absolute';
        panelWrapper.style.top = '50%';
        panelWrapper.style.left = '50%';
        panelWrapper.style.transform = 'translate(-50%, -50%)';
        panelWrapper.style.width = 'min(90vw, 1000px)';
        panelWrapper.style.height = 'min(90vh, 650px)';

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

    private createAudioControls(): HTMLElement {
        const content = document.createElement('div');
        content.className = 'settings-audio-content';
        content.style.cssText = 'display: flex; flex-direction: column; gap: 25px;';

        // Carregar configurações salvas
        const settings = GameStateManager.getSettings();
        const musicVolume = settings?.musicVolume ?? 80;
        const sfxVolume = settings?.sfxVolume ?? 100;

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

    private createPosters(wrapper: HTMLElement): void {
        // Layout Configurado pelo Usuário (Extraído dos Logs e Re-calculado para Porcentagem % do Wrapper de 1000x650)
        const savedLayout: Record<string, { left: string, top: string, width: string }> = {
            'mapa1.png': { left: '-25.90%', top: '-7.54%', width: '35.00%' },
            'mapa2.png': { left: '94.10%', top: '-6.15%', width: '24.00%' },
            'noticias1.png': { left: '54.90%', top: '-11.23%', width: '14.90%' },
            'noticias3.png': { left: '92.60%', top: '52.15%', width: '21.10%' },
            'poster_1.png': { left: '100.40%', top: '42.46%', width: '12.00%' },
            'poster_2.png': { left: '-16.10%', top: '-6.31%', width: '13.00%' },
            'poster_3.png': { left: '94.10%', top: '-8.31%', width: '13.00%' },
            'quest1.png': { left: '69.50%', top: '12.31%', width: '13.60%' },
            'quest2.png': { left: '69.90%', top: '25.08%', width: '13.10%' },
            'quest3.png': { left: '17.50%', top: '20.15%', width: '13.10%' },
            'quest6.png': { left: '17.10%', top: '60.62%', width: '9.30%' },
            'quest7.png': { left: '50.80%', top: '62.46%', width: '10.00%' },
            'Rumores1.png': { left: '104.30%', top: '55.23%', width: '12.20%' },
            'tesouro1.png': { left: '79.80%', top: '35.23%', width: '9.90%' },
            'tesouro2.png': { left: '80.30%', top: '64.00%', width: '9.00%' },
            'tesouro3.png': { left: '26.80%', top: '57.38%', width: '10.00%' },
            'tesouro4.png': { left: '37.00%', top: '59.23%', width: '10.00%' },
            'tesouro5.png': { left: '51.80%', top: '58.77%', width: '10.00%' },
            'tesouro6.png': { left: '15.50%', top: '50.31%', width: '12.00%' },
            'tesouro7.png': { left: '14.80%', top: '40.92%', width: '8.20%' },
            'Venda3.png': { left: '99.50%', top: '32.62%', width: '21.20%' },
            'mapa_do_tesouro.png': { left: '-15.10%', top: '30.77%', width: '14.00%' },
            'Venda1.png': { left: '73.90%', top: '39.08%', width: '16.00%' }
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
            img.src = `assets/themes/Taberna/img/ui/tavern/${file}`;
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
                } else {
                    img.style.transform = 'rotate(0deg)'; // Posters "base" retos
                }
            } else {
                // 2. Posicionamento seguro (Margens)
                // Ajustado para evitar que saiam da tela (max 85% em vez de 100%)
                const zones = ['top', 'bottom', 'left', 'right'];
                const zone = zones[Math.floor(Math.random() * zones.length)];

                let rTop = 0, rLeft = 0;

                switch (zone) {
                    case 'top': rTop = 2 + Math.random() * 13; rLeft = 5 + Math.random() * 80; break; // Top: 2-15% | Left: 5-85%
                    case 'bottom': rTop = 75 + Math.random() * 10; rLeft = 5 + Math.random() * 80; break; // Bottom: 75-85%
                    case 'left': rTop = 10 + Math.random() * 70; rLeft = 2 + Math.random() * 8; break;  // Left: 2-10% | Top: 10-80%
                    case 'right': rTop = 10 + Math.random() * 70; rLeft = 82 + Math.random() * 8; break; // Right: 82-90%
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

    private makeDraggable(element: HTMLElement): void {
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
            if (!isDragging) return;
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

                // Converter a posição final em pixels para % da LARGURA real do elemento PAI (o wrapper)
                // Usamos offsetLeft/Top normal que são dados baseados em relação ao wrapper e os clients do wrapper
                const finalLeftPx = element.offsetLeft;
                const finalTopPx = element.offsetTop;

                const parentW = element.parentElement?.clientWidth || window.innerWidth;
                const parentH = element.parentElement?.clientHeight || window.innerHeight;

                const pctLeft = (finalLeftPx / parentW) * 100;
                const pctTop = (finalTopPx / parentH) * 100;

                element.style.left = `${pctLeft}%`;
                element.style.top = `${pctTop}%`;

                console.log(`[Settings] Dropped at: ${pctLeft.toFixed(2)}%, ${pctTop.toFixed(2)}%`);
            }
        });

        // Feature: Scroll para Redimensionar (Quick Scale)
        element.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Determinar direção
            const delta = Math.sign(e.deltaY) * -1; // Cima = Aumentar, Baixo = Diminuir
            const step = 1; // Aproximadamente passos de 1% por scroll do Wrapper

            // Obter largura atual, que agora pode vir como '10%' ou '100px'
            let currentWidthPct = parseFloat(element.style.width);
            if (isNaN(currentWidthPct)) currentWidthPct = 10;
            // Se ainda for PX (pode ocorrer arrastando pela primeira vez)
            if (element.style.width.includes('px')) {
                const parentW = element.parentElement?.clientWidth || window.innerWidth;
                currentWidthPct = (parseFloat(element.style.width) / parentW) * 100;
            }

            // Calcular nova largura (Limites: 5% a 60%) baseada no Wrapper
            const newWidthPct = Math.max(5, Math.min(60, currentWidthPct + (delta * step)));

            element.style.width = `${newWidthPct}%`;
            console.log(`[Settings] Resized ${element.getAttribute('src')} to ${newWidthPct.toFixed(2)}%`);
        });
    }

    private createLanguageFlags(wrapper: HTMLElement): void {
        const flags = [
            { locale: 'pt-BR', file: 'flag_br.svg', defaultPos: { left: '20.30%', top: '15.54%', width: '3.00%' } },
            { locale: 'en-US', file: 'flag_us.svg', defaultPos: { left: '23.90%', top: '15.54%', width: '3.00%' } }
        ];

        const currentLocale = LocaleManager.getCurrentLocale();

        flags.forEach((flag) => {
            const img = document.createElement('img');
            img.src = `assets/themes/Taberna/img/ui/${flag.file}`;
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
            } else {
                img.style.border = '2px solid rgba(255,255,255,0.3)';
            }

            // Click para mudar idioma
            img.addEventListener('click', async (e) => {
                e.stopPropagation();
                const locale = img.dataset.locale as 'pt-BR' | 'en-US';

                console.log('[Settings] Clicou na bandeira:', locale);
                console.log('[Settings] Idioma atual antes:', LocaleManager.getCurrentLocale());

                await LocaleManager.setLocale(locale);

                console.log('[Settings] Idioma atual depois:', LocaleManager.getCurrentLocale());

                // Atualizar bordas de todas as bandeiras
                wrapper.querySelectorAll('.language-flag').forEach((f) => {
                    const flagEl = f as HTMLElement;
                    if (flagEl.dataset.locale === locale) {
                        flagEl.style.border = '3px solid #ffd700';
                        flagEl.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.8)';
                    } else {
                        flagEl.style.border = '2px solid rgba(255,255,255,0.3)';
                        flagEl.style.boxShadow = 'none';
                    }
                });

                Logger.info(LogCategory.UI, `[Settings] Idioma alterado para: ${locale}`);
            });


            wrapper.appendChild(img);
        });
    }

    private setMusicVolume(value: number): void {
        this.checkUnmuteIfSliderMoved(value);
        // Emitir evento para AudioManager
        EventBus.emit(EventType.AUDIO_MUSIC_VOLUME, { volume: value / 100 });
        Logger.info(LogCategory.UI, `[Settings] Volume música: ${value}%`);
        this.autoSaveSettings();
    }

    private setSfxVolume(value: number): void {
        this.checkUnmuteIfSliderMoved(value);
        // Emitir evento para AudioManager
        EventBus.emit(EventType.AUDIO_SFX_VOLUME, { volume: value / 100 });
        Logger.info(LogCategory.UI, `[Settings] Volume efeitos: ${value}%`);
        this.autoSaveSettings();
    }

    // Helper para desmutar se usuário mexer no slider
    private checkUnmuteIfSliderMoved(value: number): void {
        if (value > 0 && (window as any).isMuted) {
            EventBus.emit(EventType.AUDIO_MUTE_CHANGED, { isMuted: false });
        }
    }

    private autoSaveSettings(): void {
        const settings = {
            musicVolume: this.musicSlider?.getValue() ?? 80,
            sfxVolume: this.sfxSlider?.getValue() ?? 100
        };
        GameStateManager.saveSettings(settings);
        Logger.info(LogCategory.UI, '[Settings] Auto-saved', settings);
    }

    private goBack(): void {
        EventBus.emit(EventType.SCREEN_CHANGE, { from: 'settings', to: 'main-menu' });
    }

    private updateTranslations(): void {
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

    show(): void {
        if (this.container) {
            this.container.style.display = 'flex';
            this.isVisible = true;
            Logger.info(LogCategory.UI, '[Settings] Tela exibida');
        }
    }

    hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
            this.isVisible = false;
            Logger.info(LogCategory.UI, '[Settings] Tela escondida');
        }
    }

    update(): void {
        // Atualizar conteúdo se necessário
    }

    destroy(): void {
        if (this.container) {
            this.container.remove();
        }
    }
}
