// =========================
// GameController - Orquestração do Jogo
// =========================

const GameController = {

    // Inicializa o jogo
    inicializarJogo: function (jogadores) {
        if (!GameRules) {
            console.error("GameRules não carregado!");
            return;
        }

        // Cria estado inicial puro
        const novoEstado = GameRules.createInitialState(jogadores, PEDRAS_OFICIAIS);
        this.atualizarEstado(novoEstado);

        // IMPORTANT: Persist state immediately so listeners pick it up
        this.persistirEstado();

        return novoEstado;
    },

    // Ação: Colocar pedra da reserva na mesa
    colocarPedra: function (pedraObj, slotIdx) {
        // 1. Validação (GameRules)
        const estado = window.estadoJogo;
        if (!estado) return false;

        // Por enquanto, validação básica aqui
        if (estado.mesa[slotIdx] !== null) {
            console.warn("Slot ocupado!");
            return false;
        }

        // 2. Atualização de Estado
        estado.mesa[slotIdx] = pedraObj;

        // Remove da reserva (já feito pelo caller por enquanto)

        this.persistirEstado();
        this.notificarAtualizacao();

        // Multiplayer: Avançar turno
        if (window.avancarTurno) window.avancarTurno();

        return true;
    },

    // Ação: Resolver Desafio (Oponente escolheu uma pedra)
    resolverDesafio: function (idxDeduzido) {
        if (!window.estadoJogo || !window.estadoJogo.desafio) return;
        // Passa a escolha diretamente para ser processada na transação
        this.processarResolucaoDesafio(idxDeduzido);
    },

    processarResolucaoDesafio: function (idxDeduzidoOpcional) {
        if (window.currentGameMode && typeof window.currentGameMode.resolveChallenge === 'function') {
            window.currentGameMode.resolveChallenge(idxDeduzidoOpcional);
        } else {
            console.warn("[GameController] Nenhum modo de jogo ativo ou resolveChallenge não implementado.");
        }
    },


    // Ação: Responder ao Se Gabar
    responderSegabar: function (acao) {
        // acao: 'acreditar' | 'duvidar' | 'segabar_tambem'
        const estado = window.estadoJogo;
        if (!estado.desafio || estado.desafio.tipo !== "segabar") return;

        if (window.tellstonesTutorial && !window.tellstonesTutorial.verificarAcao("RESPONDER_DESAFIO")) return;

        const salaAtual = window.salaAtual;

        // --- ACREDITAR ---
        if (acao === "acreditar") {
            const jogadorDesafio = estado.desafio.jogador;
            const idx = estado.jogadores.findIndex(j => j.nome === jogadorDesafio);
            if (idx !== -1) estado.jogadores[idx].pontos++;

            if (salaAtual === "MODO_TUTORIAL") {
                if (window.showToastInterno) window.showToastInterno(`Você acreditou. O Mestre marcou ponto!`);
                estado.vez = 1;
                // Force update
                getDBRef("salas/" + salaAtual + "/estadoJogo").update({
                    jogadores: estado.jogadores,
                    vez: 1
                });
                getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
                if (window.tellstonesTutorial) setTimeout(() => window.tellstonesTutorial.registrarAcaoConcluida(), 500);

                this.notificarAtualizacao();
                return;
            }

            // Normal Flow
            getDBRef("salas/" + salaAtual + "/estadoJogo").update({
                jogadores: estado.jogadores
            });
            getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
            if (window.showToast) window.showToast(`${jogadorDesafio} ganhou 1 ponto!`);
            if (window.avancarTurno) window.avancarTurno(); // Legacy Global Call
        }

        // --- DUVIDAR ---
        else if (acao === "duvidar") {
            if (salaAtual === "MODO_TUTORIAL") {
                if (window.showToastInterno) window.showToastInterno("Você duvidou! O Mestre vai provar...");
                // Simula Mestre provando
                setTimeout(() => {
                    if (window.showToastInterno) window.showToastInterno("Mestre revelou as pedras e acertou! 3 Pantos para ele.");
                    const idxBot = estado.jogadores.findIndex(j => j.nome === "Mestre");
                    if (idxBot !== -1) estado.jogadores[idxBot].pontos += 3;
                    estado.vez = 1;
                    getDBRef("salas/" + salaAtual + "/estadoJogo").update({
                        jogadores: estado.jogadores,
                        vez: 1
                    });
                    getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
                    if (window.tellstonesTutorial) setTimeout(() => window.tellstonesTutorial.registrarAcaoConcluida(), 500);
                    this.notificarAtualizacao();
                }, 1500);
                return;
            }

            // Inicia fluxo de prova
            estado.desafio.status = "responder_pecas";
            estado.desafio.idxAtual = 0;
            estado.desafio.respostas = [];
            this.persistirEstado();
        }

        // --- SE GABAR TAMBÉM ---
        else if (acao === "segabar_tambem") {
            // Regra: O jogador 2 rouba o Boast e precisa provar a sequência IMEDIATAMENTE.
            estado.desafio.jogador = window.nomeAtual; // Agora eu sou o Boaster
            estado.desafio.status = "responder_pecas"; // Vai direto para a prova
            estado.desafio.idxAtual = 0;
            estado.desafio.respostas = [];

            if (salaAtual === "MODO_TUTORIAL") {
                if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
            }
            this.persistirEstado();
        }

        this.notificarAtualizacao();
    },

    // Ação: Verificar Resposta (Exame Se Gabar)
    verificarRespostaSegabar: function (idxMesa, nomeEscolhido) {
        const estado = window.estadoJogo;
        if (!estado.desafio.respostas) estado.desafio.respostas = [];
        if (typeof estado.desafio.idxAtual === 'undefined') estado.desafio.idxAtual = 0;

        // Armazena a resposta
        estado.desafio.respostas.push({ idxMesa, nomeEscolhido });
        estado.desafio.idxAtual++;

        const pedrasViradas = estado.mesa.filter(p => p && p.virada);
        const totalParaResponder = pedrasViradas.length; // Como não viramos, o count é constante ou deve ser conferido

        // Verifica se terminou a sequência
        if (estado.desafio.idxAtual >= totalParaResponder) {
            this.finalizarDesafioSegabar(estado);
        } else {
            // Continua para a próxima
            this.persistirEstado();
            this.notificarAtualizacao();
        }
    },

    finalizarDesafioSegabar: function (estado) {
        const salaAtual = window.salaAtual;
        let errou = false;

        // Validação em Lote e REVELAÇÃO FORÇADA
        estado.desafio.respostas.forEach(resp => {
            const pedraReal = estado.mesa[resp.idxMesa];
            if (!pedraReal || pedraReal.nome !== resp.nomeEscolhido) {
                errou = true;
            }
            // Revela todas as pedras ao final (Permanente)
            if (estado.mesa[resp.idxMesa]) estado.mesa[resp.idxMesa].virada = false;
        });

        if (!errou) {
            // VENCEU O DESAFIO
            if (window.tocarSomSucesso) window.tocarSomSucesso();
            if (window.showToast) window.showToast("Você provou seu conhecimento e VENCEU 3 PONTOS!");

            // Robust Scoring: Update directly via Firebase Transaction/Update to avoid race
            const boasterName = estado.desafio.jogador;
            const idxJogador = estado.jogadores.findIndex(j => j.nome === boasterName);

            if (idxJogador !== -1) {
                // Optimistic update locally
                estado.jogadores[idxJogador].pontos += 3;

                // Direct DB update to ensure points are counted even if full state save fails
                if (salaAtual !== "MODO_TUTORIAL") {
                    getDBRef(`salas/${salaAtual}/estadoJogo/jogadores/${idxJogador}/pontos`)
                        .transaction(pontos => (pontos || 0) + 3);
                }
            }

            getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();

            if (salaAtual === "MODO_TUTORIAL" && window.tellstonesTutorial) {
                setTimeout(() => window.tellstonesTutorial.registrarAcaoConcluida(), 500);
            }
            if (window.avancarTurno) window.avancarTurno();

        } else {
            // ERROU
            // ERROU - Ponto ao oponente
            if (window.tocarSomFalha) window.tocarSomFalha();
            if (window.showToastInterno) window.showToastInterno(`Você errou a sequência! Oponente ganha 3 PONTOS.`);
            estado.desafio = null;

            // Oponente ganha 3 pontos
            // Oponente ganha 3 pontos
            const idxOponente = (estado.vez + 1) % estado.jogadores.length;
            if (estado.jogadores[idxOponente]) {
                estado.jogadores[idxOponente].pontos += 3;
                // Direct DB update
                if (salaAtual !== "MODO_TUTORIAL") {
                    getDBRef(`salas/${salaAtual}/estadoJogo/jogadores/${idxOponente}/pontos`)
                        .transaction(pontos => (pontos || 0) + 3);
                }
            }
            // Força atualização visual imediata de pontos
            if (window.Renderer) window.Renderer.atualizarPlacar(estado.jogadores);

            this.persistirEstado();
            this.notificarAtualizacao();
            if (window.avancarTurno) window.avancarTurno();
        }

        // Limpa estado auxiliar só se não removeu o desafio inteiro antes
        if (estado.desafio) {
            estado.desafio.respostas = [];
            estado.desafio.idxAtual = 0;
        }
        this.persistirEstado();
        this.notificarAtualizacao();
    },

    // Helpers de Estado
    atualizarEstado: function (novoEstado) {
        window.estadoJogo = novoEstado;
        // Sync global se necessário
    },

    persistirEstado: function () {
        // Salva no Firebase/LocalDB
        if (window.salaAtual) {
            getDBRef("salas/" + window.salaAtual + "/estadoJogo").set(window.estadoJogo);
        }
    },

    notificarAtualizacao: function () {
        // Força re-render
        if (window.Renderer) {
            window.Renderer.renderizarMesa();
            window.Renderer.renderizarPedrasReserva();
        }
    }
};

window.GameController = GameController;
