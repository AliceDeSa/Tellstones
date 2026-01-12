/**
 * Modo PvE (Jogador vs Ambiente)
 * Gerencia estado de jogo local com um oponente IA.
 */
class PvEMode extends GameMode {
    constructor() {
        super();
        this.bot = null;
        this.botThinking = false;
    }

    start(config) {
        super.start(config);

        // Globals setup
        window.isLocalMode = true;
        window.salaAtual = "MODO_PVE";
        window.nomeAtual = config.playerName || "Jogador";

        // Reset Local State
        if (window.clearLocalData) window.clearLocalData("salas/MODO_PVE");

        // Start match

        // Inicializa Bot
        this.bot = new TellstonesBot("Bot");
        window.tellstonesBot = this.bot; // Hook legado

        // Configuração de Estado Inicial
        // Em script.js, chamamos inicializarJogo.
        const jogadores = [
            { nome: window.nomeAtual, id: "p1", pontos: 0 },
            { nome: "Bot", id: "p2", pontos: 0 }
        ];

        // We need to initialize the LocalDB structure
        const estadoInicial = GameController.inicializarJogo(jogadores);

        // Mock Local Data structure
        window.localData = {
            salas: {
                MODO_PVE: {
                    estadoJogo: estadoInicial,
                    jogadores: jogadores
                }
            }
        };

        // Renderização Inicial
        if (window.Renderer) window.Renderer.renderizarMesa();

        // Escuta atualizações (que ativam o Bot)
        this.listenToState();
    }

    listenToState() {
        const ref = getDBRef("salas/MODO_PVE/estadoJogo");
        this.registerListener(ref, "value", (snap) => {
            const estado = snap.val();
            if (!estado) return;

            // Normalize
            if (!estado.mesa) estado.mesa = Array(7).fill(null);

            // Update System
            GameController.atualizarEstado(estado);

            // Update UI Info
            if (window.Renderer) {
                window.Renderer.atualizarInfoSala("MODO_PVE", []);
            }

            // Trigger Bot Logic
            this.checkBotTurn(estado);
            this.checkBotChallengeResponse(estado);
        });
    }

    checkBotTurn(estado) {
        if (this.botThinking || !!estado.vencedor) return;

        const idxBot = estado.jogadores.findIndex(j => j.nome === "Bot");
        const isBotTurn = (estado.vez === idxBot);

        if (isBotTurn) {
            this.botThinking = true;
            // Gatilho lógico do Bot

            setTimeout(() => {
                if (!this.active) return; // Para se o modo mudou
                const jogada = this.bot.fazerJogada(estado);
                if (jogada) {
                    this.performBotAction(jogada);
                }
                this.botThinking = false;
            }, 1500);
        }
    }

    checkBotChallengeResponse(estado) {
        if (this.botThinking || !!estado.vencedor) return;

        // If there is a challenge waiting for response
        if (estado.desafio && estado.desafio.status === "aguardando_resposta") {
            const desafiante = estado.desafio.jogador;
            // If I (Player) challenged, Bot must respond
            if (desafiante !== "Bot") {
                this.botThinking = true;
                setTimeout(() => {
                    if (!this.active) return;
                    const resposta = this.bot.responderDesafio(estado);
                    this.processBotResponse(resposta, estado);
                    this.botThinking = false;
                }, 2000);
            }
        }
    }

    performBotAction(jogada) {
        // Execute action via GameController or DB updates directly
        // Currently GameController doesn't have "doAction" generic, better to simulate DB update
        // mapping jogada -> function
        if (jogada.tipo === 'colocar') {
            // Logic to update state... 
            // Ideally we call GameController.colocarPedra but we need to pass the object
            const pedra = window.estadoJogo.reserva[jogada.pedraIdx];
            GameController.colocarPedra(pedra, jogada.slot);
            // We also need to remove from reserve, GameController doesn't do that automatically yet?
            // Checking GC code: "Remove da reserva (já feito pelo caller por enquanto)"
            // So we must do it manually in state and persist.
            const novoEstado = { ...window.estadoJogo };
            novoEstado.reserva[jogada.pedraIdx] = null;
            getDBRef("salas/MODO_PVE/estadoJogo").update({ reserva: novoEstado.reserva });
        } else if (jogada.tipo === 'esconder') {
            GameController.virarPedra(jogada.idx);
        } else if (jogada.tipo === 'trocar') {
            GameController.trocarPedras(jogada.origem, jogada.destino);
        } else if (jogada.tipo === 'desafiar') {
            // Bot challenges
            // Need to set challenge state
            const novoEstado = { ...window.estadoJogo };
            novoEstado.desafio = {
                status: "aguardando_resposta",
                jogador: "Bot",
                idxPedra: jogada.idxPedra
            };
            getDBRef("salas/MODO_PVE/estadoJogo").update({ desafio: novoEstado.desafio });
        } else if (jogada.tipo === 'espiar') {
            GameController.espiarPedra(jogada.idx);
        } else if (jogada.tipo === 'mover') {
            GameController.avancarTurno();
        } else if (jogada.tipo === 'segabar') {
            const novoEstado = { ...window.estadoJogo };
            novoEstado.desafio = {
                tipo: "segabar",
                status: "aguardando_resposta",
                jogador: "Bot"
            };
            getDBRef("salas/MODO_PVE/estadoJogo").update({ desafio: novoEstado.desafio });
            if (window.showToastInterno) window.showToastInterno("O Bot se gabou! Você acredita?");
        }
    }

    processBotResponse(resposta, estado) {
        if (resposta.tipo === "responder_desafio") {
            GameController.resolverDesafio(resposta.idx);
        }
    }

    // Implementar resolveChallenge para o Jogador responder ao Bot
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
        // Identifica roles (Bot deve ser o desafiante aqui se o player está respondendo, ou vice versa)
        const idxDesafiante = jogadores.findIndex(j => j.nome === desafio.jogador);
        if (idxDesafiante === -1) return;
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
        if (acertou) {
            estado.jogadores[idxOponente].pontos = (estado.jogadores[idxOponente].pontos || 0) + 1;
        } else {
            estado.jogadores[idxDesafiante].pontos = (estado.jogadores[idxDesafiante].pontos || 0) + 1;
        }

        estado.vez = idxOponente;
        estado.desafio = null;

        // Atualizar DB Local
        getDBRef("salas/MODO_PVE/estadoJogo").set(estado);

        if (window.showToastInterno) window.showToastInterno("Resultado: " + (acertou ? "Acertou!" : "Errou!"));
    }

}

window.PvEMode = PvEMode;
