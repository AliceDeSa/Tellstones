/**
 * Modo Multijogador
 * Gerencia estado de jogo online via sincronização Firebase.
 */
class MultiplayerMode extends GameMode {
    constructor() {
        super();
        this.roomCode = null;
        this.playerName = null;
    }

    start(config) {
        super.start(config);
        this.roomCode = config.roomCode;
        this.playerName = config.playerName;

        // wrappers de janela para compatibilidade
        window.isLocalMode = false;
        window.salaAtual = this.roomCode;
        window.nomeAtual = this.playerName;

        // Lógica de entrar na sala (Join Room)
        this.joinRoom(config.playerName, "jogador"); // Default role

        // Busca Inicial
        this.fetchInitialState();

        // Inicia Listeners
        this.listenToState();
        this.listenToLobby();
        // this.listenToPresence(); // Replaced by listenToLobby which handles both
    }

    fetchInitialState() {
        // Fetch current state immediately to paint UI
        getDBRef("salas/" + this.roomCode + "/estadoJogo").once("value", (snapshot) => {
            if (snapshot.exists()) {
                const estado = snapshot.val();
                // Ensure arrays
                if (!estado.mesa) estado.mesa = Array(7).fill(null);
                GameController.atualizarEstado(estado);
            }
        });
    }

    listenToState() {
        const ref = getDBRef("salas/" + this.roomCode + "/estadoJogo");
        this.registerListener(ref, "value", (snapshot) => {
            const estado = snapshot.val();
            if (!estado) return;

            // Normalize
            if (!estado.mesa) estado.mesa = Array(7).fill(null);

            // Check for Animations (Swap)
            if (window.monitorarTrocas) window.monitorarTrocas(estado);

            // Atualiza Controlador
            GameController.atualizarEstado(estado);

            // Verifica Vitória
            if (estado.vencedor) {
                this.handleVictory(estado.vencedor);
            }
        });
    }

    joinRoom(nome, tipo) {
        const ref = getDBRef("salas/" + this.roomCode);
        const self = this;
        ref.transaction(function (sala) {
            if (!sala) {
                // Se sala não existe, cria estrutura básica
                sala = {
                    jogadores: {},
                    espectadores: {},
                    status: "aguardando",
                    estadoJogo: window.GameRules ? window.GameRules.createInitialState([], []) : {}
                };
            }
            if (tipo === "jogador") {
                if (!sala.jogadores) sala.jogadores = {};
                // Verifica limite de 2 jogadores (ou 4)
                const qtd = Object.keys(sala.jogadores).length;
                if (qtd >= 2) {
                    // Full
                    // return; // Abort? Or allow spectator fallback?
                    // For now, allow join but maybe warn.
                }
                // Adiciona ou Atualiza
                // Usa ID baseado no nome para simplificar ou gera ID único
                sala.jogadores[nome] = { nome: nome, pontos: 0, id: nome };
            } else {
                if (!sala.espectadores) sala.espectadores = {};
                sala.espectadores[nome] = { nome: nome };
            }
            return sala;
        }, function (error, committed, snapshot) {
            if (error) {
                console.error("Erro ao entrar na sala:", error);
            } else if (committed) {
                // Sucesso
                console.log("Entrou na sala com sucesso.");
            }
        });
    }

    listenToLobby() {
        // Substitui o antigo window.lobbyListener
        const ref = getDBRef("salas/" + this.roomCode);
        this.registerListener(ref, "value", (snapshot) => {
            const sala = snapshot.val();
            if (!sala) return;

            // Jogadores
            const jogadores = sala.jogadores ? Object.values(sala.jogadores) : [];
            const elJog = document.getElementById("lobby-jogadores");
            if (elJog) {
                elJog.innerHTML = jogadores.map(j => `<li>${j.nome}</li>`).join("");
            }

            // Espectadores
            const espectadores = sala.espectadores ? Object.values(sala.espectadores) : [];
            const elEsp = document.getElementById("lobby-espectadores");
            if (elEsp) {
                elEsp.innerHTML = espectadores.map(e => `<li>${e.nome}</li>`).join("");
            }

            // Notificações de Presença (reutilizando lógica global window.ultimosJogadores se possível, ou local)
            // Para simplicidade, vamos manter a lógica visual aqui:
            if (!window.ultimosJogadores) window.ultimosJogadores = [];
            jogadores.forEach((j) => {
                if (!window.ultimosJogadores.some((u) => u.nome === j.nome) && j.nome !== this.playerName) {
                    if (window.showToast) window.showToast(`${j.nome} entrou como jogador!`);
                }
            });
            window.ultimosJogadores = jogadores;

            if (window.Renderer) {
                window.Renderer.atualizarInfoSala(this.roomCode, espectadores);
            }

            // Detect Game Start
            if (sala.status === "jogo") {
                if (window.mostrarJogo) window.mostrarJogo(this.roomCode, jogadores, espectadores);
            }
        });
    }

    handleVictory(vencedor) {
        const msg = vencedor.nomes.includes(this.playerName) ? "Você venceu!" : "Você perdeu!";
        if (window.showToast) window.showToast(msg);
        // Delay and show modal?
        setTimeout(() => {
            if (window.checarTelaVitoriaGlobal) window.checarTelaVitoriaGlobal();
        }, 500);
    }

    cleanup() {
        super.cleanup();
        // Additional cleanup: maybe Remove presence?
        // Rely on onDisconnect handlers set elsewhere or add them here.
    }

    resolveChallenge(idxDeduzidoOpcional) {
        // Lógica transacional do Firebase
        const ref = getDBRef("salas/" + this.roomCode + "/estadoJogo");
        const self = this;

        ref.transaction(function (currentState) {
            if (!currentState) return;
            if (!currentState.desafio) return;

            // Se for chamada via resolverDesafio, aplicamos a escolha agora
            if (idxDeduzidoOpcional !== undefined) {
                currentState.desafio.escolhaOponente = idxDeduzidoOpcional;
                currentState.desafio.status = "resolvido";
            }

            // Verifica se está resolvido
            if (currentState.desafio.status !== "resolvido") return;

            const desafio = currentState.desafio;
            const idxPedra = desafio.idxPedra;
            const idxEscolhida = desafio.escolhaOponente;

            const jogadores = currentState.jogadores;
            const idxDesafiante = jogadores.findIndex(j => j.nome === desafio.jogador);
            if (idxDesafiante === -1) return;
            const idxOponente = (idxDesafiante + 1) % jogadores.length;

            // Importar GameRules ou usar lógica local? Melhor usar GameRules se possível, 
            // mas aqui estamos dentro da transação, acesso externo pode ser limitado.
            // Repetindo lógica simples para segurança da transação.
            const pedrasOficiais = window.PEDRAS_OFICIAIS || [];
            // Cuidado: window.PEDRAS_OFICIAIS pode não estar disponível no contexto do node se fosse SSR, mas é browser.

            const pedraMesa = currentState.mesa[idxPedra];
            const nomePedraMesa = pedraMesa ? pedraMesa.nome : "";
            const nomePedraEscolhida = pedrasOficiais[idxEscolhida] ? pedrasOficiais[idxEscolhida].nome : "";

            const acertou = nomePedraMesa === nomePedraEscolhida;

            // REVELAR
            if (currentState.mesa && currentState.mesa[idxPedra]) {
                currentState.mesa[idxPedra].virada = false;
            }

            // PONTUAR
            if (acertou) {
                // Oponente ganha 1 ponto
                if (!currentState.jogadores[idxOponente].pontos) currentState.jogadores[idxOponente].pontos = 0;
                currentState.jogadores[idxOponente].pontos += 1;
            } else {
                // Desafiante ganha 1 ponto
                if (!currentState.jogadores[idxDesafiante].pontos) currentState.jogadores[idxDesafiante].pontos = 0;
                currentState.jogadores[idxDesafiante].pontos += 1;
            }

            currentState.vez = idxOponente;
            currentState.desafio = null;

            return currentState;
        }, (error, committed, snapshot) => {
            if (committed) {
                if (window.showToastInterno) window.showToastInterno("Resultado do desafio processado!");
                // Notifica
                self.onStateChange(snapshot);
            } else if (error) {
                console.warn("[Transaction] Failed", error);
            }
        });
    }
}

// Export
window.MultiplayerMode = MultiplayerMode;
