class TellstonesTutorial {
    verificarAcao(acao) {
        if (!this.roteiro || !this.roteiro[this.passo]) return false;
        const permissoes = this.roteiro[this.passo].permissoes;
        if (permissoes && permissoes.acoes && permissoes.acoes.includes(acao)) {
            return true;
        }
        showToastInterno(`Ação indisponível neste passo do tutorial.`);
        return false;
    }

    constructor() {
        console.log("[TUTORIAL] Inicializando Nova Lógica Scriptada...");
        this.passo = 0;
        this.overlay = null;
        this.texto = null;
        this.btnNext = null;
        this.acaoConcluida = false;

        // Definição do Roteiro (Script)
        this.roteiro = [
            {
                // 0
                titulo: "Bem-vindo ao Tellstones",
                msg: "Tellstones é um jogo de memória e blefe. Vamos aprender o básico em poucos passos.",
                acao: "Clique em 'Próximo' para começar.",
                setup: () => {
                    // Reset total
                    this.resetarEstadoParaTutorial();
                },
                validacao: () => true,
                permissoes: { acoes: [] } // Nenhuma ação de jogo permitida
            },
            {
                // 1
                titulo: "Colocando Pedras",
                msg: "Você e o oponente (Mestre) se revezam colocando pedras na mesa. A pedra central (neutra) já está lá.",
                acao: "Arraste uma pedra da sua reserva (esquerda) para qualquer espaço vazio no tabuleiro.",
                setup: () => {
                    // Garante que é vez do jogador
                    window.estadoJogo.vez = 1;
                    if (window.GameController) window.GameController.persistirEstado();
                    if (window.Renderer) window.Renderer.renderizarMesa();
                },
                validacao: () => {
                    const pedras = window.estadoJogo.mesa.filter(p => p !== null);
                    // Central + 1 do jogador = 2
                    return pedras.length >= 2;
                },
                permissoes: { acoes: ["ARRASTAR_RESERVA"] }
            },
            {
                // 2
                titulo: "Escondendo a Informação",
                msg: "Depois que todas as pedras são colocadas (ou quando você quiser), você pode virar uma pedra para baixo para escondê-la.",
                acao: "Dê um DUPLO CLIQUE na pedra que você acabou de colocar para escondê-la.",
                setup: () => {
                    // Nenhuma ação específica de setup, mantém o estado anterior
                },
                validacao: () => {
                    // Verifica se tem alguma pedra virada (além da central se estiver, mas central geralmente não vira)
                    return window.estadoJogo.mesa.some(p => p && p.virada);
                },
                permissoes: { acoes: ["VIRAR_PEDRA"] }
            },
            {
                // 3 [NOVO]
                titulo: "Espiando Pedras (Virar)",
                msg: "A qualquer momento, você pode conferir uma pedra escondida (virada para baixo) para lembrar o símbolo. Só você verá.",
                acao: "Dê um DUPLO CLIQUE em uma pedra virada para baixo para olhá-la (ela virará momentaneamente).",
                setup: () => {
                    // Garante vez do jogador
                    window.estadoJogo.vez = 1;
                    if (window.GameController) window.GameController.persistirEstado();
                },
                validacao: () => {
                    // Espiar via tabela: adicionarSilhuetaEspiada define mesaEspiada
                    return typeof window.estadoJogo.mesaEspiada === 'number';
                },
                permissoes: { acoes: ["ESPIAR_PEDRA"] }
            },
            {
                // 4
                titulo: "Trocando Pedras",
                msg: "Você pode trocar duas pedras de lugar para confundir o oponente.",
                acao: "Clique e arraste uma pedra da mesa sobre outra pedra para trocá-las de posição.",
                setup: () => {
                    // Garante que é vez do jogador
                    window.estadoJogo.vez = 1;
                    // Salva estado inicial da mesa para comparação
                    const mesaSnapshot = window.estadoJogo.mesa.map(p => p ? p.nome : null);
                    window.tutorialMesaInicial = mesaSnapshot;
                    if (window.GameController) window.GameController.persistirEstado();
                },
                validacao: () => {
                    if (!window.tutorialMesaInicial) return false;
                    const mesaAtual = window.estadoJogo.mesa.map(p => p ? p.nome : null);
                    // Verifica se houve mudança na ordem das pedras (troca)
                    const mudou = JSON.stringify(mesaAtual) !== JSON.stringify(window.tutorialMesaInicial);
                    return mudou;
                },
                permissoes: { acoes: ["TROCAR_PEDRAS"] }
            },
            {
                // 5
                titulo: "Desafiando o Oponente",
                msg: "Se você acha que o oponente não sabe qual pedra é qual, você pode desafiá-lo. Ele terá que acertar ou perderá o ponto.",
                acao: "Clique no botão 'Desafiar' e se prepare para testar o Mestre.",
                setup: () => {
                    // Garante vez do jogador
                    window.estadoJogo.vez = 1;
                    if (window.GameController) window.GameController.persistirEstado();
                },
                validacao: () => {
                    // Verifica se iniciou um desafio
                    return window.estadoJogo.desafio &&
                        window.estadoJogo.desafio.jogador === "Aprendiz" &&
                        window.estadoJogo.desafio.status === "aguardando_resposta";
                },
                permissoes: { acoes: ["BOTAO_DESAFIAR", "SELECIONAR_DESAFIO"] }
            },
            {
                // 6
                titulo: "Respondendo ao Desafio",
                msg: "Agora inverta os papéis. O Mestre vai te desafiar! Você precisa provar que sabe qual é a pedra.",
                acao: "O Mestre vai te desafiar agora. Selecione a pedra correta quando solicitado.",
                setup: () => {
                    window.tutorialDesafioIniciado = false; // Reset flag

                    // SCRIPT DO BOT: Bot desafia o jogador imediatamente
                    const viradas = window.estadoJogo.mesa.map((p, i) => p && p.virada ? i : null).filter(i => i !== null);

                    // Se não tiver pedra virada (caso o user tenha resetado), vira uma a força
                    if (viradas.length === 0) {
                        const idx = window.estadoJogo.mesa.findIndex(p => p !== null);
                        if (idx !== -1) {
                            window.estadoJogo.mesa[idx].virada = true;
                            viradas.push(idx);
                        }
                    }

                    if (viradas.length > 0) {
                        const alvo = viradas[0]; // Desafia a primeira que achar
                        const novoDesafio = {
                            status: "aguardando_resposta",
                            idxPedra: alvo,
                            tipo: "normal",
                            jogador: "Mestre"
                        };

                        // Força update local síncrono para evitar race condition na validação
                        window.estadoJogo.desafio = novoDesafio;
                        window.estadoJogo.vez = 0;

                        getDBRef("salas/MODO_TUTORIAL/estadoJogo").update({
                            desafio: novoDesafio,
                            vez: 0,
                            mesa: window.estadoJogo.mesa // Salva mesa caso tenha virado pedra
                        });

                        // Força UI update visual imediato (embora listener vá capturar)
                        showToast("O Mestre desafiou você!");
                        window.tutorialDesafioIniciado = true; // Flag set
                        if (window.Renderer) window.Renderer.renderizarOpcoesDesafio(); // Força renderização imediata manual
                    }
                },
                validacao: () => {
                    // O desafio deve ter sido resolvido e a vez voltar pro jogador
                    // Check Async Flag to prevent premature pass
                    if (!window.tutorialDesafioIniciado) return false;

                    // Se desafio ainda existe, não acabou.
                    if (window.estadoJogo.desafio) return false;

                    // Se desafio sumiu e flag true -> Acabou.
                    return true;
                },
                permissoes: { acoes: ["RESPONDER_DESAFIO"] }
            },
            {
                // 7
                titulo: "Se Gabar ",
                msg: "Se você sabe TODAS as pedras viradas, você pode 'Se Gabar'. Isso é um movimento arriscado para ganhar o jogo instantaneamente.",
                acao: "Clique no botão 'Se Gabar'.",
                setup: () => {
                    // Garante que todas as pedras estão viradas para o Se Gabar fazer sentido
                    // Vira TODAS as pedras (incluindo a central e a que o jogador colocou)
                    window.estadoJogo.mesa.forEach((p) => {
                        if (p) {
                            p.virada = true;
                        }
                    });


                    window.step7BotDoubtsTriggered = false; // Reset da flag
                    // Atualiza DB diretamente
                    getDBRef("salas/MODO_TUTORIAL/estadoJogo").update({
                        mesa: window.estadoJogo.mesa,
                        vez: 1
                    });

                    // Força update local para evitar delay
                    window.estadoJogo.vez = 1;
                    if (typeof atualizarInfoSala === "function") {
                        atualizarInfoSala(window.salaAtual, window.ultimosEspectadores || []);
                    }
                },
                validacao: () => {
                    // SCRIPT AUTOMÁTICO DO BOT
                    console.log("[DEBUG][TUTORIAL] Step 7 Validacao | Desafio:", window.estadoJogo.desafio ? window.estadoJogo.desafio.status : "null");
                    // Se o jogador se gabou, o Bot deve responder "Duvidar" para forçar a prova
                    if (window.estadoJogo.desafio &&
                        window.estadoJogo.desafio.tipo === "segabar" &&
                        window.estadoJogo.desafio.status === "aguardando_resposta" &&
                        window.estadoJogo.desafio.jogador !== "Mestre") {


                        showToastInterno("Mestre: 'Eu duvido! Prove que você sabe todas as pedras.'");

                        // FIX: Verificar se JÁ estamos no estado correto E se já disparou para evitar loop infinito
                        // (Update DB -> Listener -> Render -> Check Tutorial -> Validacao -> Update DB...)
                        if (!window.step7BotDoubtsTriggered && window.estadoJogo.desafio && window.estadoJogo.desafio.status !== "responder_pecas") {
                            window.step7BotDoubtsTriggered = true; // Flag unidirecional
                            // Atualização direta no DB para garantir que o script.js receba a mudança via listener
                            getDBRef("salas/MODO_TUTORIAL/estadoJogo").update({
                                "desafio/status": "responder_pecas",
                                "desafio/idxAtual": 0,
                                "desafio/respostas": [],
                                "vez": 1
                            });
                            // Força localmente também para destravar UI imediatamente
                            window.estadoJogo.vez = 1;
                            if (typeof atualizarInfoSala === "function") {
                                atualizarInfoSala(window.salaAtual, window.ultimosEspectadores || []);
                            }
                        }

                        if (window.Renderer) window.Renderer.renderizarMesa();
                        return true; // CONCLUI O PASSO 7 (como solicitado: desbloqueia o próximo APENAS AGORA)
                    }

                    // Se não tiver desafio ou não for o momento certo, o passo NÃO está concluído
                    return false;
                },
                permissoes: { acoes: ["BOTAO_SE_GABAR", "RESPONDER_DESAFIO"] }
            },
            {
                // 8
                titulo: "Defendendo contra 'Se Gabar'",
                msg: "O Mestre diz que sabe tudo! Ele vai se gabar. Você pode Duvidar (ele tem que provar), Acreditar (ele ganha 1 ponto) ou Se Gabar também.",
                acao: "Responda ao 'Se Gabar' do Mestre.",
                setup: () => {
                    window.tutorialBoastIniciado = false; // Reset Flag

                    // SCRIPT DO BOT: Bot se gaba
                    // Garante 3 pedras viradas para ser um boast válido visualmente
                    let count = window.estadoJogo.mesa.filter(p => p && p.virada).length;
                    window.estadoJogo.mesa.forEach(p => {
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

                    getDBRef("salas/MODO_TUTORIAL/estadoJogo").update({
                        desafio: novoDesafio,
                        vez: 0,
                        mesa: window.estadoJogo.mesa
                    });

                    // Update síncrono
                    window.estadoJogo.desafio = novoDesafio;
                    window.estadoJogo.vez = 0;

                    showToast("O Mestre está se gabando!");
                    window.tutorialBoastIniciado = true;
                    if (window.Renderer) window.Renderer.renderizarOpcoesSegabar(); // Força UI manual
                },
                permissoes: { acoes: ["RESPONDER_DESAFIO"] },
                validacao: () => {
                    // Se o desafio for resolvido normalmente (acreditou/duvidou), retorna true
                    if (!window.estadoJogo.desafio && window.tutorialBoastIniciado) return true;

                    // Se o jogador optou por "Se Gabar Também", o Bot duvida e passamos para o próximo passo
                    if (window.estadoJogo.desafio &&
                        window.estadoJogo.desafio.tipo === "segabar" &&
                        window.estadoJogo.desafio.jogador === "Aprendiz") {

                        if (window.estadoJogo.desafio.status === "aguardando_resposta") {
                            // Transição Imadiata
                            console.log("[TUTORIAL] Simulando Dúvida do Bot...");
                            window.estadoJogo.desafio.status = "responder_pecas";
                            window.estadoJogo.desafio.idxAtual = 0;
                            window.estadoJogo.desafio.respostas = [];
                            window.estadoJogo.vez = 1;
                            if (window.GameController) window.GameController.persistirEstado();
                            if (window.Renderer) window.Renderer.renderizarMesa();
                            // Forçar atualização da UI de resposta (nuclear fallback)
                            if (typeof renderizarRespostaSegabar === "function") {
                                console.log("[TUTORIAL] Forçando renderizarRespostaSegabar manual.");
                                if (window.Renderer) window.Renderer.renderizarRespostaSegabar();
                            }

                            // AUTO-ADVANCE solicitado: Troca automática de passo
                            setTimeout(() => {
                                if (window.tellstonesTutorial) window.tellstonesTutorial.proximo();
                            }, 500);

                            return true;
                        }

                        if (window.estadoJogo.desafio.status === "responder_pecas") {
                            return true;
                        }
                    }
                    return false; // Continua aqui
                }
            },
            {
                // 9
                titulo: "Provando seu Conhecimento",
                msg: "O Mestre duvidou de você! Como você se gabou também, agora deve provar que sabe TODAS as pedras viradas.",
                acao: "Clique nas opções para identificar cada pedra sequencialmente.",
                setup: () => {
                    // FORÇAR PROVA DE CONHECIMENTO MESMO NO FINAL
                    // Se não houver desafio (porque o jogador acreditou ou duvidou), criamos um artificialmente
                    // para ele provar que sabe tudo (como um "Exame Final").

                    if (!window.estadoJogo.desafio) {
                        console.log("[TUTORIAL] Criando desafio 'Exame Final'...");

                        // Vira todas as pedras para garantir dificuldade máxima
                        window.estadoJogo.mesa.forEach((p) => { if (p) p.virada = true; });

                        const desafioFinal = {
                            tipo: "segabar",
                            status: "responder_pecas", // Já começa respondendo
                            jogador: "Aprendiz", // É o jogador que está provando
                            idxAtual: 0,
                            respostas: []
                        };

                        // Set DB
                        getDBRef("salas/MODO_TUTORIAL/estadoJogo").update({
                            desafio: desafioFinal,
                            mesa: window.estadoJogo.mesa,
                            vez: 1
                        });

                        // Set Local
                        window.estadoJogo.desafio = desafioFinal;
                        window.estadoJogo.vez = 1;

                        showToastInterno("Vamos testar sua memória uma última vez!");
                        if (window.Renderer) window.Renderer.renderizarMesa();

                        // Disparar UI render
                        if (typeof window.Renderer.renderizarRespostaSegabar === "function") {
                            setTimeout(() => window.Renderer.renderizarRespostaSegabar(), 100);
                        }

                    } else {
                        // Caso Normal (Veio de Se Gabar Também)
                        // Bot Duvida do contra-boast se ainda não o fez
                        if (window.estadoJogo.desafio.status === "aguardando_resposta") {
                            showToastInterno("Mestre: 'Você também sabe? Duvido! Prove.'");
                            window.estadoJogo.desafio.status = "responder_pecas";
                            window.estadoJogo.desafio.idxAtual = 0;
                            window.estadoJogo.desafio.respostas = [];
                            window.estadoJogo.vez = 1;
                            if (window.GameController) window.GameController.persistirEstado();
                            if (window.Renderer) window.Renderer.renderizarMesa();
                        }
                    }
                },
                validacao: () => {
                    // Espera o desafio sumir (Resolvido, ganhou ou perdeu)
                    const desafioEncerrado = !window.estadoJogo.desafio || window.estadoJogo.desafio.status === "resolvido";
                    return desafioEncerrado;
                },
                permissoes: { acoes: ["RESPONDER_DESAFIO", "SELECIONAR_DESAFIO"] }
            },
            {
                // 9
                titulo: "Tutorial Finalizado",
                msg: "Parabéns! Você completou o tutorial básico.",
                acao: "Agora você pode jogar partidas completas.",
                setup: () => { },
                validacao: () => true,
                permissoes: { acoes: [] }
            }
        ];
    }

    iniciar() {
        this._criarUI();
        this.mostrarPasso(0);
    }

    mostrarPasso(idx) {
        if (idx >= this.roteiro.length) {
            this.finalizar();
            return;
        }
        this.passo = idx;
        const cena = this.roteiro[idx];

        // Executa Setup da Cena
        try {
            if (cena.setup) cena.setup();
        } catch (e) {
            console.error("[TUTORIAL] Erro no setup do passo " + idx, e);
        }

        // Verifica status inicial
        this.acaoConcluida = cena.validacao();

        // Atualiza UI
        this.texto.innerHTML = `
            <h3 style="margin:0; color:#4caf50; font-size: 1.1em;">${cena.titulo}</h3>
            <p style="font-size: 0.9em; margin: 8px 0;">${cena.msg}</p>
            <p style="font-style:italic; color:#8ecfff; font-size: 0.85em; margin: 4px 0;">${cena.acao}</p>
        `;
        this._atualizarBotao();
    }

    registrarAcaoConcluida() {
        const cena = this.roteiro[this.passo];
        if (cena && cena.validacao()) {
            this.acaoConcluida = true;
            this._atualizarBotao();

            // Auto-advance opcional? Não, deixa o usuário clicar em Próximo para ler.
            // Mas animação no botão ajuda
            this.btnNext.style.transform = "scale(1.1)";
            setTimeout(() => this.btnNext.style.transform = "scale(1)", 200);
        }
    }

    proximo() {
        if (!this.acaoConcluida) {
            showToastInterno("Complete a ação primeiro!");
            return;
        }
        this.mostrarPasso(this.passo + 1);
    }

    resetarEstadoParaTutorial() {
        // Reinicia estadoJogo para limpo
        window.estadoJogo.mesa = Array(7).fill(null);
        window.estadoJogo.mesa[3] = { nome: "Coroa", url: "assets/img/Coroa.svg", virada: false, fixo: true }; // Pedra central
        window.estadoJogo.centralAlinhada = true;
        window.estadoJogo.alinhamentoFeito = true;
        window.estadoJogo.reserva = [
            { nome: "Espada", url: "assets/img/espada.svg" },
            { nome: "Escudo", url: "assets/img/escudo.svg" },
            { nome: "Cavalo", url: "assets/img/cavalo.svg" },
            { nome: "Bandeira", url: "assets/img/bandeira.svg" },
            { nome: "Martelo", url: "assets/img/martelo.svg" },
            { nome: "Balança", url: "assets/img/Balança.svg" }
        ];
        // Conjunto completo de pedras
        window.estadoJogo.vez = 1;
        window.estadoJogo.desafio = null;
        window.estadoJogo.vez = 1;
        window.estadoJogo.desafio = null;
        if (window.GameController && window.GameController.persistirEstado) {
            window.GameController.persistirEstado();
        }
        if (window.Renderer && window.Renderer.renderizarMesa) {
            window.Renderer.renderizarMesa();
        }
        // renderizarPedrasVerticaisAbsoluto is likely legacy or integrated into renderizarReserva?
        // Let's assume Renderer handles reserve too or verify. 
        if (window.Renderer && window.Renderer.renderizarPedrasReserva) {
            window.Renderer.renderizarPedrasReserva();
        }
    }

    _atrasar(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _criarUI() {
        if (document.getElementById("tutorial-ui")) return; // Já existe

        this.overlay = document.createElement("div");
        this.overlay.id = "tutorial-ui";
        this.overlay.style = `
            position: fixed; top: 170px; right: 280px; width: 300px;
            background: rgba(24, 28, 36, 0.98); border: 2px solid #4caf50;
            border-radius: 12px; padding: 15px; color: white; z-index: 100000;
            box-shadow: 0 4px 25px rgba(0,0,0,0.7); display: flex; flex-direction: column; gap: 8px;
        `;

        const handle = document.createElement("div");
        handle.innerText = "⋮⋮ TUTORIAL ⋮⋮";
        handle.style = "text-align:center; font-size:15px; color:#4caf50; cursor:move; margin-bottom:5px;";
        this.overlay.appendChild(handle);

        this.texto = document.createElement("div");
        this.overlay.appendChild(this.texto);

        this.btnNext = document.createElement("button");
        this.btnNext.innerText = "Próximo >>";
        this.btnNext.style = `
            background: #4caf50; color: white; border: none; padding: 8px 16px;
            border-radius: 4px; cursor: pointer; align-self: flex-end; margin-top: 10px;
        `;
        this.btnNext.onclick = () => this.proximo();
        this.overlay.appendChild(this.btnNext);

        document.body.appendChild(this.overlay);
        this._tornarArrastavel(handle);
    }

    _atualizarBotao() {
        if (!this.btnNext) return;
        if (this.acaoConcluida) {
            this.btnNext.style.opacity = "1";
            this.btnNext.style.cursor = "pointer";
            this.btnNext.innerHTML = "Próximo >>";
        } else {
            this.btnNext.style.opacity = "0.5";
            this.btnNext.style.cursor = "not-allowed";
            this.btnNext.innerHTML = "Aguardando ação...";
        }
    }

    _tornarArrastavel(el) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const container = this.overlay;

        // Mouse Events
        el.onmousedown = dragMouseDown;

        // Touch Events
        el.ontouchstart = dragTouchStart;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function dragTouchStart(e) {
            // e.preventDefault(); // Permite swipe se nao drag
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
            container.style.top = (container.offsetTop - pos2) + "px";
            container.style.left = (container.offsetLeft - pos1) + "px";
        }

        function elementDragTouch(e) {
            // e.preventDefault(); 
            const touch = e.touches[0];
            pos1 = pos3 - touch.clientX;
            pos2 = pos4 - touch.clientY;
            pos3 = touch.clientX;
            pos4 = touch.clientY;
            container.style.top = (container.offsetTop - pos2) + "px";
            container.style.left = (container.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
        }
    }

    finalizar() {
        // Guard: Prevent execution if not in Tutorial Mode (fixes persistence bug)
        if (window.salaAtual && window.salaAtual !== 'MODO_TUTORIAL') return;

        if (!this.overlay) return;

        // Limpa o conteúdo do overlay e adiciona mensagem final com botão
        this.texto.innerHTML = `
            <h3 style="margin:0; color:#4caf50; font-size: 1.3em; text-align: center;">🎉 Tutorial Finalizado!</h3>
            <p style="font-size: 1em; margin: 12px 0; text-align: center;">Parabéns! Você completou o tutorial básico do Tellstones.</p>
            <p style="font-size: 0.9em; margin: 8px 0; color:#8ecfff; text-align: center;">Agora você está pronto para jogar partidas completas!</p>
        `;

        // Substitui o botão "Próximo" por "Voltar ao Menu"
        this.btnNext.innerText = "Voltar ao Menu";
        this.btnNext.style.opacity = "1";
        this.btnNext.style.cursor = "pointer";
        this.btnNext.style.background = "#f44336";
        this.btnNext.style.alignSelf = "center"; // Centraliza o botão
        this.btnNext.onclick = () => {
            this.overlay.remove();
            const btnSair = document.getElementById("btn-sair-partida");
            if (btnSair) btnSair.click();
        };

        showToast("Tutorial Finalizado! Parabéns!");
    }
    cleanup() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        this.roteiro = null; // Help GC
    }
}

window.TellstonesTutorial = TellstonesTutorial;
