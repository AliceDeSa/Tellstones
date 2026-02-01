import { GameMode } from "./GameMode.js";
export class MultiplayerMode extends GameMode {
    constructor() {
        super();
        this.roomCode = null;
        this.playerName = null;
        this.playerNameId = null;
    }
    start(config) {
        super.start(config);
        this.roomCode = config.roomCode;
        this.playerName = config.playerName;
        this.playerNameId = config.playerName; // Simplification
        // Wrappers de janela para compatibilidade
        window.isLocalMode = false;
        window.salaAtual = this.roomCode;
        window.nomeAtual = this.playerName;
        // Busca Inicial
        this.fetchInitialState();
        // Inicia Listeners
        this.listenToState();
        this.listenToLobby();
    }
    fetchInitialState() {
        const dbRef = window.getDBRef(`salas/${this.roomCode}/estadoJogo`);
        dbRef.once("value", (snapshot) => {
            if (snapshot.exists()) {
                const estado = snapshot.val();
                if (!estado.mesa)
                    estado.mesa = Array(7).fill(null);
                if (window.GameController)
                    window.GameController.atualizarEstado(estado);
            }
        });
    }
    listenToState() {
        const ref = window.getDBRef(`salas/${this.roomCode}/estadoJogo`);
        this.registerListener(ref, "value", (snapshot) => {
            const estado = snapshot.val();
            if (!estado)
                return;
            // Normalize
            if (!estado.mesa)
                estado.mesa = Array(7).fill(null);
            // Check for Animations (Swap)
            if (window.Renderer && window.Renderer.monitorarTrocas) {
                window.Renderer.monitorarTrocas(estado);
            }
            // Atualiza Controlador
            if (window.GameController)
                window.GameController.atualizarEstado(estado);
            // Verifica Vitória
            if (estado.vencedor) {
                this.handleVictory(estado.vencedor);
            }
        });
    }
    joinRoom(nome, tipo) {
        const ref = window.getDBRef(`salas/${this.roomCode}`);
        ref.transaction((sala) => {
            if (!sala) {
                sala = {
                    jogadores: {},
                    espectadores: {},
                    status: "aguardando",
                    estadoJogo: window.GameRules ? window.GameRules.createInitialState([], []) : {}
                };
            }
            if (tipo === "jogador") {
                if (!sala.jogadores)
                    sala.jogadores = {};
                // Basic implementation
                sala.jogadores[nome] = { nome: nome, pontos: 0, id: nome };
            }
            else {
                if (!sala.espectadores)
                    sala.espectadores = {};
                sala.espectadores[nome] = { nome: nome };
            }
            return sala;
        }, (error, committed, snapshot) => {
            if (error) {
                console.error("Erro ao entrar na sala:", error);
            }
            else if (committed) {
                console.log("Entrou na sala com sucesso.");
            }
        });
    }
    listenToLobby() {
        const ref = window.getDBRef(`salas/${this.roomCode}`);
        this.registerListener(ref, "value", (snapshot) => {
            const sala = snapshot.val();
            if (!sala)
                return;
            // Jogadores
            const jogadores = sala.jogadores ? Object.values(sala.jogadores) : [];
            const elJog = document.getElementById("lobby-jogadores");
            if (elJog) {
                elJog.innerHTML = jogadores.map((j) => `<li>${j.nome}</li>`).join("");
            }
            // Espectadores
            const espectadores = sala.espectadores ? Object.values(sala.espectadores) : [];
            const elEsp = document.getElementById("lobby-espectadores");
            if (elEsp) {
                elEsp.innerHTML = espectadores.map((e) => `<li>${e.nome}</li>`).join("");
            }
            // Notificações de Presença
            if (!window.ultimosJogadores)
                window.ultimosJogadores = []; // Legacy global check
            jogadores.forEach((j) => {
                if (!window.ultimosJogadores.some((u) => u.nome === j.nome) && j.nome !== this.playerName) {
                    if (window.showToast)
                        window.showToast(`${j.nome} entrou como jogador!`);
                }
            });
            window.ultimosJogadores = jogadores;
            if (window.Renderer) {
                window.Renderer.atualizarInfoSala(this.roomCode, espectadores);
            }
            // Detect Game Start
            if (sala.status === "jogo") {
                if (window.mostrarJogo)
                    window.mostrarJogo(this.roomCode, jogadores, espectadores);
            }
        });
    }
    handleVictory(vencedor) {
        const msg = (vencedor.nomes && vencedor.nomes.includes(this.playerName)) ? "Você venceu!" : "Você perdeu!";
        if (window.showToast)
            window.showToast(msg);
        setTimeout(() => {
            if (window.checarTelaVitoriaGlobal)
                window.checarTelaVitoriaGlobal();
        }, 500);
    }
    // Override cleanup if needed
    cleanup() {
        super.cleanup();
    }
    /**
     * Resolves a challenge in multiplayer via Transaction.
     */
    resolveChallenge(idxDeduzidoOpcional) {
        const ref = window.getDBRef(`salas/${this.roomCode}/estadoJogo`);
        ref.transaction((currentState) => {
            if (!currentState)
                return;
            if (!currentState.desafio)
                return;
            if (idxDeduzidoOpcional !== undefined) {
                currentState.desafio.escolhaOponente = idxDeduzidoOpcional;
                currentState.desafio.status = "resolvido";
            }
            if (currentState.desafio.status !== "resolvido")
                return;
            const desafio = currentState.desafio;
            const idxPedra = desafio.idxPedra;
            const idxEscolhida = desafio.escolhaOponente;
            const jogadores = currentState.jogadores || [];
            const idxDesafiante = jogadores.findIndex((j) => j.nome === desafio.jogador);
            if (idxDesafiante === -1)
                return;
            const idxOponente = (idxDesafiante + 1) % jogadores.length;
            const pedrasOficiais = window.PEDRAS_OFICIAIS || [];
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
                if (!currentState.jogadores[idxOponente].pontos)
                    currentState.jogadores[idxOponente].pontos = 0;
                currentState.jogadores[idxOponente].pontos += 1;
            }
            else {
                if (!currentState.jogadores[idxDesafiante].pontos)
                    currentState.jogadores[idxDesafiante].pontos = 0;
                currentState.jogadores[idxDesafiante].pontos += 1;
            }
            currentState.vez = idxOponente;
            currentState.desafio = null;
            return currentState;
        }, (error, committed, snapshot) => {
            if (committed) {
                if (window.showToastInterno)
                    window.showToastInterno("Resultado do desafio processado!");
                this.onStateChange(snapshot);
            }
            else if (error) {
                console.warn("[Transaction] Failed", error);
            }
        });
    }
}
// Global Assignment
window.MultiplayerMode = MultiplayerMode;
