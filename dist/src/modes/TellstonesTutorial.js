import LocaleManager from "../data/LocaleManager.js";
export class TellstonesTutorial {
    constructor() {
        this.localeManager = null;
        console.log("[TUTORIAL] Inicializando Nova Lógica Scriptada (TS)...");
        this.passo = 0;
        this.overlay = null;
        this.texto = null;
        this.btnNext = null;
        this.acaoConcluida = false;
        // Load LocaleManager
        import('../data/LocaleManager.js').then(module => {
            this.localeManager = module.default;
        });
        // Definição do Roteiro (Script)
        this.roteiro = [
            {
                // 0
                titulo: LocaleManager.t('tutorialSteps.step0.title'),
                msg: LocaleManager.t('tutorialSteps.step0.msg'),
                acao: LocaleManager.t('tutorialSteps.step0.action'),
                setup: () => {
                    this.resetarEstadoParaTutorial();
                },
                validacao: () => true,
                permissoes: { actions: [] }
            },
            {
                // 1
                titulo: LocaleManager.t('tutorialSteps.step1.title'),
                msg: LocaleManager.t('tutorialSteps.step1.msg'),
                acao: LocaleManager.t('tutorialSteps.step1.action'),
                setup: () => {
                    window.estadoJogo.vez = 1;
                    if (window.GameController)
                        window.GameController.persistirEstado();
                    if (window.Renderer)
                        window.Renderer.renderizarMesa();
                },
                validacao: () => {
                    const mesa = window.estadoJogo.mesa;
                    if (!mesa)
                        return false;
                    const pedras = mesa.filter((p) => p !== null);
                    return pedras.length >= 2;
                },
                permissoes: { actions: ["ARRASTAR_RESERVA"] }
            },
            {
                // 2
                titulo: LocaleManager.t('tutorialSteps.step2.title'),
                msg: LocaleManager.t('tutorialSteps.step2.msg'),
                acao: LocaleManager.t('tutorialSteps.step2.action'),
                setup: () => { },
                validacao: () => {
                    const mesa = window.estadoJogo.mesa;
                    return mesa && mesa.some((p) => p && p.virada);
                },
                permissoes: { actions: ["VIRAR_PEDRA"] }
            },
            {
                // 3
                titulo: LocaleManager.t('tutorialSteps.step3.title'),
                msg: LocaleManager.t('tutorialSteps.step3.msg'),
                acao: LocaleManager.t('tutorialSteps.step3.action'),
                setup: () => {
                    window.estadoJogo.vez = 1;
                    if (window.GameController)
                        window.GameController.persistirEstado();
                },
                validacao: () => {
                    return typeof window.estadoJogo.mesaEspiada === 'number';
                },
                permissoes: { actions: ["ESPIAR_PEDRA"] }
            },
            {
                // 4
                titulo: LocaleManager.t('tutorialSteps.step4.title'),
                msg: LocaleManager.t('tutorialSteps.step4.msg'),
                acao: LocaleManager.t('tutorialSteps.step4.action'),
                setup: () => {
                    window.estadoJogo.vez = 1;
                    // Salva estado inicial da mesa
                    const mesaSnapshot = window.estadoJogo.mesa.map((p) => p ? p.nome : null);
                    window.tutorialMesaInicial = mesaSnapshot;
                    if (window.GameController)
                        window.GameController.persistirEstado();
                },
                validacao: () => {
                    if (!window.tutorialMesaInicial)
                        return false;
                    const mesaAtual = window.estadoJogo.mesa.map((p) => p ? p.nome : null);
                    return JSON.stringify(mesaAtual) !== JSON.stringify(window.tutorialMesaInicial);
                },
                permissoes: { actions: ["TROCAR_PEDRAS"] }
            },
            {
                // 5
                titulo: LocaleManager.t('tutorialSteps.step5.title'),
                msg: LocaleManager.t('tutorialSteps.step5.msg'),
                acao: LocaleManager.t('tutorialSteps.step5.action'),
                setup: () => {
                    window.estadoJogo.vez = 1;
                    if (window.GameController)
                        window.GameController.persistirEstado();
                },
                validacao: () => {
                    return window.estadoJogo.desafio &&
                        window.estadoJogo.desafio.jogador === "Aprendiz" &&
                        window.estadoJogo.desafio.status === "aguardando_resposta";
                },
                permissoes: { actions: ["BOTAO_DESAFIAR", "SELECIONAR_DESAFIO"] }
            },
            {
                // 6
                titulo: LocaleManager.t('tutorialSteps.step6.title'),
                msg: LocaleManager.t('tutorialSteps.step6.msg'),
                acao: LocaleManager.t('tutorialSteps.step6.action'),
                setup: () => {
                    window.tutorialDesafioIniciado = false;
                    const mesa = window.estadoJogo.mesa;
                    const viradas = mesa.map((p, i) => p && p.virada ? i : null).filter((i) => i !== null);
                    if (viradas.length === 0) {
                        const idx = mesa.findIndex((p) => p !== null);
                        if (idx !== -1) {
                            mesa[idx].virada = true;
                            viradas.push(idx);
                        }
                    }
                    if (viradas.length > 0) {
                        const alvo = viradas[0];
                        const novoDesafio = {
                            status: "aguardando_resposta",
                            idxPedra: alvo,
                            tipo: "normal",
                            jogador: "Mestre"
                        };
                        window.estadoJogo.desafio = novoDesafio;
                        window.estadoJogo.vez = 0;
                        window.getDBRef("salas/MODO_TUTORIAL/estadoJogo").update({
                            desafio: novoDesafio,
                            vez: 0,
                            mesa: mesa
                        });
                        if (window.notificationManager)
                            window.notificationManager.showGlobal(LocaleManager.t('master.challenged'));
                        window.tutorialDesafioIniciado = true;
                        if (window.Renderer)
                            window.Renderer.renderizarOpcoesDesafio();
                    }
                },
                validacao: () => {
                    if (!window.tutorialDesafioIniciado)
                        return false;
                    if (window.estadoJogo.desafio)
                        return false;
                    return true;
                },
                permissoes: { actions: ["RESPONDER_DESAFIO"] }
            },
            {
                // 7
                titulo: LocaleManager.t('tutorialSteps.step7.title'),
                msg: LocaleManager.t('tutorialSteps.step7.msg'),
                acao: LocaleManager.t('tutorialSteps.step7.action'),
                setup: () => {
                    window.estadoJogo.mesa.forEach((p) => {
                        if (p)
                            p.virada = true;
                    });
                    window.step7BotDoubtsTriggered = false;
                    window.getDBRef("salas/MODO_TUTORIAL/estadoJogo").update({
                        mesa: window.estadoJogo.mesa,
                        vez: 1
                    });
                    window.estadoJogo.vez = 1;
                    if (window.Renderer)
                        window.Renderer.atualizarInfoSala(window.salaAtual, window.ultimosEspectadores || []);
                },
                validacao: () => {
                    if (window.estadoJogo.desafio &&
                        window.estadoJogo.desafio.tipo === "segabar" &&
                        window.estadoJogo.desafio.status === "aguardando_resposta" &&
                        window.estadoJogo.desafio.jogador !== "Mestre") {
                        if (window.notificationManager)
                            window.notificationManager.showInternal(LocaleManager.t('master.doubt'));
                        if (!window.step7BotDoubtsTriggered && window.estadoJogo.desafio.status !== "responder_pecas") {
                            window.step7BotDoubtsTriggered = true;
                            window.getDBRef("salas/MODO_TUTORIAL/estadoJogo").update({
                                "desafio/status": "responder_pecas",
                                "desafio/idxAtual": 0,
                                "desafio/respostas": [],
                                "vez": 1
                            });
                            window.estadoJogo.vez = 1;
                            if (window.Renderer)
                                window.Renderer.atualizarInfoSala(window.salaAtual, window.ultimosEspectadores || []);
                        }
                        if (window.Renderer)
                            window.Renderer.renderizarMesa();
                        return true;
                    }
                    return false;
                },
                permissoes: { actions: ["BOTAO_SE_GABAR", "RESPONDER_DESAFIO"] }
            },
            {
                // 8
                titulo: LocaleManager.t('tutorialSteps.step8.title'),
                msg: LocaleManager.t('tutorialSteps.step8.msg'),
                acao: LocaleManager.t('tutorialSteps.step8.action'),
                setup: () => {
                    window.tutorialBoastIniciado = false;
                    let count = window.estadoJogo.mesa.filter((p) => p && p.virada).length;
                    window.estadoJogo.mesa.forEach((p) => {
                        if (p && !p.virada && count < 3) {
                            p.virada = true;
                            count++;
                        }
                    });
                    const novoDesafio = {
                        tipo: "segabar",
                        status: "aguardando_resposta",
                        jogador: "Mestre"
                    };
                    window.getDBRef("salas/MODO_TUTORIAL/estadoJogo").update({
                        desafio: novoDesafio,
                        vez: 0,
                        mesa: window.estadoJogo.mesa
                    });
                    window.estadoJogo.desafio = novoDesafio;
                    window.estadoJogo.vez = 0;
                    if (window.notificationManager)
                        window.notificationManager.showGlobal(LocaleManager.t('master.boasting'));
                    window.tutorialBoastIniciado = true;
                    if (window.Renderer)
                        window.Renderer.renderizarOpcoesSegabar();
                },
                permissoes: { actions: ["RESPONDER_DESAFIO"] },
                validacao: () => {
                    if (!window.estadoJogo.desafio && window.tutorialBoastIniciado)
                        return true;
                    if (window.estadoJogo.desafio &&
                        window.estadoJogo.desafio.tipo === "segabar" &&
                        window.estadoJogo.desafio.jogador === "Aprendiz") {
                        if (window.estadoJogo.desafio.status === "aguardando_resposta") {
                            window.estadoJogo.desafio.status = "responder_pecas";
                            window.estadoJogo.desafio.idxAtual = 0;
                            window.estadoJogo.desafio.respostas = [];
                            window.estadoJogo.vez = 1;
                            if (window.GameController)
                                window.GameController.persistirEstado();
                            if (window.Renderer)
                                window.Renderer.renderizarMesa();
                            if (window.Renderer && window.Renderer.renderizarRespostaSegabar) {
                                window.Renderer.renderizarRespostaSegabar();
                            }
                            setTimeout(() => {
                                if (window.tellstonesTutorial)
                                    window.tellstonesTutorial.proximo();
                            }, 500);
                            return true;
                        }
                        if (window.estadoJogo.desafio.status === "responder_pecas") {
                            setTimeout(() => {
                                if (window.tellstonesTutorial)
                                    window.tellstonesTutorial.proximo();
                            }, 500);
                            return true;
                        }
                    }
                    return false;
                }
            },
            {
                // 9
                titulo: LocaleManager.t('tutorialSteps.step9.title'),
                msg: LocaleManager.t('tutorialSteps.step9.msg'),
                acao: LocaleManager.t('tutorialSteps.step9.action'),
                setup: () => {
                    if (!window.estadoJogo.desafio) {
                        window.estadoJogo.mesa.forEach((p) => {
                            if (p)
                                p.virada = true;
                        });
                        const desafioFinal = {
                            tipo: "segabar",
                            status: "responder_pecas",
                            jogador: "Aprendiz",
                            idxAtual: 0,
                            respostas: []
                        };
                        window.getDBRef("salas/MODO_TUTORIAL/estadoJogo").update({
                            desafio: desafioFinal,
                            mesa: window.estadoJogo.mesa,
                            vez: 1
                        });
                        window.estadoJogo.desafio = desafioFinal;
                        window.estadoJogo.vez = 1;
                        if (window.notificationManager)
                            window.notificationManager.showInternal(LocaleManager.t('tutorialUI.testMemory'));
                        if (window.Renderer)
                            window.Renderer.renderizarMesa();
                        if (window.Renderer && window.Renderer.renderizarRespostaSegabar) {
                            setTimeout(() => window.Renderer.renderizarRespostaSegabar(), 100);
                        }
                    }
                    else {
                        if (window.estadoJogo.desafio.status === "aguardando_resposta") {
                            if (window.notificationManager)
                                window.notificationManager.showInternal(LocaleManager.t('master.doubtBoastToo'));
                            window.estadoJogo.desafio.status = "responder_pecas";
                            window.estadoJogo.desafio.idxAtual = 0;
                            window.estadoJogo.desafio.respostas = [];
                            window.estadoJogo.vez = 1;
                            if (window.GameController)
                                window.GameController.persistirEstado();
                            if (window.Renderer)
                                window.Renderer.renderizarMesa();
                        }
                    }
                },
                validacao: () => {
                    return !window.estadoJogo.desafio || window.estadoJogo.desafio.status === "resolvido";
                },
                permissoes: { actions: ["RESPONDER_DESAFIO", "SELECIONAR_DESAFIO"] }
            },
            {
                // 10
                titulo: LocaleManager.t('tutorial.completed'),
                msg: LocaleManager.t('tutorial.completedMsg'),
                acao: LocaleManager.t('tutorial.completedAction'),
                setup: () => { },
                validacao: () => true,
                permissoes: { actions: [] }
            }
        ];
    }
    verificarAcao(acao) {
        if (!this.roteiro || !this.roteiro[this.passo])
            return false;
        const permissoes = this.roteiro[this.passo].permissoes;
        if (permissoes && permissoes.actions && permissoes.actions.includes(acao)) {
            return true;
        }
        if (window.notificationManager)
            window.notificationManager.showInternal(LocaleManager.t('tutorialUI.actionUnavailable'));
        return false;
    }
    iniciar() {
        this._criarUI();
        if (window.AnalyticsManager && typeof window.AnalyticsManager.logTutorialStart === 'function') {
            window.AnalyticsManager.logTutorialStart();
        }
        this.mostrarPasso(0);
        // Listener para mudança de idioma para atualizar tutoriais ativos
        if (window.EventBus) {
            window.EventBus.on('LOCALE:CHANGE', () => {
                if (this.overlay) {
                    if (this.passo >= this.roteiro.length) {
                        this.finalizar();
                    }
                    else {
                        this.mostrarPasso(this.passo);
                    }
                }
            });
        }
    }
    mostrarPasso(idx) {
        if (idx >= this.roteiro.length) {
            this.finalizar();
            return;
        }
        this.passo = idx;
        const cena = this.roteiro[idx];
        if (window.AnalyticsManager)
            window.AnalyticsManager.logTutorialStep(this.passo, cena.titulo);
        try {
            if (cena.setup)
                cena.setup();
        }
        catch (e) {
            console.error("[TUTORIAL] Erro no setup do passo " + idx, e);
        }
        this.acaoConcluida = cena.validacao();
        // Usar traduções se disponível
        let title = cena.titulo;
        let msg = cena.msg;
        let action = cena.acao;
        if (this.localeManager) {
            title = this.localeManager.t(`tutorial.steps.${idx}.title`) || title;
            msg = this.localeManager.t(`tutorial.steps.${idx}.msg`) || msg;
            action = this.localeManager.t(`tutorial.steps.${idx}.action`) || action;
        }
        if (this.texto) {
            this.texto.innerHTML = `
                <h3 style="margin:0; color:#4caf50; font-size: 1.1em;">${title}</h3>
                <p style="font-size: 0.9em; margin: 8px 0;">${msg}</p>
                <p style="font-style:italic; color:#8ecfff; font-size: 0.85em; margin: 4px 0;">${action}</p>
            `;
        }
        this._atualizarBotao();
    }
    registrarAcaoConcluida() {
        const cena = this.roteiro[this.passo];
        if (cena && cena.validacao()) {
            this.acaoConcluida = true;
            this._atualizarBotao();
            if (this.btnNext) {
                this.btnNext.style.transform = "scale(1.1)";
                setTimeout(() => {
                    if (this.btnNext)
                        this.btnNext.style.transform = "scale(1)";
                }, 200);
            }
        }
    }
    proximo() {
        if (!this.acaoConcluida) {
            let msg = "Complete a ação primeiro!";
            if (this.localeManager) {
                msg = "⚠ " + this.localeManager.t('tutorial.completeAux');
            }
            if (window.notificationManager)
                window.notificationManager.showInternal(msg);
            return;
        }
        this.mostrarPasso(this.passo + 1);
    }
    resetarEstadoParaTutorial() {
        const estado = window.estadoJogo;
        estado.mesa = Array(7).fill(null);
        estado.mesa[3] = { nome: "Coroa", url: "assets/img/stones/demacia/Coroa.svg", virada: false, fixo: true };
        estado.centralAlinhada = true;
        estado.alinhamentoFeito = true;
        estado.reserva = [
            { nome: "Espada", url: "assets/img/stones/demacia/espada.svg" },
            { nome: "Escudo", url: "assets/img/stones/demacia/escudo.svg" },
            { nome: "Cavalo", url: "assets/img/stones/demacia/cavalo.svg" },
            { nome: "Bandeira", url: "assets/img/stones/demacia/bandeira.svg" },
            { nome: "Martelo", url: "assets/img/stones/demacia/martelo.svg" },
            { nome: "Balança", url: "assets/img/stones/demacia/Balanca.svg" }
        ];
        estado.vez = 1;
        estado.desafio = null;
        if (window.GameController && window.GameController.persistirEstado) {
            window.GameController.persistirEstado();
        }
        if (window.Renderer && window.Renderer.renderizarMesa) {
            window.Renderer.renderizarMesa();
        }
        if (window.Renderer && window.Renderer.renderizarPedrasReserva) {
            window.Renderer.renderizarPedrasReserva();
        }
    }
    _criarUI() {
        if (document.getElementById("tutorial-ui"))
            return;
        this.overlay = document.createElement("div");
        this.overlay.id = "tutorial-ui";
        this.overlay.style.cssText = `
            position: fixed; top: 170px; right: 280px; width: 300px;
            background: rgba(24, 28, 36, 0.98); border: 2px solid #4caf50;
            border-radius: 12px; padding: 15px; color: white; z-index: 100000;
            box-shadow: 0 4px 25px rgba(0,0,0,0.7); display: flex; flex-direction: column; gap: 8px;
        `;
        const handle = document.createElement("div");
        handle.innerText = "⋮⋮ TUTORIAL ⋮⋮";
        handle.style.cssText = "text-align:center; font-size:15px; color:#4caf50; cursor:move; margin-bottom:5px;";
        this.overlay.appendChild(handle);
        this.texto = document.createElement("div");
        this.overlay.appendChild(this.texto);
        this.btnNext = document.createElement("button");
        this.btnNext.innerText = this.localeManager ? this.localeManager.t('tutorial.next') : "Próximo >>";
        this.btnNext.style.cssText = `
            background: #4caf50; color: white; border: none; padding: 8px 16px;
            border-radius: 4px; cursor: pointer; align-self: flex-end; margin-top: 10px;
        `;
        this.btnNext.onclick = () => {
            if (window.audioManager)
                window.audioManager.playClick();
            this.proximo();
        };
        this.overlay.appendChild(this.btnNext);
        document.body.appendChild(this.overlay);
        this._tornarArrastavel(handle);
    }
    _atualizarBotao() {
        if (!this.btnNext)
            return;
        let nextText = "Próximo >>";
        let waitText = "Aguardando ação...";
        if (this.localeManager) {
            nextText = this.localeManager.t('tutorial.next');
            waitText = this.localeManager.t('tutorial.waitingAction');
        }
        if (this.acaoConcluida) {
            this.btnNext.style.opacity = "1";
            this.btnNext.style.cursor = "pointer";
            this.btnNext.innerHTML = nextText;
        }
        else {
            this.btnNext.style.opacity = "0.5";
            this.btnNext.style.cursor = "not-allowed";
            this.btnNext.innerHTML = waitText;
        }
    }
    _tornarArrastavel(el) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const container = this.overlay;
        if (!container)
            return;
        el.onmousedown = dragMouseDown;
        el.ontouchstart = dragTouchStart;
        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        function dragTouchStart(e) {
            const touch = e.touches[0];
            pos3 = touch.clientX;
            pos4 = touch.clientY;
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementDragTouch;
        }
        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            if (container) {
                container.style.top = (container.offsetTop - pos2) + "px";
                container.style.left = (container.offsetLeft - pos1) + "px";
            }
        }
        function elementDragTouch(e) {
            const touch = e.touches[0];
            pos1 = pos3 - touch.clientX;
            pos2 = pos4 - touch.clientY;
            pos3 = touch.clientX;
            pos4 = touch.clientY;
            if (container) {
                container.style.top = (container.offsetTop - pos2) + "px";
                container.style.left = (container.offsetLeft - pos1) + "px";
            }
        }
        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
        }
    }
    finalizar() {
        if (window.salaAtual && window.salaAtual !== 'MODO_TUTORIAL')
            return;
        if (window.AnalyticsManager && window.AnalyticsManager.logTutorialComplete)
            window.AnalyticsManager.logTutorialComplete();
        if (!this.overlay)
            return;
        // Translation keys
        let title = "🎉 Tutorial Finalizado!";
        let msg = "Parabéns! Você completou o tutorial básico do Tellstones.";
        let sub = "Agora você está pronto para jogar partidas completas!";
        let back = "Voltar ao Menu";
        if (this.localeManager) {
            title = this.localeManager.t('tutorial.finishedTitle');
            msg = this.localeManager.t('tutorial.finishedMsg');
            sub = this.localeManager.t('tutorial.finishedSub');
            back = this.localeManager.t('menu.backToMenu') || back;
        }
        if (this.texto) {
            this.texto.innerHTML = `
                <h3 style="margin:0; color:#4caf50; font-size: 1.3em; text-align: center;">${title}</h3>
                <p style="font-size: 1em; margin: 12px 0; text-align: center;">${msg}</p>
                <p style="font-size: 0.9em; margin: 8px 0; color:#8ecfff; text-align: center;">${sub}</p>
            `;
        }
        if (this.btnNext) {
            this.btnNext.innerText = back;
            this.btnNext.style.opacity = "1";
            this.btnNext.style.cursor = "pointer";
            this.btnNext.style.background = "#f44336";
            this.btnNext.style.alignSelf = "center";
            this.btnNext.onclick = () => {
                var _a;
                (_a = this.overlay) === null || _a === void 0 ? void 0 : _a.remove();
                const btnSair = document.getElementById("btn-sair-partida");
                if (btnSair)
                    btnSair.click();
            };
        }
        if (window.notificationManager)
            window.notificationManager.showGlobal(title);
    }
    cleanup() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        this.roteiro = [];
    }
}
// Global Export
window.TellstonesTutorial = TellstonesTutorial;
