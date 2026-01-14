/**
 * Modo Tutorial
 * Jogo guiado com ações restritas para aprendizado.
 */
class TutorialMode extends GameMode {
    constructor() {
        super();
        this.tutorialManager = null;
    }

    start(config) {
        super.start(config);

        window.isLocalMode = true;
        window.salaAtual = "MODO_TUTORIAL";
        window.salaAtual = "MODO_TUTORIAL";
        window.nomeAtual = "Aprendiz"; // Fixed name for tutorial

        // Reset Local State
        if (window.clearLocalData) window.clearLocalData("salas/MODO_TUTORIAL");

        // Setup Tutorial State
        const jogadores = [
            { nome: "Mestre", id: "p2", pontos: 0 },
            { nome: "Aprendiz", id: "p1", pontos: 0 }
        ];

        // Init Game Controller
        const estadoInicial = GameController.inicializarJogo(jogadores);

        // Configuração Específica do Tutorial
        // Começa alinhado, com pedra central
        estadoInicial.mesa = [null, null, null, estadoInicial.pedraCentral, null, null, null];
        estadoInicial.pedraCentral = null;
        estadoInicial.centralAlinhada = true;
        estadoInicial.alinhamentoFeito = true;
        estadoInicial.vez = 0; // Mestre começa

        // Mock Data
        window.localData = {
            salas: {
                MODO_TUTORIAL: {
                    estadoJogo: estadoInicial,
                    jogadores: jogadores
                }
            }
        };

        // Initialize Tutorial Manager
        setTimeout(() => {
            if (window.TellstonesTutorial) {
                this.tutorialManager = new TellstonesTutorial();
                window.tellstonesTutorial = this.tutorialManager;
                this.tutorialManager.iniciar();
            }
        }, 500);

        // Listen for updates
        this.listenToState();
    }

    cleanup() {
        super.cleanup();

        // Remove Tutorial Manager
        if (this.tutorialManager) {
            if (this.tutorialManager.cleanup) this.tutorialManager.cleanup();
            this.tutorialManager = null;
        }
        window.tellstonesTutorial = null;

        // Remove UI Overlay
        const overlay = document.getElementById("tutorial-ui");
        if (overlay) overlay.remove();

        // Limpa listeners locais
        const ref = getDBRef("salas/MODO_TUTORIAL/estadoJogo");
        if (ref && ref.off) ref.off();

        // Limpa local data para evitar persistencia
        if (window.clearLocalData) window.clearLocalData("salas/MODO_TUTORIAL");
    }

    listenToState() {
        // Standard listener, but we might want to intercept for Tutorial validation?
        // Actually validation is mostly in UI/Controller. Listener just reflects state.
        const ref = getDBRef("salas/MODO_TUTORIAL/estadoJogo");
        this.registerListener(ref, "value", (snap) => {
            const estado = snap.val();
            if (estado) {
                if (!estado.mesa) estado.mesa = Array(7).fill(null);

                // Handle Swap Animation
                if (window.monitorarTrocas) window.monitorarTrocas(estado);

                GameController.atualizarEstado(estado);


                // Update UI Info (Room/Players)
                // Pass [] for spectators in Tutorial
                if (window.Renderer) {
                    window.Renderer.atualizarInfoSala(this.roomCode || "MODO_TUTORIAL", []);
                }
            }
        });
    }

    canPerformAction(action, context = {}) {
        if (!this.tutorialManager) return false;
        return this.tutorialManager.verificarAcao(action);
    }

    cleanup() {
        super.cleanup();
        if (this.tutorialManager) {
            this.tutorialManager.finalizar();
            window.tellstonesTutorial = null;
        }
        // Clean UI if needed
        const ui = document.getElementById("tutorial-ui");
        if (ui) ui.remove();
    }

    resolveChallenge(idxDeduzidoOpcional) {
        const estado = window.estadoJogo;
        if (!estado.desafio) return;

        // Se for chamada via resolverDesafio, aplicamos a escolha agora
        if (idxDeduzidoOpcional !== undefined) {
            estado.desafio.escolhaOponente = idxDeduzidoOpcional;
            estado.desafio.status = "resolvido";
        }

        if (estado.desafio.status !== "resolvido") return;

        const desafio = estado.desafio;
        const idxPedra = desafio.idxPedra;
        const idxEscolhida = desafio.escolhaOponente;

        const jogadores = estado.jogadores;
        const idxDesafiante = jogadores.findIndex(j => j.nome === desafio.jogador);
        const idxOponente = (idxDesafiante + 1) % jogadores.length;

        const pedrasOficiais = window.PEDRAS_OFICIAIS || [];
        const pedraMesa = estado.mesa[idxPedra];
        const nomePedraMesa = pedraMesa ? pedraMesa.nome : "";
        const nomePedraEscolhida = pedrasOficiais[idxEscolhida] ? pedrasOficiais[idxEscolhida].nome : "";

        const acertou = nomePedraMesa === nomePedraEscolhida;

        // REVELAR
        if (estado.mesa && estado.mesa[idxPedra]) {
            estado.mesa[idxPedra].virada = false;
        }

        // PONTUAR
        let vencedor = null;
        if (acertou) {
            estado.jogadores[idxOponente].pontos = (estado.jogadores[idxOponente].pontos || 0) + 1;
            vencedor = estado.jogadores[idxOponente];
        } else {
            estado.jogadores[idxDesafiante].pontos = (estado.jogadores[idxDesafiante].pontos || 0) + 1;
            vencedor = estado.jogadores[idxDesafiante];
        }

        if (vencedor && vencedor.id === "p1") {
            if (window.tocarSomSucesso) window.tocarSomSucesso();
        } else {
            if (window.tocarSomFalha) window.tocarSomFalha();
        }

        estado.vez = idxOponente;
        estado.desafio = null;

        // Persistir e Notificar
        if (window.GameController) {
            window.GameController.persistirEstado();
            window.GameController.notificarAtualizacao();
        }

        if (window.showToastInterno) window.showToastInterno("Pedra revelada e pontos computados!");
        if (window.tellstonesTutorial) {
            setTimeout(() => window.tellstonesTutorial.registrarAcaoConcluida(), 500);
        }
    }
}

window.TutorialMode = TutorialMode;
