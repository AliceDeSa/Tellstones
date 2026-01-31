
import { GameMode, GameConfig } from "./GameMode.js";
import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';

// Define Mock Data Interface for Tutorial
interface TutorialMockData {
    salas: {
        [key: string]: {
            estadoJogo: any;
            jogadores: any[];
        }
    }
}

export class TutorialMode extends GameMode {
    private tutorialManager: any = null;
    private roomCode: string | null = null;

    constructor() {
        super();
        this.tutorialManager = null;
        this.roomCode = null;
    }

    start(config: GameConfig): void {
        super.start(config);

        if ((window as any).mostrarTela) {
            (window as any).mostrarTela('game');
        }

        (window as any).isLocalMode = true;
        (window as any).salaAtual = "MODO_TUTORIAL";
        (window as any).nomeAtual = "Aprendiz";

        if ((window as any).clearLocalData) {
            (window as any).clearLocalData("salas/MODO_TUTORIAL");
        }

        const jogadores = [
            { nome: "Mestre", id: "p2", pontos: 0 },
            { nome: "Aprendiz", id: "p1", pontos: 0 }
        ];

        let estadoInicial: any = {};
        if ((window as any).GameController) {
            estadoInicial = (window as any).GameController.inicializarJogo(jogadores);
        }

        // Configuração Específica do Tutorial
        estadoInicial.mesa = [null, null, null, estadoInicial.pedraCentral, null, null, null];
        estadoInicial.pedraCentral = null;
        estadoInicial.centralAlinhada = true;
        estadoInicial.alinhamentoFeito = true;
        estadoInicial.vez = 0; // Mestre começa

        // Mock Data
        (window as any).localData = {
            salas: {
                MODO_TUTORIAL: {
                    estadoJogo: estadoInicial,
                    jogadores: jogadores
                }
            }
        };

        // Initialize Tutorial Manager
        setTimeout(() => {
            if ((window as any).TellstonesTutorial) {
                this.tutorialManager = new (window as any).TellstonesTutorial();
                (window as any).tellstonesTutorial = this.tutorialManager;
                this.tutorialManager.iniciar();

                // v6.0: Emit EventBus events
                EventBus.emit(EventType.TUTORIAL_START, {});
                EventBus.emit(EventType.GAME_START, { mode: 'tutorial' });
            }
        }, 500);

        this.listenToState();
    }

    cleanup(): void {
        super.cleanup();

        // Emit TUTORIAL_END event
        const tutorialCompleted = this.tutorialManager?.passoAtual >= 10;
        EventBus.emit(EventType.TUTORIAL_END, {
            completed: tutorialCompleted,
            reason: tutorialCompleted ? 'completed' : 'cancelled'
        });

        if (this.tutorialManager) {
            if (this.tutorialManager.cleanup)
                this.tutorialManager.cleanup();
            if (this.tutorialManager.finalizar)
                this.tutorialManager.finalizar();
            this.tutorialManager = null;
        }

        (window as any).tellstonesTutorial = null;

        const tutorialUI = document.getElementById("tutorial-ui");
        if (tutorialUI) tutorialUI.remove();

        const ref = (window as any).getDBRef("salas/MODO_TUTORIAL/estadoJogo");
        if (ref && ref.off)
            ref.off();

        if ((window as any).clearLocalData)
            (window as any).clearLocalData("salas/MODO_TUTORIAL");
    }

    listenToState(): void {
        const ref = (window as any).getDBRef("salas/MODO_TUTORIAL/estadoJogo");
        this.registerListener(ref, "value", (snap: any) => {
            const estado = snap.val();
            if (estado) {
                if (!estado.mesa)
                    estado.mesa = Array(7).fill(null);

                if ((window as any).Renderer && (window as any).Renderer.monitorarTrocas) {
                    (window as any).Renderer.monitorarTrocas(estado);
                }

                if ((window as any).GameController)
                    (window as any).GameController.atualizarEstado(estado);

                if ((window as any).Renderer) {
                    (window as any).Renderer.atualizarInfoSala(this.roomCode || "MODO_TUTORIAL", []);
                }
            }
        });
    }

    canPerformAction(action: any, context?: any): boolean {
        if (!this.tutorialManager)
            return false;
        return this.tutorialManager.verificarAcao(action);
    }

    resolveChallenge(idxDeduzidoOpcional?: number): void {
        const estado = (window as any).estadoJogo;
        if (!estado.desafio)
            return;

        if (idxDeduzidoOpcional !== undefined) {
            estado.desafio.escolhaOponente = idxDeduzidoOpcional;
            estado.desafio.status = "resolvido";
        }

        if (estado.desafio.status !== "resolvido")
            return;

        const desafio = estado.desafio;
        const idxPedra = desafio.idxPedra;
        const idxEscolhida = desafio.escolhaOponente;
        const jogadores = estado.jogadores;

        const idxDesafiante = jogadores.findIndex((j: any) => j.nome === desafio.jogador);
        const idxOponente = (idxDesafiante + 1) % jogadores.length;

        const pedrasOficiais = (window as any).PEDRAS_OFICIAIS || [];
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
            if ((window as any).audioManager)
                (window as any).audioManager.playSuccess();
        } else {
            if ((window as any).audioManager)
                (window as any).audioManager.playFailure();
        }

        estado.vez = idxOponente;
        estado.desafio = null;

        // Persistir e Notificar
        if ((window as any).GameController) {
            (window as any).GameController.persistirEstado();
            (window as any).GameController.notificarAtualizacao();
        }

        if ((window as any).notificationManager)
            (window as any).notificationManager.showInternal("Pedra revelada e pontos computados!");

        if ((window as any).tellstonesTutorial) {
            setTimeout(() => (window as any).tellstonesTutorial.registrarAcaoConcluida(), 500);
        }
    }
}

// Global Export
(window as any).TutorialMode = TutorialMode;
