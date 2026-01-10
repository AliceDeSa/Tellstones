// ================= INÍCIO DO SCRIPT PRINCIPAL =================

// =========================
// 1. Configuração Firebase
// =========================

// =========================
// LocalDB - Abstração para Modo Offline (Tutorial/PvE)
// =========================
let isLocalMode = false;
let localData = {};
let tellstonesBot = null;

let localListeners = {}; // NEW: Global listener registry

class LocalRef {
  constructor(path) {
    this.path = path;
  }
  set(val) {
    console.log(`[LocalDB SET] ${this.path}`, val);
    this._setVal(val);
    this._trigger("value");
  }
  update(val) {
    console.log(`[LocalDB UPDATE] ${this.path}`, val);
    let current = this._getVal() || {};
    Object.assign(current, val);
    this._setVal(current);
    this._trigger("value");
  }
  remove() {
    console.log(`[LocalDB REMOVE] ${this.path}`);
    this._setVal(null);
    this._trigger("value");
  }
  push() {
    const id = "local_" + Math.random().toString(36).substring(2, 7);
    return new LocalRef(this.path + "/" + id);
  }
  on(event, callback) {
    if (!localListeners[this.path]) localListeners[this.path] = [];
    localListeners[this.path].push({ event, callback });
    // Trigger immediately for 'on'
    this.once(event, callback);
  }
  off() {
    // Simple implementation: remove all listeners for this path (for tutorial purposes)
    // In a real app we might want to remove only specific callbacks
    localListeners[this.path] = [];
  }
  once(event, callback) {
    const val = this._getVal();
    callback({
      val: () => val,
      exists: () => val !== null && val !== undefined,
      ref: this
    });
  }
  transaction(updateFn, onComplete) {
    const current = this._getVal();
    const newVal = updateFn(current);
    if (newVal !== undefined) {
      this.set(newVal);
      if (onComplete) onComplete(null, true, { val: () => newVal });
    } else {
      if (onComplete) onComplete(null, false, null);
    }
  }
  _getVal() {
    const parts = this.path.split("/").filter(p => p);
    let curr = localData;
    for (const p of parts) {
      if (!curr) return null;
      curr = curr[p];
    }
    return curr === undefined ? null : curr;
  }
  _setVal(val) {
    const parts = this.path.split("/").filter(p => p);
    let curr = localData;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!curr[parts[i]]) curr[parts[i]] = {};
      curr = curr[parts[i]];
    }
    if (parts.length > 0) {
      curr[parts[parts.length - 1]] = val;
    } else {
      localData = val;
    }
  }
  _trigger(event) {
    // Implementar bubbling simplificado: notificar listeners do path atual e de todos os pais
    // Ex: "salas/TUTORIAL/estadoJogo/desafio" -> notifica "salas/TUTORIAL/estadoJogo" -> "salas/TUTORIAL" ...
    const parts = this.path.split("/");
    let currentPath = "";

    // Lista de paths para notificar (do raiz até o atual)
    const pathsToNotify = [];
    parts.forEach(p => {
      if (currentPath) currentPath += "/";
      currentPath += p;
      pathsToNotify.push(currentPath);
    });
    // Adiciona bubbling reverso (opcional, mas aqui queremos notificar PAIS sobre mudanças em FILHOS)
    // O listener está em 'salas/MODO_TUTORIAL/estadoJogo', e o update pode ser lá ou em filhos.

    // Iterar paths
    console.log(`[LocalDB TRIGGER] Disparando '${event}' para paths:`, pathsToNotify);
    pathsToNotify.forEach(notifyPath => {
      if (localListeners[notifyPath]) {
        console.log(`[LocalDB TRIGGER] Notificando update em: ${notifyPath}, Listeners: ${localListeners[notifyPath].length}`);
        const ref = new LocalRef(notifyPath);
        const val = ref._getVal();
        localListeners[notifyPath].forEach(l => {
          if (l.event === event) {
            try {
              l.callback({
                val: () => val,
                exists: () => val !== null && val !== undefined,
                ref: ref,
                key: notifyPath.split("/").pop()
              });
            } catch (err) {
              console.error(`[LocalDB ERROR] Erro no listener de ${notifyPath}:`, err);
            }
          }
        });
      }
    });
  }
}

function getDBRef(path) {
  if (isLocalMode) {
    return new LocalRef(path);
  }
  return db.ref(path);
}

// Configuração do Firebase para conexão com o banco de dados em tempo real
const firebaseConfig = {
  apiKey: "AIzaSyBsXOj779DLtaL1cC0uxoRp_OmnMzj703c",
  authDomain: "tellstones-alice.firebaseapp.com",
  databaseURL: "https://tellstones-alice-default-rtdb.firebaseio.com",
  projectId: "tellstones-alice",
  storageBucket: "tellstones-alice.firebasestorage.app",
  messagingSenderId: "357049051853",
  appId: "1:357049051853:web:90abf9a1925fb7e9d79784",
  measurementId: "G-QK5X0YDD54"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// =========================
// 2. Utilidades Gerais
// =========================

// Gera um código aleatório para a sala (6 caracteres, letras e números)
function gerarCodigoSala() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Exibe um toast simples na tela (mensagem temporária)
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.innerHTML = msg;
  toast.style.display = "block";
  toast.style.opacity = "1";
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => {
      toast.style.display = "none";
    }, 400);
  }, 4000);
}

// Função auxiliar para tocar som de click
function tocarSomClick() {
  const audio = document.getElementById("som-click");
  if (audio) {
    audio.currentTime = 0; // Reinicia o som se já estiver tocando
    audio.play().catch(e => console.warn("Erro ao tocar som de click:", e));
  }
}

// Exibe um toast interno (mensagem temporária dentro do jogo)
function showToastInterno(msg) {
  const toast = document.getElementById("toast-interno");
  toast.innerHTML = msg;
  toast.classList.add("mostrar");
  setTimeout(() => {
    toast.classList.remove("mostrar");
  }, 2200);
}

// =========================
// 3. Lógica de Lobby e Salas
// =========================

// Cria uma nova sala no Firebase com o modo selecionado
function criarSala(modo) {
  const codigo = gerarCodigoSala();
  const salaRef = getDBRef("salas/" + codigo);
  salaRef.set({
    modo: modo,
    jogadores: {},
    espectadores: {},
    status: "lobby",
    criadaEm: Date.now()
  });
  return codigo;
}

// Entra em uma sala como jogador ou espectador
function entrarSala(codigo, nome, tipo) {
  const salaRef = getDBRef(
    "salas/" +
    codigo +
    "/" +
    (tipo === "espectador" ? "espectadores" : "jogadores")
  );
  const novoRef = salaRef.push();
  novoRef.set({ nome: nome });
}

// Função auxiliar para tocar som de press (botões da UI)
function tocarSomPress() {
  const audio = document.getElementById("som-press");
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(e => console.warn("Erro ao tocar som de press:", e));
  }
}

// Alterna entre as telas principais do app
function mostrarTela(tela) {
  document.getElementById("start-screen").classList.remove("active");
  document.getElementById("lobby").classList.remove("active");
  document.getElementById("game").classList.remove("active");
  document.getElementById(tela).classList.add("active");
  // Som de fundo (Regra: Tocar no Menu/Lobby, Parar no Jogo)
  const somFundo = document.getElementById("som-fundo");
  const creditosSom = document.getElementById("creditos-som");
  const placarTurno = document.getElementById("placar-turno-central");
  const btnMute = document.getElementById("btn-mute-global");

  if (tela === "start-screen" || tela === "lobby") {
    if (somFundo && !window.isMuted) {
      somFundo.volume = 0.5;
      somFundo.play().catch(() => { });
    }
    if (creditosSom) creditosSom.style.display = "";
    if (placarTurno) placarTurno.style.display = "none";
    if (btnMute) btnMute.style.display = "flex"; // Mostrar botão mute
  } else {
    // Tela de Jogo ou outras: Parar música
    if (somFundo) somFundo.pause();
    if (creditosSom) creditosSom.style.display = "none";
    if (placarTurno) placarTurno.style.display = "";
    if (btnMute) btnMute.style.display = "none"; // Esconder botão mute no jogo
  }
  // Ocultar/mostrar Ko-fi conforme a tela
  const kofiBtn = document.querySelector('.floatingchat-donate-button') || document.querySelector('.floatingchat-container-wrap');
  if (kofiBtn) {
    if (tela === "game") {
      kofiBtn.style.display = "none";
    } else {
      kofiBtn.style.display = "flex";
    }
  }

  // CLEANUP UI SEGABAR: Se sair da tela de jogo, remove o container de escolha de pedras
  if (tela !== "game") {
    const segabarContainer = document.getElementById("opcoes-resposta-segabar");
    if (segabarContainer) {
      segabarContainer.remove();
    }
  }
}

// ==== FUNÇÃO SAIR PARTIDA (GLOBAL) ====
function sairPartida() {
  // 1. Limpa listeners do Firebase
  if (window.salaAtual) {
    getDBRef("salas/" + window.salaAtual).off();
    getDBRef("salas/" + window.salaAtual + "/estadoJogo").off();
  }

  // 2. Reseta estado local
  window.salaAtual = null;
  window.jogador = null;
  window.estadoJogo = null;
  window.jaEntrouNoGame = false;
  window.selecionandoDesafio = false;
  window.tutorialBoastIniciado = false;
  window.step7BotDoubtsTriggered = false;

  // 3. Limpa UI
  if (document.getElementById("opcoes-resposta-segabar")) {
    document.getElementById("opcoes-resposta-segabar").remove();
  }
  if (document.getElementById("opcoes-desafio")) {
    document.getElementById("opcoes-desafio").remove();
  }

  // 4. Se for tutorial, finaliza
  if (window.tellstonesTutorial) {
    if (window.tellstonesTutorial.overlay) window.tellstonesTutorial.overlay.remove();
    window.tellstonesTutorial = null;
  }

  // 5. Volta para tela inicial
  mostrarTela("start-screen");
}

// Função para adicionar listener de notificações globais por sala
function adicionarListenerNotificacoes() {
  if (
    window.notificacaoListener &&
    window.notificacaoListener.sala === salaAtual
  ) {
    return;
  }
  if (window.notificacaoListener) {
    window.notificacaoListener.off();
  }
  window.notificacaoListener = getDBRef("salas/" + salaAtual + "/notificacoes");
  window.notificacaoListener.sala = salaAtual;
  window.notificacaoListener.on("child_added", function (snap) {
    const val = snap.val();
    let msg = val;
    if (typeof val === "object" && val !== null) {
      if (val.skip && val.skip === nomeAtual) {
        snap.ref.remove();
        return;
      }
      msg = val.msg;
    }
    if (msg) {
      showToast(msg);
      snap.ref.remove();
    }
  });
}

// Mostra o lobby da sala e atualiza lista de jogadores/espectadores em tempo real
function mostrarLobby(codigo, nome, criador = false) {
  salaAtual = codigo;
  nomeAtual = nome;
  souCriador = criador;
  adicionarListenerNotificacoes();
  getDBRef("salas/" + codigo + "/estadoJogo").once("value", function (snapshot) {
    if (snapshot.exists()) {
      mesaAnterior = garantirArray(snapshot.val().mesa);
    } else {
      mesaAnterior = Array(7).fill(null);
    }
  });
  mostrarTela("lobby");
  document.getElementById("lobby-codigo").innerText =
    "Código da sala: " + codigo;
  document.getElementById("lobby-iniciar").style.display = criador
    ? "inline-block"
    : "none";

  // Adiciona o evento do botão de iniciar jogo SEMPRE que mostrar o lobby
  const btnIniciar = document.getElementById("lobby-iniciar");
  if (btnIniciar) {
    btnIniciar.onclick = function () {
      tocarSomPress();
      // Buscar o modo da sala
      getDBRef("salas/" + codigo).once("value", function (snapshot) {
        const sala = snapshot.val();
        const jogadores =
          sala && sala.jogadores ? Object.values(sala.jogadores) : [];
        const modo = sala && sala.modo ? sala.modo : "1x1";
        if (
          (modo === "1x1" && jogadores.length !== 2) ||
          (modo === "2x2" && jogadores.length !== 4)
        ) {
          showToast("Número de jogadores incorreto para o modo selecionado!");
          return;
        }
        // Limpa campos de vencedor e sorteio da moeda antes de iniciar novo jogo
        getDBRef("salas/" + codigo + "/estadoJogo/vencedor").remove();
        getDBRef("salas/" + codigo + "/caraCoroa").remove();
        getDBRef("salas/" + codigo + "/estadoJogo/centralAlinhada").remove();
        getDBRef("salas/" + codigo + "/estadoJogo/alinhamentoFeito").remove();
        getDBRef("salas/" + codigo + "/estadoJogo/mesaEspiada").remove();
        getDBRef("salas/" + codigo + "/estadoJogo/desafio").remove();
        // Garante que o botão da moeda será exibido ao iniciar o jogo
        const moedaBtn = document.getElementById("moeda-btn");
        if (moedaBtn) {
          moedaBtn.style.display = "block";
          moedaBtn.disabled = false;
        }
        getDBRef("salas/" + codigo + "/notificacao").set(
          "A partida irá começar!"
        );
        setTimeout(() => {
          // Inicializa o estado do jogo ANTES de mudar o status para 'jogo'
          getDBRef("salas/" + codigo).once("value", function (snapshot) {
            const sala = snapshot.val();
            const jogadores =
              sala && sala.jogadores ? Object.values(sala.jogadores) : [];
            inicializarJogo(jogadores);
            salvarEstadoJogo();
            getDBRef("salas/" + codigo + "/status").set("jogo");
            showToast("Jogo iniciado!");
          });
        }, 600);
      });
    };
  }

  // Remove listener antigo se existir
  if (window.lobbyListener) {
    window.lobbyListener.off();
  }
  window.lobbyListener = getDBRef("salas/" + codigo);
  window.lobbyListener.on("value", function (snapshot) {
    const sala = snapshot.val();
    // Jogadores
    const jogadores =
      sala && sala.jogadores ? Object.values(sala.jogadores) : [];
    document.getElementById("lobby-jogadores").innerHTML = jogadores
      .map((j) => `<li>${j.nome}</li>`)
      .join("");
    // Espectadores
    const espectadores =
      sala && sala.espectadores ? Object.values(sala.espectadores) : [];
    document.getElementById("lobby-espectadores").innerHTML = espectadores
      .map((e) => `<li>${e.nome}</li>`)
      .join("");
    // Notificação de novo jogador
    jogadores.forEach((j) => {
      if (
        !ultimosJogadores.some((u) => u.nome === j.nome) &&
        j.nome !== nomeAtual
      ) {
        showToast(`${j.nome} entrou como jogador!`);
      }
    });
    ultimosJogadores = jogadores;
    // Notificação de novo espectador
    espectadores.forEach((e) => {
      if (
        !ultimosEspectadores.some((u) => u.nome === e.nome) &&
        e.nome !== nomeAtual
      ) {
        showToast(`${e.nome} entrou como espectador!`);
      }
    });
    ultimosEspectadores = espectadores;
    // Notificação de início de partida
    if (sala && sala.notificacao) {
      showToast(sala.notificacao);
      getDBRef("salas/" + codigo + "/notificacao").remove();
    }
    // Se status mudar para jogo, mostrar tela do jogo
    if (sala && sala.status === "jogo") {
      mostrarJogo(codigo, jogadores, espectadores);
    }
  });
}

// =========================
// 4. Estado e Inicialização do Jogo
// =========================

// Variáveis globais para controle da sala e do usuário atual
let salaAtual = null;
let nomeAtual = null;
let souCriador = false;
let ultimosJogadores = [];
let ultimosEspectadores = [];
// Estado anterior da mesa para detectar mudanças
let mesaAnterior = null;

// Estado principal do jogo, controlando jogadores, pedras e turno
let estadoJogo = {
  jogadores: [], // [{nome, pontos, id}]
  mesa: [], // [{nome, url, virada: false}]
  reserva: [], // pedras restantes do jogador atual
  pedraCentral: null, // pedra central do jogo
  vez: 0, // índice do jogador da vez
  alinhamentoFeito: false, // NOVO: indica se o alinhamento vertical foi feito
  centralAlinhada: false, // NOVO: indica se a pedra central já foi alinhada
  mesaEspiada: null, // NOVO: índice da pedra espiada
  vencedor: null, // NOVO: campo para armazenar o vencedor
  trocaAnimacao: null // NOVO: campo para armazenar a última animação executada
};

// Salva o estado do jogo no Firebase
function salvarEstadoJogo() {
  if (!salaAtual) return;
  getDBRef("salas/" + salaAtual + "/estadoJogo").set(estadoJogo);
  window.estadoJogo = estadoJogo;
  if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
}

// Ouve o estado do jogo no Firebase e atualiza a interface
// Garante que o valor seja um array (Firebase pode converter para objeto)
function garantirArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.values(val);
}

function ouvirEstadoJogo() {
  if (!salaAtual) return;
  getDBRef("salas/" + salaAtual + "/estadoJogo").on("value", function (snapshot) {
    if (!snapshot.exists()) {
      return;
    }
    const novaMesa = garantirArray(snapshot.val().mesa);
    estadoJogo = snapshot.val();
    estadoJogo.mesa = garantirArray(estadoJogo.mesa);
    estadoJogo.reserva = garantirArray(estadoJogo.reserva);
    if (
      typeof estadoJogo.mesaEspiada !== "undefined" &&
      estadoJogo.mesaEspiada !== null
    ) {
      adicionarSilhuetaEspiada(estadoJogo.mesaEspiada);
    }
    renderizarMesa();
    // Garante alinhamento vertical para todos após alinhamento
    if (estadoJogo.alinhamentoFeito) {
      window.animouReservaCircular = false;
    }
    renderizarPedrasReserva();
    atualizarInfoSala(salaAtual, ultimosEspectadores);
    getDBRef("salas/" + salaAtual + "/caraCoroa").once(
      "value",
      function (snapRes) {
        const data = snapRes.val();
        if (!estadoJogo.centralAlinhada && data && data.sorteioFinalizado) {
          sincronizarPedraCentralEAlinhamento();
        }
      }
    );
    mesaAnterior = [...novaMesa];
    // NOVO: Garante animação de alinhamento para todos
    if (estadoJogo.centralAlinhada && !window.alinhamentoAnimado) {
      window.alinhamentoAnimado = true;
      sincronizarPedraCentralEAlinhamento();
    }
    // Se resetar a sala, reseta o flag
    if (!estadoJogo.centralAlinhada) {
      window.alinhamentoAnimado = false;
    }
    // SWAP LOGIC MOVED INSIDE LISTENER
    const troca = estadoJogo.trocaAnimacao;

    if (
      troca &&
      (!ultimoTrocaAnimacao || ultimoTrocaAnimacao.timestamp !== troca.timestamp)
    ) {
      ultimoTrocaAnimacao = troca;
      // Executa animação localmente
      animarTrocaCircular(troca.from, troca.to, function () {
        // Após a animação, apenas o jogador que iniciou faz a troca real no Firebase
        // No modo correio/tutorial (isLocalMode), sempre executa
        if (nomeAtual === troca.jogador || isLocalMode) {
          // Troca as peças no array
          const novaMesa = [...estadoJogo.mesa];
          const temp = novaMesa[troca.from];
          novaMesa[troca.from] = novaMesa[troca.to];
          novaMesa[troca.to] = temp;
          // Calcula o novo turno
          let novoVez = estadoJogo.vez;
          if (estadoJogo.jogadores.length === 2) {
            novoVez = (estadoJogo.vez + 1) % 2;
          } else if (estadoJogo.jogadores.length === 4) {
            novoVez = (estadoJogo.vez + 1) % 2;
          }
          getDBRef("salas/" + salaAtual + "/estadoJogo").update({
            mesa: novaMesa,
            trocaAnimacao: null,
            vez: novoVez
          });
        }
        showToastInterno("Pedras trocadas!");
      });
    }

    // Garante layout vertical para todos após alinhamento, mesmo se não animou
    if (estadoJogo.centralAlinhada && estadoJogo.alinhamentoFeito) {
      window.animouReservaCircular = false;
      renderizarPedrasReserva();
    }

    window.estadoJogo = estadoJogo;
    if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
  });
  getDBRef("salas/" + salaAtual + "/caraCoroa/sorteioFinalizado").once(
    "value",
    function (snap) {
      if ((!snap.exists() || !snap.val()) && !estadoJogo.centralAlinhada) {
        mostrarEscolhaCaraCoroa();
        ouvirCaraCoroa();
      } else {
        const escolhaDiv = document.getElementById("escolha-cara-coroa");
        if (escolhaDiv) escolhaDiv.style.display = "none";
      }
    }
  );
}

// Corrigir inicializarJogo para NÃO colocar a pedra central na mesa antes do sorteio
function inicializarJogo(jogadores) {
  window.animouReservaCircular = false;
  const pedrasOficiais = [
    {
      nome: "Coroa",
      url: "https://github.com/AliceDeSa/Tellstones/raw/main/Coroa.svg"
    },
    {
      nome: "Espada",
      url: "https://github.com/AliceDeSa/Tellstones/raw/main/espada.svg"
    },
    {
      nome: "Balança",
      url: "https://github.com/AliceDeSa/Tellstones/raw/main/Balança.svg"
    },
    {
      nome: "Cavalo",
      url: "https://github.com/AliceDeSa/Tellstones/raw/main/cavalo.svg"
    },
    {
      nome: "Escudo",
      url: "https://github.com/AliceDeSa/Tellstones/raw/main/escudo.svg"
    },
    {
      nome: "Bandeira",
      url: "https://github.com/AliceDeSa/Tellstones/raw/main/bandeira.svg"
    },
    {
      nome: "Martelo",
      url: "https://github.com/AliceDeSa/Tellstones/raw/main/martelo.svg"
    }
  ];
  // Embaralhar as pedras da reserva a cada partida
  const pedrasEmbaralhadas = pedrasOficiais
    .slice()
    .sort(() => Math.random() - 0.5);
  const pedraCentral = pedrasEmbaralhadas.shift();
  // Inicializar estado customizado
  estadoJogo = {
    jogadores: jogadores.map((j) => ({
      nome: j.nome,
      pontos: 0,
      id: j.id || j.nome
    })),
    mesa: Array(7).fill(null), // sem pedra central ainda
    reserva: pedrasEmbaralhadas,
    pedraCentral: { ...pedraCentral, virada: false },
    vez: 1, // Começa com o jogador (Aprendiz, index 1)
    alinhamentoFeito: false,
    centralAlinhada: false,
    mesaEspiada: null,
    vencedor: null,
    trocaAnimacao: null
  };
}

// =========================
// 5. Renderização de UI
// =========================

// Adiciona slots fixos proporcionais no tabuleiro
function desenharSlotsFixos() {
  const wrapper = document.getElementById("tabuleiro-wrapper");
  if (!wrapper) return;
  // Remove slots antigos, se existirem
  const antigos = wrapper.querySelectorAll(".slot-fixo");
  antigos.forEach((el) => el.remove());
  const positions = getSlotPositions(wrapper, 7, 68.39, 40);
  for (let i = 0; i < 7; i++) {
    const slot = document.createElement("div");
    slot.className = "slot-fixo";
    slot.setAttribute("data-slot", i);
    slot.style.position = "absolute";
    slot.style.width = "68.39px";
    slot.style.height = "68.39px";
    slot.style.left = positions[i].left + "px";
    slot.style.top = positions[i].top + "px";
    slot.style.transform = "translate(-50%, -50%)";
    slot.style.border = "none";
    slot.style.background = "transparent";
    // slot.innerText = i+1; // Se quiser numerar as posições
    wrapper.appendChild(slot);
  }
}

// Renderiza a imagem do tabuleiro na tela
function renderizarMesa() {
  if (window.animacaoTrocaEmAndamento) return;
  // Garante que a mesa sempre tenha 7 slots e é array
  estadoJogo.mesa = garantirArray(estadoJogo.mesa);
  if (estadoJogo.mesa.length !== 7) {
    const novaMesa = Array(7).fill(null);
    // Se vier como array de 1 elemento, mas a pedra tem que ir para o centro
    if (
      estadoJogo.mesa.length === 1 &&
      estadoJogo.mesa[0] &&
      estadoJogo.centralAlinhada
    ) {
      novaMesa[3] = estadoJogo.mesa[0];
    } else {
      estadoJogo.mesa.forEach((p, i) => {
        if (p) novaMesa[i] = p;
      });
    }
    estadoJogo.mesa = novaMesa;
  }
  renderizarPedrasMesa(estadoJogo.mesa);
  desenharSlotsFixos(); // Adiciona os slots fixos ao tabuleiro
}

// Atualiza informações da sala, espectadores, placar e turno no topo da tela
function atualizarInfoSala(codigo, espectadores) {
  document.getElementById("codigo-sala-valor").innerText = codigo;
  document.getElementById("lista-espectadores").innerHTML = espectadores
    .map((e) => `<span>${e.nome}</span>`)
    .join(", ");
  const infoSala = document.getElementById("info-sala");
  if (
    (!codigo || codigo.trim() === "") &&
    (!espectadores || espectadores.length === 0)
  ) {
    infoSala.style.display = "none";
  } else {
    infoSala.style.display = "";
  }

  // Placar centralizado, destacando o jogador da vez em amarelo
  const placarTurnoDiv = document.getElementById("placar-turno-central");
  if (
    placarTurnoDiv &&
    estadoJogo.jogadores &&
    estadoJogo.jogadores.length > 0
  ) {
    const placar = estadoJogo.jogadores
      .map((j, i) => {
        const destaque =
          (estadoJogo.jogadores.length === 2 && i === estadoJogo.vez) ||
          (estadoJogo.jogadores.length === 4 && i % 2 === estadoJogo.vez);
        return `<span style='${destaque
          ? "color:#ffd700;font-weight:bold;text-shadow:0 0 8px #ffd70088;"
          : ""
          }'>${j.nome}: ${j.pontos}</span>`;
      })
      .join(" <b>|</b> ");
    placarTurnoDiv.innerHTML = `<div style='margin-bottom:4px;'>${placar}</div>`;
  }
  renderizarMarcadoresPonto();
}

// =========================
// 6. Drag & Drop e Interações
// =========================

// Flag global para bloquear renderização durante a animação de alinhamento
let animacaoAlinhamentoEmAndamento = false;

// Renderiza as pedras da reserva em círculo ou vertical, dependendo do estado
function renderizarPedrasReserva() {
  // Só bloqueia animação se o alinhamento ainda não foi feito
  if (animacaoAlinhamentoEmAndamento && !estadoJogo.alinhamentoFeito) return;
  estadoJogo.reserva = garantirArray(estadoJogo.reserva);
  // O layout depende apenas do alinhamentoFeito global
  if (estadoJogo.alinhamentoFeito) {
    renderizarPedrasVerticaisAbsoluto(estadoJogo.reserva);
  } else {
    renderizarPedrasCirculo(estadoJogo.reserva, estadoJogo.pedraCentral);
  }
}

// Renderiza as pedras em círculo ao redor da pedra central
function renderizarPedrasCirculo(pedras, pedraCentral) {
  const circle = document.getElementById("circle-pedras");
  if (!circle || !pedras || pedras.length === 0) return;
  circle.style.display = "";
  circle.innerHTML = "";
  const angStep = 360 / pedras.length;
  const raio = 100;
  if (typeof window.animouReservaCircular === "undefined")
    window.animouReservaCircular = false;
  let animar = false;
  // Só anima se ainda não animou, o DOM está pronto e houver pedras
  if (!window.animouReservaCircular && pedras.length > 0) {
    animar = true;
  }
  // Diminui o tempo de animação das pedras reserva
  const TEMPO_ANIMACAO_PEDRA = 180;
  pedras.forEach((p, i) => {
    const ang = ((angStep * i - 90) * Math.PI) / 180;
    const x = Math.cos(ang) * raio + 90;
    const y = Math.sin(ang) * raio + 90;
    const div = document.createElement("div");
    div.className = "pedra-circulo pedra-reserva";
    if (animar) {
      div.style.left = "90px";
      div.style.top = "90px";
      div.style.transform = "scale(0.2)";
      div.style.opacity = "0";
      div.innerHTML = `<img src="${p.url}" alt="${p.nome}" draggable="false">`;
      div.setAttribute("data-idx", i);
      // Tooltip: Arraste para o tabuleiro
      div.onmouseenter = function (e) { showTooltip("Arraste para o Tabuleiro", e.clientX, e.clientY); };
      div.onmousemove = function (e) { showTooltip("Arraste para o Tabuleiro", e.clientX, e.clientY); };
      div.onmouseleave = hideTooltip;
      circle.appendChild(div);
      setTimeout(() => {
        div.style.transition = "all 0.8s cubic-bezier(0.77,0,0.175,1)";
        div.style.left = x + "px";
        div.style.top = y + "px";
        div.style.transform = "scale(1)";
        div.style.opacity = "1";
        // Só marca como animado após realmente disparar a animação
        if (i === pedras.length - 1) {
          window.animouReservaCircular = true;
        }
      }, TEMPO_ANIMACAO_PEDRA + i * TEMPO_ANIMACAO_PEDRA);
    } else {
      div.style.left = x + "px";
      div.style.top = y + "px";
      div.style.transform = "scale(1)";
      div.style.opacity = "1";
      div.innerHTML = `<img src="${p.url}" alt="${p.nome}" draggable="false">`;
      div.setAttribute("data-idx", i);
      // Tooltip: Arraste para o tabuleiro
      div.onmouseenter = function (e) { showTooltip("Arraste para o tabuleiro", e.clientX, e.clientY); };
      div.onmousemove = function (e) { showTooltip("Arraste para o tabuleiro", e.clientX, e.clientY); };
      div.onmouseleave = hideTooltip;
      circle.appendChild(div);
    }
  });
  // Pedra central interativa (NÃO deve ser drag-and-drop antes do alinhamento)
  if (pedraCentral) {
    const central = document.createElement("div");
    central.className = "pedra-circulo pedra-reserva pedra-central";
    central.style.left = "90px";
    central.style.top = "90px";
    central.innerHTML = `<img src="${pedraCentral.url}" alt="${pedraCentral.nome}" draggable="false">`;
    central.onmousedown = null;
    central.style.cursor = "not-allowed";
    central.title = "Aguarde o alinhamento";
    circle.appendChild(central);
  }
}

// =========================
// Função utilitária: slots válidos para inserir pedra na mesa
// =========================
function calcularSlotsValidos(mesa) {
  // Retorna array de índices válidos (0 a 6)
  const slots = Array(7)
    .fill(null)
    .map((_, i) => i);
  const ocupados = mesa.map((p) => p && p.nome && p.url);
  let validos = [];
  for (let i = 0; i < 7; i++) {
    if (ocupados[i]) continue; // já tem pedra
    // verifica se é adjacente a uma pedra
    if ((i > 0 && ocupados[i - 1]) || (i < 6 && ocupados[i + 1])) {
      validos.push(i);
    }
  }
  // Se a mesa está vazia, só permite no centro
  if (mesa.filter((p) => p && p.nome && p.url).length === 0) {
    return [3];
  }
  return validos;
}

// Função para calcular posições dinâmicas dos slots, agora usando pedras de 68.39px e tabuleiro de 740x320px
function getSlotPositions(wrapper, numSlots = 7, pedraSize = 70, borda = 40) {
  const largura = wrapper.offsetWidth;
  const altura = wrapper.offsetHeight;
  const espacamento = (largura - 2 * borda - pedraSize) / (numSlots - 1);
  const top = altura / 2;
  const positions = [];
  for (let i = 0; i < numSlots; i++) {
    const left = borda + pedraSize / 2 + espacamento * i;
    positions.push({ left, top });
  }
  return positions;
}

// Função para desenhar highlights dos slots válidos
function desenharHighlightsFixos(validos, wrapper) {
  const positions = getSlotPositions(wrapper, 7, 68.39, 40);
  // Remove highlights antigos
  const antigos = wrapper.querySelectorAll(".highlight-slot");
  antigos.forEach((h) => h.remove());
  validos.forEach((slotIdx) => {
    const highlight = document.createElement("div");
    highlight.className = "highlight-slot";
    highlight.style.position = "absolute";
    highlight.style.width = "68.39px";
    highlight.style.height = "68.39px";
    highlight.style.left = positions[slotIdx].left + "px";
    highlight.style.top = positions[slotIdx].top + "px";
    highlight.style.transform = "translate(-50%, -50%)";
    highlight.style.background = "transparent";
    highlight.style.border = "none";
    highlight.style.borderRadius = "50%";
    highlight.style.zIndex = 10000;
    highlight.style.pointerEvents = "none";
    highlight.setAttribute("data-slot", slotIdx);
    //highlight.style.boxShadow = "0 0 0 2.5px #ffd70088, 0 0 8px 2px #fff3";
    //wrapper.appendChild(highlight);
  });
}

// Modificar renderizarPedrasVerticaisAbsoluto para destacar slots válidos e permitir drop
function renderizarPedrasVerticaisAbsoluto(pedras) {
  if (animacaoAlinhamentoEmAndamento) return;
  const circle = document.getElementById("circle-pedras");

  // Flexbox Configuration
  circle.style.display = "flex";
  circle.style.flexDirection = "column";
  circle.style.justifyContent = "flex-start"; // Start from top
  circle.style.alignItems = "flex-start"; // Align left
  circle.style.gap = "6px";
  circle.style.position = "fixed";
  circle.style.left = "20px";
  circle.style.top = "130px"; // Adjusted top
  circle.style.transform = "none";
  circle.style.width = "auto";
  circle.style.height = "auto";
  circle.style.pointerEvents = "auto";
  circle.style.paddingTop = "0";
  circle.innerHTML = "";

  pedras.forEach((p, i) => {
    if (!p) return;
    const div = document.createElement("div");
    div.className = "pedra-circulo pedra-reserva";
    div.style.position = "relative";
    div.style.left = "0";
    div.style.top = "0";
    div.style.width = "55px"; // Adjusted size
    div.style.height = "55px";
    div.innerHTML = `<img src="${p.url}" alt="${p.nome}" draggable="false" style="width:100%; height:100%;">`;
    div.setAttribute("data-idx", i);

    // Tooltip
    div.onmouseenter = function (e) { showTooltip("Arraste para o tabuleiro", e.clientX, e.clientY); };
    div.onmousemove = function (e) { showTooltip("Arraste para o tabuleiro", e.clientX, e.clientY); };
    div.onmouseleave = hideTooltip;

    // Drag Logic
    if (estadoJogo.alinhamentoFeito && ehMinhaVez()) {
      div.onmousedown = function (e) {
        // Bloqueio Tutorial: Strict Mode
        if (window.tellstonesTutorial) {
          if (!window.tellstonesTutorial.verificarAcao("ARRASTAR_RESERVA")) return;
        }
        tocarSomClick();

        e.preventDefault();
        e.stopPropagation();
        const rect = div.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        const ghost = div.cloneNode(true);
        ghost.className = "ghost-pedra";
        ghost.style.position = "fixed";
        ghost.style.left = rect.left + "px";
        ghost.style.top = rect.top + "px";
        ghost.style.width = rect.width + "px";
        ghost.style.height = rect.height + "px";
        ghost.style.pointerEvents = "none";
        ghost.style.opacity = "0.85";
        ghost.style.zIndex = 99999;
        document.body.appendChild(ghost);
        div.style.opacity = "0.3";
        div.style.pointerEvents = "none";

        const wrapper = document.getElementById("tabuleiro-wrapper");

        let highlights = [];
        function desenharHighlights() {
          highlights.forEach((h) => h.remove());
          highlights = [];
          const mesa = Array.isArray(estadoJogo.mesa)
            ? estadoJogo.mesa
            : Array(7).fill(null);
          const validos = calcularSlotsValidos(mesa);
          const positions = getSlotPositions(wrapper, 7, 68.39, 40);
          validos.forEach((slotIdx) => {
            const highlight = document.createElement("div");
            highlight.className = "highlight-slot";
            highlight.style.position = "absolute";
            highlight.style.width = "68.39px";
            highlight.style.height = "68.39px";
            highlight.style.left = positions[slotIdx].left + "px";
            highlight.style.top = positions[slotIdx].top + "px";
            highlight.style.transform = "translate(-50%, -50%)";
            highlight.style.background = "transparent";
            highlight.style.border = "none";
            highlight.style.borderRadius = "50%";
            highlight.style.zIndex = 10000;
            highlight.style.pointerEvents = "none";
            highlight.setAttribute("data-slot", slotIdx);
            highlight.style.boxShadow = "0 0 0 3px #bbb, 0 0 8px 2px #fff";
            wrapper.appendChild(highlight);
            highlights.push(highlight);
          });
        }
        desenharHighlights();

        let slotAlvo = null;
        function onMove(ev) {
          ghost.style.left = ev.clientX - offsetX + "px";
          ghost.style.top = ev.clientY - offsetY + "px";
          slotAlvo = null;
          highlights.forEach((h) => {
            const r = h.getBoundingClientRect();
            if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
              h.style.border = "2px solid #ffd700";
              slotAlvo = parseInt(h.getAttribute("data-slot"));
            } else {
              h.style.border = "none";
            }
          });
        }
        function onUp(ev) {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          div.style.opacity = "";
          div.style.pointerEvents = "";
          highlights.forEach((h) => h.remove());
          highlights = [];
          if (slotAlvo !== null) {
            const idxAtual = parseInt(div.getAttribute("data-idx"));
            const pedraObj = estadoJogo.reserva[idxAtual];
            console.log("[DEBUG] Soltando pedra reserva", { idxAtual, slotAlvo, pedraObj, reserva: [...estadoJogo.reserva] });
            if (pedraObj) {
              try {
                estadoJogo.reserva[idxAtual] = null;
                inserirPedraNaMesa(pedraObj, slotAlvo);
                renderizarMesa();
                renderizarPedrasVerticaisAbsoluto(estadoJogo.reserva);
                setupMesaInteractions();
                showToastInterno("Pedra colocada!");
                if (window.tellstonesTutorial) {
                  console.log("[DEBUG] Triggering tutorial validation");
                  window.tellstonesTutorial.registrarAcaoConcluida();
                }
              } catch (e) {
                console.error("[DEBUG] Erro ao colocar pedra:", e);
              }
            } else {
              console.warn("[DEBUG] Pedra não encontrada!");
            }
          }
          ghost.remove();
        }
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      };
      div.style.cursor = "pointer";
      div.title = "";
    } else {
      div.onmousedown = null;
      div.style.cursor = "not-allowed";
      div.title = estadoJogo.alinhamentoFeito
        ? "Aguarde sua vez"
        : "Aguarde o alinhamento";
    }
    circle.appendChild(div);
  });
}

// Função para animar a pedra da reserva até o slot da mesa
function animarPedraReservaParaMesa(ghost, wrapper, slotIdx, callback) {
  const larguraWrapper = wrapper.offsetWidth;
  const larguraPedra = 80;
  const slots = 7;
  const slotLargura = larguraWrapper / slots;
  const leftFinal =
    wrapper.getBoundingClientRect().left +
    slotLargura * slotIdx +
    slotLargura / 2 -
    larguraPedra / 2;
  const topFinal =
    wrapper.getBoundingClientRect().top +
    wrapper.offsetHeight / 2 -
    larguraPedra / 2;
  const leftStart = parseFloat(ghost.style.left);
  const topStart = parseFloat(ghost.style.top);
  const anim = ghost.animate(
    [
      { left: leftStart + "px", top: topStart + "px" },
      { left: leftFinal + "px", top: topFinal + "px" }
    ],
    {
      duration: 700,
      easing: "cubic-bezier(0.77, 0, 0.175, 1)",
      fill: "forwards"
    }
  );
  anim.onfinish = function () {
    if (callback) callback();
  };
}

// Configura as interações de drag & drop e clique nas pedras da mesa
function setupMesaInteractions() {
  const pedrasMesa = document.querySelectorAll(".pedra-oficial");
  pedrasMesa.forEach((pedra, idx) => {
    // Drag para mover/trocar
    if (ehMinhaVez() && !estadoJogo.desafio) {
      pedra.setAttribute("draggable", "true");
      pedra.ondragstart = (e) => {
        if (window.tellstonesTutorial && !window.tellstonesTutorial.verificarAcao("TROCAR_PEDRAS")) {
          e.preventDefault();
          return;
        }
        setTimeout(() => pedra.classList.add("pedra-troca-selecionada"), 0);
        e.dataTransfer.setData("idx", idx);
      };
      pedra.ondragend = () => {
        pedra.classList.remove("pedra-troca-selecionada");
      };
      pedra.ondragover = (e) => {
        e.preventDefault();
        pedra.classList.add("pedra-drop-alvo");
      };
      pedra.ondragleave = (e) => {
        pedra.classList.remove("pedra-drop-alvo");
      };
      pedra.ondrop = (e) => {
        e.preventDefault();
        div.classList.remove("pedra-drop-alvo");
        const fromIdxDrop = parseInt(e.dataTransfer.getData("idx"));
        if (fromIdxDrop === idx) return;
        getDBRef("salas/" + salaAtual + "/estadoJogo").update({
          trocaAnimacao: {
            from: fromIdxDrop,
            to: i,
            timestamp: Date.now(),
            jogador: nomeAtual
          }
        });
        showToastInterno("Pedras trocadas!");
        // Removido avancarTurno() aqui
      };
    } else {
      pedra.setAttribute("draggable", "false");
      pedra.ondragstart = null;
      pedra.ondragend = null;
      pedra.ondragover = null;
      pedra.ondragleave = null;
      pedra.ondrop = null;
    }
  });
}

// =========================
// 7. Moeda e Animações
// =========================

// Eventos para escolha de cara ou coroa
let escolhaJogador = null;
function definirEscolha(escolha) {
  if (!salaAtual || !nomeAtual) return;
  // Tenta registrar a escolha apenas se ainda não houver escolha registrada
  getDBRef("salas/" + salaAtual + "/caraCoroa/escolha").transaction(function (
    current
  ) {
    if (current === null) {
      console.log("[DEBUG] Escolha de cara/coroa SALVA:", {
        nome: nomeAtual,
        escolha
      });
      return { nome: nomeAtual, escolha: escolha };
    }
    return; // já existe escolha
  });
}
document.getElementById("btn-cara").onclick = function () {
  document.getElementById("escolha-cara-coroa").style.display = "none";
  definirEscolha("cara");
};
document.getElementById("btn-coroa").onclick = function () {
  document.getElementById("escolha-cara-coroa").style.display = "none";
  definirEscolha("coroa");
};

// Variável global para evitar toast duplicado
let ultimoLadoNotificado = null;

function ouvirCaraCoroa() {
  if (!salaAtual) return;
  getDBRef("salas/" + salaAtual + "/caraCoroa").on("value", function (snap) {
    const data = snap.val();
    window.ultimoCaraCoroaData = data;
    const escolhaDiv = document.getElementById("escolha-cara-coroa");
    const btnCara = document.getElementById("btn-cara");
    const btnCoroa = document.getElementById("btn-coroa");
    let feedbackDiv = document.getElementById("msg-feedback-cara-coroa");
    if (!feedbackDiv && escolhaDiv) {
      feedbackDiv = document.createElement("div");
      feedbackDiv.id = "msg-feedback-cara-coroa";
      feedbackDiv.style.marginTop = "22px";
      feedbackDiv.style.fontSize = "1.25em";
      feedbackDiv.style.color = "#ffd700";
      feedbackDiv.style.textAlign = "center";
      feedbackDiv.style.width = "100%";
      const parent = escolhaDiv.querySelector("div");
      if (parent) parent.appendChild(feedbackDiv);
    }
    if (btnCara) {
      btnCara.style.fontSize = "1.3em";
      btnCara.style.padding = "16px 32px";
      btnCara.style.minWidth = "120px";
      btnCara.style.display = "inline-flex";
      btnCara.style.flexDirection = "column";
      btnCara.style.alignItems = "center";
      btnCara.innerHTML = `<img src='assets/img/Cara.png' alt='Cara' style='width:80px;height:80px;border-radius:50%;margin-bottom:10px;box-shadow:0 2px 8px #0007;' /><span style='font-size:1.1em;'>Cara</span>`;
    }
    if (btnCoroa) {
      btnCoroa.style.fontSize = "1.3em";
      btnCoroa.style.padding = "16px 32px";
      btnCoroa.style.minWidth = "120px";
      btnCoroa.style.display = "inline-flex";
      btnCoroa.style.flexDirection = "column";
      btnCoroa.style.alignItems = "center";
      btnCoroa.innerHTML = `<img src='assets/img/Coroa.png' alt='Coroa' style='width:80px;height:80px;border-radius:50%;margin-bottom:10px;box-shadow:0 2px 8px #0007;' /><span style='font-size:1.1em;'>Coroa</span>`;
    }
    if (!data || !data.escolha) {
      if (escolhaDiv) escolhaDiv.style.display = "flex";
      if (btnCara) btnCara.disabled = false;
      if (btnCoroa) btnCoroa.disabled = false;
      if (feedbackDiv) feedbackDiv.innerHTML = "";
      ultimoLadoNotificado = null;
      return;
    }
    // Descobre meu lado
    let minhaEscolha;
    if (nomeAtual === data.escolha.nome) {
      minhaEscolha = data.escolha.escolha;
    } else {
      minhaEscolha = data.escolha.escolha === "cara" ? "coroa" : "cara";
    }
    escolhaJogador = minhaEscolha;
    // Sincronização do feedback para ambos
    if (!data.feedbackLiberado) {
      getDBRef("salas/" + salaAtual + "/caraCoroa/feedbackLiberado").set(
        Date.now()
      );
      return;
    }
    if (escolhaDiv) escolhaDiv.style.display = "flex";
    if (btnCara) btnCara.disabled = true;
    if (btnCoroa) btnCoroa.disabled = true;
    if (feedbackDiv) {
      feedbackDiv.innerHTML = `Você ficou com: <b>${minhaEscolha.toUpperCase()}</b><br><span style='font-size:0.95em;color:#ffd700;'>Aguarde o sorteio da moeda...</span>`;
    }
    if (minhaEscolha !== ultimoLadoNotificado) {
      showToastInterno(`Você ficou com: ${minhaEscolha.toUpperCase()}`);
      ultimoLadoNotificado = minhaEscolha;
    }
    const agora = Date.now();
    const tempoRestante = Math.max(0, 2500 - (agora - data.feedbackLiberado));
    setTimeout(() => {
      if (feedbackDiv) feedbackDiv.innerHTML = "";
      if (escolhaDiv) escolhaDiv.style.display = "none";
      // Mostra o botão para todos enquanto não houver resultado
      if (!data || typeof data.resultado === "undefined") {
        mostrarMoedaParaSorteioCriador();
      }
    }, tempoRestante);
    // Se já existe resultado, mostrar animação sincronizada
    if (typeof data.resultado !== "undefined") {
      if (escolhaDiv) escolhaDiv.style.display = "none";
      mostrarMoedaParaSorteioSincronizado(data.resultado, minhaEscolha);
    }
  });
}

// 1. Corrigir o som da moeda para tocar apenas uma vez por resultado
let ultimoResultadoMoedaTocado = null;
function mostrarMoedaParaSorteioSincronizado(resultado, minhaEscolha) {
  const moedaBtn = document.getElementById("moeda-btn");
  const moedaAnimada = document.getElementById("moeda-animada");
  const moedaFrente = document.getElementById("moeda-frente");
  const moedaVerso = document.getElementById("moeda-verso");
  const somMoeda = document.getElementById("som-moeda");
  // Se qualquer elemento não existir, não faz nada
  if (!moedaBtn || !moedaAnimada || !moedaFrente || !moedaVerso || !somMoeda)
    return;
  void moedaAnimada.offsetWidth;
  moedaAnimada.classList.add("moeda-girando");
  // Tocar o som da moeda exatamente no início da animação
  if (somMoeda) {
    somMoeda.currentTime = 0;
    somMoeda.play();
  }
  // Sincronizar o tempo do flip com a duração do áudio
  const duracaoAudio =
    somMoeda.duration && !isNaN(somMoeda.duration) ? somMoeda.duration : 2.0; // fallback 2s
  const tempoFlip = duracaoAudio * 800;
  setTimeout(() => {
    if (resultado === 0) {
      moedaFrente.style.transform = "rotateY(0deg)";
      moedaVerso.style.transform = "rotateY(180deg)";
    } else {
      moedaFrente.style.transform = "rotateY(180deg)";
      moedaVerso.style.transform = "rotateY(0deg)";
    }
    moedaAnimada.classList.remove("moeda-girando");
    mostrarNotificacaoMoeda(
      (resultado === 0 && minhaEscolha === "cara") ||
        (resultado === 1 && minhaEscolha === "coroa")
        ? "<span style='font-size:1.2em;'>Você ganhou o sorteio! Você começa.</span>"
        : "<span style='font-size:1.2em;'>O adversário ganhou o sorteio e começa.</span>"
    );
    setTimeout(() => {
      moedaBtn.style.opacity = "0";
      setTimeout(() => {
        moedaBtn.style.display = "none";
        moedaBtn.onclick = null;
        moedaBtn.disabled = true;
        // Remove o botão da moeda do DOM
        if (moedaBtn && moedaBtn.parentNode) {
          moedaBtn.parentNode.removeChild(moedaBtn);
        }
        mostrarNotificacaoMoeda("");
        // --- NOVO: Buscar escolha do Firebase para garantir nomeGanhador correto ---
        function tentarDefinirVencedorMoeda(tentativas = 0) {
          getDBRef("salas/" + salaAtual + "/caraCoroa/escolha").once(
            "value",
            function (snapEscolha) {
              const escolhaData = snapEscolha.val();
              console.log(
                "[DEBUG] escolhaData:",
                escolhaData,
                "| jogadores:",
                estadoJogo.jogadores
              );
              let nomeGanhador = null;
              if (escolhaData && estadoJogo.jogadores) {
                if (resultado === 0 && escolhaData.escolha === "cara") {
                  nomeGanhador = escolhaData.nome;
                } else if (resultado === 1 && escolhaData.escolha === "coroa") {
                  nomeGanhador = escolhaData.nome;
                } else if (resultado === 0 && escolhaData.escolha === "coroa") {
                  nomeGanhador = estadoJogo.jogadores.find(
                    (j) => j.nome !== escolhaData.nome
                  )?.nome;
                } else if (resultado === 1 && escolhaData.escolha === "cara") {
                  nomeGanhador = estadoJogo.jogadores.find(
                    (j) => j.nome !== escolhaData.nome
                  )?.nome;
                }
              }
              console.log(
                "[DEBUG] [SORTEIO] nomeGanhador (retry):",
                nomeGanhador,
                "| jogadores:",
                estadoJogo.jogadores,
                "| tentativas:",
                tentativas
              );
              if (nomeGanhador && estadoJogo.jogadores) {
                const idx = estadoJogo.jogadores.findIndex(
                  (j) => j.nome === nomeGanhador
                );
                if (idx !== -1) {
                  // Atualizar o campo 'vez' dentro do objeto inteiro do estado do jogo
                  getDBRef("salas/" + salaAtual + "/estadoJogo").once(
                    "value",
                    function (snapEstado) {
                      const estado = snapEstado.val() || {};
                      estado.vez = idx;
                      getDBRef("salas/" + salaAtual + "/estadoJogo").set(estado);
                      console.log(
                        "[DEBUG] vez atualizado pelo sorteio da moeda para:",
                        idx
                      );
                    }
                  );
                } else {
                  console.error(
                    "[ERRO] [SORTEIO] Não encontrou índice do ganhador:",
                    nomeGanhador,
                    estadoJogo.jogadores
                  );
                }
              } else {
                if (tentativas < 10) {
                  setTimeout(
                    () => tentarDefinirVencedorMoeda(tentativas + 1),
                    200
                  );
                } else {
                  console.error(
                    "[ERRO] [SORTEIO] Não foi possível determinar o ganhador após várias tentativas.",
                    escolhaData,
                    estadoJogo.jogadores
                  );
                }
              }
            }
          );
        }
        tentarDefinirVencedorMoeda();
        // ---
        // NOVO: sinaliza no Firebase que o sorteio foi finalizado
        getDBRef("salas/" + salaAtual + "/caraCoroa/sorteioFinalizado").set(true);
        //sincronizarPedraCentralEAlinhamento(); // agora só será chamado pelo listener
      }, 500);
    }, 2500);
  }, tempoFlip);
}

// 3. Reduzir o tamanho do texto do resultado da moeda
function mostrarNotificacaoMoeda(msg) {
  let notif = document.getElementById("notificacao-moeda");
  if (!notif) {
    notif = document.createElement("div");
    notif.id = "notificacao-moeda";
    notif.style.position = "absolute";
    notif.style.left = "50%";
    notif.style.top = "40%";
    notif.style.transform = "translate(-50%, -50%)";
    notif.style.background = "#2d8cff";
    notif.style.color = "#fff";
    notif.style.padding = "16px 32px";
    notif.style.borderRadius = "12px";
    notif.style.fontSize = "1.2em";
    notif.style.boxShadow = "0 2px 16px #0007";
    notif.style.zIndex = 1001;
    notif.style.display = "none";
    document.body.appendChild(notif);
  }
  if (msg && msg.trim() !== "") {
    notif.innerHTML = msg;
    notif.style.display = "block";
  } else {
    notif.style.display = "none";
  }
}

// 1. Ajustar flag de animação para garantir que só é desativada após a renderização vertical
function sincronizarPedraCentralEAlinhamento() {
  try {
    console.log('[ALINHAMENTO] Entrou em sincronizarPedraCentralEAlinhamento', {
      animacaoAlinhamentoEmAndamento,
      pedraCentral: estadoJogo.pedraCentral,
      centralAlinhada: estadoJogo.centralAlinhada,
      salaAtual
    });
    // Log extra para depuração fina
    console.log('[ALINHAMENTO][DEBUG] Após entrada da função, antes de checar animacaoAlinhamentoEmAndamento');
    if (animacaoAlinhamentoEmAndamento) {
      console.log('[ALINHAMENTO][RETURN] animacaoAlinhamentoEmAndamento=true, abortando');
      return;
    }
    animacaoAlinhamentoEmAndamento = true;
    // Log extra antes do if crítico
    console.log('[ALINHAMENTO][DEBUG] Antes do if (!estadoJogo.pedraCentral || estadoJogo.centralAlinhada)', {
      pedraCentral: estadoJogo.pedraCentral,
      centralAlinhada: estadoJogo.centralAlinhada
    });
    if (!estadoJogo.pedraCentral || estadoJogo.centralAlinhada) {
      console.log('[ALINHAMENTO][RETURN] Pedra central ausente ou já alinhada', {
        pedraCentral: estadoJogo.pedraCentral,
        centralAlinhada: estadoJogo.centralAlinhada
      });
      animacaoAlinhamentoEmAndamento = false;
      return;
    }
    // Log extra após o if crítico
    console.log('[ALINHAMENTO][DEBUG] Passou do if (!estadoJogo.pedraCentral || estadoJogo.centralAlinhada)');
    // Checagem de elementos DOM
    const circle = document.getElementById("circle-pedras");
    if (!circle) {
      console.log('[ALINHAMENTO][ERRO] Elemento circle-pedras não encontrado. Tentando novamente em 300ms.');
      animacaoAlinhamentoEmAndamento = false;
      setTimeout(sincronizarPedraCentralEAlinhamento, 300);
      return;
    }
    const wrapper = document.getElementById("tabuleiro-wrapper");
    if (!wrapper) {
      console.log('[ALINHAMENTO][ERRO] Elemento tabuleiro-wrapper não encontrado. Tentando novamente em 300ms.');
      animacaoAlinhamentoEmAndamento = false;
      setTimeout(sincronizarPedraCentralEAlinhamento, 300);
      return;
    }
    const tabuleiroCenter = document.getElementById("tabuleiro-center");
    if (!tabuleiroCenter) {
      console.log('[ALINHAMENTO][ERRO] Elemento tabuleiro-center não encontrado. Tentando novamente em 300ms.');
      animacaoAlinhamentoEmAndamento = false;
      setTimeout(sincronizarPedraCentralEAlinhamento, 300);
      return;
    }
    // Log antes da transação do Firebase
    console.log('[ALINHAMENTO][DEBUG] Antes da transação do Firebase');
    getDBRef("salas/" + salaAtual + "/estadoJogo/centralAlinhada").transaction(
      function (current) {
        if (current === true) return; // já foi alinhada
        return true;
      },
      function (error, committed, snapshot) {
        console.log('[ALINHAMENTO] Callback da transação', { error, committed, snapshot: snapshot && snapshot.val() });
        if (committed) {
          let pedraCentral = estadoJogo.pedraCentral;
          const wrapperRect = wrapper.getBoundingClientRect();
          const centerRect = tabuleiroCenter.getBoundingClientRect();
          const larguraPedra = 80;
          // Corrigir: pegar o centro EXATO da pedra central no círculo
          const centralDiv = circle.querySelector(".pedra-central");
          let leftStart, topStart;
          if (centralDiv) {
            const rect = centralDiv.getBoundingClientRect();
            leftStart = rect.left - centerRect.left + rect.width / 2;
            topStart = rect.top - centerRect.top + rect.height / 2;
            centralDiv.style.visibility = "hidden";
          } else {
            const reservaRect = circle.getBoundingClientRect();
            leftStart = 90;
            topStart = 90;
            console.log('[ALINHAMENTO][WARN] Não encontrou .pedra-central, usando fallback');
          }
          // Posição final: centro do slot central do tabuleiro
          const slots = 7;
          const slotLargura = wrapper.offsetWidth / slots;
          const leftFinal =
            wrapperRect.left - centerRect.left +
            slotLargura * 3 +
            slotLargura / 2 -
            larguraPedra / 2;
          const topFinal =
            wrapperRect.top - centerRect.top +
            wrapper.offsetHeight / 2 -
            larguraPedra / 2;
          // Cria o elemento animado exatamente sobre a pedra central
          const pedraAnimada = document.createElement("div");
          pedraAnimada.className = "pedra-mesa pedra-oficial pedra-animada-mesa";
          pedraAnimada.style.position = "absolute";
          pedraAnimada.style.left = leftStart + "px";
          pedraAnimada.style.top = topStart + "px";
          pedraAnimada.style.width = larguraPedra + "px";
          pedraAnimada.style.height = larguraPedra + "px";
          pedraAnimada.style.transform = "translate(-50%, -50%)";
          pedraAnimada.innerHTML = `<img src="${pedraCentral.url}" alt="${pedraCentral.nome}" draggable="false">`;
          tabuleiroCenter.appendChild(pedraAnimada);
          console.log('[ALINHAMENTO] Iniciando animação da pedra central', { leftStart, topStart, leftFinal, topFinal });
          pedraAnimada.animate(
            [
              {
                left: leftStart + "px",
                top: topStart + "px",
                transform: "translate(-50%, -50%)"
              },
              {
                left: leftFinal + "px",
                top: topFinal + "px",
                transform: "translate(-50%, -50%)"
              }
            ],
            {
              duration: 2000,
              easing: "cubic-bezier(0.77, 0, 0.175, 1)",
              fill: "forwards"
            }
          );
          setTimeout(() => {
            pedraAnimada.remove();
            // Atualiza o array mesa inteiro no Firebase
            const novaMesa = [null, null, null, pedraCentral, null, null, null];
            console.log('[ALINHAMENTO] Atualizando Firebase com central alinhada', { novaMesa, pedraCentral });
            getDBRef("salas/" + salaAtual + "/estadoJogo").update({
              mesa: novaMesa,
              pedraCentral: null,
              centralAlinhada: true,
              alinhamentoFeito: true
            });
            renderizarMesa();
            // --- Animação suave do círculo para o alinhamento vertical ---
            const pedrasDivs = Array.from(
              circle.querySelectorAll(".pedra-circulo:not(.pedra-central)")
            );
            const pedrasParaAnimar = estadoJogo.reserva
              ? estadoJogo.reserva.slice()
              : [];
            const total = pedrasDivs.length;
            const containerAltura = 260;
            const alturaPedra = 80;
            const espacamento =
              total > 1 ? (containerAltura - alturaPedra) / (total - 1) : 0;
            pedrasDivs.forEach((div, i) => {
              const rect = div.getBoundingClientRect();
              const parentRect = circle.getBoundingClientRect();
              const leftAtual = rect.left - parentRect.left;
              const topAtual = rect.top - parentRect.top;
              const leftFinal = 90 - leftAtual;
              const topFinal = i * espacamento - topAtual;
              div.style.transition =
                "transform 0.7s cubic-bezier(0.77,0,0.175,1)";
              div.style.zIndex = 10000;
              div.style.transform = `translate(${leftFinal}px, ${topFinal}px)`;
            });
            setTimeout(() => {
              circle.innerHTML = "";
              animacaoAlinhamentoEmAndamento = false;
              renderizarPedrasReserva();
              estadoJogo.alinhamentoFeito = true;
              console.log('[ALINHAMENTO] Alinhamento vertical finalizado', {
                centralAlinhada: estadoJogo.centralAlinhada,
                alinhamentoFeito: estadoJogo.alinhamentoFeito
              });
            }, 700);
          }, 2000);
        } else {
          animacaoAlinhamentoEmAndamento = false;
          console.log('[ALINHAMENTO] Transação não foi committed', { error, committed });
        }
      }
    );
    // Log depois da transação do Firebase
    console.log('[ALINHAMENTO][DEBUG] Após chamada da transação do Firebase');
  } catch (e) {
    console.error('[ALINHAMENTO][CATCH] Erro inesperado na função:', e);
  }
}

// =========================
// 8. Eventos de Botões e Inicialização
// =========================

// Evento para o botão de criar sala
if (document.getElementById("start-game-btn")) {
  document.getElementById("start-game-btn").onclick = function () {
    tocarSomPress();
    const modo = document.querySelector('input[name="mode"]:checked').value;
    const nome = document.getElementById("nome-criar").value.trim();
    if (!nome) return alert("Digite seu nome!");
    const codigo = criarSala(modo);
    entrarSala(codigo, nome, "jogador");
    document.getElementById("codigo-sala-criada").innerText =
      "Código da sala: " + codigo;
    mostrarLobby(codigo, nome, true);
  };
}

// Evento para o botão de entrar em sala
if (document.getElementById("enter-room-btn")) {
  document.getElementById("enter-room-btn").onclick = function () {
    tocarSomPress();
    const codigo = document
      .getElementById("room-code")
      .value.trim()
      .toUpperCase();
    const nome = document.getElementById("nome-entrar").value.trim();
    const tipo = document.querySelector('input[name="tipo-entrada"]:checked')
      .value;
    if (!codigo) return alert("Digite o código da sala!");
    if (!nome) return alert("Digite seu nome!");
    entrarSala(codigo, nome, tipo);
    mostrarLobby(codigo, nome, false);
  };
}

// Evento para mostrar tela inicial ao carregar a página
// Evento para mostrar tela inicial ao carregar a página
window.onload = function () {
  // Configurar botão de mute (Apenas Música)
  window.isMuted = false;
  const btnMute = document.getElementById("btn-mute-global");
  if (btnMute) {
    // Atualizar tooltip para refletir a função
    btnMute.title = "Mutar/Desmutar Música de Fundo";

    btnMute.onclick = function () {
      window.isMuted = !window.isMuted;
      const somFundo = document.getElementById("som-fundo");
      // SFX não são mais afetados pelo botão de mute global

      if (window.isMuted) {
        btnMute.innerText = "🔇";
        if (somFundo) somFundo.pause();
      } else {
        btnMute.innerText = "🔊";
        // Só retoma música se estiver em tela permitida
        const telaGame = document.getElementById("game");
        if (somFundo && (!telaGame || !telaGame.classList.contains("active"))) {
          somFundo.play().catch(() => { });
        }
      }
    };
  }

  mostrarTela("start-screen");
};

// Evento para voltar do Lobby
if (document.getElementById("back-from-lobby-btn")) {
  document.getElementById("back-from-lobby-btn").onclick = function () {
    tocarSomPress();
    if (confirm("Deseja sair do Lobby?")) {
      sairPartida();
    }
  }
}

// Função para o criador sortear e salvar o resultado
function mostrarMoedaParaSorteioCriador() {
  garantirMoedaBtnNoDOM();
  const moedaBtn = document.getElementById("moeda-btn");
  const moedaAnimada = document.getElementById("moeda-animada");
  // Checa se já existe resultado no Firebase
  getDBRef("salas/" + salaAtual + "/caraCoroa/resultado").once(
    "value",
    function (snapshot) {
      if (snapshot.exists()) {
        // Bloqueia e oculta o botão imediatamente
        moedaBtn.style.display = "none";
        moedaBtn.onclick = null;
        return; // Já foi sorteado!
      }
      // NOVO: só permite sortear se a escolha existir
      getDBRef("salas/" + salaAtual + "/caraCoroa/escolha").once(
        "value",
        function (snapEscolha) {
          if (!snapEscolha.exists()) {
            showToastInterno("Aguardando escolha de Cara ou Coroa!");
            if (moedaBtn) {
              moedaBtn.style.display = "none";
              moedaBtn.onclick = null;
            }
            return;
          }
          if (moedaBtn) {
            moedaBtn.style.display = "block";
            moedaBtn.onclick = function () {
              tocarSomPress();
              moedaBtn.onclick = null; // desabilita localmente
              if (moedaAnimada) {
                moedaAnimada.classList.remove("moeda-girando");
                void moedaAnimada.offsetWidth;
                moedaAnimada.classList.add("moeda-girando");
              }
              // Usa transação para garantir atomicidade
              getDBRef("salas/" + salaAtual + "/caraCoroa/resultado").transaction(
                function (current) {
                  if (current === null) {
                    return Math.random() < 0.5 ? 0 : 1;
                  }
                  return; // já existe, não sobrescreve
                }
              );
            };
          }
        }
      );
    }
  );
}

// Listeners dos botões da tela inicial
const btnOnline = document.getElementById("online-menu-btn");
const btnVoltarMain = document.getElementById("back-to-main-btn");
const mainMenu = document.getElementById("main-menu-btns");
const onlineMenu = document.getElementById("online-menu");
const btnCriar = document.getElementById("create-room-btn");
const btnEntrar = document.getElementById("join-room-btn");

if (btnOnline) {
  btnOnline.onclick = () => {
    tocarSomPress();
    mainMenu.style.display = "none";
    onlineMenu.style.display = "flex";
  };
}

if (btnVoltarMain) {
  btnVoltarMain.onclick = () => {
    tocarSomPress();
    mainMenu.style.display = "flex";
    onlineMenu.style.display = "none";
    document.getElementById("room-options").style.display = "none";
    document.getElementById("join-room").style.display = "none";
  };
}

if (btnCriar) {
  btnCriar.onclick = function () {
    tocarSomPress();
    document.getElementById("room-options").style.display = "block";
    document.getElementById("join-room").style.display = "none";
  };
}
if (btnEntrar) {
  btnEntrar.onclick = function () {
    tocarSomPress();
    document.getElementById("room-options").style.display = "none";
    document.getElementById("join-room").style.display = "block";
  };
}
const btnDesafiar = document.getElementById("btn-desafiar");

// Novos botões: Tutorial e Bot
const btnTutorial = document.getElementById("tutorial-btn");
const btnBot = document.getElementById("bot-pve-btn");

if (btnTutorial) {
  btnTutorial.onclick = function () {
    tocarSomPress();
    iniciarModoTutorial();
  };
}

if (btnBot) {
  btnBot.onclick = function () {
    tocarSomPress();
    alert("Modo PvE ainda em desenvolvimento!");
    // iniciarModoBot();
  };
}

const btnSairPartida = document.getElementById("btn-sair-partida");
if (btnSairPartida) {
  btnSairPartida.onclick = function () {
    tocarSomPress();
    const btnVoltarLobbyManual = document.getElementById("btn-voltar-lobby");
    if (btnVoltarLobbyManual) {
      btnVoltarLobbyManual.click();
    } else {
      mostrarTela("start-screen");
      isLocalMode = false;
      tellstonesBot = null;
      if (window.tellstonesTutorial) {
        window.tellstonesTutorial.finalizar();
        window.tellstonesTutorial = null;
      }
      // Remove tutorial UI if it exists
      const tutorialUI = document.getElementById("tutorial-ui");
      if (tutorialUI) tutorialUI.remove();
    }
  };
  // Move o botão para dentro do container de info da sala
  const infoSala = document.getElementById("info-sala");
  if (infoSala) {
    infoSala.appendChild(btnSairPartida);
    infoSala.style.display = "flex";
    infoSala.style.flexDirection = "column";
    infoSala.style.alignItems = "center";
    infoSala.style.gap = "8px";
    infoSala.style.textAlign = "center";

    btnSairPartida.style.position = "static";
    btnSairPartida.style.margin = "8px 0 0 0";
    btnSairPartida.style.fontSize = "0.85em";
    btnSairPartida.style.padding = "6px 12px";
    btnSairPartida.style.background = "rgba(244, 67, 54, 0.15)";
    btnSairPartida.style.color = "#ff5252";
    btnSairPartida.style.border = "1px solid #ff5252";
    btnSairPartida.style.borderRadius = "4px";
    btnSairPartida.style.cursor = "pointer";
    btnSairPartida.style.transition = "all 0.2s";

    btnSairPartida.onmouseover = () => {
      btnSairPartida.style.background = "rgba(244, 67, 54, 0.3)";
      btnSairPartida.style.boxShadow = "0 0 8px rgba(255, 82, 82, 0.4)";
    };
    btnSairPartida.onmouseout = () => {
      btnSairPartida.style.background = "rgba(244, 67, 54, 0.15)";
      btnSairPartida.style.boxShadow = "none";
    };
  }
}

if (btnDesafiar) {
  btnDesafiar.onclick = function () {
    if (!ehMinhaVez()) {
      showToastInterno("Aguarde sua vez!");
      return;
    }
    // Restrição Tutorial: Strict Mode
    if (salaAtual === "MODO_TUTORIAL" && window.tellstonesTutorial) {
      if (!window.tellstonesTutorial.verificarAcao("BOTAO_DESAFIAR")) return;
    }
    // Restrição Tutorial
    // Restrição Tutorial
    if (salaAtual === "MODO_TUTORIAL" && window.tellstonesTutorial && window.tellstonesTutorial.passo !== 5) {
      showToastInterno("Siga o tutorial: agora não é hora de desafiar.");
      return;
    }
    // Só permite se houver pelo menos uma pedra virada para baixo
    const pedrasViradas = estadoJogo.mesa.filter((p) => p && p.virada);
    if (!pedrasViradas.length) {
      showToastInterno("Não há pedras viradas para baixo para desafiar!");
      return;
    }
    showToastInterno("Selecione uma pedra virada para baixo para desafiar.");
    window.selecionandoDesafio = true;
    // Marcar status 'selecionando' no desafio com o jogador correto
    estadoJogo.desafio = { status: "selecionando", jogador: nomeAtual };
    salvarEstadoJogo();
    renderizarMesa();
  };
}


// =========================
// Função para mostrar a tela de jogo
// =========================
function mostrarJogo(codigo, jogadores, espectadores) {
  if (!window.jaEntrouNoGame) {
    window.animouReservaCircular = false;
    window.jaEntrouNoGame = true;
  }
  adicionarListenerNotificacoes();
  mostrarTela("game");
  atualizarInfoSala(codigo, espectadores);

  // Garantir que o botão de sair está no lugar certo
  const btnSair = document.getElementById("btn-sair-partida");
  const infoSala = document.getElementById("info-sala");
  if (btnSair && infoSala && !infoSala.contains(btnSair)) {
    infoSala.appendChild(btnSair);
    infoSala.style.display = "flex";
    infoSala.style.flexDirection = "column";
    infoSala.style.alignItems = "center";
    infoSala.style.gap = "8px";
    infoSala.style.textAlign = "center";

    btnSair.style.position = "static";
    btnSair.style.margin = "8px 0 0 0";
    btnSair.style.fontSize = "0.85em";
    btnSair.style.padding = "6px 12px";
    btnSair.style.background = "rgba(244, 67, 54, 0.15)";
    btnSair.style.color = "#ff5252";
    btnSair.style.border = "1px solid #ff5252";
    btnSair.style.borderRadius = "4px";
    btnSair.style.cursor = "pointer";
    btnSair.style.transition = "all 0.2s";

    btnSair.onmouseover = () => {
      btnSair.style.background = "rgba(244, 67, 54, 0.3)";
      btnSair.style.boxShadow = "0 0 8px rgba(255, 82, 82, 0.4)";
    };
    btnSair.onmouseout = () => {
      btnSair.style.background = "rgba(244, 67, 54, 0.15)";
      btnSair.style.boxShadow = "none";
    };
  }
  getDBRef("salas/" + codigo + "/estadoJogo").once("value", function (snapshot) {
    if (snapshot.exists()) {
      mesaAnterior = garantirArray(snapshot.val().mesa);
    } else {
      mesaAnterior = Array(7).fill(null);
    }
  });
  ouvirEstadoJogo();
  renderizarMesa();
  renderizarPedrasReserva();
}

// 1. Corrigir o funcionamento do ícone de ações para abrir o card de ações possíveis
document.addEventListener("DOMContentLoaded", function () {
  const iconeAcoes = document.getElementById("icone-acoes");
  const cartaAcoes = document.getElementById("carta-acoes");
  const conteudoAcoes = document.getElementById("conteudo-acoes");
  if (iconeAcoes && cartaAcoes && conteudoAcoes) {
    iconeAcoes.onclick = function () {
      if (cartaAcoes.style.display === "block") {
        cartaAcoes.style.display = "none";
      } else {
        conteudoAcoes.innerHTML = `
              <h3>Ações Possíveis</h3>
              <ul>
                <li><strong>Colocar:</strong> <span class='descricao-acao'>Adiciona pedra à mesa.</span></li>
                <li><strong>Esconder:</strong> <span class='descricao-acao'>Vira uma pedra para baixo.</span></li>
                <li><strong>Trocar:</strong> <span class='descricao-acao'>Troca duas pedras de lugar.</span></li>
                <li><strong>Espiar:</strong> <span class='descricao-acao'>Olha uma pedra virada.</span></li>
                <li><strong>Desafiar:</strong> <span class='descricao-acao'>Testa o oponente sobre uma pedra virada.</span></li>
                <li class="acoes-segabar-intro" style="display:block;width:100%;margin-bottom:8px;">
                  <strong>Se Gabar:</strong> <span class='descricao-acao'>Afirma saber todas as posições. O oponente pode responder com:</span>
                </li>
              </ul>
              <ul class="acoes-segabar-lista">
                <li><strong>Acreditar:</strong> <span>O jogador que fez a ação ganha 1 ponto.</span></li>
                <li><strong>Duvidar:</strong> <span>O jogador deve provar que sabe a combinação das peças.</span>
                  <ul>
                    <li>Se conseguir, <u>vence</u> o jogo <u>imediatamente</u>.</li>
                    <li>Se errar qualquer pedra, o oponente vence.</li>
                  </ul>
                </li>
                <li><strong>Se Gabar:</strong> <span>O oponente diz que também sabe onde estão todas as peças.</span>
                  <ul>
                    <li>Se conseguir, <u>vence</u> o jogo <u>imediatamente</u>.</li>
                    <li>Se errar qualquer pedra, o oponente vence.</li>
                  </ul>
                </li>
              </ul>
            `;
        cartaAcoes.style.display = "block";
      }
    };
  }
});

function alternarLayoutReserva(tipo) {
  // Limpa estado de drag global
  window.dragAtivo = false;
  // Remove listeners globais se necessário
  document.removeEventListener("mousemove", onMove);
  document.removeEventListener("mouseup", onUp);

  if (tipo === "vertical") {
    renderizarPedrasVerticaisAbsoluto(estadoJogo.reserva);
  } else {
    renderizarPedrasCirculo(estadoJogo.reserva, estadoJogo.pedraCentral);
  }
}

// Garantir que ao inserir pedra na mesa, sempre seja um array de 7 slots
// (Já garantido em renderizarPedrasVerticaisAbsoluto, mas reforçado aqui)
function inserirPedraNaMesa(pedraObj, slotAlvo) {
  // Bloqueio: só permite inserir pedra se a pedra central já foi alinhada
  if (!estadoJogo.centralAlinhada) {
    showToastInterno("Aguarde o alinhamento da pedra central!");
    return;
  }
  // Restrição Tutorial
  if (salaAtual === "MODO_TUTORIAL" && window.tellstonesTutorial && window.tellstonesTutorial.passo !== 1) {
    showToastInterno("Siga o tutorial: coloque a pedra no momento certo.");
    return;
  }
  if (!Array.isArray(estadoJogo.mesa) || estadoJogo.mesa.length !== 7) {
    const novaMesa = Array(7).fill(null);
    if (Array.isArray(estadoJogo.mesa)) {
      estadoJogo.mesa.forEach((p, i) => {
        if (p) novaMesa[i] = p;
      });
    }
    estadoJogo.mesa = novaMesa;
  }
  estadoJogo.mesa[slotAlvo] = { ...pedraObj, virada: false };
  // Atualiza apenas os campos necessários, nunca sobrescreva 'vez' aqui
  getDBRef("salas/" + salaAtual + "/estadoJogo").update({
    mesa: estadoJogo.mesa,
    reserva: estadoJogo.reserva
  });
  window.estadoJogo = { ...estadoJogo };
  if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
  console.log(
    "[DEBUG] inserirPedraNaMesa: enviando notificação de pedra colocada"
  );
  enviarNotificacaoGlobal(
    `Pedra (${pedraObj.nome}) foi colocada. <span style='display:inline-block;width:26px;height:26px;background:#fff;border-radius:50%;vertical-align:middle;margin-left:6px;box-shadow:0 1px 4px #0002;'><img src='${pedraObj.url}' alt='${pedraObj.nome}' style='width:22px;height:22px;vertical-align:middle;margin:2px;'></span>`
  );
  avancarTurno(); // Garante que o turno passa após colocar a pedra
}

// Função para saber se é minha vez
function ehMinhaVez() {
  if (!estadoJogo.jogadores || estadoJogo.jogadores.length === 0) return false;
  const idx = estadoJogo.jogadores.findIndex((j) => j.nome === nomeAtual);
  let resultado = false;
  if (estadoJogo.jogadores.length === 2) {
    resultado = estadoJogo.vez === idx;
  } else if (estadoJogo.jogadores.length === 4) {
    resultado = estadoJogo.vez === idx % 2;
  }
  return resultado;
}

// Função para avançar o turno
function avancarTurno() {
  if (!estadoJogo.jogadores || estadoJogo.jogadores.length === 0) return;
  let novoVez = estadoJogo.vez;
  if (estadoJogo.jogadores.length === 2) {
    novoVez = (estadoJogo.vez + 1) % 2;
  } else if (estadoJogo.jogadores.length === 4) {
    novoVez = (estadoJogo.vez + 1) % 2;
  }

  // No modo Tutorial, não queremos que o turno mude automaticamente para o Bot
  if (salaAtual === "MODO_TUTORIAL") {
    const tutorial = window.tellstonesTutorial;
    // Permite trocar turno apenas nos passos onde há interação de jogo real (5, 6, 7, 8)
    // 5: Desafiar Bot, 6: Responder Bot, 7: Se Gabar, 8: Defender Se Gabar
    const passosPermitidos = [5, 6, 7, 8];
    console.log("[DEBUG][TURN] avancarTurno | Tutorial Passo:", tutorial.passo, "Permitido?", passosPermitidos.includes(tutorial.passo));
    if (!tutorial || !passosPermitidos.includes(tutorial.passo)) {
      console.log("[TUTORIAL] Turno travado no jogador para permitir passos sequenciais.");
      window.estadoJogo = { ...estadoJogo };
      if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
      renderizarMesa();
      return;
    }
  }

  estadoJogo.vez = novoVez;
  getDBRef("salas/" + salaAtual + "/estadoJogo/vez").once(
    "value",
    function (snap) {
      getDBRef("salas/" + salaAtual + "/estadoJogo").update({ vez: novoVez });
      atualizarInfoSala(salaAtual, ultimosEspectadores);
      renderizarMesa();
    }
  );
}

// Adicionar função renderizarPedrasMesa de volta
function renderizarPedrasMesa(pedras) {
  if (window.animacaoTrocaEmAndamento) return;
  const wrapper = document.getElementById("tabuleiro-wrapper");
  const pedrasMesa = document.getElementById("pedras-mesa");
  pedrasMesa.innerHTML = "";
  const positions = getSlotPositions(wrapper, 7, 68.39, 40);
  for (let i = 0; i < 7; i++) {
    const p = pedras[i];
    if (p && p.url) {
      const div = document.createElement("div");
      div.className = "pedra-mesa pedra-oficial";
      // Aplica silhueta dourada se for a pedra do desafio
      if (
        estadoJogo.desafio &&
        typeof estadoJogo.desafio.idxPedra === "number" &&
        estadoJogo.desafio.idxPedra === i &&
        estadoJogo.desafio.status === "aguardando_resposta"
      ) {
        div.classList.add("desafio-alvo");
      }
      // Aplica silhueta dourada se for o fluxo de se gabar > duvidar
      if (
        estadoJogo.desafio &&
        estadoJogo.desafio.tipo === "segabar" &&
        (estadoJogo.desafio.status === "responder_pecas" ||
          estadoJogo.desafio.status === "responder_pecas_oponente")
      ) {
        const pedrasViradas = estadoJogo.mesa
          .map((p, idx) => ({ ...p, idx }))
          .filter((p) => p && p.virada);
        const idxAtual = estadoJogo.desafio.idxAtual || 0;
        const idxMesa = pedrasViradas[idxAtual]
          ? pedrasViradas[idxAtual].idx
          : null;
        if (i === idxMesa) {
          div.classList.add("desafio-alvo");
        }
      }
      div.style.left = positions[i].left + "px";
      div.style.top = positions[i].top + "px";
      div.style.position = "absolute";
      div.style.width = "68.39px";
      div.style.height = "68.39px";
      div.style.transform = "translate(-50%, -50%)";
      div.setAttribute("data-idx", i);
      if (p.virada) {
        div.innerHTML = `<div style='width:100%;height:100%;border-radius:50%;background:#fff;border:2px solid #2d8cff;position:relative;'></div>`;
        // Tooltip: Arraste para Mover | 2x Clique para Espiar
        div.onmouseenter = function (e) { showTooltip("Arraste para Mover | 2x Clique para Espiar", e.clientX, e.clientY); };
        div.onmousemove = function (e) { showTooltip("Arraste para Mover | 2x Clique para Espiar", e.clientX, e.clientY); };
        div.onmouseleave = hideTooltip;
        // Animação dourada se for a pedra espiada
        if (estadoJogo.mesaEspiada === i) {
          const fundo = div.querySelector("div");
          if (fundo) fundo.classList.add("borda-dourada-animada");
        }
        // Permitir ao desafiante selecionar a pedra virada para o desafio (apenas se virada para baixo)
        if (
          estadoJogo.desafio &&
          estadoJogo.desafio.status === "selecionando" &&
          estadoJogo.alinhamentoFeito &&
          ehMinhaVez()
        ) {
          div.style.cursor = "pointer";
          div.onclick = function (e) {
            e.stopPropagation();
            if (window.tellstonesTutorial && !window.tellstonesTutorial.verificarAcao("SELECIONAR_DESAFIO")) return;
            tocarSomClick();
            if (!estadoJogo.mesa[i] || !estadoJogo.mesa[i].virada) return;
            adicionarSilhuetaEspiada(i);
            showToastInterno("Aguarde o oponente escolher a pedra!");
            const pedrasMesa = document.querySelectorAll(".pedra-mesa");
            pedrasMesa.forEach((d) => {
              d.onclick = null;
              d.style.cursor = "not-allowed";
            });
            // Atualiza o objeto completo do desafio no Firebase para garantir sincronização
            const desafioAtual = estadoJogo.desafio || {};
            desafioAtual.idxPedra = i;
            desafioAtual.status = "aguardando_resposta";
            getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").set(
              desafioAtual
            );
            if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
            window.selecionandoDesafio = false;
          };
        } else if (
          !estadoJogo.desafio &&
          estadoJogo.alinhamentoFeito &&
          ehMinhaVez()
        ) {
          // Permitir espiar normalmente
          div.ondblclick = function () {
            if (window.tellstonesTutorial && !window.tellstonesTutorial.verificarAcao("ESPIAR_PEDRA")) return;
            tocarSomClick();
            espiarPedra(i);
          };
          div.style.cursor = "pointer";
          div.title = "Espiar pedra (duplo clique)";
        } else {
          div.onclick = null;
          div.style.cursor = "not-allowed";
        }
        // Permitir drag & drop APENAS se for a vez do jogador
        // Permitir drag & drop APENAS se for a vez do jogador
        // Restrição Tutorial: Strict Mode
        if (ehMinhaVez()) {
          div.setAttribute("draggable", "true");
          div.ondragstart = (e) => {
            if (window.tellstonesTutorial && !window.tellstonesTutorial.verificarAcao("TROCAR_PEDRAS")) {
              e.preventDefault();
              return;
            }
            tocarSomClick();
            setTimeout(() => div.classList.add("pedra-troca-selecionada"), 0);
            e.dataTransfer.setData("idx", i);
          };
          div.ondragend = () => {
            div.classList.remove("pedra-troca-selecionada");
          };
          div.ondragover = (e) => {
            e.preventDefault();
            div.classList.add("pedra-drop-alvo");
          };
          div.ondragleave = (e) => {
            div.classList.remove("pedra-drop-alvo");
          };
          div.ondrop = (e) => {
            e.preventDefault();
            div.classList.remove("pedra-drop-alvo");
            const fromIdxDrop = parseInt(e.dataTransfer.getData("idx"));
            if (fromIdxDrop === i) return;
            getDBRef("salas/" + salaAtual + "/estadoJogo").update({
              trocaAnimacao: {
                from: fromIdxDrop,
                to: i,
                timestamp: Date.now(),
                jogador: nomeAtual
              }
            });
            showToastInterno("Pedras trocadas!");
            // Removido avancarTurno() aqui
          };
        } else {
          div.setAttribute("draggable", "false");
          div.ondragstart = null;
          div.ondragend = null;
          div.ondragover = null;
          div.ondragleave = null;
          div.ondrop = null;
          div.style.cursor = "not-allowed";
        }
      } else {
        // Pedra virada para cima: nunca permitir clique para desafio
        div.innerHTML = `<img src=\"${p.url}\" alt=\"${p.nome}\" draggable=\"false\">`;
        // Tooltip: Arraste para Mover | 2x Clique para Esconder
        div.onmouseenter = function (e) { showTooltip("Arraste para Mover | 2x Clique para Esconder", e.clientX, e.clientY); };
        div.onmousemove = function (e) { showTooltip("Arraste para Mover | 2x Clique para Esconder", e.clientX, e.clientY); };
        div.onmouseleave = hideTooltip;
        div.onclick = null;
        div.ondblclick = null;
        div.style.cursor = "not-allowed";

        // Interação para responder desafio (Se Gabar / Desafio Normal)
        if (
          estadoJogo.desafio &&
          estadoJogo.desafio.status === "responder_pecas" &&
          estadoJogo.desafio.jogador === nomeAtual &&
          ehMinhaVez()
        ) {
          div.onclick = function () {
            if (window.tellstonesTutorial && !window.tellstonesTutorial.verificarAcao("RESPONDER_DESAFIO")) return;
            tocarSomClick();
            abrirSeletorPedra(i);
          };
          div.style.cursor = "pointer";
          div.title = "Selecionar pedra";
          // IMPORTANTE: Impede outros eventos (drag/flip) retornando o tratamento aqui
          // Mas como estamos dentro do loop, usamos continue se fosse loop, mas aqui é função do forEach.
          // Vamos garantir que bloco de flip/drag não rode se entrar aqui.
        }

        // Permitir virar se for a vez do jogador e NÃO estiver respondendo desafio
        if (estadoJogo.alinhamentoFeito && ehMinhaVez() &&
          (!estadoJogo.desafio || estadoJogo.desafio.status !== "responder_pecas")
        ) {
          div.ondblclick = function () {
            const idx = parseInt(div.getAttribute("data-idx"));
            if (estadoJogo.mesa[idx] && !estadoJogo.mesa[idx].virada) {
              // Restrição Tutorial: Strict Mode
              if (window.tellstonesTutorial && !window.tellstonesTutorial.verificarAcao("VIRAR_PEDRA")) return;
              tocarSomClick();

              estadoJogo.mesa[idx].virada = true;
              salvarEstadoJogo();
              console.log(
                "[DEBUG] renderizarPedrasMesa: enviando notificação de pedra virada"
              );
              enviarNotificacaoGlobal(
                `Pedra (${estadoJogo.mesa[idx].nome}) foi virada.`
              );
              if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
              avancarTurno();
            }
          };
          div.style.cursor = "pointer";
          div.title = "Virar pedra (duplo clique)";
        }
        if (ehMinhaVez()) {
          div.setAttribute("draggable", "true");
          div.ondragstart = (e) => {
            setTimeout(() => div.classList.add("pedra-troca-selecionada"), 0);
            e.dataTransfer.setData("idx", i);
          };
          div.ondragend = () => {
            div.classList.remove("pedra-troca-selecionada");
          };
          div.ondragover = (e) => {
            e.preventDefault();
            div.classList.add("pedra-drop-alvo");
          };
          div.ondragleave = (e) => {
            div.classList.remove("pedra-drop-alvo");
          };
          div.ondrop = (e) => {
            e.preventDefault();
            div.classList.remove("pedra-drop-alvo");
            const idxReserva = e.dataTransfer.getData("idxReserva");
            if (idxReserva) {
              // Veio da reserva
              const rIdx = parseInt(idxReserva);
              const pedraObj = estadoJogo.reserva[rIdx];
              if (pedraObj) {
                estadoJogo.reserva[rIdx] = null;
                inserirPedraNaMesa(pedraObj, i);
              }
            } else {
              // Veio da mesa
              const fromIdxDrop = parseInt(e.dataTransfer.getData("idx"));
              if (isNaN(fromIdxDrop) || fromIdxDrop === i) return;
              getDBRef("salas/" + salaAtual + "/estadoJogo").update({
                trocaAnimacao: {
                  from: fromIdxDrop,
                  to: i,
                  timestamp: Date.now(),
                  jogador: nomeAtual
                }
              });
              showToastInterno("Pedras trocadas!");
            }
          };
        } else {
          div.setAttribute("draggable", "false");
          div.ondragstart = null;
          div.ondragend = null;
          div.ondragover = null;
          div.ondragleave = null;
          div.ondrop = null;
          div.style.cursor = "not-allowed";
        }
      }
      pedrasMesa.appendChild(div);
    }
  }
}

// Restaurar função mostrarEscolhaCaraCoroa
function mostrarEscolhaCaraCoroa() {
  const escolha = document.getElementById("escolha-cara-coroa");
  if (escolha) {
    escolha.style.display = "flex";
    escolha.style.alignItems = "center";
    escolha.style.justifyContent = "center";
    escolha.style.zIndex = 4000;
    escolha.style.visibility = "visible";
    escolha.style.opacity = "1";
  }
}

// Garante que o valor é sempre um array, mesmo se vier como objeto do Firebase
function garantirArray(objOuArray) {
  if (Array.isArray(objOuArray)) return objOuArray;
  if (typeof objOuArray === "object" && objOuArray !== null) {
    // Se for objeto, monta um array de 7 posições
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

// Função para enviar notificação global para todos os jogadores
function enviarNotificacaoGlobal(msg) {
  if (!salaAtual) return;
  getDBRef("salas/" + salaAtual + "/notificacoes").push(msg);
}

// Exemplo de função para espiar uma pedra virada (toast privado)
function espiarPedra(idx) {
  if (estadoJogo.mesa[idx] && estadoJogo.mesa[idx].virada) {
    const pedra = estadoJogo.mesa[idx];
    showToastInterno(
      `Você espiou: ${pedra.nome} <span style='display:inline-block;width:44px;height:44px;background:#fff;border-radius:50%;vertical-align:middle;margin-left:8px;box-shadow:0 1px 4px #0002;'><img src='${pedra.url}' alt='${pedra.nome}' style='width:40px;height:40px;vertical-align:middle;margin:2px;'></span>`
    );
    // Notifica todos os outros jogadores que alguém espiou
    getDBRef("salas/" + salaAtual + "/notificacoes").push({
      msg: `${nomeAtual} espiou uma pedra.`,
      skip: nomeAtual
    });
    // Salva só o campo mesaEspiada no Firebase
    // Salva só o campo mesaEspiada no Firebase
    getDBRef("salas/" + salaAtual + "/estadoJogo").update({ mesaEspiada: idx });

    // Tutorial: Marca passo como concluído
    if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();

    setTimeout(() => {
      getDBRef("salas/" + salaAtual + "/estadoJogo/mesaEspiada").remove();
    }, 2200);
    avancarTurno();
  } else {
    showToastInterno("Só é possível espiar pedras viradas.");
  }
}

function adicionarSilhuetaEspiada(idx) {
  // Procura o elemento da pedra na mesa
  const pedrasMesa = document.getElementById("pedras-mesa");
  if (!pedrasMesa) return;
  const div = pedrasMesa.querySelector(`[data-idx='${idx}']`);
  if (!div) return;
  // Seleciona o fundo branco
  const fundo = div.querySelector("div");
  // Salva os borders e classes anteriores
  const borderPaiAnterior = div.style.border;
  const borderFundoAnterior = fundo ? fundo.style.border : undefined;
  const classesOriginais = div.className;
  // Remove as classes que aplicam o border azul
  div.classList.remove("pedra-mesa", "pedra-oficial");
  // Força o border dourado inline
  div.style.border = "9px solid #ffd700";
  if (fundo) fundo.style.border = "9px solid #ffd700";
  div.classList.add("pedra-drop-alvo");
  if (fundo) fundo.classList.add("pedra-drop-alvo");
  setTimeout(() => {
    div.className = classesOriginais;
    div.classList.remove("pedra-drop-alvo");
    if (fundo) fundo.classList.remove("pedra-drop-alvo");
    div.style.border = borderPaiAnterior || "";
    if (fundo) fundo.style.border = borderFundoAnterior || "";
  }, 2200);
}

window.addEventListener("click", function ativarSomFundo() {
  const somFundo = document.getElementById("som-fundo");
  if (somFundo && somFundo.paused) {
    somFundo.volume = 0.5;
    somFundo.play().catch(() => { });
  }
  window.removeEventListener("click", ativarSomFundo);
});

function garantirAudioFundoCarregado() {
  const somFundo = document.getElementById("som-fundo");
  if (somFundo) {
    somFundo.onerror = function () {
      somFundo.src =
        "https://raw.githubusercontent.com/AliceDeSa/Tellstones/main/ambient.mp3";
      somFundo.load();
      somFundo.play().catch(() => { });
    };
  }
}
garantirAudioFundoCarregado();

// Função para renderizar as opções de desafio para o oponente
function renderizarOpcoesDesafio() {
  // Só mostra se houver desafio pendente, for oponente e NÃO for do tipo 'segabar'
  console.log("[DEBUG][UI] renderizarOpcoesDesafio | Desafio:", estadoJogo.desafio ? "Sim" : "Não");
  if (estadoJogo.desafio) {
    console.log("[DEBUG][UI] Status:", estadoJogo.desafio.status, "Tipo:", estadoJogo.desafio.tipo, "Jogador:", estadoJogo.desafio.jogador);
  }

  if (
    !estadoJogo.desafio ||
    estadoJogo.desafio.status !== "aguardando_resposta" ||
    estadoJogo.desafio.tipo === "segabar"
  ) {
    // Esconde o container se não for para mostrar
    console.log("[DEBUG][UI] Escondendo opcoes-desafio (Condição de saída atendida)");
    const antigo = document.getElementById("opcoes-desafio");
    if (antigo) antigo.style.display = "none";
    return;
  }
  if (ehMinhaVez()) {
    console.log("[DEBUG][UI] renderizarOpcoesDesafio: É minha vez, retornando (Oponente só vê).");
    return;
  }
  // Cria ou seleciona o container
  let container = document.getElementById("opcoes-desafio");
  if (!container) {
    container = document.createElement("div");
    container.id = "opcoes-desafio";
    container.style.display = "flex";
    container.style.justifyContent = "center";
    container.style.margin = "0 auto";
    container.style.padding = "0";
    container.style.background = "transparent";
    container.style.border = "none";
    container.style.boxShadow = "none";
    container.style.position = "relative";
    // Forçar sempre no Body para garantir visibilidade (Nuclear Fix)
    // Restaurar hierarquia original (dentro do tabuleiro-center)
    const tabuleiroCenter = document.getElementById("tabuleiro-center");
    if (tabuleiroCenter) {
      if (!tabuleiroCenter.contains(container)) {
        tabuleiroCenter.insertBefore(container, tabuleiroCenter.firstChild);
      }
    } else {
      document.body.appendChild(container); // Fallback apenas se não achar
    }

    // Aplicar estilos: Absolute para não empurrar, Width 740px (igual mesa)
    container.style.cssText = "display: flex; justify-content: center; top: 7%; left: 50%; transform: translateX(-50%); padding: 0px; background: transparent; border: none; box-shadow: none; position: absolute; z-index: 99999; width: 740px; flex-direction: column; align-items: center;";

  } else {
    container.innerHTML = "";
    container.style.display = "flex";
  }
  // Novo: criar box-desafio para envolver título e pedras
  const box = document.createElement("div");
  box.className = "box-desafio";
  // Adiciona o título acima das pedras
  const titulo = document.createElement("div");
  titulo.className = "titulo-desafio";
  titulo.innerText = "Adivinhe a peça do desafio!";
  box.appendChild(titulo);
  // Linha de pedras
  const linha = document.createElement("div");
  linha.className = "linha-pedras";
  // Ordem fixa das pedras oficiais
  const pedrasOficiais = [
    {
      nome: "Coroa",
      url: "assets/img/Coroa.svg"
    },
    {
      nome: "Espada",
      url: "assets/img/espada.svg"
    },
    {
      nome: "Balança",
      url: "assets/img/Balança.svg"
    },
    {
      nome: "Cavalo",
      url: "assets/img/cavalo.svg"
    },
    {
      nome: "Escudo",
      url: "assets/img/escudo.svg"
    },
    {
      nome: "Bandeira",
      url: "assets/img/bandeira.svg"
    },
    {
      nome: "Martelo",
      url: "assets/img/martelo.svg"
    }
  ];
  pedrasOficiais.forEach((p, idx) => {
    const btn = document.createElement("button");
    btn.className = "pedra-reserva";
    btn.innerHTML = `<img src="${p.url}" alt="${p.nome}">`;
    btn.onclick = function () {
      tocarSomClick();
      estadoJogo.desafio.escolhaOponente = idx;
      estadoJogo.desafio.status = "resolvido";
      salvarEstadoJogo();
      resolverDesafioSeNecessario(); // Force logic execution
      renderizarMesa();
      container.style.display = "none";

      // Update tutorial if needed
      if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
    };
    linha.appendChild(btn);
  });
  box.appendChild(linha);
  container.appendChild(box);
  // Adicionar destaque durante o fluxo de se gabar + duvidar
  if (
    estadoJogo.desafio &&
    estadoJogo.desafio.tipo === "segabar" &&
    estadoJogo.desafio.status === "responder_pecas"
  ) {
    // Descobrir todas as pedras viradas para baixo na mesa (em ordem)
    const pedrasViradas = estadoJogo.mesa
      .map((p, idx) => ({ ...p, idx }))
      .filter((p) => p && p.virada);
    const idxAtual = estadoJogo.desafio.idxAtual || 0;
    const idxMesa = pedrasViradas[idxAtual]
      ? pedrasViradas[idxAtual].idx
      : null;
    const pedrasMesa = document.querySelectorAll(".pedra-mesa");
    pedrasMesa.forEach((el, i) => {
      if (i === idxMesa) {
        el.classList.add("desafio-alvo");
      } else {
        el.classList.remove("desafio-alvo");
      }
    });
  }
}

// Chamar renderizarOpcoesDesafio sempre que o estado do jogo mudar
const oldOuvirEstadoJogo = ouvirEstadoJogo;
ouvirEstadoJogo = function () {
  oldOuvirEstadoJogo.apply(this, arguments);
  setTimeout(renderizarOpcoesDesafio, 100); // Garante que a UI já foi atualizada
  setTimeout(renderizarOpcoesSegabar, 100); // Garante que a UI de Se Gabar também seja atualizada
  setTimeout(renderizarRespostaSegabar, 100); // Garante que a UI de Resposta ao Se Gabar seja atualizada (Correção)
};

// Função para resolver o desafio após a escolha do oponente
function resolverDesafioSeNecessario() {
  if (!estadoJogo.desafio || estadoJogo.desafio.status !== "resolvido") {
    window.resolvendoDesafio = false;
    return;
  }
  if (window.resolvendoDesafio) return;
  // Só o desafiante executa a pontuação, EXCETO no Tutorial onde o local script manda
  if (!ehMinhaVez() && salaAtual !== "MODO_TUTORIAL") return;
  window.resolvendoDesafio = true;
  const idxPedra = estadoJogo.desafio.idxPedra;
  const idxEscolhida = estadoJogo.desafio.escolhaOponente;
  // Salvar nomes antes de atualizar placar/turno
  const desafiante = estadoJogo.jogadores[estadoJogo.vez]?.nome;
  const oponente =
    estadoJogo.jogadores[(estadoJogo.vez + 1) % estadoJogo.jogadores.length]
      ?.nome;
  // Lista das 7 pedras oficiais (ordem fixa)
  const pedrasOficiais = [
    {
      nome: "Coroa",
      url: "assets/img/Coroa.svg"
    },
    {
      nome: "Espada",
      url: "assets/img/espada.svg"
    },
    {
      nome: "Balança",
      url: "assets/img/Balança.svg"
    },
    {
      nome: "Cavalo",
      url: "assets/img/cavalo.svg"
    },
    {
      nome: "Escudo",
      url: "assets/img/escudo.svg"
    },
    {
      nome: "Bandeira",
      url: "assets/img/bandeira.svg"
    },
    {
      nome: "Martelo",
      url: "assets/img/martelo.svg"
    }
  ];
  // Revela a pedra
  if (estadoJogo.mesa[idxPedra]) {
    estadoJogo.mesa[idxPedra].virada = false;
  }
  // Verifica se acertou
  const nomePedraMesa = estadoJogo.mesa[idxPedra]
    ? estadoJogo.mesa[idxPedra].nome
    : "";
  const nomePedraEscolhida = pedrasOficiais[idxEscolhida].nome;
  let acertou = nomePedraMesa === nomePedraEscolhida;
  // Atualiza placar
  if (acertou) {
    // O oponente ganha 1 ponto
    const idxOponente = (estadoJogo.vez + 1) % estadoJogo.jogadores.length;
    estadoJogo.jogadores[idxOponente].pontos++;
  } else {
    // O desafiante ganha 1 ponto
    estadoJogo.jogadores[estadoJogo.vez].pontos++;
  }
  // Atualiza mesa, jogadores e remove desafio
  const jogadoresAtualizados = estadoJogo.jogadores.map((j) => ({ ...j }));
  const mesaAtualizada = estadoJogo.mesa.map((p) => (p ? { ...p } : null));

  // Troca de turno após desafio
  const proximaVez = (estadoJogo.vez + 1) % estadoJogo.jogadores.length;
  estadoJogo.vez = proximaVez;

  getDBRef("salas/" + salaAtual + "/estadoJogo").update({
    jogadores: jogadoresAtualizados,
    mesa: mesaAtualizada,
    vez: proximaVez
  });
  getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();

  // Feedback imediato para o Tutorial
  if (salaAtual === "MODO_TUTORIAL") {
    const msg = acertou
      ? "Você acertou! O Mestre errou o desafio."
      : "Você errou! O Mestre marcou ponto.";
    showToastInterno(msg);

    // Força verificação do tutorial após atualização de turno
    if (window.tellstonesTutorial) {
      setTimeout(() => window.tellstonesTutorial.registrarAcaoConcluida(), 500);
    }
  }

  // Mensagem Global
  setTimeout(() => {
    // Notificação para todos os jogadores
    enviarNotificacaoGlobal(
      acertou
        ? `${oponente} acertou o desafio!`
        : `${oponente} errou o desafio! ${desafiante} marcou ponto!`
    );
    // Notificação local personalizada
    if (nomeAtual === desafiante) {
      showToast(
        acertou
          ? "Você desafiou e o oponente acertou!"
          : "Você desafiou e o oponente errou! Você marcou ponto!"
      );
    } else if (nomeAtual === oponente) {
      showToast(
        acertou
          ? "Você foi desafiado e acertou o desafio!"
          : "Você foi desafiado e errou o desafio!"
      );
    }
    // Limpa desafio e passa turno
    window.resolvendoDesafio = false;
    avancarTurno();
  }, 1200);
}

// Chamar resolverDesafioSeNecessario sempre que o estado do jogo mudar
const oldOuvirEstadoJogo2 = ouvirEstadoJogo;
ouvirEstadoJogo = function () {
  oldOuvirEstadoJogo2.apply(this, arguments);
  setTimeout(renderizarOpcoesDesafio, 100);
  setTimeout(resolverDesafioSeNecessario, 200);
};

// Bloquear interações durante desafio
function bloquearAcoesDuranteDesafio() {
  if (
    estadoJogo.desafio &&
    (estadoJogo.desafio.status === "aguardando_resposta" ||
      estadoJogo.desafio.status === "resolvido" ||
      estadoJogo.desafio.status === "responder_pecas" ||
      estadoJogo.desafio.status === "verificar_respostas" ||
      estadoJogo.desafio.status === "responder_pecas_oponente" ||
      estadoJogo.desafio.status === "verificar_respostas_oponente")
  ) {
    // Bloqueia pedras da mesa
    const pedrasMesa = document.querySelectorAll(".pedra-mesa, .pedra-oficial");
    pedrasMesa.forEach((div) => {
      // Exceção: Se estiver respondendo ao desafio (Se Gabar ou Desafio Normal)
      // E for a vez do jogador atual responder
      if (
        (estadoJogo.desafio.status === "responder_pecas" && estadoJogo.desafio.jogador === nomeAtual) ||
        (estadoJogo.desafio.status === "responder_pecas_oponente" && estadoJogo.desafio.jogador !== nomeAtual)
      ) {
        div.style.cursor = "pointer";
        // Não remove listeners, permite que renderizarMesa defina os cliques de resposta
        return;
      }

      div.onclick = null;
      div.ondblclick = null;
      div.onmousedown = null;
      div.draggable = false;
      div.style.cursor = "not-allowed";
    });
    // Bloqueia pedras da reserva
    const pedrasReserva = document.querySelectorAll(".pedra-reserva");
    pedrasReserva.forEach((div) => {
      div.onclick = null;
      div.ondblclick = null;
      div.onmousedown = null;
      div.draggable = false;
      div.style.cursor = "not-allowed";
    });
    // Desabilita botões de ação
    const btns = [
      document.getElementById("btn-desafiar"),
      document.getElementById("btn-segabar")
    ];
    btns.forEach((btn) => {
      if (btn) btn.disabled = true;
    });
  } else {
    // Reabilita botões de ação
    const btns = [
      document.getElementById("btn-desafiar"),
      document.getElementById("btn-segabar")
    ];
    btns.forEach((btn) => {
      if (btn) btn.disabled = false;
    });
  }
}
// Chamar após renderizar mesa e reserva
const oldRenderizarMesa = renderizarMesa;
renderizarMesa = function () {
  oldRenderizarMesa.apply(this, arguments);
  bloquearAcoesDuranteDesafio();
};
const oldRenderizarPedrasReserva = renderizarPedrasReserva;
renderizarPedrasReserva = function () {
  oldRenderizarPedrasReserva.apply(this, arguments);
  bloquearAcoesDuranteDesafio();
};

// Evento para o botão de se gabar
const btnSegabar = document.getElementById("btn-segabar");
if (btnSegabar) {
  btnSegabar.onclick = function () {
    if (!ehMinhaVez()) {
      // EXCEÇÃO TUTORIAL: Se estiver no passo 7 (Se Gabar), permitir mesmo que a vez esteja desincronizada
      if (salaAtual === "MODO_TUTORIAL" && window.tellstonesTutorial && window.tellstonesTutorial.passo === 7) {
        // Permite passar
        console.warn("[TUTORIAL] Forçando permissão de Se Gabar no passo 7.");
      } else {
        showToastInterno("Aguarde sua vez!");
        return;
      }
    }
    // Restrição Tutorial: Strict Mode
    if (salaAtual === "MODO_TUTORIAL" && window.tellstonesTutorial) {
      if (!window.tellstonesTutorial.verificarAcao("BOTAO_SE_GABAR")) return;
    }
    // Restrição Tutorial
    // Restrição Tutorial
    if (salaAtual === "MODO_TUTORIAL" && window.tellstonesTutorial && window.tellstonesTutorial.passo !== 7) {
      showToastInterno("Siga o tutorial: use 'Se Gabar' no momento certo.");
      return;
    }
    // Bloqueio: só permite se houver pelo menos uma pedra virada para baixo
    const pedrasViradas = estadoJogo.mesa.filter((p) => p && p.virada);
    if (!pedrasViradas.length) {
      showToastInterno("Não há pedras viradas para baixo para se gabar!");
      return;
    }
    // Travar todos os botões do jogador
    btnSegabar.disabled = true;
    const btnDesafiar = document.getElementById("btn-desafiar");
    if (btnDesafiar) btnDesafiar.disabled = true;
    // Sinalizar no estado que está aguardando resposta do oponente
    estadoJogo.desafio = {
      tipo: "segabar",
      status: "aguardando_resposta",
      jogador: nomeAtual
    };
    salvarEstadoJogo();
    bloquearAcoesDuranteDesafio();
    showToastInterno("Aguardando resposta do oponente...");
  };
}

// Renderizar opções de resposta ao Se Gabar
function renderizarOpcoesSegabar() {
  if (
    !estadoJogo.desafio ||
    estadoJogo.desafio.tipo !== "segabar" ||
    estadoJogo.desafio.status !== "aguardando_resposta"
  ) {
    // Esconde o container se não for para mostrar
    const antigo = document.getElementById("opcoes-segabar");
    if (antigo) antigo.style.display = "none";
    return;
  }
  // Sempre que mostrar o segabar, esconde o de desafio normal
  const desafioNormal = document.getElementById("opcoes-desafio");
  if (desafioNormal) desafioNormal.style.display = "none";
  // Se eu sou o jogador que está se gabando, eu não vejo as opções de resposta (acreditar/duvidar)
  if (estadoJogo.desafio.jogador === nomeAtual) return;
  // Cria ou seleciona o container exclusivo
  let container = document.getElementById("opcoes-segabar");
  if (!container) {
    container = document.createElement("div");
    container.id = "opcoes-segabar";
    container.style.display = "flex";
    container.style.justifyContent = "center";
    container.style.margin = "0 auto";
    container.style.padding = "0";
    container.style.background = "transparent";
    container.style.border = "none";
    container.style.boxShadow = "none";
    container.style.position = "relative";
    // Forçar sempre no Body para garantir visibilidade (Nuclear Fix)
    // Forçar sempre no Body para garantir visibilidade (Nuclear Fix) e usar position fixed
    document.body.appendChild(container);
    container.style.cssText = "display: flex; justify-content: center; top: 11%; left: 50%; transform: translateX(-50%); padding: 0px; background: transparent; border: none; box-shadow: none; position: fixed; z-index: 99999; width: 740px; flex-direction: column; align-items: center;";


  } else {
    container.innerHTML = "";
    container.style.display = "flex";
  }
  // Box para alinhar os botões
  const box = document.createElement("div");
  box.className = "box-desafio";
  box.style.display = "flex";
  box.style.flexDirection = "row";
  box.style.justifyContent = "center";
  box.style.alignItems = "center";
  box.style.gap = "18px";
  // Botão Acreditar
  const btnAcreditar = document.createElement("button");
  btnAcreditar.innerText = "Acreditar";
  btnAcreditar.className = "acao-btn";
  btnAcreditar.style.margin = "0 12px";
  btnAcreditar.onclick = function () {
    if (window.tellstonesTutorial && !window.tellstonesTutorial.verificarAcao("RESPONDER_DESAFIO")) return;
    console.log("[DEBUG] Clique em Acreditar");
    // Encontra o índice do jogador que se gabou
    const idx = estadoJogo.jogadores.findIndex(
      (j) => j.nome === estadoJogo.desafio.jogador
    );
    if (idx !== -1) estadoJogo.jogadores[idx].pontos++;

    // Feedback explícito e correção de turno para Tutorial
    if (salaAtual === "MODO_TUTORIAL") {
      showToastInterno(`Você acreditou. O Mestre marcou ponto!`);
      estadoJogo.vez = 1; // Devolve a vez para o jogador (Index 1)
      getDBRef("salas/" + salaAtual + "/estadoJogo").update({
        jogadores: estadoJogo.jogadores,
        vez: 1
      });
      getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
      container.style.display = "none";

      if (window.tellstonesTutorial) {
        setTimeout(() => window.tellstonesTutorial.registrarAcaoConcluida(), 500);
      }
      return;
    }

    // Remove o desafio e atualiza apenas os campos necessários
    const jogadoresAtualizados = estadoJogo.jogadores.map((j) => ({ ...j }));
    getDBRef("salas/" + salaAtual + "/estadoJogo").update({
      jogadores: jogadoresAtualizados
    });
    getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
    showToast("O jogador ganhou 1 ponto!");
    // Esconde o container para todos
    container.style.display = "none";
    avancarTurno();
  };
  // Botão Duvidar
  const btnDuvidar = document.createElement("button");
  btnDuvidar.innerText = "Duvidar";
  btnDuvidar.className = "acao-btn";
  btnDuvidar.style.margin = "0 12px";
  btnDuvidar.onclick = function () {
    if (window.tellstonesTutorial && !window.tellstonesTutorial.verificarAcao("RESPONDER_DESAFIO")) return;
    // Lógica especial para Tutorial (Auto-Resolução)
    if (salaAtual === "MODO_TUTORIAL") {
      showToastInterno("Você duvidou! O Mestre vai provar...");
      setTimeout(() => {
        // Simula o Mestre acertando todas (ele é perfeito) e pontuando
        showToastInterno("Mestre revelou as pedras e acertou! Ponto para ele.");
        // Bot ganha ponto
        const idxBot = estadoJogo.jogadores.findIndex(j => j.nome === "Mestre");
        if (idxBot !== -1) estadoJogo.jogadores[idxBot].pontos++;

        estadoJogo.vez = 1; // Devolve vez ao jogador (Index 1)
        getDBRef("salas/" + salaAtual + "/estadoJogo").update({
          jogadores: estadoJogo.jogadores,
          vez: 1
        });
        getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
        container.style.display = "none";

        if (window.tellstonesTutorial) {
          setTimeout(() => window.tellstonesTutorial.registrarAcaoConcluida(), 500);
        }
      }, 1500);
      return;
    }

    // Inicia o fluxo de resposta para o jogador que se gabou
    estadoJogo.desafio.status = "responder_pecas";
    estadoJogo.desafio.idxAtual = 0;
    estadoJogo.desafio.respostas = [];
    salvarEstadoJogo();
    // Esconde o container de botões
    container.style.display = "none";
  };
  // Botão Se Gabar Também
  const btnSegabarTambem = document.createElement("button");
  btnSegabarTambem.innerText = "Se Gabar Também";
  btnSegabarTambem.className = "acao-btn";
  btnSegabarTambem.style.margin = "0 12px";
  btnSegabarTambem.onclick = function () {
    if (window.tellstonesTutorial && !window.tellstonesTutorial.verificarAcao("RESPONDER_DESAFIO")) return;
    // Lógica correta de Counter-Boast: Inverte quem está se gabando e aguarda resposta do oponente original
    estadoJogo.desafio.jogador = nomeAtual;
    estadoJogo.desafio.status = "aguardando_resposta";

    // Se for Tutorial, precisamos notificar para o Bot reagir
    if (salaAtual === "MODO_TUTORIAL") {
      // O Tutorial.js vai detectar 'aguardando_resposta' + 'Aprendiz' e fazer o Bot Duvidar
      if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
    }

    salvarEstadoJogo();
    container.style.display = "none";
  };
  // (Ainda não implementa ações)
  box.appendChild(btnAcreditar);
  box.appendChild(btnDuvidar);
  box.appendChild(btnSegabarTambem);
  container.appendChild(box);
}

// Chamar renderizarOpcoesSegabar sempre que o estado do jogo mudar
const oldOuvirEstadoJogoSegabar = ouvirEstadoJogo;
ouvirEstadoJogo = function () {
  oldOuvirEstadoJogoSegabar.apply(this, arguments);
  setTimeout(renderizarOpcoesDesafio, 100);
  setTimeout(renderizarOpcoesSegabar, 100);
  setTimeout(renderizarRespostaSegabar, 100);
  setTimeout(resolverDesafioSeNecessario, 200);
};

// Renderizar interface de resposta do Se Gabar para o jogador que se gabou
// Renderizar interface de resposta do Se Gabar para o jogador que se gabou
function renderizarRespostaSegabar() {
  console.log("[DEBUG][UI] renderizarRespostaSegabar | Chamado.");
  if (!estadoJogo.desafio) {
    console.log("[DEBUG][UI] renderizarRespostaSegabar | Sem desafio ativo.");
    return;
  }
  console.log("[DEBUG][UI] renderizarRespostaSegabar | Estado:", estadoJogo.desafio.tipo, estadoJogo.desafio.status, "Jogador:", estadoJogo.desafio.jogador);

  if (
    estadoJogo.desafio.tipo !== "segabar" ||
    estadoJogo.desafio.status !== "responder_pecas"
  ) {
    console.log("[DEBUG][UI] renderizarRespostaSegabar | Tipo ou Status incorreto. Saindo.");
    return;
  }

  // Só o jogador que se gabou vê
  // EXCEÇÃO TUTORIAL: Se for "Aprendiz", mostramos para o usuário local (independente do nome real)
  const ehTutorialAprendiz = salaAtual === "MODO_TUTORIAL" && estadoJogo.desafio.jogador === "Aprendiz";
  console.log("[DEBUG][UI] renderizarRespostaSegabar | NomeAuth:", nomeAtual, "Target:", estadoJogo.desafio.jogador, "EhTutorial:", ehTutorialAprendiz);

  if (nomeAtual !== estadoJogo.desafio.jogador && !ehTutorialAprendiz) {
    console.log("[DEBUG][UI] Não sou o jogador do desafio. Retornando.");
    return;
  }

  console.log("[DEBUG][UI] renderizarRespostaSegabar | Renderizando UI de Prova...");
  // Descobrir todas as pedras viradas para baixo na mesa (em ordem)
  const pedrasViradas = estadoJogo.mesa
    .map((p, idx) => ({ ...p, idx }))
    .filter((p) => p && p.virada);
  const idxAtual = estadoJogo.desafio.idxAtual || 0;
  console.log("[DEBUG][UI] renderizarRespostaSegabar | Index Atual:", idxAtual, "Total:", pedrasViradas.length);

  // Reutiliza o container do desafio (Agora com ID único para evitar conflitos)
  let container = document.getElementById("opcoes-resposta-segabar");
  if (!container) {
    container = document.createElement("div");
    container.id = "opcoes-resposta-segabar";
    container.style.display = "flex";
    container.style.justifyContent = "center";
    container.style.margin = "0 auto";
    container.style.padding = "0";
    container.style.background = "transparent";
    container.style.border = "none";
    container.style.boxShadow = "none";
    container.style.position = "relative";

    // Forçar sempre no Body para garantir visibilidade (Nuclear Fix) e usar position fixed
    document.body.appendChild(container);
    container.style.cssText = "display: flex; justify-content: center; top: 5%; left: 50%; transform: translateX(-50%); padding: 0px; background: transparent; border: none; box-shadow: none; position: fixed; z-index: 99999; width: 740px; flex-direction: column; align-items: center;";

  } else {
    container.innerHTML = "";
    container.style.display = "flex";
  }
  // Box para alinhar
  const box = document.createElement("div");
  box.className = "box-desafio";
  // Título
  const titulo = document.createElement("div");
  titulo.className = "titulo-desafio";
  titulo.innerText = `Qual é a pedra na posição ${pedrasViradas[idxAtual].idx + 1}?`;
  box.appendChild(titulo);
  // Destaque dourado na pedra da mesa correspondente
  const pedrasMesa = document.querySelectorAll(".pedra-mesa");
  pedrasMesa.forEach((el) => {
    const idxMesaEl = parseInt(el.getAttribute("data-idx"));
    if (idxMesaEl === pedrasViradas[idxAtual].idx) {
      el.classList.add("desafio-alvo");
    } else {
      el.classList.remove("desafio-alvo");
    }
  });
  // Lista de pedras oficiais para escolher
  const linha = document.createElement("div");
  linha.className = "linha-pedras";
  // Estilo inline para garantir layout horizontal correto (ignora CSS conflitante)
  linha.style.cssText = "display: flex; gap: 12px; justify-content: center; margin-top: 16px; flex-wrap: wrap; width: 100%; pointer-events: auto;";

  const pedrasOficiais = [
    {
      nome: "Coroa",
      url: "assets/img/Coroa.svg"
    },
    {
      nome: "Espada",
      url: "assets/img/espada.svg"
    },
    {
      nome: "Balança",
      url: "assets/img/Balança.svg"
    },
    {
      nome: "Cavalo",
      url: "assets/img/cavalo.svg"
    },
    {
      nome: "Escudo",
      url: "assets/img/escudo.svg"
    },
    {
      nome: "Bandeira",
      url: "assets/img/bandeira.svg"
    },
    {
      nome: "Martelo",
      url: "assets/img/martelo.svg"
    }
  ];
  pedrasOficiais.forEach((p, idxPedra) => {
    const btn = document.createElement("button");
    btn.className = "pedra-opcao-segabar"; // Nome único para evitar conflito com drag-drop global
    // Sobrepor estilos para garantir que não flutue e não seja bloqueado
    btn.style.cssText = "position: relative; width: 64px; height: 64px; border-radius: 50%; border: 2px solid #2d8cff; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; top: auto; left: auto; transform: none; margin: 0; pointer-events: auto; z-index: 100002;";

    btn.innerHTML = `<img src="${p.url}" alt="${p.nome}" style="width: 80%; height: 80%; object-fit: contain;">`;

    // Marcar visualmente se já foi selecionada como resposta
    if (
      estadoJogo.desafio.respostas &&
      estadoJogo.desafio.respostas[idxAtual] === idxPedra
    ) {
      btn.style.background = "#ffd700"; // Destaque direto
      btn.style.borderColor = "#fff";
    }
    btn.onclick = function () {
      tocarSomClick();
      console.log("[DEBUG CLICK] Botão de pedra clicado. Index:", idxAtual, "Pedra:", idxPedra);
      estadoJogo.desafio.respostas = estadoJogo.desafio.respostas || [];
      estadoJogo.desafio.respostas[idxAtual] = idxPedra;
      // Salva imediatamente o array de respostas no banco
      const path = "salas/" + salaAtual + "/estadoJogo/desafio";

      console.log("[DEBUG CLICK] Atualizando respostas no DB:", estadoJogo.desafio.respostas);
      getDBRef(path).update({
        respostas: estadoJogo.desafio.respostas
      });

      const qtdPedrasMesa = pedrasViradas.length;
      console.log("[DEBUG CLICK] Respostas:", estadoJogo.desafio.respostas.length, "Esperadas:", qtdPedrasMesa);

      if (idxAtual + 1 < qtdPedrasMesa) {
        console.log("[DEBUG CLICK] Avançando para próxima pedra.");

        // UPDATE MEMORY (Critical)
        estadoJogo.desafio.idxAtual = idxAtual + 1;
        if (window.estadoJogo && window.estadoJogo.desafio) {
          window.estadoJogo.desafio.idxAtual = idxAtual + 1;
        }

        // UPDATE DB (Granular)
        getDBRef(path).update({ idxAtual: idxAtual + 1 });

        // Removemos salvarEstadoJogo() daqui para evitar race conditions
        console.log("[DEBUG CLICK] Estado memória atualizado para Index:", estadoJogo.desafio.idxAtual);

        // FORÇAR UPDATE DE UI IMEDIATO
        renderizarRespostaSegabar();

      } else {
        // Só muda para 'verificar_respostas' se todas as respostas estiverem preenchidas
        const respostas = estadoJogo.desafio.respostas;

        // Verifica se não tem undefined
        const completou = respostas.length === qtdPedrasMesa && !respostas.includes(undefined);
        console.log("[DEBUG CLICK] Completou?", completou);

        if (completou) {
          console.log("[DEBUG CLICK] Setando status para 'verificar_respostas'");
          estadoJogo.desafio.status = "verificar_respostas";
          // Update direto no DB para garantir gatilho
          getDBRef(path).update({
            status: "verificar_respostas"
          });
          // Log extra para confirmar local state update
          salvarEstadoJogo(); // Aqui mantemos pois é o trigger final de mudança de fase
          console.log("[DEBUG CLICK] Estado salvo com status verificar_respostas");

          // FORÇAR UPDATE DE UI IMEDIATO (Direct Drive)
          console.log("[DEBUG CLICK] Forçando re-renderização imediata.");
          renderizarRespostaSegabar();
          verificarRespostasSegabar();

        } else {
          console.log("[DEBUG CLICK] Respostas incompletas. Salvando estado atual.");
          salvarEstadoJogo();

          // FORÇAR UPDATE DE UI IMEDIATO
          console.log("[DEBUG CLICK] Forçando re-renderização imediata (Próxima pedra).");
          renderizarRespostaSegabar();
        }
      }
    };
    linha.appendChild(btn);
  });
  box.appendChild(linha);
  container.appendChild(box);
}

// Chamar renderizarRespostaSegabar sempre que o estado do jogo mudar
const oldOuvirEstadoJogoSegabar2 = ouvirEstadoJogo;
ouvirEstadoJogo = function () {
  oldOuvirEstadoJogoSegabar2.apply(this, arguments);
  // Reduzir delays para tornar UI mais responsiva no tutorial
  setTimeout(renderizarOpcoesDesafio, 50);
  setTimeout(renderizarOpcoesSegabar, 50);
  setTimeout(renderizarRespostaSegabar, 50); // Reduzido de 120
  setTimeout(renderizarRespostaSegabarOponente, 60);
  setTimeout(resolverDesafioSeNecessario, 100);
  setTimeout(verificarRespostasSegabar, 150);
  setTimeout(verificarRespostasSegabarOponente, 160);
};

// Adicionar notificações para o fluxo de Se Gabar (duvidar)
function verificarRespostasSegabar() {
  console.log("[DEBUG VERIFY] verificarRespostasSegabar chamado.");
  if (!estadoJogo.desafio) {
    console.log("[DEBUG VERIFY] Sem desafio.");
    return;
  }

  // ============== NUCLEAR TUTORIAL BYPASS ==============
  // Se for tutorial, ignoramos status e vez. Apenas verificamos se completou.
  if (salaAtual === "MODO_TUTORIAL") {
    const pedrasViradasTut = estadoJogo.mesa
      .map((p, idx) => ({ ...p, idx }))
      .filter((p) => p && p.virada);
    const respostasTut = estadoJogo.desafio.respostas || [];

    // Se ainda não preencheu tudo, sai silenciosamente
    if (respostasTut.length < pedrasViradasTut.length || respostasTut.includes(undefined)) {
      return;
    }

    console.log("[DEBUG VERIFY] Tutorial: Respostas completas. Validando...");

    // Validação
    const pedrasOficiais = [
      { nome: "Coroa", url: "assets/img/Coroa.svg" },
      { nome: "Espada", url: "assets/img/espada.svg" },
      { nome: "Balança", url: "assets/img/Balança.svg" },
      { nome: "Cavalo", url: "assets/img/cavalo.svg" },
      { nome: "Escudo", url: "assets/img/escudo.svg" },
      { nome: "Bandeira", url: "assets/img/bandeira.svg" },
      { nome: "Martelo", url: "assets/img/martelo.svg" }
    ];

    let acertouTodas = true;
    for (let i = 0; i < pedrasViradasTut.length; i++) {
      const idxMesa = pedrasViradasTut[i].idx;
      const nomePedraMesa = estadoJogo.mesa[idxMesa] ? estadoJogo.mesa[idxMesa].nome : "";
      const idxResposta = respostasTut[i];
      const nomePedraEscolhida = (typeof idxResposta !== "undefined" && pedrasOficiais[idxResposta]) ? pedrasOficiais[idxResposta].nome : "";

      console.log(`[DEBUG VERIFY] Comparando [${i}]: Mesa (Idx ${idxMesa}) = '${nomePedraMesa}' vs Escolha (Idx ${idxResposta}) = '${nomePedraEscolhida}'`);

      if (!nomePedraMesa || !nomePedraEscolhida || nomePedraMesa !== nomePedraEscolhida) {
        console.log("[DEBUG VERIFY] Mismatch encontrado!");
        acertouTodas = false;
        // Não break para ver o resto
      }
    }

    console.log("[DEBUG VERIFY] Tutorial Resultado. Acertou?", acertouTodas);

    if (acertouTodas) {
      console.log("[DEBUG VERIFY] ACERTOU! Iniciando sequência de vitória.");
      showToastInterno("Parabéns! Você provou seu conhecimento!");
      setTimeout(() => {
        console.log("[DEBUG VERIFY] Timeout 1.5s executado. Limpando desafio...");
        getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
        if (window.estadoJogo && window.estadoJogo.desafio) {
          window.estadoJogo.desafio = null;
          salvarEstadoJogo();
        }
        if (window.tellstonesTutorial) {
          console.log("[DEBUG VERIFY] Chamando registrarAcaoConcluida e proximo.");
          window.tellstonesTutorial.registrarAcaoConcluida();
          setTimeout(() => {
            console.log("[DEBUG VERIFY] Chamando proximo() forçado.");
            if (window.tellstonesTutorial) window.tellstonesTutorial.proximo();
          }, 200);
        } else {
          console.error("[DEBUG VERIFY] ERRO: window.tellstonesTutorial não encontrado!");
        }
      }, 1500);
    } else {
      // FAIL FORWARD: Usuário pediu para finalizar mesmo se errar
      console.log("[DEBUG VERIFY] ERROU! (Mas avançando tutorial por request)");
      showToastInterno("Que pena! Você errou. O Mestre venceu este desafio.");

      setTimeout(() => {
        console.log("[DEBUG VERIFY] Timeout Fail-Forward executado.");
        getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
        if (window.estadoJogo && window.estadoJogo.desafio) {
          window.estadoJogo.desafio = null;
          salvarEstadoJogo();
        }
        if (window.tellstonesTutorial) {
          window.tellstonesTutorial.registrarAcaoConcluida();
          setTimeout(() => {
            if (window.tellstonesTutorial) window.tellstonesTutorial.proximo();
          }, 200);
        }
      }, 2000); // 2s para ler a mensagem de derrota
    }
    return; // FIM DO BYPASS TUTORIAL
  }
  // =====================================================

  console.log("[DEBUG VERIFY] Status Standard:", estadoJogo.desafio.status);

  if (estadoJogo.desafio.status !== "verificar_respostas") {
    return;
  }

  // Exceção Tutorial: Sempre permitir validação no modo tutorial
  const ehVezTutorial = salaAtual === "MODO_TUTORIAL";
  if (!ehMinhaVez() && !ehVezTutorial) {
    console.log("[DEBUG VERIFY] Não é minha vez e não é tutorial exception.");
    return;
  }

  const pedrasViradas = estadoJogo.mesa
    .map((p, idx) => ({ ...p, idx }))
    .filter((p) => p && p.virada);

  const respostas = estadoJogo.desafio.respostas || [];
  console.log("[DEBUG VERIFY] Pedras Viradas:", pedrasViradas.length, "Respostas:", respostas.length);

  if (
    respostas.length < pedrasViradas.length ||
    respostas.includes(undefined) ||
    respostas.includes(null)
  ) {
    console.log("[DEBUG VERIFY] Respostas incompletas ou com gaps.");
    return;
  }

  console.log("[DEBUG VERIFY] Tudo pronto. Verificando acertos...");

  const pedrasOficiais = [
    {
      nome: "Coroa",
      url: "assets/img/Coroa.svg"
    },
    {
      nome: "Espada",
      url: "assets/img/espada.svg"
    },
    {
      nome: "Balança",
      url: "assets/img/Balança.svg"
    },
    {
      nome: "Cavalo",
      url: "assets/img/cavalo.svg"
    },
    {
      nome: "Escudo",
      url: "assets/img/escudo.svg"
    },
    {
      nome: "Bandeira",
      url: "assets/img/bandeira.svg"
    },
    {
      nome: "Martelo",
      url: "assets/img/martelo.svg"
    }
  ];
  let acertouTodas = true;
  for (let i = 0; i < pedrasViradas.length; i++) {
    const idxMesa = pedrasViradas[i].idx;
    const nomePedraMesa = estadoJogo.mesa[idxMesa]
      ? estadoJogo.mesa[idxMesa].nome
      : "";
    const idxResposta = respostas[i];
    const nomePedraEscolhida =
      typeof idxResposta !== "undefined" && pedrasOficiais[idxResposta]
        ? pedrasOficiais[idxResposta].nome
        : "";
    if (
      !nomePedraMesa ||
      !nomePedraEscolhida ||
      nomePedraMesa !== nomePedraEscolhida
    ) {
      acertouTodas = false;
      break;
    }
    if (estadoJogo.mesa[idxMesa]) {
      estadoJogo.mesa[idxMesa].virada = false;
    }
  }
  const mesaAtualizada = estadoJogo.mesa.map((p) => (p ? { ...p } : null));
  /* Restaurando a atualização da mesa para TODOS os modos */
  getDBRef("salas/" + salaAtual + "/estadoJogo/mesa").set(mesaAtualizada);

  /* LÓGICA ESPECÍFICA PARA TUTORIAL */
  /* LÓGICA ESPECÍFICA PARA TUTORIAL */
  if (salaAtual === "MODO_TUTORIAL") {
    console.log("[DEBUG VERIFY] Entrou lógica Tutorial. Acertou?", acertouTodas);
    if (acertouTodas) {
      showToastInterno("Parabéns! Você provou seu conhecimento!");
      // Delay para remoção para dar tempo de ler
      setTimeout(() => {
        console.log("[DEBUG VERIFY] Timeout de sucesso executando.");
        // Remove do DB
        getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();

        // FORCE LOCAL UPDATE (Nuclear Option)
        // Garante que a UI do tutorial perceba que o desafio sumiu, mesmo se o listener falhar
        if (window.estadoJogo && window.estadoJogo.desafio) {
          window.estadoJogo.desafio = null;
          salvarEstadoJogo(); // Salva estado limpo localmente
        }

        // Notifica o tutorial explicitamente
        if (window.tellstonesTutorial) {
          console.log("[DEBUG VERIFY] Chamando registrarAcaoConcluida e proximo.");
          window.tellstonesTutorial.registrarAcaoConcluida();
          // AUTO-ADVANCE FINAL: Garante que vá para a tela de finalização
          setTimeout(() => {
            if (window.tellstonesTutorial) window.tellstonesTutorial.proximo();
          }, 200);
        }
      }, 1500);
    } else {
      showToastInterno("Ops! Alguma pedra está errada. Tente novamente!");
      console.log("[DEBUG VERIFY] Resposta errada no tutorial. Resetando para tentar de novo.");
      // Não remove o desafio, permite tentar de novo (resetando status para responder)
      getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").update({
        status: "responder_pecas"
      });
      // Update local também
      if (window.estadoJogo.desafio) {
        window.estadoJogo.desafio.status = "responder_pecas";
        salvarEstadoJogo();
      }
    }
    return;
  }

  // Lógica normal do jogo
  const desafiante = estadoJogo.desafio.jogador;
  const jogadores = estadoJogo.jogadores || [];
  const oponente =
    jogadores.find((j) => j.nome !== desafiante)?.nome || "Oponente";
  if (acertouTodas) {
    enviarNotificacaoGlobal(
      `${desafiante} acertou todas as pedras e venceu o jogo!`
    );
    if (!estadoJogo.vencedor) salvarVencedor([desafiante], "instantanea");
    if (nomeAtual === desafiante) {
      mostrarTelaVitoria("Parabéns, você venceu!", "Vitória!");
    } else if (nomeAtual === oponente) {
      mostrarTelaVitoria(
        "O adversário acertou todas as pedras e venceu o jogo!",
        "Derrota"
      );
    }
    getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
    setTimeout(() => {
      avancarTurno();
    }, 1200);
    return;
  } else {
    enviarNotificacaoGlobal(
      `${desafiante} errou uma pedra! ${oponente} venceu o jogo!`
    );
    if (!estadoJogo.vencedor) salvarVencedor([oponente], "instantanea");
    if (nomeAtual === desafiante) {
      mostrarTelaVitoria(
        "Você errou uma pedra! O oponente venceu o jogo!",
        "Derrota"
      );
    } else if (nomeAtual === oponente) {
      mostrarTelaVitoria("O adversário errou! Você venceu o jogo!", "Vitória!");
    }
    getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
    setTimeout(() => {
      avancarTurno();
    }, 1200);
    return;
  }
  getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
  avancarTurno();
}
// Chamar verificarRespostasSegabar sempre que o estado do jogo mudar
const oldOuvirEstadoJogoSegabar3 = ouvirEstadoJogo;
ouvirEstadoJogo = function () {
  oldOuvirEstadoJogoSegabar3.apply(this, arguments);
  setTimeout(renderizarOpcoesDesafio, 100);
  setTimeout(renderizarOpcoesSegabar, 100);
  setTimeout(renderizarRespostaSegabar, 120);
  setTimeout(renderizarRespostaSegabarOponente, 130);
  setTimeout(resolverDesafioSeNecessario, 200);
  setTimeout(verificarRespostasSegabar, 250);
  setTimeout(verificarRespostasSegabarOponente, 260);
};

// Renderizar interface de resposta do Se Gabar Também para o oponente
function renderizarRespostaSegabarOponente() {
  if (
    !estadoJogo.desafio ||
    estadoJogo.desafio.tipo !== "segabar" ||
    estadoJogo.desafio.status !== "responder_pecas_oponente"
  )
    return;
  // Só o oponente vê
  if (nomeAtual === estadoJogo.desafio.jogador) return;
  // Descobrir todas as pedras viradas para baixo na mesa (em ordem)
  const pedrasViradas = estadoJogo.mesa
    .map((p, idx) => ({ ...p, idx }))
    .filter((p) => p && p.virada);
  const idxAtual = estadoJogo.desafio.idxAtual || 0;
  // Reutiliza o container do desafio
  let container = document.getElementById("opcoes-desafio");
  if (!container) {
    container = document.createElement("div");
    container.id = "opcoes-desafio";
    container.style.display = "flex";
    container.style.justifyContent = "center";
    container.style.margin = "0 auto";
    container.style.padding = "0";
    container.style.background = "transparent";
    container.style.border = "none";
    container.style.boxShadow = "none";
    container.style.position = "relative";
    // Forçar sempre no Body para garantir visibilidade (Nuclear Fix)
    document.body.appendChild(container);
    container.style.position = "fixed";
    container.style.top = "calc(50% - 220px)";
    container.style.left = "50%";
    container.style.transform = "translateX(-50%)";
    container.style.zIndex = "99999";
    container.style.width = "auto";
    container.style.background = "transparent";
    container.style.border = "none";
    container.style.boxShadow = "none";
    container.style.padding = "0";
    container.style.borderRadius = "0";
    container.style.display = "flex";

    // Restaurar hierarquia original
    const tabuleiroCenter = document.getElementById("tabuleiro-center");
    if (tabuleiroCenter) {
      if (!tabuleiroCenter.contains(container)) {
        tabuleiroCenter.insertBefore(container, tabuleiroCenter.firstChild);
      }
    } else {
      document.body.appendChild(container);
    }

    container.style.cssText = "display: flex; justify-content: center; top: 18%; left: 50%; transform: translateX(-50%); padding: 0px; background: transparent; border: none; box-shadow: none; position: absolute; z-index: 99999; width: 740px; flex-direction: column; align-items: center;";
  } else {
    container.innerHTML = "";
    container.style.display = "flex";
  }
  // Box para alinhar
  const box = document.createElement("div");
  box.className = "box-desafio";
  // Título
  const titulo = document.createElement("div");
  titulo.className = "titulo-desafio";
  titulo.innerText = `Qual é a pedra na posição ${pedrasViradas[idxAtual].idx + 1
    }?`;
  box.appendChild(titulo);
  // Lista de pedras oficiais para escolher
  const linha = document.createElement("div");
  linha.className = "linha-pedras";
  const pedrasOficiais = [
    {
      nome: "Coroa",
      url: "assets/img/Coroa.svg"
    },
    {
      nome: "Espada",
      url: "assets/img/espada.svg"
    },
    {
      nome: "Balança",
      url: "assets/img/Balança.svg"
    },
    {
      nome: "Cavalo",
      url: "assets/img/cavalo.svg"
    },
    {
      nome: "Escudo",
      url: "assets/img/escudo.svg"
    },
    {
      nome: "Bandeira",
      url: "assets/img/bandeira.svg"
    },
    {
      nome: "Martelo",
      url: "assets/img/martelo.svg"
    }
  ];
  pedrasOficiais.forEach((p, idxPedra) => {
    const btn = document.createElement("button");
    btn.className = "pedra-reserva";
    btn.innerHTML = `<img src="${p.url}" alt="${p.nome}">`;
    // Marcar visualmente se já foi selecionada como resposta
    if (
      estadoJogo.desafio.respostasOponente &&
      estadoJogo.desafio.respostasOponente[idxAtual] === idxPedra
    ) {
      btn.classList.add("pedra-troca-selecionada");
    }
    btn.onclick = function () {
      tocarSomClick();
      estadoJogo.desafio.respostas = estadoJogo.desafio.respostas || [];
      estadoJogo.desafio.respostas[idxAtual] = idxPedra;
      // Salva imediatamente o array de respostas no banco
      getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").update({
        respostas: estadoJogo.desafio.respostas
      });
      if (idxAtual + 1 < pedrasViradas.length) {
        estadoJogo.desafio.idxAtual = idxAtual + 1;
        salvarEstadoJogo();
      } else {
        // Só muda para 'verificar_respostas' se todas as respostas estiverem preenchidas
        const respostas = estadoJogo.desafio.respostas;
        if (
          respostas.length === pedrasViradas.length &&
          !respostas.includes(undefined)
        ) {
          estadoJogo.desafio.status = "verificar_respostas";
          getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").update({
            status: "verificar_respostas"
          });
        } else {
          // Se faltar alguma resposta, não muda o status e apenas salva o estado
          salvarEstadoJogo();
        }
      }
    };
    linha.appendChild(btn);
  });
  box.appendChild(linha);
  container.appendChild(box);
}

// Verificar respostas do Se Gabar Também (oponente)
function verificarRespostasSegabarOponente() {
  if (
    !estadoJogo.desafio ||
    estadoJogo.desafio.status !== "verificar_respostas_oponente"
  )
    return;
  if (!ehMinhaVez()) return;
  // Descobrir todas as pedras viradas para baixo na mesa (em ordem)
  const pedrasViradas = estadoJogo.mesa
    .map((p, idx) => ({ ...p, idx }))
    .filter((p) => p && p.virada);
  const respostas = estadoJogo.desafio.respostasOponente || [];
  // Só verifica se todas as respostas foram dadas
  if (
    respostas.length < pedrasViradas.length ||
    respostas.includes(undefined)
  ) {
    return;
  }
  const pedrasOficiais = [
    {
      nome: "Coroa",
      url: "assets/img/Coroa.svg"
    },
    {
      nome: "Espada",
      url: "assets/img/espada.svg"
    },
    {
      nome: "Balança",
      url: "assets/img/Balança.svg"
    },
    {
      nome: "Cavalo",
      url: "assets/img/cavalo.svg"
    },
    {
      nome: "Escudo",
      url: "assets/img/escudo.svg"
    },
    {
      nome: "Bandeira",
      url: "assets/img/bandeira.svg"
    },
    {
      nome: "Martelo",
      url: "assets/img/martelo.svg"
    }
  ];
  let acertouTodas = true;
  for (let i = 0; i < pedrasViradas.length; i++) {
    const idxMesa = pedrasViradas[i].idx;
    const nomePedraMesa = estadoJogo.mesa[idxMesa]
      ? estadoJogo.mesa[idxMesa].nome
      : "";
    const idxResposta = respostas[i];
    const nomePedraEscolhida =
      typeof idxResposta !== "undefined" && pedrasOficiais[idxResposta]
        ? pedrasOficiais[idxResposta].nome
        : "";
    if (
      !nomePedraMesa ||
      !nomePedraEscolhida ||
      nomePedraMesa !== nomePedraEscolhida
    ) {
      acertouTodas = false;
      break;
    }
    // Revela a pedra
    if (estadoJogo.mesa[idxMesa]) {
      estadoJogo.mesa[idxMesa].virada = false;
    }
  }
  // Atualiza mesa
  const mesaAtualizada = estadoJogo.mesa.map((p) => (p ? { ...p } : null));
  getDBRef("salas/" + salaAtual + "/estadoJogo/mesa").set(mesaAtualizada);
  // Atualiza placar e envia notificações
  const desafiante = estadoJogo.desafio.jogador;
  const jogadores = estadoJogo.jogadores || [];
  const oponente =
    jogadores.find((j) => j.nome !== desafiante)?.nome || "Oponente";
  if (acertouTodas) {
    enviarNotificacaoGlobal(
      `${oponente} acertou todas as pedras e venceu o jogo!`
    );
    if (!estadoJogo.vencedor) salvarVencedor([oponente], "instantanea");
    if (nomeAtual === oponente) {
      mostrarTelaVitoria("Parabéns, você venceu!", "Vitória!");
    } else if (nomeAtual === desafiante) {
      mostrarTelaVitoria(
        "O adversário acertou todas as pedras e venceu o jogo!",
        "Derrota"
      );
    }
    getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
    setTimeout(() => {
      avancarTurno();
    }, 1200);
    return;
  } else {
    enviarNotificacaoGlobal(`${oponente} errou! ${desafiante} venceu o jogo!`);
    if (!estadoJogo.vencedor) salvarVencedor([desafiante], "instantanea");
    if (nomeAtual === oponente) {
      mostrarTelaVitoria("Você errou! O adversário venceu o jogo!", "Derrota");
    } else if (nomeAtual === desafiante) {
      mostrarTelaVitoria("O oponente errou! Você venceu o jogo!", "Vitória!");
    }
    getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
    setTimeout(() => {
      avancarTurno();
    }, 1200);
    return;
  }
  getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
  avancarTurno();
}

// Renderiza os marcadores de ponto de acordo com os pontos dos jogadores/duplas
function renderizarMarcadoresPonto() {
  const marcadoresEsq = document.querySelectorAll(
    ".marcador-ponto.marcador-esquerda"
  );
  const marcadoresDir = document.querySelectorAll(
    ".marcador-ponto.marcador-direita"
  );
  let pontosEsq = 0;
  let pontosDir = 0;
  if (estadoJogo.jogadores && estadoJogo.jogadores.length === 2) {
    pontosEsq = estadoJogo.jogadores[0]?.pontos || 0;
    pontosDir = estadoJogo.jogadores[1]?.pontos || 0;
  } else if (estadoJogo.jogadores && estadoJogo.jogadores.length === 4) {
    // Duplas: soma pontos dos jogadores 0+2 e 1+3
    pontosEsq =
      (estadoJogo.jogadores[0]?.pontos || 0) +
      (estadoJogo.jogadores[2]?.pontos || 0);
    pontosDir =
      (estadoJogo.jogadores[1]?.pontos || 0) +
      (estadoJogo.jogadores[3]?.pontos || 0);
  }
  marcadoresEsq.forEach((el, i) => {
    if (i < pontosEsq) el.classList.add("preenchido");
    else el.classList.remove("preenchido");
  });
  marcadoresDir.forEach((el, i) => {
    if (i < pontosDir) el.classList.add("preenchido");
    else el.classList.remove("preenchido");
  });
  // Verifica vitória automática
  if (pontosEsq >= 3) {
    showToast("Vitória do Jogador 1!");
    bloquearAcoesDuranteDesafio();
  } else if (pontosDir >= 3) {
    showToast("Vitória do Jogador 2!");
    bloquearAcoesDuranteDesafio();
  }
}
// Chamar sempre que atualizar o placar ou renderizar a mesa
const oldAtualizarInfoSala = atualizarInfoSala;
atualizarInfoSala = function () {
  oldAtualizarInfoSala.apply(this, arguments);
  renderizarMarcadoresPonto();
};

// Função para exibir a tela de vitória/derrota
function mostrarTelaVitoria(msg, titulo = "Vitória!") {
  const tela = document.getElementById("tela-vitoria");
  const tituloEl = document.getElementById("tela-vitoria-titulo");
  const msgEl = document.getElementById("tela-vitoria-msg");
  if (tela && tituloEl && msgEl) {
    tituloEl.innerText = titulo;
    msgEl.innerHTML = msg;
    tela.classList.add("active");
    tela.style.display = "flex";
  }
  // Bloqueia ações do jogo
  bloquearAcoesDuranteDesafio();
}
// Botão para voltar ao lobby
const btnVoltarLobby = document.getElementById("btn-voltar-lobby");
if (btnVoltarLobby) {
  btnVoltarLobby.onclick = function () {
    // Esconde a tela de vitória
    const tela = document.getElementById("tela-vitoria");
    if (tela) tela.classList.remove("active");
    if (tela) tela.style.display = "none";
    // Remove listeners do Firebase
    if (window.lobbyListener) {
      window.lobbyListener.off();
      window.lobbyListener = null;
    }
    if (window.notificacaoListener) {
      window.notificacaoListener.off();
      window.notificacaoListener = null;
    }
    getDBRef().off();
    // Limpa variáveis globais principais
    salaAtual = null;
    nomeAtual = null;
    souCriador = false;
    ultimosJogadores = [];
    ultimosEspectadores = [];
    mesaAnterior = null;
    estadoJogo = {};
    window.jaEntrouNoGame = false;
    window.animouReservaCircular = false;
    window.selecionandoDesafio = false;
    window.resolvendoDesafio = false;
    // Limpa tutorial se existir
    if (window.tellstonesTutorial) {
      window.tellstonesTutorial.finalizar();
      window.tellstonesTutorial = null;
    }
    const tutorialUI = document.getElementById("tutorial-ui");
    if (tutorialUI) tutorialUI.remove();
    // Limpa UI
    document.getElementById("game").classList.remove("active");
    document.getElementById("lobby").classList.remove("active");
    document.getElementById("start-screen").classList.remove("active");
    // Mostra a tela inicial
    mostrarTela("start-screen");
  };
}
// Atualizar renderizarMarcadoresPonto para chamar mostrarTelaVitoria ao atingir 3 pontos
const oldRenderizarMarcadoresPonto = renderizarMarcadoresPonto;
renderizarMarcadoresPonto = function () {
  oldRenderizarMarcadoresPonto.apply(this, arguments);
  let pontosEsq = 0;
  let pontosDir = 0;
  let venceu = false;
  let perdeu = false;
  let nomeVencedor = "";
  let nomesVencedores = [];
  if (estadoJogo.jogadores && estadoJogo.jogadores.length === 2) {
    pontosEsq = estadoJogo.jogadores[0]?.pontos || 0;
    pontosDir = estadoJogo.jogadores[1]?.pontos || 0;
    if (pontosEsq >= 3 || pontosDir >= 3) {
      if (
        (nomeAtual === estadoJogo.jogadores[0].nome && pontosEsq >= 3) ||
        (nomeAtual === estadoJogo.jogadores[1].nome && pontosDir >= 3)
      ) {
        venceu = true;
        nomeVencedor = nomeAtual;
      } else {
        perdeu = true;
        nomeVencedor =
          pontosEsq >= 3
            ? estadoJogo.jogadores[0].nome
            : estadoJogo.jogadores[1].nome;
      }
      nomesVencedores =
        pontosEsq >= 3
          ? [estadoJogo.jogadores[0].nome]
          : [estadoJogo.jogadores[1].nome];
      if (!estadoJogo.vencedor) salvarVencedor(nomesVencedores, "pontos");
    }
  } else if (estadoJogo.jogadores && estadoJogo.jogadores.length === 4) {
    pontosEsq =
      (estadoJogo.jogadores[0]?.pontos || 0) +
      (estadoJogo.jogadores[2]?.pontos || 0);
    pontosDir =
      (estadoJogo.jogadores[1]?.pontos || 0) +
      (estadoJogo.jogadores[3]?.pontos || 0);
    const idx = estadoJogo.jogadores.findIndex((j) => j.nome === nomeAtual);
    const souEsq = idx === 0 || idx === 2;
    if (pontosEsq >= 3 || pontosDir >= 3) {
      if ((souEsq && pontosEsq >= 3) || (!souEsq && pontosDir >= 3)) {
        venceu = true;
        nomeVencedor = souEsq
          ? estadoJogo.jogadores[0].nome + " e " + estadoJogo.jogadores[2].nome
          : estadoJogo.jogadores[1].nome + " e " + estadoJogo.jogadores[3].nome;
      } else {
        perdeu = true;
        nomeVencedor =
          pontosEsq >= 3
            ? estadoJogo.jogadores[0].nome +
            " e " +
            estadoJogo.jogadores[2].nome
            : estadoJogo.jogadores[1].nome +
            " e " +
            estadoJogo.jogadores[3].nome;
      }
      nomesVencedores =
        pontosEsq >= 3
          ? [estadoJogo.jogadores[0].nome, estadoJogo.jogadores[2].nome]
          : [estadoJogo.jogadores[1].nome, estadoJogo.jogadores[3].nome];
      if (!estadoJogo.vencedor) salvarVencedor(nomesVencedores, "pontos");
    }
  }
  if (venceu) {
    mostrarTelaVitoria("Parabéns, você venceu!", "Vitória!");
  } else if (perdeu) {
    mostrarTelaVitoria("O adversário venceu o jogo!", "Derrota");
  }
};

// Função para salvar o vencedor no estado do jogo
function salvarVencedor(nomes, motivo) {
  if (!salaAtual) return;
  getDBRef("salas/" + salaAtual + "/estadoJogo/vencedor").set({ nomes, motivo });
}

// Exibir tela de vitória/derrota para todos ao detectar estadoJogo.vencedor
function checarTelaVitoriaGlobal() {
  if (!estadoJogo.vencedor || !estadoJogo.vencedor.nomes) return;
  const nomesVencedores = estadoJogo.vencedor.nomes;
  if (nomesVencedores.includes(nomeAtual)) {
    mostrarTelaVitoria("Parabéns, você venceu!", "Vitória!");
  } else {
    mostrarTelaVitoria("O adversário venceu o jogo!", "Derrota");
  }
}
// Chamar checarTelaVitoriaGlobal sempre que o estado do jogo mudar
const oldOuvirEstadoJogoVitoria = ouvirEstadoJogo;
ouvirEstadoJogo = function () {
  oldOuvirEstadoJogoVitoria.apply(this, arguments);
  setTimeout(checarTelaVitoriaGlobal, 300);
};

function garantirMoedaBtnNoDOM() {
  if (!document.getElementById("moeda-btn")) {
    const wrapper = document.getElementById("tabuleiro-wrapper");
    if (!wrapper) return;
    const btn = document.createElement("button");
    btn.id = "moeda-btn";
    btn.title = "Lançar moeda";
    btn.style.background = "none";
    btn.style.border = "none";
    btn.style.outline = "none";
    btn.style.position = "absolute";
    btn.style.left = "50%";
    btn.style.top = "50%";
    btn.style.transform = "translate(-50%,-50%)";
    btn.style.zIndex = "20";
    btn.style.width = "auto";
    btn.style.height = "auto";
    btn.innerHTML = `
      <span id="moeda-animada" style="display:inline-block;width:80px;height:80px;position:relative;perspective:300px;">
        <img id="moeda-frente" src="assets/img/Cara.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:50% 52%;position:absolute;left:0;top:0;backface-visibility:hidden;transition:transform 0.6s;box-shadow:0 2px 8px #0007;background:#222;" />
        <img id="moeda-verso" src="assets/img/Coroa.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:50% 52%;position:absolute;left:0;top:0;backface-visibility:hidden;transform:rotateY(180deg);transition:transform 0.6s;box-shadow:0 2px 8px #0007;background:#222;" />
      </span>
    `;
    wrapper.appendChild(btn);
  }
}

// =============== ANIMAÇÃO DE TROCA CIRCULAR ===============
function animarTrocaCircular(idxA, idxB, callback) {
  window.animacaoTrocaEmAndamento = true;
  const wrapper = document.getElementById("tabuleiro-wrapper");
  const pedrasMesa = document.getElementById("pedras-mesa");
  const positions = getSlotPositions(wrapper, 7, 68.39, 40);
  // Bloqueia ações
  // Bloqueia ações
  const overlay = document.createElement("div"); // Changed let to const for safety
  overlay.style.position = "fixed";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.zIndex = "999999";
  overlay.style.background = "rgba(0,0,0,0)";
  overlay.id = "troca-circular-overlay";
  document.body.appendChild(overlay);

  // Pega as divs reais
  const divA = pedrasMesa.querySelector(`[data-idx='${idxA}']`);
  const divB = pedrasMesa.querySelector(`[data-idx='${idxB}']`);

  if (!divA || !divB) {
    console.error("[SWAP DEBUG] ERRO: Elementos DOM não encontrados para troca!", idxA, idxB);
    overlay.remove();
    window.animacaoTrocaEmAndamento = false; // FIX: Reset flag
    if (callback) callback();
    return;
  }
  console.log("[SWAP DEBUG] Elementos encontrados. Iniciando animação visual.");
  // Pega posição dos slots na tela (centro exato do slot)
  const wrapperRect = wrapper.getBoundingClientRect();
  function slotCenter(pos) {
    return {
      left: wrapperRect.left + pos.left,
      top: wrapperRect.top + pos.top
    };
  }
  const slotA = slotCenter(positions[idxA]);
  const slotB = slotCenter(positions[idxB]);
  // Cria clones
  const cloneA = divA.cloneNode(true);
  const cloneB = divB.cloneNode(true);
  cloneA.style.position = "fixed";
  cloneA.style.left = slotA.left + "px";
  cloneA.style.top = slotA.top + "px";
  cloneA.style.zIndex = "1000000";
  cloneA.style.pointerEvents = "none";
  cloneB.style.position = "fixed";
  cloneB.style.left = slotB.left + "px";
  cloneB.style.top = slotB.top + "px";
  cloneB.style.zIndex = "1000000";
  cloneB.style.pointerEvents = "none";
  document.body.appendChild(cloneA);
  document.body.appendChild(cloneB);
  // Esconde as reais
  divA.style.visibility = "hidden";
  divB.style.visibility = "hidden";
  divA.style.display = "none";
  divB.style.display = "none";
  // Calcula centro do wrapper para basear o arco
  const centerY = wrapperRect.top + wrapperRect.height / 2;
  // Duração
  const dur = 1200;
  // Função arco (circular):
  function arco(t, start, end, porCima = true) {
    // t: 0 a 1
    const cx = (start.left + end.left) / 2;
    const cy = centerY + (porCima ? -80 : 80); // 80px acima ou abaixo
    const ang0 = Math.atan2(start.top - cy, start.left - cx);
    const ang1 = Math.atan2(end.top - cy, end.left - cx);
    const ang = ang0 + (ang1 - ang0) * t;
    const r = Math.hypot(start.left - cx, start.top - cy);
    return {
      left: cx + r * Math.cos(ang),
      top: cy + r * Math.sin(ang)
    };
  }
  // Animação manual (requestAnimationFrame)
  let startTime = null;
  function animarFrame(now) {
    if (!startTime) startTime = now;
    let t = Math.min(1, (now - startTime) / dur);
    // A por cima, B por baixo
    const posA = arco(t, slotA, slotB, true);
    const posB = arco(t, slotB, slotA, false);
    cloneA.style.left = posA.left + "px";
    cloneA.style.top = posA.top + "px";
    cloneB.style.left = posB.left + "px";
    cloneB.style.top = posB.top + "px";
    if (t < 1) {
      requestAnimationFrame(animarFrame);
    } else {
      // Fim: remove clones, mostra reais
      cloneA.remove();
      cloneB.remove();
      divA.style.visibility = "";
      divB.style.visibility = "";
      divA.style.display = "";
      divB.style.display = "";
      overlay.remove();
      window.animacaoTrocaEmAndamento = false;
      if (callback) {
        callback();
        // Renderiza APÓS o callback ter atualizado o estado (se for síncrono)
        // Se for assíncrono, o listener do DB cuidará disso.
      } else {
        renderizarMesa();
      }
    }
  }
  requestAnimationFrame(animarFrame);
}

// 1. Adicione uma variável global para controlar a última animação executada
let ultimoTrocaAnimacao = null;

// ===== Ko-fi Widget Customizado =====
// Função para carregar o widget Ko-fi
function carregarKofiWidget() {
  console.log('[Ko-fi] carregarKofiWidget chamado');
  // Só carrega o widget se ainda não existir na página
  if (document.querySelector('.floatingchat-container-wrap')) {
    console.log('[Ko-fi] Widget já está carregado');
    return; // Já está carregado
  }
  if (window.kofiWidgetOverlay) {
    console.log('[Ko-fi] kofiWidgetOverlay já existe, desenhando widget');
    kofiWidgetOverlay.draw('alicedesa', {
      'type': 'floating-chat',
      'floating-chat.donateButton.text': '', // Sem texto
      'floating-chat.donateButton.background-color': '#794bc4',
      'floating-chat.donateButton.text-color': '#fff',
      'floating-chat.position': 'right', // Canto direito inferior
    });
    setTimeout(moverKofiParaDireita, 1200);
    return;
  }
  if (!document.getElementById('kofi-widget-script')) {
    console.log('[Ko-fi] Adicionando script do Ko-fi');
    var script = document.createElement('script');
    script.id = 'kofi-widget-script';
    script.src = 'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js';
    script.onload = function () {
      console.log('[Ko-fi] Script do Ko-fi carregado');
      if (window.kofiWidgetOverlay) {
        kofiWidgetOverlay.draw('alicedesa', {
          'type': 'floating-chat',
          'floating-chat.donateButton.text': '', // Sem texto
          'floating-chat.donateButton.background-color': '#794bc4',
          'floating-chat.donateButton.text-color': '#fff',
          'floating-chat.position': 'right', // Canto direito inferior
        });
        setTimeout(moverKofiParaDireita, 1200);
      }
    };
    document.body.appendChild(script);
  }
}
// Função para mover o Ko-fi para o container fixo na direita inferior
function moverKofiParaDireita() {
  var kofiBtn = document.querySelector('.floatingchat-container-wrap');
  var meuContainer = document.getElementById('kofi-fixo-direita');
  if (kofiBtn && meuContainer && !meuContainer.contains(kofiBtn)) {
    meuContainer.appendChild(kofiBtn);
    // Remove estilos de posição do Ko-fi
    kofiBtn.style.position = 'static';
    kofiBtn.style.left = '';
    kofiBtn.style.right = '';
    kofiBtn.style.bottom = '';
    kofiBtn.style.top = '';
  }
}

// Observer para garantir que o Ko-fi nunca suma
(function garantirKofiSempreVisivel() {
  const meuContainer = document.getElementById('kofi-fixo-direita');
  if (!meuContainer) return;
  const observer = new MutationObserver(function () {
    var kofiBtn = document.querySelector('.floatingchat-container-wrap');
    if (kofiBtn && !meuContainer.contains(kofiBtn)) {
      meuContainer.appendChild(kofiBtn);
      kofiBtn.style.position = 'static';
      kofiBtn.style.left = '';
      kofiBtn.style.right = '';
      kofiBtn.style.bottom = '';
      kofiBtn.style.top = '';
    }
    // Se o botão sumiu completamente, tenta recarregar
    if (!document.querySelector('.floatingchat-container-wrap')) {
      carregarKofiWidget();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();

// Garante carregamento do Ko-fi após DOM pronto

document.addEventListener('DOMContentLoaded', function () {
  console.log('[Ko-fi] DOMContentLoaded - tentando carregar Ko-fi');
  carregarKofiWidget();
});

// Tooltip global
function showTooltip(msg, x, y) {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  tooltip.innerHTML = msg;
  tooltip.style.display = "block";
  tooltip.style.left = (x + 12) + "px";
  tooltip.style.top = (y + 12) + "px";
}
function hideTooltip() {
  const tooltip = document.getElementById("tooltip");
  if (!tooltip) return;
  tooltip.style.display = "none";
}

// =========================
// 9. Modo PvE e Tutorial

function iniciarModoBot() {
  isLocalMode = true;
  localData = {};
  nomeAtual = "Você";
  salaAtual = "MODO_PVE";
  souCriador = true;

  const jogadores = [
    { nome: "Você", id: "p1", pontos: 0 },
    { nome: "Bot", id: "p2", pontos: 0 }
  ];

  inicializarJogo(jogadores);

  // No modo local, simulamos o "sorteio" ganhando sempre ou aleatório
  localData = {
    salas: {
      MODO_PVE: {
        status: "jogo",
        jogadores: {
          p1: { nome: "Você" },
          p2: { nome: "Bot" }
        },
        estadoJogo: {
          ...estadoJogo,
          vez: 0,
          centralAlinhada: true,
          alinhamentoFeito: true,
          mesa: [null, null, null, estadoJogo.pedraCentral, null, null, null],
          pedraCentral: null
        },
        caraCoroa: {
          escolha: { nome: "Você", escolha: "cara" },
          resultado: 0,
          sorteioFinalizado: true,
          feedbackLiberado: Date.now()
        }
      }
    }
  };

  estadoJogo = localData.salas.MODO_PVE.estadoJogo;
  tellstonesBot = new TellstonesBot("Bot");

  mostrarJogo("MODO_PVE", [{ nome: "Você", id: "p1", pontos: 0 }, { nome: "Bot", id: "p2", pontos: 0 }], []);
  ouvirEstadoJogo();
  salvarEstadoJogo();

  showToast("Modo PvE Iniciado! Você começa.");
}

function iniciarModoTutorial() {
  isLocalMode = true;
  localData = {};
  nomeAtual = "Aprendiz";
  salaAtual = "MODO_TUTORIAL";
  souCriador = true;

  const jogadores = [
    { nome: "Mestre", id: "p2", pontos: 0 },
    { nome: "Aprendiz", id: "p1", pontos: 0 }
  ];

  inicializarJogo(jogadores);

  // Setup inicial do tutorial
  estadoJogo.centralAlinhada = true;
  estadoJogo.alinhamentoFeito = true;
  estadoJogo.mesa = [null, null, null, estadoJogo.pedraCentral, null, null, null];
  estadoJogo.pedraCentral = null;
  estadoJogo.vez = 0;

  localData = {
    salas: {
      MODO_TUTORIAL: {
        status: "jogo",
        jogadores: { p1: { nome: "Aprendiz" }, p2: { nome: "Mestre" } },
        estadoJogo: estadoJogo,
        caraCoroa: { sorteioFinalizado: true }
      }
    }
  };

  mostrarJogo("MODO_TUTORIAL", jogadores, []);
  ouvirEstadoJogo();
  salvarEstadoJogo();

  // Inicializa o Bot no modo tutorial para que ele possa jogar depois
  tellstonesBot = new TellstonesBot("Mestre");

  setTimeout(() => {
    try {
      if (window.TellstonesTutorial) {
        console.log("[TUTORIAL] Iniciando instância...");
        window.tellstonesTutorial = new TellstonesTutorial();
        window.tellstonesTutorial.iniciar();
      } else {
        console.error("[TUTORIAL] Classe TellstonesTutorial não encontrada no window.");
        showToastInterno("Erro: Tutorial não pôde ser iniciado.");
      }
    } catch (e) {
      console.error("[TUTORIAL] Erro ao iniciar:", e);
    }
  }, 500);
}

// Hook para o turno do Bot
const oldOuvirEstadoJogoBot = ouvirEstadoJogo;
ouvirEstadoJogo = function () {
  oldOuvirEstadoJogoBot.apply(this, arguments);

  if (isLocalMode && tellstonesBot && !estadoJogo.vencedor) {
    const idxBot = estadoJogo.jogadores.findIndex(j => j.nome === "Bot");
    const isBotTurn = (estadoJogo.vez === idxBot % 2);

    if (isBotTurn && !window.botProcessando) {
      // Inibir o Bot no modo tutorial completamente (Scriptado)
      if (salaAtual === "MODO_TUTORIAL") {
        return;
      }
      window.botProcessando = true;
      console.log("[BOT] Minha vez! Pensando...");
      setTimeout(() => {
        const jogada = tellstonesBot.fazerJogada(estadoJogo);
        console.log("[BOT] Jogada decidida:", jogada);
        if (jogada) {
          executarJogadaBot(jogada);
        }
        window.botProcessando = false;
      }, 1500);
    }
  }
};

// LOGICA PARA BOT RESPONDER A DESAFIOS (Executa fora do turno 'vez', pois é uma resposta)
if (isLocalMode && tellstonesBot && estadoJogo.desafio && estadoJogo.desafio.status === "aguardando_resposta") {
  const d = estadoJogo.desafio;
  // Se o desafio não foi iniciado pelo Bot, o Bot precisa responder (se for o alvo)
  // No modo local PvE/Tutorial, assumimos que se não foi o Bot quem desafiou, foi o jogador, então Bot responde.
  // Check extra: jogador !== "Mestre" (nome da instancia do bot) ou "Bot"
  if (d.jogador !== "Mestre" && d.jogador !== "Bot" && !window.botRespondendo) {
    window.botRespondendo = true;
    console.log("[BOT] Detectado desafio contra o Bot. Pensando na resposta...");
    setTimeout(() => {
      const resposta = tellstonesBot.responderDesafio(estadoJogo);
      console.log("[BOT] Resposta ao desafio:", resposta);

      if (resposta.tipo === "responder_desafio") {
        // Bot escolheu uma pedra (resposta a desafio normal)
        estadoJogo.desafio.escolhaOponente = resposta.idx;
        estadoJogo.desafio.status = "resolvido";
        salvarEstadoJogo();
      } else if (resposta.tipo === "acreditar") {
        // Bot acreditou no Se Gabar
        const idxJogador = estadoJogo.jogadores.findIndex(j => j.nome === d.jogador);
        if (idxJogador !== -1) estadoJogo.jogadores[idxJogador].pontos++;
        // Remover desafio
        getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();
        delete estadoJogo.desafio;
        showToast("Bot acreditou em você!");
        salvarEstadoJogo();
        avancarTurno();
      } else if (resposta.tipo === "duvidar") {
        // Bot duvidou do Se Gabar
        estadoJogo.desafio.status = "responder_pecas";
        estadoJogo.desafio.idxAtual = 0;
        estadoJogo.desafio.respostas = [];
        salvarEstadoJogo();
        showToast("Bot duvidou de você! Prove que sabe as pedras.");
      }

      window.botRespondendo = false;
    }, 2000);
  }
}
;

function executarJogadaBot(jogada) {
  if (jogada.tipo === 'colocar') {
    const pedra = estadoJogo.reserva[jogada.pedraIdx];
    estadoJogo.reserva.splice(jogada.pedraIdx, 1);
    inserirPedraNaMesa(pedra, jogada.slot);
  } else if (jogada.tipo === 'esconder') {
    estadoJogo.mesa[jogada.idx].virada = true;
    salvarEstadoJogo();
    enviarNotificacaoGlobal(`Bot escondeu uma pedra.`);
    avancarTurno();
  } else if (jogada.tipo === 'espiar') {
    espiarPedra(jogada.idx);
  } else if (jogada.tipo === 'mover') {
    avancarTurno();
  } else if (jogada.tipo === 'segabar') {
    estadoJogo.desafio = { tipo: "segabar", status: "aguardando_resposta", jogador: "Mestre" };
    salvarEstadoJogo();
    showToastInterno("O Bot se gabou! Você acredita?");
  } else if (jogada.tipo === 'desafiar') {
    const desafio = { status: "aguardando_resposta", idxPedra: jogada.idx, tipo: "normal", jogador: "Mestre" };
    estadoJogo.desafio = desafio;
    salvarEstadoJogo();
    showToastInterno("O Bot te desafiou!");
  }
}


// =========================
// UI para Seleção de Pedra (Prova do Se Gabar)
// =========================
function abrirSeletorPedra(idxMesa) {
  // Evita abrir múltiplos
  if (document.getElementById("seletor-pedra-modal")) return;

  const modal = document.createElement("div");
  modal.id = "seletor-pedra-modal";
  modal.style.position = "fixed";
  modal.style.left = "0";
  modal.style.top = "0";
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.background = "rgba(0,0,0,0.8)";
  modal.style.zIndex = "100000";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";

  const box = document.createElement("div");
  box.style.background = "#222";
  box.style.padding = "24px";
  box.style.borderRadius = "12px";
  box.style.textAlign = "center";
  box.style.maxWidth = "90%";
  box.style.border = "1px solid #444";
  box.innerHTML = "<h3>Qual é esta pedra?</h3><p style='margin-bottom:16px;color:#aaa'>Se errar, você perde imediatamente.</p>";

  const grid = document.createElement("div");
  grid.style.display = "flex";
  grid.style.flexWrap = "wrap";
  grid.style.gap = "12px";
  grid.style.justifyContent = "center";

  const pedrasOficiais = [
    { nome: "Coroa", url: "assets/img/Coroa.svg" },
    { nome: "Espada", url: "assets/img/espada.svg" },
    { nome: "Balança", url: "assets/img/Balança.svg" },
    { nome: "Cavalo", url: "assets/img/cavalo.svg" },
    { nome: "Escudo", url: "assets/img/escudo.svg" },
    { nome: "Martelo", url: "assets/img/martelo.svg" },
    { nome: "Bandeira", url: "assets/img/bandeira.svg" }
  ];

  pedrasOficiais.forEach(p => {
    const btn = document.createElement("button");
    btn.style.background = "transparent";
    btn.style.border = "2px solid #555";
    btn.style.borderRadius = "8px";
    btn.style.padding = "8px";
    btn.style.cursor = "pointer";
    btn.style.display = "flex";
    btn.style.flexDirection = "column";
    btn.style.alignItems = "center";
    btn.style.transition = "all 0.2s";

    btn.onmouseover = () => { btn.style.borderColor = "#fff"; btn.style.background = "#333"; };
    btn.onmouseout = () => { btn.style.borderColor = "#555"; btn.style.background = "transparent"; };

    const img = document.createElement("img");
    img.src = p.url;
    img.style.width = "48px";
    img.style.height = "48px";
    img.style.marginBottom = "4px";

    const span = document.createElement("span");
    span.innerText = p.nome;
    span.style.color = "#eee";
    span.style.fontSize = "0.9em";

    btn.appendChild(img);
    btn.appendChild(span);

    btn.onclick = () => {
      verificarEscolhaPedra(idxMesa, p.nome);
      modal.remove();
    };

    grid.appendChild(btn);
  });

  const btnCancelar = document.createElement("button");
  btnCancelar.innerText = "Cancelar";
  btnCancelar.style.marginTop = "20px";
  btnCancelar.style.padding = "8px 16px";
  btnCancelar.style.background = "#d32f2f";
  btnCancelar.style.color = "white";
  btnCancelar.style.border = "none";
  btnCancelar.style.borderRadius = "4px";
  btnCancelar.style.cursor = "pointer";
  btnCancelar.onclick = () => modal.remove();

  box.appendChild(grid);
  box.appendChild(btnCancelar);
  modal.appendChild(box);
  document.body.appendChild(modal);
}

function verificarEscolhaPedra(idxMesa, nomeEscolhido) {
  const pedraReal = estadoJogo.mesa[idxMesa];
  if (!pedraReal) return;

  if (pedraReal.nome === nomeEscolhido) {
    showToastInterno("Correto!");
    // Revela a pedra
    estadoJogo.mesa[idxMesa].virada = false;

    // Verifica se ainda tem pedras viradas
    const aindaTemViradas = estadoJogo.mesa.some(p => p && p.virada);

    // No tutorial, precisamos dar feedback visual se o desafio continuar
    salvarEstadoJogo();
    renderizarMesa();

    if (!aindaTemViradas) {
      // Venceu o Se Gabar!
      showToast("Você provou seu conhecimento e VENCEU!");
      const idxJogador = estadoJogo.jogadores.findIndex(j => j.nome === nomeAtual);
      if (idxJogador !== -1) estadoJogo.jogadores[idxJogador].pontos++; // Ganha ponto ou vence o jogo

      // Finaliza o desafio
      getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").remove();

      // No tutorial, garante que o passo seja concluído
      if (salaAtual === "MODO_TUTORIAL" && window.tellstonesTutorial) {
        setTimeout(() => window.tellstonesTutorial.registrarAcaoConcluida(), 500);
      }
    }
  } else {
    showToastInterno(`Errou! A pedra era ${pedraReal.nome}. Você perdeu.`);
    // Revela a pedra para mostrar o erro
    estadoJogo.mesa[idxMesa].virada = false;

    // Oponente vence
    // Em tutorial, podemos impedir a derrota ou mostrar msg educativa?
    // Vamos deixar perder para aprender

    // Finaliza desafio (Derrota)
    estadoJogo.desafio = null;
    salvarEstadoJogo();
    renderizarMesa();
  }
}
