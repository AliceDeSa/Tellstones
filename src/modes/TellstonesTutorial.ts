
export interface TutorialPermissions {
    actions: string[];
}

export interface TutorialStep {
    titulo: string;
    msg: string;
    acao: string;
    setup: () => void;
    validacao: () => boolean;
    permissoes: TutorialPermissions;
}

export class TellstonesTutorial {
    private passo: number;
    private overlay: HTMLElement | null;
    private texto: HTMLElement | null;
    private btnNext: HTMLElement | null;
    private acaoConcluida: boolean;
    private roteiro: TutorialStep[];
    private localeManager: any = null;

    constructor() {
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
                titulo: "Bem-vindo ao Tellstones",
                msg: "Tellstones é um jogo de memória e blefe. Vamos aprender o básico em poucos passos.",
                acao: "Clique em 'Próximo' para começar.",
                setup: () => {
                    this.resetarEstadoParaTutorial();
                },
                validacao: () => true,
                permissoes: { actions: [] }
            },
            {
                // 1
                titulo: "Colocando Pedras",
                msg: "Você e o oponente (Mestre) se revezam colocando pedras na mesa. A pedra central (neutra) já está lá.",
                acao: "Arraste uma pedra da sua reserva (esquerda) para qualquer espaço vazio no tabuleiro.",
                setup: () => {
                    (window as any).estadoJogo.vez = 1;
                    if ((window as any).GameController)
                        (window as any).GameController.persistirEstado();
                    if ((window as any).Renderer)
                        (window as any).Renderer.renderizarMesa();
                },
                validacao: () => {
                    const mesa = (window as any).estadoJogo.mesa;
                    if (!mesa) return false;
                    const pedras = mesa.filter((p: any) => p !== null);
                    return pedras.length >= 2;
                },
                permissoes: { actions: ["ARRASTAR_RESERVA"] }
            },
            {
                // 2
                titulo: "Escondendo a Informação",
                msg: "Depois que todas as pedras são colocadas (ou quando você quiser), você pode virar uma pedra para baixo para escondê-la.",
                acao: "Dê um DUPLO CLIQUE na pedra que você acabou de colocar para escondê-la.",
                setup: () => { },
                validacao: () => {
                    const mesa = (window as any).estadoJogo.mesa;
                    return mesa && mesa.some((p: any) => p && p.virada);
                },
                permissoes: { actions: ["VIRAR_PEDRA"] }
            },
            {
                // 3
                titulo: "Espiando Pedras (Virar)",
                msg: "A qualquer momento, você pode conferir uma pedra escondida (virada para baixo) para lembrar o símbolo. Só você verá.",
                acao: "Dê um DUPLO CLIQUE em uma pedra virada para baixo para olhá-la (ela virará momentaneamente).",
                setup: () => {
                    (window as any).estadoJogo.vez = 1;
                    if ((window as any).GameController)
                        (window as any).GameController.persistirEstado();
                },
                validacao: () => {
                    return typeof (window as any).estadoJogo.mesaEspiada === 'number';
                },
                permissoes: { actions: ["ESPIAR_PEDRA"] }
            },
            {
                // 4
                titulo: "Trocando Pedras",
                msg: "Você pode trocar duas pedras de lugar para confundir o oponente.",
                acao: "Clique e arraste uma pedra da mesa sobre outra pedra para trocá-las de posição.",
                setup: () => {
                    (window as any).estadoJogo.vez = 1;
                    // Salva estado inicial da mesa
                    const mesaSnapshot = (window as any).estadoJogo.mesa.map((p: any) => p ? p.nome : null);
                    (window as any).tutorialMesaInicial = mesaSnapshot;
                    if ((window as any).GameController)
                        (window as any).GameController.persistirEstado();
                },
                validacao: () => {
                    if (!(window as any).tutorialMesaInicial)
                        return false;
                    const mesaAtual = (window as any).estadoJogo.mesa.map((p: any) => p ? p.nome : null);
                    return JSON.stringify(mesaAtual) !== JSON.stringify((window as any).tutorialMesaInicial);
                },
                permissoes: { actions: ["TROCAR_PEDRAS"] }
            },
            {
                // 5
                titulo: "Desafiando o Oponente",
                msg: "Se você acha que o oponente não sabe qual pedra é qual, você pode desafiá-lo. Ele terá que acertar ou perderá o ponto.",
                acao: "Clique no botão 'Desafiar' e se prepare para testar o Mestre.",
                setup: () => {
                    (window as any).estadoJogo.vez = 1;
                    if ((window as any).GameController)
                        (window as any).GameController.persistirEstado();
                },
                validacao: () => {
                    return (window as any).estadoJogo.desafio &&
                        (window as any).estadoJogo.desafio.jogador === "Aprendiz" &&
                        (window as any).estadoJogo.desafio.status === "aguardando_resposta";
                },
                permissoes: { actions: ["BOTAO_DESAFIAR", "SELECIONAR_DESAFIO"] }
            },
            {
                // 6
                titulo: "Respondendo ao Desafio",
                msg: "Agora inverta os papéis. O Mestre vai te desafiar! Você precisa provar que sabe qual é a pedra.",
                acao: "O Mestre vai te desafiar agora. Selecione a pedra correta quando solicitado.",
                setup: () => {
                    (window as any).tutorialDesafioIniciado = false;
                    const mesa = (window as any).estadoJogo.mesa;
                    const viradas = mesa.map((p: any, i: number) => p && p.virada ? i : null).filter((i: any) => i !== null);

                    if (viradas.length === 0) {
                        const idx = mesa.findIndex((p: any) => p !== null);
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
                        (window as any).estadoJogo.desafio = novoDesafio;
                        (window as any).estadoJogo.vez = 0;
                        (window as any).getDBRef("salas/MODO_TUTORIAL/estadoJogo").update({
                            desafio: novoDesafio,
                            vez: 0,
                            mesa: mesa
                        });
                        if ((window as any).notificationManager)
                            (window as any).notificationManager.showGlobal("O Mestre desafiou você!");

                        (window as any).tutorialDesafioIniciado = true;

                        if ((window as any).Renderer)
                            (window as any).Renderer.renderizarOpcoesDesafio();
                    }
                },
                validacao: () => {
                    if (!(window as any).tutorialDesafioIniciado)
                        return false;
                    if ((window as any).estadoJogo.desafio)
                        return false;
                    return true;
                },
                permissoes: { actions: ["RESPONDER_DESAFIO"] }
            },
            {
                // 7
                titulo: "Se Gabar ",
                msg: "Se você sabe TODAS as pedras viradas, você pode 'Se Gabar'. Isso é um movimento arriscado para ganhar o jogo instantaneamente.",
                acao: "Clique no botão 'Se Gabar'.",
                setup: () => {
                    (window as any).estadoJogo.mesa.forEach((p: any) => {
                        if (p)
                            p.virada = true;
                    });
                    (window as any).step7BotDoubtsTriggered = false;
                    (window as any).getDBRef("salas/MODO_TUTORIAL/estadoJogo").update({
                        mesa: (window as any).estadoJogo.mesa,
                        vez: 1
                    });
                    (window as any).estadoJogo.vez = 1;
                    if ((window as any).Renderer)
                        (window as any).Renderer.atualizarInfoSala((window as any).salaAtual, (window as any).ultimosEspectadores || []);
                },
                validacao: () => {
                    if ((window as any).estadoJogo.desafio &&
                        (window as any).estadoJogo.desafio.tipo === "segabar" &&
                        (window as any).estadoJogo.desafio.status === "aguardando_resposta" &&
                        (window as any).estadoJogo.desafio.jogador !== "Mestre") {

                        if ((window as any).notificationManager)
                            (window as any).notificationManager.showInternal("Mestre: 'Eu duvido! Prove que você sabe todas as pedras.'");

                        if (!(window as any).step7BotDoubtsTriggered && (window as any).estadoJogo.desafio.status !== "responder_pecas") {
                            (window as any).step7BotDoubtsTriggered = true;
                            (window as any).getDBRef("salas/MODO_TUTORIAL/estadoJogo").update({
                                "desafio/status": "responder_pecas",
                                "desafio/idxAtual": 0,
                                "desafio/respostas": [],
                                "vez": 1
                            });
                            (window as any).estadoJogo.vez = 1;
                            if ((window as any).Renderer)
                                (window as any).Renderer.atualizarInfoSala((window as any).salaAtual, (window as any).ultimosEspectadores || []);
                        }
                        if ((window as any).Renderer)
                            (window as any).Renderer.renderizarMesa();
                        return true;
                    }
                    return false;
                },
                permissoes: { actions: ["BOTAO_SE_GABAR", "RESPONDER_DESAFIO"] }
            },
            {
                // 8
                titulo: "Defendendo contra 'Se Gabar'",
                msg: "O Mestre diz que sabe tudo! Ele vai se gabar. Você pode Duvidar (ele tem que provar), Acreditar (ele ganha 1 ponto) ou Se Gabar também.",
                acao: "Responda ao 'Se Gabar' do Mestre.",
                setup: () => {
                    (window as any).tutorialBoastIniciado = false;
                    let count = (window as any).estadoJogo.mesa.filter((p: any) => p && p.virada).length;
                    (window as any).estadoJogo.mesa.forEach((p: any) => {
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
                    (window as any).getDBRef("salas/MODO_TUTORIAL/estadoJogo").update({
                        desafio: novoDesafio,
                        vez: 0,
                        mesa: (window as any).estadoJogo.mesa
                    });
                    (window as any).estadoJogo.desafio = novoDesafio;
                    (window as any).estadoJogo.vez = 0;
                    if ((window as any).notificationManager)
                        (window as any).notificationManager.showGlobal("O Mestre está se gabando!");
                    (window as any).tutorialBoastIniciado = true;
                    if ((window as any).Renderer)
                        (window as any).Renderer.renderizarOpcoesSegabar();
                },
                permissoes: { actions: ["RESPONDER_DESAFIO"] },
                validacao: () => {
                    if (!(window as any).estadoJogo.desafio && (window as any).tutorialBoastIniciado)
                        return true;
                    if ((window as any).estadoJogo.desafio &&
                        (window as any).estadoJogo.desafio.tipo === "segabar" &&
                        (window as any).estadoJogo.desafio.jogador === "Aprendiz") {
                        if ((window as any).estadoJogo.desafio.status === "aguardando_resposta") {
                            (window as any).estadoJogo.desafio.status = "responder_pecas";
                            (window as any).estadoJogo.desafio.idxAtual = 0;
                            (window as any).estadoJogo.desafio.respostas = [];
                            (window as any).estadoJogo.vez = 1;
                            if ((window as any).GameController)
                                (window as any).GameController.persistirEstado();
                            if ((window as any).Renderer)
                                (window as any).Renderer.renderizarMesa();
                            if ((window as any).Renderer && (window as any).Renderer.renderizarRespostaSegabar) {
                                (window as any).Renderer.renderizarRespostaSegabar();
                            }
                            setTimeout(() => {
                                if ((window as any).tellstonesTutorial)
                                    (window as any).tellstonesTutorial.proximo();
                            }, 500);
                            return true;
                        }
                        if ((window as any).estadoJogo.desafio.status === "responder_pecas") {
                            setTimeout(() => {
                                if ((window as any).tellstonesTutorial)
                                    (window as any).tellstonesTutorial.proximo();
                            }, 500);
                            return true;
                        }
                    }
                    return false;
                }
            },
            {
                // 9
                titulo: "Provando seu Conhecimento",
                msg: "Agora é sua vez! O Mestre duvidou de você (ou você escolheu atacar). Prove que você sabe onde estão as pedras.",
                acao: "Clique nas opções para identificar cada pedra sequencialmente.",
                setup: () => {
                    if (!(window as any).estadoJogo.desafio) {
                        (window as any).estadoJogo.mesa.forEach((p: any) => {
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
                        (window as any).getDBRef("salas/MODO_TUTORIAL/estadoJogo").update({
                            desafio: desafioFinal,
                            mesa: (window as any).estadoJogo.mesa,
                            vez: 1
                        });
                        (window as any).estadoJogo.desafio = desafioFinal;
                        (window as any).estadoJogo.vez = 1;
                        if ((window as any).notificationManager)
                            (window as any).notificationManager.showInternal("Vamos testar sua memória uma última vez!");
                        if ((window as any).Renderer)
                            (window as any).Renderer.renderizarMesa();
                        if ((window as any).Renderer && (window as any).Renderer.renderizarRespostaSegabar) {
                            setTimeout(() => (window as any).Renderer.renderizarRespostaSegabar(), 100);
                        }
                    }
                    else {
                        if ((window as any).estadoJogo.desafio.status === "aguardando_resposta") {
                            if ((window as any).notificationManager)
                                (window as any).notificationManager.showInternal("Mestre: 'Você também sabe? Duvido! Prove.'");
                            (window as any).estadoJogo.desafio.status = "responder_pecas";
                            (window as any).estadoJogo.desafio.idxAtual = 0;
                            (window as any).estadoJogo.desafio.respostas = [];
                            (window as any).estadoJogo.vez = 1;
                            if ((window as any).GameController)
                                (window as any).GameController.persistirEstado();
                            if ((window as any).Renderer)
                                (window as any).Renderer.renderizarMesa();
                        }
                    }
                },
                validacao: () => {
                    return !(window as any).estadoJogo.desafio || (window as any).estadoJogo.desafio.status === "resolvido";
                },
                permissoes: { actions: ["RESPONDER_DESAFIO", "SELECIONAR_DESAFIO"] }
            },
            {
                // 10
                titulo: "Tutorial Finalizado",
                msg: "Parabéns! Você completou o tutorial básico.",
                acao: "Agora você pode jogar partidas completas.",
                setup: () => { },
                validacao: () => true,
                permissoes: { actions: [] }
            }
        ];
    }

    public verificarAcao(acao: string): boolean {
        if (!this.roteiro || !this.roteiro[this.passo])
            return false;

        const permissoes = this.roteiro[this.passo].permissoes;
        if (permissoes && permissoes.actions && permissoes.actions.includes(acao)) {
            return true;
        }

        if ((window as any).notificationManager)
            (window as any).notificationManager.showInternal(`Ação indisponível neste passo do tutorial.`);

        return false;
    }

    public iniciar(): void {
        this._criarUI();
        if ((window as any).AnalyticsManager && typeof (window as any).AnalyticsManager.logTutorialStart === 'function') {
            (window as any).AnalyticsManager.logTutorialStart();
        }
        this.mostrarPasso(0);

        // Listener para mudança de idioma para atualizar tutoriais ativos
        if ((window as any).EventBus) {
            (window as any).EventBus.on('LOCALE:CHANGE', () => {
                if (this.overlay) {
                    if (this.passo >= this.roteiro.length) {
                        this.finalizar();
                    } else {
                        this.mostrarPasso(this.passo);
                    }
                }
            });
        }
    }

    public mostrarPasso(idx: number): void {
        if (idx >= this.roteiro.length) {
            this.finalizar();
            return;
        }

        this.passo = idx;
        const cena = this.roteiro[idx];

        if ((window as any).AnalyticsManager)
            (window as any).AnalyticsManager.logTutorialStep(this.passo, cena.titulo);

        try {
            if (cena.setup)
                cena.setup();
        } catch (e) {
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

    public registrarAcaoConcluida(): void {
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

    public proximo(): void {
        if (!this.acaoConcluida) {
            let msg = "Complete a ação primeiro!";
            if (this.localeManager) {
                msg = "⚠ " + this.localeManager.t('tutorial.completeAux');
            }

            if ((window as any).notificationManager)
                (window as any).notificationManager.showInternal(msg);
            return;
        }
        this.mostrarPasso(this.passo + 1);
    }

    private resetarEstadoParaTutorial(): void {
        const estado = (window as any).estadoJogo;
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

        if ((window as any).GameController && (window as any).GameController.persistirEstado) {
            (window as any).GameController.persistirEstado();
        }
        if ((window as any).Renderer && (window as any).Renderer.renderizarMesa) {
            (window as any).Renderer.renderizarMesa();
        }
        if ((window as any).Renderer && (window as any).Renderer.renderizarPedrasReserva) {
            (window as any).Renderer.renderizarPedrasReserva();
        }
    }

    private _criarUI(): void {
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
            if ((window as any).audioManager)
                (window as any).audioManager.playClick();
            this.proximo();
        };
        this.overlay.appendChild(this.btnNext);

        document.body.appendChild(this.overlay);
        this._tornarArrastavel(handle);
    }

    private _atualizarBotao(): void {
        if (!this.btnNext) return;

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
        } else {
            this.btnNext.style.opacity = "0.5";
            this.btnNext.style.cursor = "not-allowed";
            this.btnNext.innerHTML = waitText;
        }
    }

    private _tornarArrastavel(el: HTMLElement): void {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const container = this.overlay;
        if (!container) return;

        el.onmousedown = dragMouseDown;
        el.ontouchstart = dragTouchStart;

        function dragMouseDown(e: MouseEvent) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function dragTouchStart(e: TouchEvent) {
            const touch = e.touches[0];
            pos3 = touch.clientX;
            pos4 = touch.clientY;
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementDragTouch;
        }

        function elementDrag(e: MouseEvent) {
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

        function elementDragTouch(e: TouchEvent) {
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

    public finalizar(): void {
        if ((window as any).salaAtual && (window as any).salaAtual !== 'MODO_TUTORIAL')
            return;

        if ((window as any).AnalyticsManager && (window as any).AnalyticsManager.logTutorialComplete)
            (window as any).AnalyticsManager.logTutorialComplete();

        if (!this.overlay) return;

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
                this.overlay?.remove();
                const btnSair = document.getElementById("btn-sair-partida");
                if (btnSair) btnSair.click();
            };
        }

        if ((window as any).notificationManager)
            (window as any).notificationManager.showGlobal(title);
    }

    public cleanup(): void {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        this.roteiro = [];
    }
}

// Global Export
(window as any).TellstonesTutorial = TellstonesTutorial;
