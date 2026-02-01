// =========================
// RoomManager - Gerenciamento de Salas e Lobby
// =========================

interface RoomManagerInterface {
    lobbyListener: any;
    notificacaoListener: any;
    criarSala(modo: string): string | null;
    entrarSala(codigo: string, nome: string, tipo: string): void;
    limparEstadoLocal(): void;
    sairPartida(): void;
    mostrarLobby(codigo: string, nome: string, criador?: boolean): void;
    _onLobbyUpdate(snapshot: any, codigo: string): void;
    solicitarInicioJogo(codigo: string): void;
    adicionarListenerNotificacoes(codigo: string): void;
    removerListeners(): void;
    _garantirArray(objOuArray: any): any[];
    salvarSessaoLocal(codigo: string, nome: string): void;
    verificarSessaoAtiva(): any;
    tentarReconexao(): boolean | void;
}

declare var safeStorage: Storage;
declare var mostrarTela: (tela: string) => void;
declare var mostrarJogo: (codigo: string, jogadores: any[], espectadores: any[]) => void;
declare var inicializarJogo: (jogadores: any[]) => void;
declare var salvarEstadoJogo: () => void;
declare var hideTooltip: () => void;
declare var gerarCodigoSala: () => string;

const RoomManager: RoomManagerInterface = {
    lobbyListener: null,
    notificacaoListener: null,

    // Cria uma nova sala
    criarSala: function (modo: string) {
        if (typeof (window as any).gerarCodigoSala !== 'function' || typeof (window as any).getDBRef !== 'function') {
            console.error("[RoomManager] Dependências (gerarCodigoSala, getDBRef) não encontradas.");
            return null;
        }

        const codigo = (window as any).gerarCodigoSala();
        const salaRef = (window as any).getDBRef("salas/" + codigo);
        salaRef.set({
            modo: modo,
            jogadores: {},
            espectadores: {},
            status: "lobby",
            criadaEm: Date.now()
        });
        return codigo;
    },

    // Entra em uma sala como jogador ou espectador
    entrarSala: function (codigo: string, nome: string, tipo: string) {
        if (typeof (window as any).getDBRef !== 'function' || typeof safeStorage === 'undefined') {
            console.error("[RoomManager] Dependências (getDBRef, safeStorage) não encontradas.");
            return;
        }

        // Limpeza do estado anterior do jogo
        this.limparEstadoLocal();

        // Inicializa o modo de jogo apropriado
        // Por enquanto, sempre MultiplayerMode, mas preparado para PvE/Tutorial se necessário via arquitetura
        if ((window as any).MultiplayerMode) {
            (window as any).currentGameMode = new (window as any).MultiplayerMode();
            (window as any).currentGameMode.start({
                roomCode: codigo,
                playerName: nome,
                role: tipo
            });
        } else {
            console.error("[RoomManager] MultiplayerMode não encontrado.");
        }

        // Registro de presença no Firebase (Mantido por compatibilidade com legado)
        // Idealmente o MultiplayerMode faria isso, mas mantemos a logica do script.js
        const salaRef = (window as any).getDBRef(
            "salas/" +
            codigo +
            "/" +
            (tipo === "espectador" ? "espectadores" : "jogadores")
        );
        // FIX: Usa o nome como chave para evitar duplicatas ao reconectar
        // const novoRef = salaRef.push(); 
        const novoRef = salaRef.child(nome);
        novoRef.onDisconnect().remove();
        novoRef.set({ nome: nome, timestamp: Date.now() });

        // Persistência local do nome
        safeStorage.setItem("tellstones_playerName", nome);

        // RECONNECTION: Salva sessão atual para recuperação em caso de refresh
        this.salvarSessaoLocal(codigo, nome);

        // Define globais (Legado, removeremos gradualmente)
        (window as any).salaAtual = codigo;
        (window as any).nomeAtual = nome;
        // souCriador é setado no mostrarLobby geralmente, mas aqui não sabemos ainda.
        // O fluxo normal é: CriarSala -> EntrarSala -> MostrarLobby
    },

    // Limpa estado local ao trocar de sala ou sair
    limparEstadoLocal: function () {
        (window as any).estadoJogo = {
            jogadores: [],
            mesa: [],
            reserva: [],
            pedraCentral: null,
            vez: 0,
            alinhamentoFeito: false,
            centralAlinhada: false,
            mesaEspiada: null,
            vencedor: null,
            trocaAnimacao: null
        };

        if ((window as any).currentGameMode) {
            (window as any).currentGameMode.cleanup();
            (window as any).currentGameMode = null;
        }

        // Limpa Globais de UI
        (window as any).animacaoAlinhamentoEmAndamento = false;
        (window as any).animouReservaCircular = false;
        (window as any).ultimoCaraCoroaData = null;

        // Limpa UI do DOM
        if ((window as any).tellstonesTutorial && (window as any).tellstonesTutorial.cleanup) {
            (window as any).tellstonesTutorial.cleanup();
        }
        const tutorialUI = document.getElementById("tutorial-ui");
        if (tutorialUI) tutorialUI.remove();

        const circle = document.getElementById("circle-pedras");
        if (circle) circle.innerHTML = "";

        const tabCenter = document.getElementById("tabuleiro-center");
        if (tabCenter) {
            const pedras = tabCenter.querySelectorAll(".pedra-mesa");
            pedras.forEach(p => p.remove());
        }
    },

    // Sai da partida atual e volta para a tela inicial
    sairPartida: function () {
        if ((window as any).notificationManager) (window as any).notificationManager.clear();
        if (typeof hideTooltip === "function") hideTooltip();
        if ((window as any).Renderer && (window as any).Renderer.limparFalaBot) (window as any).Renderer.limparFalaBot();

        this.limparEstadoLocal();

        // Remove listeners
        this.removerListeners();

        // Limpa Globais de Sessão
        (window as any).salaAtual = null;
        (window as any).nomeAtual = null;
        (window as any).souCriador = false;
        (window as any).isLocalMode = false;
        (window as any).jaEntrouNoGame = false;

        // UI Cleanup Specific
        const toast = document.getElementById("toast");
        if (toast) { toast.style.display = "none"; toast.style.opacity = "0"; }

        const toastInt = document.getElementById("toast-interno");
        if (toastInt) { toastInt.classList.remove("mostrar"); toastInt.style.display = "none"; }

        if (typeof mostrarTela === "function") mostrarTela("start-screen");

        // UX Cleanups
        const roomInput: any = document.getElementById("room-code");
        if (roomInput) roomInput.value = "";

        const roomDisplayCreated = document.getElementById("codigo-sala-criada");
        if (roomDisplayCreated) roomDisplayCreated.innerText = "";

        // RECONNECTION: Limpa sessão salva pois o usuário saiu intencionalmente
        if (typeof safeStorage !== 'undefined') {
            safeStorage.removeItem("tellstones_active_session");
        }

        // Expandir Ko-fi automaticamente
        setTimeout(() => {
            const kofiElements: any = document.querySelectorAll('.floatingchat-donate-button, [id*="kofi-widget-overlay"]');
            kofiElements.forEach((el: any) => {
                if (el && el.click) el.click();
            });
        }, 1200);
    },

    // Mostra o Lobby e inicia listeners de atualização
    mostrarLobby: function (codigo: string, nome: string, criador: boolean = false) {
        (window as any).salaAtual = codigo;
        (window as any).nomeAtual = nome;
        (window as any).souCriador = criador;

        this.adicionarListenerNotificacoes(codigo);

        // Carrega estado anterior se houver (Reconnection check)
        (window as any).getDBRef("salas/" + codigo + "/estadoJogo").once("value", function (snapshot: any) {
            if (snapshot.exists()) {
                (window as any).mesaAnterior = RoomManager._garantirArray(snapshot.val().mesa);
            } else {
                (window as any).mesaAnterior = Array(7).fill(null);
            }
        });

        if (typeof mostrarTela === "function") mostrarTela("lobby");

        const elLobbyCodigo = document.getElementById("lobby-codigo");
        if (elLobbyCodigo) elLobbyCodigo.innerText = "Código da sala: " + codigo;

        const elBtnIniciar = document.getElementById("lobby-iniciar");
        if (elBtnIniciar) {
            elBtnIniciar.style.display = criador ? "inline-block" : "none";
            // Remove previous listener to avoid duplicated clicks
            const newBtn = elBtnIniciar.cloneNode(true) as HTMLElement;
            if (elBtnIniciar.parentNode) elBtnIniciar.parentNode.replaceChild(newBtn, elBtnIniciar);

            newBtn.onclick = () => this.solicitarInicioJogo(codigo);
        }

        // Listener Principal da Sala
        if (this.lobbyListener) {
            this.lobbyListener.off();
        }
        this.lobbyListener = (window as any).getDBRef("salas/" + codigo);
        this.lobbyListener.on("value", (snapshot: any) => this._onLobbyUpdate(snapshot, codigo));
    },

    // Lógica privada de atualização do Lobby
    _onLobbyUpdate: function (snapshot: any, codigo: string) {
        const sala = snapshot.val();
        if (!sala) return;

        // Atualiza Listas UI
        const jogadores = sala.jogadores ? Object.values(sala.jogadores) : [];
        const espectadores = sala.espectadores ? Object.values(sala.espectadores) : [];

        const elJogadores = document.getElementById("lobby-jogadores");
        if (elJogadores) elJogadores.innerHTML = jogadores.map((j: any) => `<li>${j.nome}</li>`).join("");

        const elEspectadores = document.getElementById("lobby-espectadores");
        if (elEspectadores) elEspectadores.innerHTML = espectadores.map((e: any) => `<li>${e.nome}</li>`).join("");

        // Notificações de Entrada (Simples check vs ultimo estado global)
        // Nota: Para simplificar, estamos removendo a logica complexa de 'ultimosJogadores' aqui 
        // e deixando o NotificationManager lidar apenas com eventos explícitos do backend se possível,
        // mas mantendo o básico para feedback visual.
        // TODO: Migrar lógica de 'ultimosJogadores' global para dentro do RoomManager se necessária.

        // Notificação de Início
        if (sala.notificacao) {
            if ((window as any).notificationManager) (window as any).notificationManager.showGlobal(sala.notificacao);
            (window as any).getDBRef("salas/" + codigo + "/notificacao").remove();
        }

        // Redirecionamento para o Jogo
        if (sala.status === "jogo") {
            // Chama função global legada ou nova do Controller
            if (typeof mostrarJogo === "function") mostrarJogo(codigo, jogadores, espectadores);
        }
    },

    // Solicita ao backend (via Firebase) para iniciar o jogo
    solicitarInicioJogo: function (codigo: string) {
        if ((window as any).audioManager) (window as any).audioManager.playPress();

        (window as any).getDBRef("salas/" + codigo).once("value", (snapshot: any) => {
            const sala = snapshot.val();
            const jogadores = sala && sala.jogadores ? Object.values(sala.jogadores) : [];
            const modo = sala && sala.modo ? sala.modo : "1x1";

            // Validação de Players
            if ((modo === "1x1" && jogadores.length !== 2) || (modo === "2x2" && jogadores.length !== 4)) {
                if ((window as any).notificationManager) (window as any).notificationManager.showGlobal("Número de jogadores incorreto para o modo selecionado!");
                return;
            }

            // Limpezas pré-jogo
            const updates: any = {};
            updates["salas/" + codigo + "/estadoJogo/vencedor"] = null;
            updates["salas/" + codigo + "/caraCoroa"] = null;
            updates["salas/" + codigo + "/estadoJogo/centralAlinhada"] = null;
            updates["salas/" + codigo + "/estadoJogo/alinhamentoFeito"] = null;
            updates["salas/" + codigo + "/estadoJogo/mesaEspiada"] = null;
            updates["salas/" + codigo + "/estadoJogo/desafio"] = null;
            updates["salas/" + codigo + "/notificacao"] = "A partida irá começar!";

            (window as any).getDBRef().update(updates).then(() => {
                // UI Cleanups
                const moedaBtn: any = document.getElementById("moeda-btn");
                if (moedaBtn) {
                    moedaBtn.style.display = "block";
                    moedaBtn.disabled = false;
                }

                // Delay para start
                setTimeout(() => {
                    try {
                        // Inicializa Logica de Estado
                        if ((window as any).GameController) {
                            if (!(window as any).PEDRAS_OFICIAIS) throw new Error("PEDRAS_OFICIAIS não definidas!");
                            const novoEstado = (window as any).GameController.inicializarJogo(jogadores);
                            // Salva estado inicial
                            if (novoEstado) {
                                (window as any).getDBRef("salas/" + codigo + "/estadoJogo").set(novoEstado);
                            } else {
                                throw new Error("Falha ao gerar estado inicial do jogo.");
                            }
                        } else if (typeof inicializarJogo === 'function') {
                            inicializarJogo(jogadores); // Legacy Fallback
                            if (typeof salvarEstadoJogo === 'function') salvarEstadoJogo();
                        } else {
                            throw new Error("GameController e inicializarJogo não encontrados.");
                        }

                        // Muda status da sala para startar clients
                        (window as any).getDBRef("salas/" + codigo + "/status").set("jogo");
                        if ((window as any).notificationManager) (window as any).notificationManager.showGlobal("Jogo iniciado!");
                        if ((window as any).AnalyticsManager) (window as any).AnalyticsManager.logGameStart("multiplayer", codigo, jogadores.length);

                    } catch (err: any) {
                        console.error("[RoomManager] Erro ao iniciar jogo:", err);
                        if ((window as any).notificationManager) (window as any).notificationManager.showGlobal("Erro ao iniciar: " + err.message);
                    }

                }, 600);
            });
        });
    },

    adicionarListenerNotificacoes: function (codigo: string) {
        if (this.notificacaoListener && this.notificacaoListener.sala === codigo) return;
        if (this.notificacaoListener) this.notificacaoListener.off();

        this.notificacaoListener = (window as any).getDBRef("salas/" + codigo + "/notificacoes");
        this.notificacaoListener.sala = codigo;

        this.notificacaoListener.on("child_added", (snap: any) => {
            const val = snap.val();
            let msg = val;
            if (typeof val === "object" && val !== null) {
                if (val.skip && val.skip === (window as any).nomeAtual) {
                    snap.ref.remove();
                    return;
                }
                msg = val.msg;
            }
            if (msg) {
                if ((window as any).notificationManager) (window as any).notificationManager.showGlobal(msg);
                snap.ref.remove();
            }
        });
    },

    removerListeners: function () {
        if (this.lobbyListener) {
            this.lobbyListener.off();
            this.lobbyListener = null;
        }
        if (this.notificacaoListener) {
            this.notificacaoListener.off();
            this.notificacaoListener = null;
        }
        if (typeof (window as any).getDBRef === 'function') (window as any).getDBRef().off();
    },

    // Utils Internos
    _garantirArray: function (objOuArray: any) {
        if (Array.isArray(objOuArray)) return objOuArray;
        if (typeof objOuArray === "object" && objOuArray !== null) {
            const arr = Array(7).fill(null);
            Object.keys(objOuArray).forEach((k) => {
                const idx = parseInt(k, 10);
                if (!isNaN(idx) && idx >= 0 && idx < 7) {
                    arr[idx] = objOuArray[k];
                }
            });
            return arr;
        }
        return [];
    }
    ,

    // --- RECONNECTION LOGIC ---

    salvarSessaoLocal: function (codigo: string, nome: string) {
        if (typeof safeStorage === 'undefined') return;
        const session = {
            roomId: codigo,
            playerName: nome,
            timestamp: Date.now()
        };
        safeStorage.setItem("tellstones_active_session", JSON.stringify(session));
        console.log("[RoomManager] Sessão SALVA localmente:", session);
        if ((window as any).Logger) (window as any).Logger.debug("RoomManager", "Sessão salva para reconexão:", session);
    },

    verificarSessaoAtiva: function () {
        if (typeof safeStorage === 'undefined') return null;
        const raw = safeStorage.getItem("tellstones_active_session");
        if (!raw) return null;
        try {
            const session = JSON.parse(raw);
            // Expira em 1 hora (3600000 ms) para evitar stale state muito antigo
            if (Date.now() - session.timestamp > 3600000) {
                console.log("[RoomManager] Sessão expirada.");
                safeStorage.removeItem("tellstones_active_session");
                return null;
            }
            return session;
        } catch (e) {
            console.error("[RoomManager] Erro ao ler sessão:", e);
            return null;
        }
    },

    tentarReconexao: function () {
        console.log("[RoomManager] tentarReconexao chamado.");
        const session = this.verificarSessaoAtiva();
        if (session) {
            console.log("[RoomManager] Sessão válida encontrada:", session);
            if ((window as any).Logger) (window as any).Logger.info("RoomManager", "Tentando reconectar...", session);

            // Verifica se a sala ainda existe antes de conectar cegamente
            if (typeof (window as any).getDBRef !== 'function') {
                console.error("[RoomManager] getDBRef indefinido!");
                return false;
            }

            (window as any).getDBRef("salas/" + session.roomId).once("value", (snap: any) => {
                if (snap.exists()) {
                    console.log("[RoomManager] Sala verificada no Firebase. Reconectando...");
                    if ((window as any).notificationManager) (window as any).notificationManager.showGlobal("Reconectando à sessão anterior...");
                    this.entrarSala(session.roomId, session.playerName, "jogador"); // Assume jogador por padrão
                    this.mostrarLobby(session.roomId, session.playerName, false); // Não sabemos se é criador, assume false, firebase ajusta permissões se necessário
                } else {
                    console.log("[RoomManager] Sala não existe. Sessão descartada.");
                    // Sala morreu, limpa sessão
                    safeStorage.removeItem("tellstones_active_session");
                }
            });
            return true;
        } else {
            console.log("[RoomManager] Nenhuma sessão ativa.");
        }
    }
};

(window as any).RoomManager = RoomManager;
