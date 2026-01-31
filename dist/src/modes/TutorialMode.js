import { GameMode } from "./GameMode.js";
import { EventBus } from '../core/EventBus.js';
import { EventType } from '../core/types/Events.js';
export class TutorialMode extends GameMode {
    constructor() {
        super();
        this.tutorialManager = null;
        this.roomCode = null;
        this.tutorialManager = null;
        this.roomCode = null;
    }
    start(config) {
        super.start(config);
        if (window.mostrarTela) {
            window.mostrarTela('game');
        }
        window.isLocalMode = true;
        window.salaAtual = "MODO_TUTORIAL";
        window.nomeAtual = "Aprendiz";
        if (window.clearLocalData) {
            window.clearLocalData("salas/MODO_TUTORIAL");
        }
        const jogadores = [
            { nome: "Mestre", id: "p2", pontos: 0 },
            { nome: "Aprendiz", id: "p1", pontos: 0 }
        ];
        let estadoInicial = {};
        if (window.GameController) {
            estadoInicial = window.GameController.inicializarJogo(jogadores);
        }
        // Configuração Específica do Tutorial
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
                this.tutorialManager = new window.TellstonesTutorial();
                window.tellstonesTutorial = this.tutorialManager;
                this.tutorialManager.iniciar();
                // v6.0: Emit EventBus events
                EventBus.emit(EventType.TUTORIAL_START, {});
                EventBus.emit(EventType.GAME_START, { mode: 'tutorial' });
            }
        }, 500);
        this.listenToState();
    }
    cleanup() {
        var _a;
        super.cleanup();
        // Emit TUTORIAL_END event
        const tutorialCompleted = ((_a = this.tutorialManager) === null || _a === void 0 ? void 0 : _a.passoAtual) >= 10;
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
        window.tellstonesTutorial = null;
        const tutorialUI = document.getElementById("tutorial-ui");
        if (tutorialUI)
            tutorialUI.remove();
        const ref = window.getDBRef("salas/MODO_TUTORIAL/estadoJogo");
        if (ref && ref.off)
            ref.off();
        if (window.clearLocalData)
            window.clearLocalData("salas/MODO_TUTORIAL");
    }
    listenToState() {
        const ref = window.getDBRef("salas/MODO_TUTORIAL/estadoJogo");
        this.registerListener(ref, "value", (snap) => {
            const estado = snap.val();
            if (estado) {
                if (!estado.mesa)
                    estado.mesa = Array(7).fill(null);
                if (window.Renderer && window.Renderer.monitorarTrocas) {
                    window.Renderer.monitorarTrocas(estado);
                }
                if (window.GameController)
                    window.GameController.atualizarEstado(estado);
                if (window.Renderer) {
                    window.Renderer.atualizarInfoSala(this.roomCode || "MODO_TUTORIAL", []);
                }
            }
        });
    }
    canPerformAction(action, context) {
        if (!this.tutorialManager)
            return false;
        return this.tutorialManager.verificarAcao(action);
    }
    resolveChallenge(idxDeduzidoOpcional) {
        const estado = window.estadoJogo;
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
        const idxDesafiante = jogadores.findIndex((j) => j.nome === desafio.jogador);
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
        }
        else {
            estado.jogadores[idxDesafiante].pontos = (estado.jogadores[idxDesafiante].pontos || 0) + 1;
            vencedor = estado.jogadores[idxDesafiante];
        }
        if (vencedor && vencedor.id === "p1") {
            if (window.audioManager)
                window.audioManager.playSuccess();
        }
        else {
            if (window.audioManager)
                window.audioManager.playFailure();
        }
        estado.vez = idxOponente;
        estado.desafio = null;
        // Persistir e Notificar
        if (window.GameController) {
            window.GameController.persistirEstado();
            window.GameController.notificarAtualizacao();
        }
        if (window.notificationManager)
            window.notificationManager.showInternal("Pedra revelada e pontos computados!");
        if (window.tellstonesTutorial) {
            setTimeout(() => window.tellstonesTutorial.registrarAcaoConcluida(), 500);
        }
    }
}
// Global Export
window.TutorialMode = TutorialMode;
