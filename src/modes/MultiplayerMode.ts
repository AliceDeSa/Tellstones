
import { GameMode, GameConfig } from "./GameMode.js";

// Define Interfaces for Room Data
interface PlayerData {
    nome: string;
    pontos: number;
    id: string;
}

interface SpectatorData {
    nome: string;
}

interface RoomData {
    jogadores: { [key: string]: PlayerData };
    espectadores: { [key: string]: SpectatorData };
    status: string;
    estadoJogo: any; // Ideally this should be a stronger GameState type
}

export class MultiplayerMode extends GameMode {
    public roomCode: string | null;
    public playerName: string | null;
    public playerNameId: string | null;

    constructor() {
        super();
        this.roomCode = null;
        this.playerName = null;
        this.playerNameId = null;
    }

    start(config: GameConfig): void {
        super.start(config);
        this.roomCode = config.roomCode;
        this.playerName = config.playerName;
        this.playerNameId = config.playerName; // Simplification

        // Wrappers de janela para compatibilidade
        (window as any).isLocalMode = false;
        (window as any).salaAtual = this.roomCode;
        (window as any).nomeAtual = this.playerName;

        // Busca Inicial
        this.fetchInitialState();

        // Inicia Listeners
        this.listenToState();
        this.listenToLobby();
    }

    private fetchInitialState(): void {
        const dbRef = (window as any).getDBRef(`salas/${this.roomCode}/estadoJogo`);
        dbRef.once("value", (snapshot: any) => {
            if (snapshot.exists()) {
                const estado = snapshot.val();
                if (!estado.mesa)
                    estado.mesa = Array(7).fill(null);

                if ((window as any).GameController)
                    (window as any).GameController.atualizarEstado(estado);
            }
        });
    }

    private listenToState(): void {
        const ref = (window as any).getDBRef(`salas/${this.roomCode}/estadoJogo`);
        this.registerListener(ref, "value", (snapshot: any) => {
            const estado = snapshot.val();
            if (!estado) return;

            // Normalize
            if (!estado.mesa)
                estado.mesa = Array(7).fill(null);

            // Check for Animations (Swap)
            if ((window as any).Renderer && (window as any).Renderer.monitorarTrocas) {
                (window as any).Renderer.monitorarTrocas(estado);
            }

            // Atualiza Controlador
            if ((window as any).GameController)
                (window as any).GameController.atualizarEstado(estado);

            // Verifica Vitória
            if (estado.vencedor) {
                this.handleVictory(estado.vencedor);
            }
        });
    }

    public joinRoom(nome: string, tipo: string): void {
        const ref = (window as any).getDBRef(`salas/${this.roomCode}`);
        ref.transaction((sala: RoomData | null) => {
            if (!sala) {
                sala = {
                    jogadores: {},
                    espectadores: {},
                    status: "aguardando",
                    estadoJogo: (window as any).GameRules ? (window as any).GameRules.createInitialState([], []) : {}
                };
            }

            if (tipo === "jogador") {
                if (!sala.jogadores) sala.jogadores = {};
                // Basic implementation
                sala.jogadores[nome] = { nome: nome, pontos: 0, id: nome };
            } else {
                if (!sala.espectadores) sala.espectadores = {};
                sala.espectadores[nome] = { nome: nome };
            }
            return sala;
        }, (error: any, committed: boolean, snapshot: any) => {
            if (error) {
                console.error("Erro ao entrar na sala:", error);
            } else if (committed) {
                console.log("Entrou na sala com sucesso.");
            }
        });
    }

    private listenToLobby(): void {
        const ref = (window as any).getDBRef(`salas/${this.roomCode}`);
        this.registerListener(ref, "value", (snapshot: any) => {
            const sala = snapshot.val();
            if (!sala) return;

            // Jogadores
            const jogadores: PlayerData[] = sala.jogadores ? Object.values(sala.jogadores) : [];
            const elJog = document.getElementById("lobby-jogadores");
            if (elJog) {
                elJog.innerHTML = jogadores.map((j) => `<li>${j.nome}</li>`).join("");
            }

            // Espectadores
            const espectadores = sala.espectadores ? Object.values(sala.espectadores) : [];
            const elEsp = document.getElementById("lobby-espectadores");
            if (elEsp) {
                elEsp.innerHTML = espectadores.map((e: any) => `<li>${e.nome}</li>`).join("");
            }

            // Notificações de Presença
            if (!(window as any).ultimosJogadores)
                (window as any).ultimosJogadores = []; // Legacy global check

            jogadores.forEach((j) => {
                if (!(window as any).ultimosJogadores.some((u: any) => u.nome === j.nome) && j.nome !== this.playerName) {
                    if ((window as any).showToast)
                        (window as any).showToast(`${j.nome} entrou como jogador!`);
                }
            });

            (window as any).ultimosJogadores = jogadores;

            if ((window as any).Renderer) {
                (window as any).Renderer.atualizarInfoSala(this.roomCode, espectadores);
            }

            // Detect Game Start
            if (sala.status === "jogo") {
                if ((window as any).mostrarJogo)
                    (window as any).mostrarJogo(this.roomCode, jogadores, espectadores);
            }
        });
    }

    private handleVictory(vencedor: any): void {
        const msg = (vencedor.nomes && vencedor.nomes.includes(this.playerName)) ? "Você venceu!" : "Você perdeu!";
        if ((window as any).showToast)
            (window as any).showToast(msg);

        setTimeout(() => {
            if ((window as any).checarTelaVitoriaGlobal)
                (window as any).checarTelaVitoriaGlobal();
        }, 500);
    }

    // Override cleanup if needed
    cleanup(): void {
        super.cleanup();
    }

    /**
     * Resolves a challenge in multiplayer via Transaction.
     */
    resolveChallenge(idxDeduzidoOpcional?: number): void {
        const ref = (window as any).getDBRef(`salas/${this.roomCode}/estadoJogo`);
        ref.transaction((currentState: any) => {
            if (!currentState) return;
            if (!currentState.desafio) return;

            if (idxDeduzidoOpcional !== undefined) {
                currentState.desafio.escolhaOponente = idxDeduzidoOpcional;
                currentState.desafio.status = "resolvido";
            }

            if (currentState.desafio.status !== "resolvido") return;

            const desafio = currentState.desafio;
            const idxPedra: number = desafio.idxPedra;
            const idxEscolhida: number = desafio.escolhaOponente;

            const jogadores = currentState.jogadores || [];
            const idxDesafiante = jogadores.findIndex((j: any) => j.nome === desafio.jogador);

            if (idxDesafiante === -1) return;

            const idxOponente = (idxDesafiante + 1) % jogadores.length;
            const pedrasOficiais = (window as any).PEDRAS_OFICIAIS || [];

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
                if (!currentState.jogadores[idxOponente].pontos) currentState.jogadores[idxOponente].pontos = 0;
                currentState.jogadores[idxOponente].pontos += 1;
            } else {
                if (!currentState.jogadores[idxDesafiante].pontos) currentState.jogadores[idxDesafiante].pontos = 0;
                currentState.jogadores[idxDesafiante].pontos += 1;
            }

            currentState.vez = idxOponente;
            currentState.desafio = null;

            return currentState;
        }, (error: any, committed: boolean, snapshot: any) => {
            if (committed) {
                if ((window as any).showToastInterno)
                    (window as any).showToastInterno("Resultado do desafio processado!");
                this.onStateChange(snapshot);
            } else if (error) {
                console.warn("[Transaction] Failed", error);
            }
        });
    }
}

// Global Assignment
(window as any).MultiplayerMode = MultiplayerMode;
