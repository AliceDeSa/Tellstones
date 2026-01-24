// Tellstones Client v5.0
// =========================
// Main Orchestrator for Game Logic, managing Room State and legacy interactions.
// Note: Logic is progressively being migrated to src/ modules.


window.onerror = function (message, source, lineno, colno, error) {
  if (window.AnalyticsManager) {
    window.AnalyticsManager.logError(message, error ? error.stack : "");
  }
  // Prevent default handling (optional, usually false to let browser log it too)
  return false;
};

let tellstonesBot = null;

// =========================
// 2. Utilidades Gerais & Shims Legados
// =========================

// Shims para manter compatibilidade com chamadas antigas
window.tocarSomPress = function () {
  if (window.audioManager) window.audioManager.playPress();
};
window.tocarSomClick = function () {
  if (window.audioManager) window.audioManager.playClick();
};
window.showToastInterno = function (msg) {
  if (window.notificationManager) window.notificationManager.showInternal(msg);
};
window.showToast = function (msg) {
  if (window.notificationManager) window.notificationManager.showGlobal(msg);
};

// gerarCodigoSala movido para src/utils/utils.js (e é Global)

// =========================
// 3. Lógica de Lobby e Salas
// =========================

// Cria uma nova sala no Firebase com o modo selecionado
// Cria uma nova sala via RoomManager
function criarSala(modo) {
  if (window.RoomManager) {
    return window.RoomManager.criarSala(modo);
  } else {
    console.error("RoomManager não carregado!");
    return null;
  }
}

window.currentGameMode = null;

// Entra em uma sala como jogador ou espectador
// Entra em uma sala via RoomManager
function entrarSala(codigo, nome, tipo) {
  if (window.RoomManager) {
    window.RoomManager.entrarSala(codigo, nome, tipo);
  } else {
    console.error("RoomManager não carregado!");
  }
  // Legacy Fallback for direct usage in script if needed immediately (mostly handled inside Manager now)
}

// tocarSomPress movido para src/utils/utils.js

// Alterna entre as telas principais do app
function mostrarTela(tela) {
  // Limpar tooltips ao trocar de tela
  if (typeof hideTooltip === "function") hideTooltip();

  document.getElementById("start-screen").classList.remove("active");
  document.getElementById("lobby").classList.remove("active");
  document.getElementById("game").classList.remove("active");
  document.getElementById(tela).classList.add("active");
  // Som de fundo (Regra: Tocar no Menu/Lobby, Parar no Jogo)
  const creditosSom = document.getElementById("creditos-som");
  const placarTurno = document.getElementById("placar-turno-central");
  const btnMute = document.getElementById("btn-mute-global");

  if (tela === "start-screen" || tela === "lobby") {
    if (window.audioManager) window.audioManager.playAmbience();
    if (creditosSom) creditosSom.style.display = "";
    if (placarTurno) placarTurno.style.display = "none";
    if (btnMute) btnMute.style.display = "flex"; // Mostrar botão mute
  } else {
    // Tela de Jogo ou outras: Parar música
    if (window.audioManager) window.audioManager.stopAmbience();
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




  // FIX: Force Cleanup of In-Game UI when leaving 'game' screen
  if (tela !== "game") {
    // Cleanup Segabar
    const segabarContainer = document.getElementById("opcoes-resposta-segabar");
    if (segabarContainer) segabarContainer.remove();

    // Cleanup Global Overlays
    const idsToHide = ["box-acoes", "carta-acoes", "icone-acoes", "tutorial-ui", "escolha-cara-coroa"];
    idsToHide.forEach(uiId => {
      const el = document.getElementById(uiId);
      if (el) el.style.display = "none";
    });

    // Hide tooltip global
    const tooltip = document.getElementById("tooltip");
    if (tooltip) tooltip.style.display = "none";
  }
}

// ==== FUNÇÃO SAIR PARTIDA (GLOBAL) ====
// Sai da partida atual via RoomManager
function sairPartida() {
  if (window.RoomManager) {
    window.RoomManager.sairPartida();
  } else {
    // Fallback básico se RoomManager falhar
    mostrarTela("start-screen");
    window.location.reload(); // Hard Reset
  }
}


// Função para adicionar listener de notificações globais por sala
// adicionarListenerNotificacoes movido e gerenciado pelo RoomManager
// A função original foi removida para usar window.RoomManager.adicionarListenerNotificacoes se necessário,
// mas o próprio RoomManager.mostrarLobby já cuida disso.

// Mostra o lobby da sala e atualiza lista de jogadores/espectadores em tempo real
// Mostra o lobby via RoomManager
function mostrarLobby(codigo, nome, criador = false) {
  if (window.RoomManager) {
    window.RoomManager.mostrarLobby(codigo, nome, criador);
  } else {
    console.error("RoomManager não encotrado!");
  }
}

// =========================
// 4. Estado e Inicialização do Jogo
// =========================

// Variáveis globais para controle da sala e do usuário atual
window.salaAtual = null;
window.nomeAtual = null;
window.souCriador = false;
let ultimosJogadores = [];
let ultimosEspectadores = [];
// Estado anterior da mesa para detectar mudanças
let mesaAnterior = null;

// Estado principal do jogo, controlando jogadores, pedras e turno
window.estadoJogo = {
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
// Wrapper para salvarEstadoJogo -> GameController.persistirEstado
function salvarEstadoJogo() {
  if (window.GameController) {
    window.GameController.persistirEstado();
  } else {
    // console.warn("GameController não disponível para salvarEstadoJogo.");
  }
}

// Wrapper para ouvirEstadoJogo -> GameController.iniciarListenerEstado
function ouvirEstadoJogo() {
  // Ignora se não houver sala ou GameController
  if (window.GameController && window.salaAtual) {
    window.GameController.iniciarListenerEstado(window.salaAtual);
  }
}

// Corrigir inicializarJogo para NÃO colocar a pedra central na mesa antes do sorteio
// Wrapper para inicializarJogo -> GameController.inicializarJogo
function inicializarJogo(jogadores) {
  if (window.GameController) {
    return window.GameController.inicializarJogo(jogadores);
  } else {
    // console.error("GameController não disponível para inicializarJogo.");
    return null;
  }
}

// =========================
// 4. Lógica de Turno (Global)
// =========================

window.avancarTurno = function () {
  if (!window.estadoJogo) return;
  const jogadores = window.estadoJogo.jogadores || [];
  if (jogadores.length === 0) return;

  // Toggle logic for 2 players
  let proximaVez = (window.estadoJogo.vez + 1) % jogadores.length;
  window.estadoJogo.vez = proximaVez;

  // Notify (System)
  const proximoJogador = jogadores[proximaVez];
  const nome = proximoJogador ? proximoJogador.nome : "Oponente";

  // Use Global Notification for Turn Change (Optional, but good feedback)
  // if (window.notificationManager) window.notificationManager.showGlobal(`Vez de ${nome}`);

  console.log(`[System] Turn Advanced. Now it is ${nome}'s turn (Index: ${proximaVez})`);

  // Persist State
  if (window.GameController && window.GameController.persistirEstado) {
    window.GameController.persistirEstado();
  }
};

// =========================
// 5. Renderização de UI
// =========================

// Flag global para bloquear renderização durante a animação de alinhamento
let animacaoAlinhamentoEmAndamento = false;

// =========================
// Função utilitária: slots válidos para inserir pedra na mesa
// =========================
function calcularSlotsValidos(mesa) {
  if (GameRules && GameRules.calcularSlotsValidos) {
    return GameRules.calcularSlotsValidos(mesa);
  }
  return [];
}

// Função auxiliar de troca
// Função auxiliar de troca
function realizarTroca(from, to) {
  if (from === to) return;
  getDBRef("salas/" + window.salaAtual + "/estadoJogo").update({
    trocaAnimacao: {
      from: from,
      to: to,
      timestamp: Date.now(),
      jogador: window.nomeAtual
    }
  });
  // if (window.notificationManager) window.notificationManager.showInternal("Pedras trocadas!");
}

// Configura as interações de drag & drop e clique nas pedras da mesa
// Função setupMesaInteractions DEPRECATED (Logica movida para Renderer.js)
function setupMesaInteractions() {
  // No-op
}

// =========================
// 8. Event Listeners para Botões de Ação (Desafiar / Se Gabar)
// =========================
// =========================
// 8. Event Listeners para Botões de Ação (Desafiar / Se Gabar)
// =========================
// Movido para InputHandler.setupGlobalListeners()

// =========================
// 7. Moeda e Animações
// =========================

// Eventos para escolha de cara ou coroa
// Force re-render on resize to fix slot positions
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // Only if not animating
    if (!window.animacaoTrocaEmAndamento) {
      // console.log("[RESIZE] Re-rendering mesa to fix positions.");
      Renderer.renderizarMesa();
    }
  }, 200);
});
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
// Listeners movidos para InputHandler.setupGlobalListeners()

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
      if (window.notificationManager) window.notificationManager.showInternal(`Você ficou com: ${minhaEscolha.toUpperCase()}`);
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
              // console.log("[DEBUG] escolhaData:", escolhaData);
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
              // console.log("[DEBUG] [SORTEIO] nomeGanhador:", nomeGanhador);
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
                      getDBRef("salas/" + salaAtual + "/estadoJogo").set(estado);
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
    notif.style.background = "transparent url('assets/img/notification_icon.png') no-repeat center center";
    notif.style.backgroundSize = "100% 100%";
    notif.style.color = "#fff";
    notif.style.padding = "100px 140px"; // Ajustado para ser levemente menor que o toast padrão se necessário, ou igual
    notif.style.textAlign = "center";
    notif.style.borderRadius = "0";
    notif.style.fontSize = "1.3em";
    notif.style.boxShadow = "none";
    notif.style.border = "none";
    notif.style.zIndex = 1001;
    notif.style.display = "none";
    notif.style.fontFamily = "'Cinzel', serif";
    notif.style.textShadow = "0 2px 4px rgba(0,0,0,0.8)";
    notif.style.pointerEvents = "none"; // Garante que não bloqueie cliques
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
// 1. Ajustar flag de animação para garantir que só é desativada após a renderização vertical
function sincronizarPedraCentralEAlinhamento() {
  try {
    if (animacaoAlinhamentoEmAndamento) return;
    animacaoAlinhamentoEmAndamento = true;

    if (!estadoJogo.pedraCentral || estadoJogo.centralAlinhada) {
      animacaoAlinhamentoEmAndamento = false;
      return;
    }

    // Checagem de elementos DOM
    const circle = document.getElementById("circle-pedras");
    const wrapper = document.getElementById("tabuleiro-wrapper");
    const tabuleiroCenter = document.getElementById("tabuleiro-center");

    if (!circle || !wrapper || !tabuleiroCenter) {
      animacaoAlinhamentoEmAndamento = false;
      setTimeout(sincronizarPedraCentralEAlinhamento, 300);
      return;
    }

    getDBRef("salas/" + salaAtual + "/estadoJogo/centralAlinhada").transaction(
      function (current) {
        if (current === true) return; // já foi alinhada
        return true;
      },
      function (error, committed, snapshot) {
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
            getDBRef("salas/" + salaAtual + "/estadoJogo").update({
              mesa: novaMesa,
              pedraCentral: null,
              centralAlinhada: true,
              alinhamentoFeito: true
            });
            if (window.Renderer) window.Renderer.renderizarMesa();
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
              Renderer.renderizarPedrasReserva();
              estadoJogo.alinhamentoFeito = true;
            }, 700);
          }, 2000);
        } else {
          animacaoAlinhamentoEmAndamento = false;
        }
      }
    );
  } catch (e) {
    console.warn('[ALINHAMENTO] Erro:', e);
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
    safeStorage.setItem("tellstones_playerName", nome);
    const codigo = criarSala(modo);

    // Configura sessão e jogo via Manager
    if (window.RoomManager) {
      window.RoomManager.entrarSala(codigo, nome, "jogador");
      window.RoomManager.mostrarLobby(codigo, nome, true);
    } else {
      // Fallback
      window.currentGameMode = new MultiplayerMode();
      window.currentGameMode.start({ roomCode: codigo, playerName: nome });
      mostrarLobby(codigo, nome, true);
    }

    document.getElementById("codigo-sala-criada").innerText =
      "Código da sala: " + codigo;
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
    safeStorage.setItem("tellstones_playerName", nome);
    if (!codigo) return alert("Digite o código da sala!");
    if (!nome) return alert("Digite seu nome!");
    safeStorage.setItem("tellstones_playerName", nome);

    // Configura sessão e jogo via Manager
    if (window.RoomManager) {
      window.RoomManager.entrarSala(codigo, nome, tipo);
      window.RoomManager.mostrarLobby(codigo, nome, false);
    } else {
      window.currentGameMode = new MultiplayerMode();
      window.currentGameMode.start({ roomCode: codigo, playerName: nome });
      mostrarLobby(codigo, nome, false);
    }
  };
}

// Evento para mostrar tela inicial ao carregar a página
// Evento para mostrar tela inicial ao carregar a página

// Evento para mostrar tela inicial ao carregar a página
document.addEventListener("DOMContentLoaded", function () {
  // Configurar botão de mute (Apenas Música)
  const btnMute = document.getElementById("btn-mute-global");
  if (btnMute) {
    btnMute.title = "Mutar/Desmutar Música";
    let isMuted = false;

    function atualizarIconeMute() {
      if (btnMute) btnMute.innerText = isMuted ? "🔇" : "🔊";
    }

    // Load saved state
    const savedMuted = safeStorage.getItem("tellstones_muted");
    if (savedMuted !== null) {
      isMuted = (savedMuted === 'true');
      atualizarIconeMute();
      const somFundo = document.getElementById("som-fundo");
      if (somFundo) somFundo.muted = isMuted;
    }

    btnMute.onclick = function (e) {
      e.preventDefault(); // Prevent double tap zoom etc
      isMuted = !isMuted;
      safeStorage.setItem("tellstones_muted", isMuted);
      atualizarIconeMute();

      const somFundo = document.getElementById("som-fundo");
      if (somFundo) {
        somFundo.muted = isMuted;
        // Se desmutar e não estiver tocando (e não estiver no jogo), tenta tocar
        if (!isMuted && somFundo.paused) {
          const telaGame = document.getElementById("game");
          if (!telaGame || !telaGame.classList.contains("active") || userHasInteracted) {
            somFundo.play().catch(() => { });
          }
        }
      }
    };

    // Ensure usage of pointer events on mobile if needed
    btnMute.style.cursor = "pointer";

    // --- Nome do Jogador Persistence ---
    const savedName = safeStorage.getItem("tellstones_playerName");
    if (savedName) {
      const inpCriar = document.getElementById("nome-criar");
      const inpEntrar = document.getElementById("nome-entrar");
      if (inpCriar) inpCriar.value = savedName;
      if (inpEntrar) inpEntrar.value = savedName;
    }
  }
});

mostrarTela("start-screen");

// --- FIXES MOBILE ---
function checkOrientation() {
  const overlay = document.getElementById("rotate-device-overlay");
  if (!overlay) return;
  // Se width < 900 e altura > largura (portrait)
  if (window.innerHeight > window.innerWidth) {
    overlay.style.display = "flex";
    overlay.style.zIndex = "9999999"; // Força bruta z-index
  } else {
    overlay.style.display = "none";
  }
}

// --- LOGICA DO BOTAO DE FORCAR ROTAÇÃO ---
const btnFull = document.getElementById("btn-fullscreen-rotate");
if (btnFull) {
  btnFull.onclick = async function () {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) { // Safari/iOS
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) { // Firefox
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) { // IE/Edge
        await docEl.msRequestFullscreen();
      }

      // Pequeno delay para garantir que o browser entrou em fullscreen
      setTimeout(() => {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock("landscape").then(() => {
            console.log("Orientação travada em landscape");
          }).catch((e) => {
            console.warn("Falha ao travar orientação:", e);
            // Fallback visual ou aviso se necessário
            showToastInterno("Rotação automática não suportada. Por favor, gire manualmente.");
          });
        } else {
          // Safari iOS (iPad) não suporta lock, mas o fullscreen ajuda
          showToastInterno("Modo tela cheia ativado. Por favor, gire o dispositivo.");
        }
      }, 300);
    } catch (err) {
      console.error("Erro ao tentar entrar em fullscreen:", err);
      showToastInterno("Erro ao ativar tela cheia. Gire manualmente.");
    }
  };
}

function fixKofiVisibility() {
  const isGameActive = document.getElementById("game").classList.contains("active");
  // Selectors for various parts of the Ko-fi widget structure
  const kofiElements = [
    document.querySelector("iframe[id*='kofi']"),
    document.querySelector(".floating-chat-kofi-popup-iframe"),
    document.querySelector(".floatingchat-container-wrap"),
    document.querySelector("[id*='kofi-widget-overlay']")
  ];

  kofiElements.forEach(el => {
    if (!el) return;
    if (isGameActive) {
      el.style.setProperty("display", "none", "important");
    } else {
      // Restore visibility when not in game
      // Removing the property restores the default (usually flex or block from external CSS)
      el.style.removeProperty("display");
      // If simply removing doesn't work (due to external script state), force block/flex
      if (getComputedStyle(el).display === "none") {
        el.style.display = "block"; // Fallback
      }
    }
  });
}

// Listeners
window.addEventListener("resize", checkOrientation);
window.addEventListener("orientationchange", () => setTimeout(checkOrientation, 200));
setInterval(checkOrientation, 1000); // Polling lento
setInterval(fixKofiVisibility, 1000); // Polling para garantir que o Ko-fi suma
// --- GLOBAL FIXES ---
// Prevent excessive mobile scrolling/bouncing
document.body.addEventListener('touchmove', function (e) {
  if (e.target.closest('#game-mesa') || e.target.closest('#rotate-device-overlay')) {
    // Allow internal moves but prevent body scroll if needed
    // e.preventDefault(); 
  }
}, { passive: false });

// CRITICAL: Block Context Menu Globally on the Game Board
document.addEventListener("contextmenu", function (e) {
  if (e.target.tagName === 'IMG' || e.target.closest('#game-mesa') || e.target.closest('.pedra-oficial')) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}, { passive: false }); /* capture: false */

checkOrientation();

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
            if (window.notificationManager) window.notificationManager.showInternal("Aguardeando escolha de Cara ou Coroa!");
            if (moedaBtn) {
              moedaBtn.style.display = "none";
              moedaBtn.onclick = null;
            }
            return;
          }
          if (moedaBtn) {
            moedaBtn.style.display = "block";
            moedaBtn.onclick = function () {
              // if (window.audioManager) window.audioManager.playPress(); // Removed to avoid double sound with Coin Audio
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

    // UI Fix: Add class to start-screen
    const startScreen = document.getElementById("start-screen");
    if (startScreen) startScreen.classList.add("mode-online");
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
    if (window.audioManager) window.audioManager.playPress();
    iniciarModoTutorial();
  };
}

if (btnBot) {
  btnBot.onclick = function () {
    if (window.audioManager) window.audioManager.playPress();
    iniciarModoBot();
  };
}

const btnSairPartida = document.getElementById("btn-sair-partida");
if (btnSairPartida) {
  btnSairPartida.onclick = function () {
    if (window.audioManager) window.audioManager.playPress();

    // Call centralized exit logic which handles session cleanup
    if (window.RoomManager) {
      window.RoomManager.sairPartida();
    } else {
      // Fallback for non-RoomManager modes (Tutorial?)
      mostrarTela("start-screen");
      isLocalMode = false;
      tellstonesBot = null;
      if (window.tellstonesTutorial) {
        if (window.tellstonesTutorial.cleanup) window.tellstonesTutorial.cleanup();
        window.tellstonesTutorial = null;
      }
      const tutorialUI = document.getElementById("tutorial-ui");
      if (tutorialUI) tutorialUI.remove();

      // Hide UI
      const idsToHide = ["box-acoes", "carta-acoes", "icone-acoes"];
      idsToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
      });
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
    // tocarSomDesafio(); // REMOVIDO A PEDIDO DO USUARIO
    if (!ehMinhaVez()) {
      if (window.notificationManager) window.notificationManager.showInternal("Aguarde sua vez!");
      return;
    }
    // Restrição Tutorial: Strict Mode
    if (salaAtual === "MODO_TUTORIAL" && window.tellstonesTutorial) {
      if (!window.tellstonesTutorial.verificarAcao("BOTAO_DESAFIAR")) return;
    }
    // Restrição Tutorial
    // Restrição Tutorial
    if (salaAtual === "MODO_TUTORIAL" && window.tellstonesTutorial && window.tellstonesTutorial.passo !== 5) {
      if (window.notificationManager) window.notificationManager.showInternal("Siga o tutorial: agora não é hora de desafiar.");
      return;
    }
    // Só permite se houver pelo menos uma pedra virada para baixo
    const pedrasViradas = estadoJogo.mesa.filter((p) => p && p.virada);
    if (!pedrasViradas.length) {
      if (window.notificationManager) window.notificationManager.showInternal("Não há pedras viradas para baixo para desafiar!");
      return;
    }
    if (window.notificationManager) window.notificationManager.showInternal("Selecione uma pedra virada para baixo para desafiar.");
    window.selecionandoDesafio = true;
    // Marcar status 'selecionando' no desafio com o jogador correto
    estadoJogo.desafio = { status: "selecionando", jogador: nomeAtual };
    salvarEstadoJogo();
    if (window.Renderer) window.Renderer.renderizarMesa();
  };
}

const btnSegabar = document.getElementById("btn-segabar");
if (btnSegabar) {
  btnSegabar.onclick = function () {
    console.log("[DEBUG] Boast Button Clicked");
    console.log("[DEBUG] ehMinhaVez:", ehMinhaVez());
    console.log("[DEBUG] salaAtual:", salaAtual);

    // tocarSomDesafio(); // REMOVIDO A PEDIDO DO USUARIO
    if (!ehMinhaVez()) {
      console.warn("[DEBUG] Boast Blocked: Not my turn");
      if (window.notificationManager) window.notificationManager.showInternal("Aguarde sua vez!");
      return;
    }
    // Restrição Tutorial
    if (salaAtual === "MODO_TUTORIAL" && window.tellstonesTutorial && window.tellstonesTutorial.passo !== 7) {
      if (window.notificationManager) window.notificationManager.showInternal("Siga o tutorial: agora não é hora de se gabar.");
      return;
    }
    // Lógica de Se Gabar
    // Marca desafio como 'segabar' e espera resposta do oponente
    estadoJogo.desafio = {
      tipo: "segabar",
      status: "aguardando_resposta",
      jogador: nomeAtual
    };
    salvarEstadoJogo();
    enviarNotificacaoGlobal(`${nomeAtual} está se gabando!`);
    if (window.Renderer) window.Renderer.renderizarMesa();
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
  // adicionarListenerNotificacoes() removido; gerenciado pelo RoomManager
  if (window.RoomManager && window.RoomManager.adicionarListenerNotificacoes) {
    if (codigo) window.RoomManager.adicionarListenerNotificacoes(codigo);
  }
  mostrarTela("game");
  Renderer.atualizarInfoSala(codigo, espectadores);

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
  if (window.GameController) {
    window.GameController.iniciarListenerEstado(codigo);
  } else {
    console.error("GameController não encontrado para iniciar listener.");
  }
  if (typeof monitorarTrocas === 'function') monitorarTrocas();
  Renderer.renderizarMesa();
  Renderer.renderizarPedrasReserva();

  // Force uppercase on Room Input
  const roomInput = document.getElementById("room-code");
  if (roomInput) {
    roomInput.addEventListener("input", function () {
      this.value = this.value.toUpperCase();
    });
  }
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
              <button class="fechar-card" onclick="document.getElementById('carta-acoes').style.display='none'">X</button>
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
// Função para avançar o turno (Delegada para GameController)
function avancarTurno() {
  if (window.GameController && window.GameController.avancarTurno) {
    window.GameController.avancarTurno();
  } else {
    console.error("GameController.avancarTurno não encontrado.");
  }
}

// Adicionar função renderizarPedrasMesa de volta
function renderizarPedrasMesa(pedras) {

  if (window.animacaoTrocaEmAndamento) {

    return;
  }
  // DEBUG VISUAL STATE
  if (pedras && pedras.length > 0) {
    const states = pedras.map((p, i) => p ? `${i}:${p.virada ? 'DOWN' : 'UP'}` : `${i}:NULL`);
    console.log(`[RENDER] Pedras: ${states.join(', ')}`);
  }

  const wrapper = document.getElementById("tabuleiro-wrapper");
  const pedrasMesa = document.getElementById("pedras-mesa");
  pedrasMesa.innerHTML = "";
  const positions = Renderer.getSlotPositions(wrapper, 7, 68.39, 40);
  for (let i = 0; i < 7; i++) {
    const p = pedras[i];

    // SEMPRE criar o elemento, mesmo se vazio, para garantir alvo da animação
    const div = document.createElement("div");
    div.className = "pedra-oficial pedra-mesa"; // Classes base
    div.style.left = positions[i].left + "px";
    div.style.top = positions[i].top + "px";
    div.style.position = "absolute";
    div.style.width = "68.39px";
    div.style.height = "68.39px";
    div.style.transform = "translate(-50%, -50%)";
    div.setAttribute("data-idx", i); // Sempre presente

    // Log positions occasionally (e.g. for index 0 and 6)


    // [REFACTORED] Lógica Unificada de Renderização e Interação
    if (p && p.url) {
      // 1. Configuração Visual e de Clique (Específica por Estado)
      if (p.virada) {
        div.innerHTML = `<div style='width:100%;height:100%;border-radius:50%;background:#fff;border:2px solid #2d8cff;position:relative;'></div>`;

        // Logica para Desafio (Selecionar pedra, etc)
        if (estadoJogo.desafio && estadoJogo.desafio.status === "selecionando" && estadoJogo.alinhamentoFeito && ehMinhaVez()) {
          div.style.cursor = "pointer";
          div.onclick = function (e) {
            e.stopPropagation();
            if (window.tellstonesTutorial && !window.tellstonesTutorial.verificarAcao("SELECIONAR_DESAFIO")) return;
            if (window.audioManager) window.audioManager.playClick();
            if (!estadoJogo.mesa[i] || !estadoJogo.mesa[i].virada) return;
            adicionarSilhuetaEspiada(i);
            if (window.notificationManager) window.notificationManager.showInternal("Aguarde o oponente escolher a pedra!");
            const pedrasMesa = document.querySelectorAll(".pedra-mesa");
            pedrasMesa.forEach((d) => { d.onclick = null; d.style.cursor = "not-allowed"; });

            const desafioAtual = estadoJogo.desafio || {};
            desafioAtual.idxPedra = i;
            desafioAtual.status = "aguardando_resposta";

            if (window.isLocalMode) {
              window.estadoJogo.desafio = desafioAtual;
              window.estadoJogo.mesaEspiada = null;
              window.selecionandoDesafio = false;
              GameController.persistirEstado();
            } else {
              getDBRef("salas/" + salaAtual + "/estadoJogo/desafio").set(desafioAtual);
              getDBRef("salas/" + salaAtual + "/estadoJogo/mesaEspiada").set(null);
            }

            // TUTORIAL TRIGGER
            if (salaAtual === 'MODO_TUTORIAL' && window.tellstonesTutorial) {
              window.tellstonesTutorial.registrarAcaoConcluida();
            }

            avancarTurno();
          };
        } else if (!estadoJogo.desafio && estadoJogo.alinhamentoFeito && ehMinhaVez()) {
          // Espiar
          div.ondblclick = function () {
            if (window.tellstonesTutorial && !window.tellstonesTutorial.verificarAcao("ESPIAR_PEDRA")) return;
            if (window.audioManager) window.audioManager.playFlip();
            espiarPedra(i);
          };
          div.style.cursor = "pointer";
          div.title = "Espiar pedra (duplo clique)";
        } else {
          div.onclick = null;
          div.style.cursor = "not-allowed";
        }

        // CRITICAL FIX: Ensure no tooltip or title reveals the stone name
        div.onmouseenter = null;
        div.onmousemove = null;
        div.onmouseleave = null;
        div.title = "";
        div.removeAttribute("title");

      } else {
        // Pedra virada para CIMA
        const img = document.createElement("img");
        img.src = p.url;
        img.alt = p.nome;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        img.draggable = false;
        div.appendChild(img);

        // Tooltip
        div.onmouseenter = function (e) { showTooltip(p.nome, e.clientX, e.clientY); };
        div.onmousemove = function (e) { showTooltip(p.nome, e.clientX, e.clientY); };
        div.onmouseleave = hideTooltip;

        // Responder Desafio
        if (estadoJogo.desafio && estadoJogo.desafio.status === "responder_pecas" && estadoJogo.desafio.jogador === nomeAtual && ehMinhaVez()) {
          div.onclick = function () {
            if (window.currentGameMode && !window.currentGameMode.canPerformAction("RESPONDER_DESAFIO")) return;
            if (window.audioManager) window.audioManager.playClick();
            abrirSeletorPedra(i);
          };
          div.style.cursor = "pointer";
        }

        // Virar Pedra
        // Virar Pedra (Esconder)
        if (estadoJogo.alinhamentoFeito && ehMinhaVez() && (!estadoJogo.desafio || estadoJogo.desafio.status !== "responder_pecas")) {
          div.ondblclick = function () {
            const idx = parseInt(div.getAttribute("data-idx"));
            if (estadoJogo.mesa[idx] && !estadoJogo.mesa[idx].virada) {
              if (window.currentGameMode && !window.currentGameMode.canPerformAction("VIRAR_PEDRA")) return;
              if (window.audioManager) window.audioManager.playFlip();
              // Estado update
              estadoJogo.mesa[idx].virada = true;
              salvarEstadoJogo();
              enviarNotificacaoGlobal(`Pedra (${estadoJogo.mesa[idx].nome}) foi virada.`);

              if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();

              avancarTurno();

              // FORCE RE-RENDER to ensure visual updates immediately
              if (window.Renderer) window.Renderer.renderizarMesa();
            }
          };
          div.style.cursor = "pointer";
          div.title = "Esconder pedra (duplo clique)";
        }
      }

      // 2. Animações e Debug Comuns
      if (estadoJogo.mesaEspiada === i && p.virada) {
        const fundo = div.querySelector("div");
        if (fundo) fundo.classList.add("borda-dourada-animada");
      }

      // HIGHLIGHT CHALLENGED STONE (Fix for Bot Visuals)
      const desafio = window.estadoJogo.desafio;
      if (desafio && !desafio.resolvido && (desafio.alvo == i || desafio.pedra == i || desafio.idxPedra == i)) {
        console.log(`[Script.js] Highlight Triggered for Stone ${i} (Alvo: ${desafio.alvo})`);
        div.style.setProperty("box-shadow", "0 0 15px 5px yellow", "important");
        div.style.setProperty("border", "3px solid yellow", "important");
        div.style.setProperty("transform", "translate(-50%, -50%) scale(1.15)", "important");
        div.style.setProperty("z-index", "1000", "important");
      }

      // Debug numbering removed


      // 3. Lógica de Drag & Drop / Touch (UNIFICADA)
      if (ehMinhaVez()) {
        // --- DESKTOP DRAG ---
        div.setAttribute("draggable", "true");
        div.ondragstart = (e) => {
          if (window.currentGameMode && !window.currentGameMode.canPerformAction("TROCAR_PEDRAS")) {
            e.preventDefault(); return;
          }
          if (window.audioManager) window.audioManager.playClick();
          setTimeout(() => div.classList.add("pedra-troca-selecionada"), 0);
          e.dataTransfer.setData("idx", i);
          if (window.notificationManager) window.notificationManager.showInternal(`Arrastando Pedra ${i}`);
        };
        div.ondragend = () => { div.classList.remove("pedra-troca-selecionada"); };
        div.ondragover = (e) => { e.preventDefault(); div.classList.add("pedra-drop-alvo"); };
        div.ondragleave = (e) => { div.classList.remove("pedra-drop-alvo"); };
        div.ondrop = (e) => {
          e.preventDefault();
          div.classList.remove("pedra-drop-alvo");
          const idxReserva = e.dataTransfer.getData("idxReserva");
          if (idxReserva) {
            // Reserva Logic
            const rIdx = parseInt(idxReserva);
            const pedraObj = estadoJogo.reserva[rIdx];
            if (pedraObj) { estadoJogo.reserva[rIdx] = null; inserirPedraNaMesa(pedraObj, i); }
          } else {
            // Swap Logic
            const fromIdxDrop = parseInt(e.dataTransfer.getData("idx"));
            if (isNaN(fromIdxDrop) || fromIdxDrop === i) return;
            if (!estadoJogo.mesa[fromIdxDrop]) { if (window.notificationManager) window.notificationManager.showInternal("Inválido!"); return; }

            // FIX: Write directly to child path to ensure LocalDB/Firebase listeners trigger correctly
            getDBRef("salas/" + salaAtual + "/estadoJogo/trocaAnimacao").set({
              from: fromIdxDrop,
              to: i,
              timestamp: Date.now(),
              jogador: nomeAtual
            });
            if (window.notificationManager) window.notificationManager.showInternal("Pedras trocadas!");
          }
        };

        div.addEventListener("touchstart", function (e) {
          if (window.currentGameMode && !window.currentGameMode.canPerformAction("TROCAR_PEDRAS")) return;
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();

          div.classList.add("pedra-troca-selecionada");

          const touch = e.touches[0];
          const rect = div.getBoundingClientRect();
          const startX = touch.clientX;
          const startY = touch.clientY;
          let hasMoved = false;

          const offsetX = touch.clientX - rect.left;
          const offsetY = touch.clientY - rect.top;

          // Create Ghost
          const ghost = document.createElement("div");
          ghost.className = "ghost-pedra";
          ghost.style.width = rect.width + "px";
          ghost.style.height = rect.height + "px";
          ghost.style.position = "fixed";
          ghost.style.zIndex = "999999";
          ghost.style.opacity = "0.9";
          ghost.style.pointerEvents = "none";
          ghost.style.boxShadow = "0 6px 16px rgba(0,0,0,0.4)";

          if (p.virada) {
            const faceDownVis = document.createElement("div");
            Object.assign(faceDownVis.style, {
              width: '100%', height: '100%', borderRadius: '50%',
              background: '#fff', border: '3px solid #2d8cff', boxSizing: 'border-box'
            });
            ghost.appendChild(faceDownVis);
          } else {
            const imgOriginal = div.querySelector('img');
            if (imgOriginal) {
              const ghostImg = imgOriginal.cloneNode(true);
              ghostImg.style.width = "100%";
              ghostImg.style.height = "100%";
              ghost.appendChild(ghostImg);
            } else {
              ghost.style.background = "white"; ghost.innerText = "?";
            }
          }

          document.body.appendChild(ghost);
          div.style.opacity = "0.3";

          let targetIdx = null;
          let lastTarget = null;
          let initialMove = 0;

          function onTouchMoveBoard(ev) {
            if (ev.cancelable) ev.preventDefault();
            const t = ev.touches[0];

            const dx = t.clientX - startX;
            const dy = t.clientY - startY;
            const moveDist = Math.sqrt(dx * dx + dy * dy);

            // Consider move only if > 10px to avoid jitter triggering drag instead of tap
            if (moveDist > 10) hasMoved = true;

            ghost.style.left = (t.clientX - offsetX) + "px";
            ghost.style.top = (t.clientY - offsetY) + "px";

            if (hasMoved) {
              const gCx = t.clientX - offsetX + (rect.width / 2);
              const gCy = t.clientY - offsetY + (rect.height / 2);

              // Hit Test
              const candidates = document.querySelectorAll('.pedra-mesa[data-idx]');
              let closest = null;
              let minDist = 70; // Pixel threshold

              candidates.forEach(cand => {
                const r = cand.getBoundingClientRect();
                const dist = Math.hypot(gCx - (r.left + r.width / 2), gCy - (r.top + r.height / 2));
                if (dist < minDist) { minDist = dist; closest = cand; }
              });

              if (lastTarget && lastTarget !== closest) lastTarget.style.border = "none";
              if (closest && closest !== div) {
                closest.style.border = "2px solid #2d8cff";
                lastTarget = closest;
                targetIdx = parseInt(closest.getAttribute("data-idx"));
              } else {
                targetIdx = null;
                lastTarget = null;
              }
            }
          }

          function onTouchEndBoard(ev) {
            div.style.opacity = "1";
            div.classList.remove("pedra-troca-selecionada");
            if (ghost) ghost.remove();
            if (lastTarget) lastTarget.style.border = "none";

            // Drag Interaction
            if (hasMoved && targetIdx !== null && !isNaN(targetIdx) && targetIdx !== i) {
              if (!estadoJogo.mesa[targetIdx] && !estadoJogo.mesa[i]) {
                showToastInterno("Vazio!");
              } else {
                realizarTroca(i, targetIdx);
              }
            }
            // Tap / Double Tap Interaction
            else if (!hasMoved) {
              const now = Date.now();
              // Se houver onclick direto (Ex: Responder Desafio), prioriza single tap
              if (div.onclick && !div.ondblclick) {
                div.onclick(ev);
              }
              // Lógica de Double Tap para ações normais (Virar/Espiar)
              else {
                if (div.lastTapTime && (now - div.lastTapTime < 300)) {
                  // Double Tap Trigger
                  if (div.ondblclick) div.ondblclick(ev);
                  div.lastTapTime = 0;
                } else {
                  // First Tap
                  div.lastTapTime = now;
                  // Opcional: Mostrar tooltip no single tap
                  showTooltip(p.nome, rect.left, rect.top);
                  setTimeout(hideTooltip, 1000);
                }
              }
            }

            document.removeEventListener("touchmove", onTouchMoveBoard);
            document.removeEventListener("touchend", onTouchEndBoard);
          }
          document.addEventListener("touchmove", onTouchMoveBoard, { passive: false });
          document.addEventListener("touchend", onTouchEndBoard);
        }, { passive: false });

      } else {
        div.setAttribute("draggable", "false");
        div.ondragstart = null;
        div.style.cursor = "not-allowed";
      }

      div.classList.add("pedra-mesa");
    } else {
      // Slot Vazio
      div.innerHTML = "";
      div.style.background = "transparent";
      div.style.border = "none";
      div.classList.remove("pedra-oficial");
      div.classList.add("slot-vazio", "pedra-mesa");
    }
    pedrasMesa.appendChild(div);
  }
} // End renderizarPedrasMesa


// Restaurar função mostrarEscolhaCaraCoroa
function mostrarEscolhaCaraCoroa() {
  const escolha = document.getElementById("escolha-cara-coroa");
  if (escolha) {
    escolha.style.display = "flex";
    escolha.style.alignItems = "center";
    escolha.style.justifyContent = "center";
    escolha.style.zIndex = 1050;
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
    if (window.notificationManager) window.notificationManager.showInternal(
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
    if (window.notificationManager) window.notificationManager.showInternal("Só é possível espiar pedras viradas.");
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
        "assets/audio/ambient.mp3";
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
    // FIX: pointer-events: none para o container PRINCIPAL para não bloquear a mesa abaixo
    container.style.cssText = "display: flex; justify-content: center; top: 7%; left: 50%; transform: translateX(-50%); padding: 0px; background: transparent; border: none; box-shadow: none; position: absolute; z-index: 1000; width: 740px; flex-direction: column; align-items: center; pointer-events: none;";

  } else {
    container.innerHTML = "";
    container.style.display = "flex";
  }
  // Novo: criar box-desafio para envolver título e pedras
  const box = document.createElement("div");
  box.className = "box-desafio";
  // Force high Z-index and interaction
  box.style.zIndex = "1100";
  box.style.pointerEvents = "auto";
  box.style.position = "relative"; // Ensure z-index works
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
      url: "assets/img/Balanca.svg"
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
    btn.onclick = function (e) {
      console.log("[DEBUG] Resposta Desafio Clicada:", p.nome);
      e.preventDefault();
      tocarSomClick();

      const desafioUpdate = { ...estadoJogo.desafio };
      desafioUpdate.escolhaOponente = idx;
      desafioUpdate.status = "resolvido";

      // Salvar via update para evitar sobrescrever tudo
      const updates = {};
      updates["salas/" + salaAtual + "/estadoJogo/desafio/escolhaOponente"] = idx;
      updates["salas/" + salaAtual + "/estadoJogo/desafio/resposta"] = p.nome;
      updates["salas/" + salaAtual + "/estadoJogo/desafio/status"] = "resolvido";

      getDBRef().update(updates)
        .then(() => {
          console.log("[DEBUG] Desafio resposta salva no Firebase.");
          renderizarMesa();
          container.style.display = "none";
          if (window.tellstonesTutorial) window.tellstonesTutorial.registrarAcaoConcluida();
        })
        .catch(err => console.error("[ERROR] Falha ao salvar resposta desafio:", err));
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

    // Chamar renderizarOpcoesDesafio sempre que o estado do jogo mudar
    // Wrapper ouvirEstadoJogo removido (renderizarOpcoesSegabar global deletada)


    // Função para resolver o desafio após a escolha do oponente
    // resolverDesafioSeNecessario e wrapper removidos
  }
}


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
        // REMOVE o blocked style explicitamente
        div.style.pointerEvents = "auto";
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
      // FIX: Não bloquear pedras dentro do box de desafio (resposta)
      if (div.closest('.box-desafio') || div.closest('.linha-pedras')) return;

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

    // FIX: Garantir que as pedras de resposta (linha-pedras) estejam CLICÁVEIS para quem defende
    const pedrasResposta = document.querySelectorAll(".linha-pedras button, .linha-pedras .pedra-reserva");
    pedrasResposta.forEach(btn => {
      // Se for a vez do jogador responder, libera
      const status = estadoJogo.desafio.status;
      const isChallenger = estadoJogo.desafio.jogador === window.nomeAtual;

      let deveLiberar = false;
      if (status === "responder_pecas" && isChallenger) deveLiberar = true;
      if (status === "responder_pecas_oponente" && !isChallenger) deveLiberar = true;
      if (status === "aguardando_resposta" && !isChallenger) deveLiberar = true;

      if (deveLiberar) {
        btn.style.cursor = "pointer";
        btn.style.pointerEvents = "auto";
        btn.disabled = false;
        btn.removeAttribute('disabled');
      }
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
// Chamar após renderizar mesa e reserva
const oldRenderizarMesa = Renderer.renderizarMesa;
Renderer.renderizarMesa = function () {
  oldRenderizarMesa.call(Renderer); // Mantenha o contexto
  bloquearAcoesDuranteDesafio();
};
const oldRenderizarPedrasReserva = Renderer.renderizarPedrasReserva;
Renderer.renderizarPedrasReserva = function () {
  oldRenderizarPedrasReserva.call(Renderer); // Mantenha o contexto
  bloquearAcoesDuranteDesafio();
};

// (Código legado do botão Se Gabar removido - movido para seção de Eventos de Botões)

// Renderizar opções de resposta ao Se Gabar
// renderizarOpcoesSegabar movido para Renderer.js

// Chamar renderizarOpcoesSegabar sempre que o estado do jogo mudar
// Código legado de ouvirEstadoJogo e render removed

// Funções de validação legadas removidas e migradas para GameController/Renderer


// Renderiza os marcadores de ponto de acordo com os pontos dos jogadores/duplas
// Renderiza os marcadores de ponto de acordo com os pontos dos jogadores/duplas (PERSPECTIVA RELATIVA)
function renderizarMarcadoresPonto() {
  const marcadoresEsq = document.querySelectorAll(
    ".marcador-ponto.marcador-esquerda"
  );
  const marcadoresDir = document.querySelectorAll(
    ".marcador-ponto.marcador-direita"
  );

  let ptsP1 = 0;
  let ptsP2 = 0;

  if (estadoJogo.jogadores && estadoJogo.jogadores.length >= 2) {
    // Calcula pontos absolutos de P1 e P2 (ou duplas)
    if (estadoJogo.jogadores.length === 2) {
      ptsP1 = estadoJogo.jogadores[0]?.pontos || 0;
      ptsP2 = estadoJogo.jogadores[1]?.pontos || 0;
    } else {
      // Duplas
      ptsP1 = (estadoJogo.jogadores[0]?.pontos || 0) + (estadoJogo.jogadores[2]?.pontos || 0);
      ptsP2 = (estadoJogo.jogadores[1]?.pontos || 0) + (estadoJogo.jogadores[3]?.pontos || 0);
    }
  }

  // Lógica de Perspectiva: Topo (Esquerda) vs Baixo (Direita)

  let pontosTopo = ptsP1;
  let pontosBaixo = ptsP2;

  // FIX: Safe access to players array
  if (estadoJogo.jogadores && estadoJogo.jogadores.length >= 2) {
    const nomeP1 = estadoJogo.jogadores[0]?.nome;
    const nomeP2 = estadoJogo.jogadores[1]?.nome;

    // Se sou P1, eu quero estar em Baixo. (Inverte, pois padrão é P1 Topo)
    if (window.nomeAtual === nomeP1) {
      pontosTopo = ptsP2; // Oponente
      pontosBaixo = ptsP1; // Eu
    }
    // Se sou P2, eu quero estar em Baixo. (Padrão já é P2 Baixo, mantém)
    else if (window.nomeAtual === nomeP2) {
      pontosTopo = ptsP1; // Oponente
      pontosBaixo = ptsP2; // Eu
    }
  }
  // Se sou Espectador ou jogo não começou, mantém padrão (P1 Topo, P2 Baixo) -> ptsP1, ptsP2 já definidos acima

  // Renderiza Topo (Esquerda)

  // Renderiza Topo (Esquerda)
  marcadoresEsq.forEach((el, i) => {
    if (i < pontosTopo) el.classList.add("preenchido");
    else el.classList.remove("preenchido");
  });

  // Renderiza Baixo (Direita)
  marcadoresDir.forEach((el, i) => {
    if (i < pontosBaixo) el.classList.add("preenchido");
    else el.classList.remove("preenchido");
  });

  // Verifica vitória automática (Lógica mantém checagem absoluta de P1/P2)
  if (ptsP1 >= 3) {
    if (window.notificationManager) window.notificationManager.showGlobal(`Vitória de ${estadoJogo.jogadores[0].nome}!`);
    bloquearAcoesDuranteDesafio();
  } else if (ptsP2 >= 3) {
    if (window.notificationManager) window.notificationManager.showGlobal(`Vitória de ${estadoJogo.jogadores[1].nome}!`);
    bloquearAcoesDuranteDesafio();
  }
}
// Chamar sempre que atualizar o placar ou renderizar a mesa
const oldAtualizarInfoSala = Renderer.atualizarInfoSala;
Renderer.atualizarInfoSala = function () {
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
      // Apenas limpa a referência, a UI é removida abaixo
      window.tellstonesTutorial = null;
    }
    const tutorialUI = document.getElementById("tutorial-ui");
    if (tutorialUI) tutorialUI.remove();
    // Limpa Moeda (Persistence Fix)
    const coinBtn = document.getElementById("moeda-btn");
    if (coinBtn) coinBtn.remove();
    // Limpa Fala do Bot
    if (window.Renderer && window.Renderer.limparFalaBot) window.Renderer.limparFalaBot();
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

  // Guard: No victory screen in Tutorial Mode
  if (window.salaAtual === "MODO_TUTORIAL") return;

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

// checarTelaVitoriaGlobal e override de ouvirEstadoJogo removidos
// Lógica agora está em GameController.verificarSincronizacao

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
    btn.style.zIndex = "150";
    btn.style.width = "80px";
    btn.style.height = "80px";
    btn.innerHTML = `
      <span id="moeda-animada" style="display:inline-block;width:80px;height:80px;position:relative;perspective:300px;pointer-events:none;">
        <img id="moeda-frente" src="assets/img/Cara.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:50% 52%;position:absolute;left:0;top:0;backface-visibility:hidden;transition:transform 0.6s;box-shadow:0 2px 8px #0007;background:#222;pointer-events:none;" />
        <img id="moeda-verso" src="assets/img/Coroa.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:50% 52%;position:absolute;left:0;top:0;backface-visibility:hidden;transform:rotateY(180deg);transition:transform 0.6s;box-shadow:0 2px 8px #0007;background:#222;pointer-events:none;" />
      </span>
    `;
    // Append to BODY to escape stacking contexts
    document.body.appendChild(btn);
    // Fixed positioning relative to viewport
    btn.style.position = "fixed";
    btn.style.left = "50%";
    btn.style.top = "50%";
    btn.style.transform = "translate(-50%, -50%)";
    btn.style.zIndex = "150"; // Standard Game Piece Level
    btn.style.cursor = "pointer";
    btn.style.zIndex = "150"; // Redundant safety
    btn.style.cursor = "pointer";
    btn.style.pointerEvents = "auto";
    btn.style.pointerEvents = "auto";
    // Debug border removed
  }
}

// =============== ANIMAÇÃO DE TROCA CIRCULAR ===============
// Função animarTrocaCircular movida para AnimationManager.js
// Mantido stub vazio para evitar crash se chamado legado (não deve ocorrer)
function animarTrocaCircular(idxA, idxB, callback) {
  if (window.AnimationManager) {
    window.AnimationManager.playSwap(idxA, idxB, callback);
  } else {
    if (callback) callback();
  }
}

// FIX: HITBOX HACK logic for Coin Button
// Ensures clicks are registered even if layout/z-index issues persist
window.addEventListener("click", (e) => {
  const btn = document.getElementById("moeda-btn");
  if (!btn || btn.style.display === 'none') return;

  const originalTarget = e.target;
  // If native click worked (id match), do nothing
  if (originalTarget.id === 'moeda-btn' || originalTarget.closest('#moeda-btn')) return;

  // Check collision with coin rect for "missed" clicks (overlay issue)
  const rect = btn.getBoundingClientRect();
  const x = e.clientX;
  const y = e.clientY;

  if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
    // Force click
    e.stopPropagation();
    e.preventDefault();
    if (btn.onclick) btn.onclick(e);
    else btn.click();
  }
}, { capture: true });


// 1. Adicione uma variável global para controlar a última animação executada
let ultimoTrocaAnimacao = null;

// Ko-fi code fully removed

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

async function iniciarModoBot() {
  if (window.currentGameMode) window.currentGameMode.cleanup();

  // Use the new PvEMode Class
  window.currentGameMode = new PvEMode();
  window.currentGameMode.start(); // Handles setup, state, and bot init
}


async function executarAcaoBot(acao) {
  const salaRef = getDBRef("salas/" + salaAtual + "/estadoJogo");

  // RESPOSTAS A DESAFIO
  if (acao.tipo === "responder_desafio") {
    // Bot respondeu qual é a pedra
    // Precisamos validar se acertou ou errou (automático no PVE, já que o bot controla o DB local?)
    // Não, a lógica de validação de desafio geralmente é feita pelo front ou backend.
    // Em PVE Local, script.js deve validar.

    const desafio = window.estadoJogo.desafio;
    const pedraReal = window.estadoJogo.mesa[desafio.idxPedra];
    const pedrasOficiais = ["Coroa", "Espada", "Balança", "Cavalo", "Escudo", "Bandeira", "Martelo"];
    const nomeChute = pedrasOficiais[acao.idx];

    const acertou = (pedraReal && pedraReal.nome === nomeChute);

    // Atualiza desafio com a resposta
    const novoDesafio = { ...desafio, resposta: nomeChute, acertou: acertou, respondido: true };
    salaRef.update({ desafio: novoDesafio });

    showToast(acertou ? "Bot acertou!" : "Bot errou!");
    await new Promise(r => setTimeout(r, 2000));
    resolverDesafioPvE(novoDesafio); // Função helper para aplicar pontos/resetar
    return;
  }

  if (acao.tipo === "acreditar") {
    // Bot acreditou no Boast
    const desafio = window.estadoJogo.desafio;
    const novoDesafio = { ...desafio, resposta: "acredito", respondido: true };
    salaRef.update({ desafio: novoDesafio });
    resolverDesafioPvE(novoDesafio);
    return;
  }

  if (acao.tipo === "duvidar") {
    // Bot duvidou do Boast
    const desafio = window.estadoJogo.desafio;
    const novoDesafio = { ...desafio, resposta: "duvido", respondido: true };
    salaRef.update({ desafio: novoDesafio });
    // UI vai pedir pro Jogador provar
    showToast("Bot duvidou! Prove seu conhecimento.");
    return;
  }

  // AÇÕES NORMAIS (Manteve lógica anterior)
  if (acao.tipo === "passar") {
    salaRef.update({ vez: 0 });
    showToast("Bot passou a vez.");
    return;
  }
  if (acao.tipo === "colocar") {
    const mesa = [...window.estadoJogo.mesa];
    const reserva = [...window.estadoJogo.reserva];
    const pedraReserva = reserva.splice(acao.pedraIdx, 1)[0];
    mesa[acao.slot] = { ...pedraReserva, virada: false, fixo: false };
    salaRef.update({ mesa: mesa, reserva: reserva, vez: 0 });
    showToast(`Bot colocou ${pedraReserva.nome}.`);
    if (tellstonesBot) tellstonesBot.observarAcao(acao, window.estadoJogo);
    return;
  }
  if (acao.tipo === "esconder" || acao.tipo === "virar") {
    const mesa = [...window.estadoJogo.mesa];
    if (mesa[acao.idx]) {
      mesa[acao.idx].virada = true;
      salaRef.update({ mesa: mesa, vez: 0 });
      showToast("Bot virou uma pedra.");
      if (tellstonesBot) tellstonesBot.observarAcao({ tipo: "virar", idx: acao.idx }, window.estadoJogo);
    }
    return;
  }
  if (acao.tipo === "trocar") {
    const mesa = [...window.estadoJogo.mesa];
    const temp = mesa[acao.origem];
    mesa[acao.origem] = mesa[acao.destino];
    mesa[acao.destino] = temp;
    salaRef.update({ mesa: mesa, vez: 0 });
    showToast("Bot trocou duas pedras.");
    return; // Observação de troca já é feita via hook de animação global?
    // Melhor chamar direto aqui pois é ação do BOT
    // if (tellstonesBot) tellstonesBot.observarAcao(acao, window.estadoJogo);
  }
  if (acao.tipo === "espiar") {
    salaRef.update({ vez: 0 });
    showToast("Bot espiou uma pedra.");
    if (tellstonesBot) tellstonesBot.observarAcao({ ...acao, autor: 'Bot' }, window.estadoJogo);
    return;
  }
  if (acao.tipo === "desafiar") {
    const desafio = { tipo: 'normal', idxPedra: acao.idx, autor: 'Bot', alvo: 'Você' };
    salaRef.update({ desafio: desafio, status: 'desafio' });
    showToast("Bot desafiou você!");
    return;
  }
  if (acao.tipo === "segabar") {
    const desafio = { tipo: 'segabar', autor: 'Bot', alvo: 'Você' };
    salaRef.update({ desafio: desafio, status: 'desafio' });
    showToast("Bot está se gabando!");
    return;
  }
}

// Helper simples para resolver rodada PvE
function resolverDesafioPvE(desafio) {
  const estado = window.estadoJogo;
  let pontosP1 = estado.jogadores[0].pontos; // Você
  let pontosP2 = estado.jogadores[1].pontos; // Bot

  let venceuRodada = false;
  let vencedorNome = "";

  // Lógica simplificada de pontuação
  if (desafio.tipo === 'normal') {
    if (desafio.acertou) {
      // Bot acertou (Bot era autor?) Sim, se Bot respondeu é pq Player desafiou.
      // Espera, quem responde é o ALVO. 
      // Se Bot respondeu, ele era o alvo. Então acertou -> ganha ponto.
      if (desafio.alvo === 'Bot') {
        pontosP2++;
        vencedorNome = "Bot";
      }
    } else {
      // Bot errou -> Autor ganha ponto (Você)
      if (desafio.alvo === 'Bot') {
        pontosP1++;
        vencedorNome = "Você";
      }
    }
  } else if (desafio.tipo === 'segabar' && desafio.resposta === 'acredito') {
    // Acreditou -> Autor ganha ponto
    if (desafio.autor === 'Bot') { pontosP2++; vencedorNome = "Bot"; }
  }

  // Atualiza pontuação
  const jogadores = [
    { ...estado.jogadores[0], pontos: pontosP1 },
    { ...estado.jogadores[1], pontos: pontosP2 }
  ];

  // Limpa mesa e reseta
  setTimeout(() => {
    getDBRef("salas/" + salaAtual + "/estadoJogo").update({
      jogadores: jogadores,
      mesa: [null, null, null, null, null, null, null], // Reset total? Ou só limpa desafio?
      // Em Tellstones resetar mesa é complexo, no PvE simplificado vamos só limpar desafio por enquanto
      // Vamos apenas tirar o desafio e dar ponto.
      desafio: null,
      status: 'jogo',
      vez: (vencedorNome === "Bot" ? 1 : 0) // Vencedor começa
    });
    showToast(`Ponto para ${vencedorNome}!`);
  }, 2000);
}

function iniciarModoTutorial() {
  if (window.currentGameMode) window.currentGameMode.cleanup();

  window.currentGameMode = new TutorialMode();
  window.currentGameMode.start({});

  mostrarTela("game");
}

function iniciarModoBot() {
  if (window.currentGameMode) window.currentGameMode.cleanup();

  window.currentGameMode = new PvEMode();
  window.currentGameMode.start({
    playerName: "Jogador"
  });

  mostrarTela("game");
}


;




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
    { nome: "Balança", url: "assets/img/Balanca.svg" },
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
    Renderer.renderizarMesa();

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
    Renderer.renderizarMesa();
  }
}

// =========================
// FIX: Monitoramento de Trocas e Turno (Multiplayer)
// =========================
function monitorarTrocas() {
  if (!salaAtual) return;
  getDBRef("salas/" + salaAtual + "/estadoJogo/trocaAnimacao").off();

  getDBRef("salas/" + salaAtual + "/estadoJogo/trocaAnimacao").on("value", function (snap) {
    const troca = snap.val();
    if (troca && !window.animacaoTrocaEmAndamento) {
      window.animacaoTrocaEmAndamento = true;

      // Animação Visual
      const elFrom = document.querySelector(`.pedra-mesa[data-idx='${troca.from}']`);
      const elTo = document.querySelector(`.pedra-mesa[data-idx='${troca.to}']`);

      console.log("[SWAP DEBUG] Visual Elements:", { elFrom, elTo });

      if (elFrom && elTo) {
        // Use Circular Animation (Via Manager)
        if (window.AnimationManager) {
          window.AnimationManager.playSwap(troca.from, troca.to, () => {
            console.log("[SWAP DEBUG] Animation Finished.");
            // Authority Check
            if (troca.jogador === window.nomeAtual || window.isLocalMode) {
              finalizarTrocaServer(troca);
            }
            setTimeout(() => { if (window.Renderer) window.Renderer.renderizarMesa(); }, 100);
          });
        } else {
          // Fallback
          animarTrocaCircular(troca.from, troca.to, () => {
            if (troca.jogador === window.nomeAtual || window.isLocalMode) {
              finalizarTrocaServer(troca);
            }
            setTimeout(() => { if (window.Renderer) window.Renderer.renderizarMesa(); }, 100);
          });
        }

      } else {
        console.warn("[SWAP ERROR] Could not find elements to animate.");
        window.animacaoTrocaEmAndamento = false;
        // Fallback to finish swap anyway
        if (troca.jogador === window.nomeAtual) finalizarTrocaServer(troca);
      }
    }
  });
}

function finalizarTrocaServer(troca) {
  // ATOMIC SWAP: Use transaction to ensure we are swapping based on LATEST server data

  // --- PATCH PVE / LOCAL MODE / TUTORIAL ---
  if (window.isLocalMode || salaAtual === 'MODO_TUTORIAL') {
    const estado = window.estadoJogo;
    if (!estado || !estado.mesa) return;

    const temp = estado.mesa[troca.from];
    estado.mesa[troca.from] = estado.mesa[troca.to];
    estado.mesa[troca.to] = temp;

    estado.trocaAnimacao = null; // Clear flag

    // Advance Turn Logic (Simple for PvE usually handled by BotBrain/GameController, but Swap is an action)
    // If Player swapped, Turn -> Bot.
    // If Bot swapped, Turn -> Player.
    if (estado.vez === 0 && troca.jogador !== "Bot") {
      estado.vez = 1;
    } else if (estado.vez === 1 && troca.jogador === "Bot") {
      estado.vez = 0;
    }

    // UNBLOCK TUTORIAL STEP (Local Mode Patch)
    if (salaAtual === 'MODO_TUTORIAL' && window.tellstonesTutorial) {
      console.log("[TUTORIAL] Swap detected in Local Logic. Triggering next step.");
      setTimeout(() => window.tellstonesTutorial.registrarAcaoConcluida(), 500);
    }

    GameController.persistirEstado();
    return;
  }

  // --- ONLINE MODE (Transaction) ---
  getDBRef("salas/" + salaAtual + "/estadoJogo").transaction(function (estado) {
    if (!estado) return estado; // Abort if null

    // Safety check: slots exist
    if (!estado.mesa) estado.mesa = Array(7).fill(null);
    // Fill undefineds
    for (let i = 0; i < 7; i++) { if (typeof estado.mesa[i] === 'undefined') estado.mesa[i] = null; }

    const temp = estado.mesa[troca.from];
    estado.mesa[troca.from] = estado.mesa[troca.to];
    estado.mesa[troca.to] = temp;

    // Clear animation flag
    estado.trocaAnimacao = null;

    // Turn Logic Check (Atomic)
    // Only advance if it's currently the player's turn to avoid double-skip
    let numJogadores = estado.jogadores ? estado.jogadores.length : 2;
    let expectedVez = -1;
    // Find index of player who moved
    if (estado.jogadores) {
      expectedVez = estado.jogadores.findIndex(j => j.nome === troca.jogador);
    }

    // If current turn matches the player who swapped, advance
    // (Or if local mode, just advance)
    if (window.isLocalMode || (expectedVez !== -1 && estado.vez === expectedVez)) {
      let proximaVez = (estado.vez + 1) % numJogadores;

      // TUTORIAL FIX: Prevent turn change if tutorial step is SWAP (4)
      // We want player to stay in control to click "Desafiar" next.
      if (salaAtual === 'MODO_TUTORIAL') {
        // We can check TellstonesTutorial instance if possible, or assume if it's player's turn we keep it?
        // But simpler: In Tutorial, Swap doesn't end turn. Player must Challenge.
        // Usually Swap ends turn. But for Tutorial flow 4->5, we need Player to perform Challenge action immediately?
        // Actually, Step 5 is "Desafiando". If turn passes to Master, Master plays.
        // So YES, we must keep turn.
        proximaVez = estado.vez;
        console.log("[TUTORIAL] Keeping turn with player after swap.");

        // UNBLOCK TUTORIAL STEP
        if (window.tellstonesTutorial) {
          setTimeout(() => window.tellstonesTutorial.registrarAcaoConcluida(), 500);
        }
      }

      estado.vez = proximaVez;
    }

    return estado;
  });
}


/* =========================================
   FIX ONLINE MENU TABS (User Request)
   ========================================= */
document.addEventListener('DOMContentLoaded', function () {
  // Helper to strip old listeners
  function replaceWithClone(id) {
    const el = document.getElementById(id);
    if (el) {
      const newEl = el.cloneNode(true);
      el.parentNode.replaceChild(newEl, el);
      return newEl;
    }
    return null;
  }

  const btnCreate = replaceWithClone('create-room-btn');
  const btnJoin = replaceWithClone('join-room-btn');
  const sectionCreate = document.getElementById('room-options');
  const sectionJoin = document.getElementById('join-room');

  if (btnCreate && btnJoin) {
    // Tab Logic
    btnCreate.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (sectionCreate) sectionCreate.style.display = 'flex';
      if (sectionJoin) sectionJoin.style.display = 'none';
    };

    btnJoin.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (sectionCreate) sectionCreate.style.display = 'none';
      if (sectionJoin) sectionJoin.style.display = 'flex';
    };

    // Initialize: Show Create by default or none? 
    // Let's show Create by default if neither is open, or just leave empty?
    // Better UX: Show Create logic immediately if user was navigating?
    // Let's defaulted to Create open to fill the empty space
    if (sectionCreate) sectionCreate.style.display = 'flex';
  }
});


/* --- DEBUG LAYOUT SCRIPT --- */
(function () {
  let dragged = null;
  let offsetX = 0; let offsetY = 0;
  document.addEventListener('mousedown', function (e) {
    if (e.target.classList.contains('debug-layout-box')) {
      dragged = e.target;
      const rect = dragged.getBoundingClientRect();
      const parentRect = dragged.parentElement.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      e.preventDefault();
    }
  });
  document.addEventListener('mousemove', function (e) {
    if (dragged) {
      const parentRect = dragged.parentElement.getBoundingClientRect();
      let newLeft = e.clientX - parentRect.left - offsetX;
      let newTop = e.clientY - parentRect.top - offsetY;
      dragged.style.left = newLeft + 'px';
      dragged.style.top = newTop + 'px';
      console.log(`[DEBUG LAYOUT] : Top = ${newTop}px Left = ${newLeft}px`);
    }
  });
  document.addEventListener('mouseup', function () {
    if (dragged) {
      console.log(`[FINAL] : Drag ended`);
      dragged = null;
    }
  });
})();

// =========================
// 9. Event Listeners para Menu Principal (Restaurados)
// =========================
// =========================
// 9. Inicialização Global
// =========================
document.addEventListener("DOMContentLoaded", () => {
  // Inicializa InputHandler (Listeners Globais)
  if (window.InputHandler && window.InputHandler.init) {
    window.InputHandler.init();
  }

  if (window.AnalyticsManager && !window.AnalyticsManager.initialized) {
    window.AnalyticsManager.init();
  }

  // 1. Tutorial
  const btnTutorial = document.getElementById('tutorial-btn');
  if (btnTutorial) {
    btnTutorial.onclick = () => {
      if (window.audioManager) window.audioManager.playPress();
      // Analytics
      if (window.AnalyticsManager) window.AnalyticsManager.logEvent('select_content', { content_type: 'game_mode', item_id: 'tutorial' });

      console.log("[Menu] Iniciando Tutorial...");
      if (window.currentGameMode) window.currentGameMode.cleanup();
      window.currentGameMode = new TutorialMode();
      window.currentGameMode.start();
    };
  }

  // 2. PvE (Contra Bot)
  const btnPvE = document.getElementById('bot-pve-btn');
  if (btnPvE) {
    btnPvE.onclick = () => {
      if (window.audioManager) window.audioManager.playPress();
      // Analytics
      if (window.AnalyticsManager) window.AnalyticsManager.logEvent('select_content', { content_type: 'game_mode', item_id: 'pve' });

      console.log("[Menu] Iniciando PvE...");
      if (window.currentGameMode) window.currentGameMode.cleanup();
      if (typeof mostrarTela === 'function') mostrarTela('game');
      window.currentGameMode = new PvEMode();
      window.currentGameMode.start({ playerName: 'Jogador' });
    };
  }

  // 2.5 Demo Bot vs Bot (Dev Tool)
  const btnBotVsBot = document.getElementById('btn-dev-bot-match');
  if (btnBotVsBot) {
    btnBotVsBot.onclick = () => {
      if (window.audioManager) window.audioManager.playPress();
      console.log("[Menu] Iniciando Demo Bot vs Bot...");
      if (window.currentGameMode) window.currentGameMode.cleanup();
      if (typeof mostrarTela === 'function') mostrarTela('game');
      // Inicia PvE
      window.currentGameMode = new PvEMode();
      window.currentGameMode.start({ playerName: 'Bot (Automator)' });

      // Inicia Automator
      if (window.PvEAutomator) {
        setTimeout(() => {
          if (window.notificationManager) window.notificationManager.showGlobal("Modo Espectador: O Automator assumiu o controle.");
          window.PvEAutomator.run();
        }, 1000);
      }
    };
  }

  // 3. Online Menu (Toggle)
  const btnOnline = document.getElementById('online-menu-btn');
  const divOnline = document.getElementById('online-menu');
  const divMainBtns = document.getElementById('main-menu-btns');
  const btnBack = document.getElementById('back-to-main-btn');

  if (btnOnline && divOnline && divMainBtns) {
    btnOnline.onclick = () => {
      if (window.audioManager) window.audioManager.playPress();
      // Analytics
      if (window.AnalyticsManager) window.AnalyticsManager.logEvent('select_content', { content_type: 'game_mode', item_id: 'online' });

      divMainBtns.style.display = 'none';
      divOnline.style.display = 'flex';
    };
  }

  const btnCreateRoom = document.getElementById('create-room-btn');
  const btnJoinRoom = document.getElementById('join-room-btn');
  const btnStartGame = document.getElementById('start-game-btn');
  const btnEnterRoom = document.getElementById('enter-room-btn');

  const addAudio = (btn) => {
    if (btn) {
      btn.addEventListener('click', () => {
        if (window.audioManager) window.audioManager.playPress();
      });
    }
  };

  addAudio(btnCreateRoom);
  addAudio(btnJoinRoom);
  addAudio(btnStartGame);
  addAudio(btnEnterRoom);

  if (btnBack && divOnline && divMainBtns) {
    btnBack.onclick = () => {
      if (window.audioManager) window.audioManager.playPress();
      divOnline.style.display = 'none';
      divMainBtns.style.display = 'flex';
      divMainBtns.style.flexDirection = 'column';
      divMainBtns.style.alignItems = 'center';

      // UI Fix: Remove class from start-screen
      const startScreen = document.getElementById("start-screen");
      if (startScreen) startScreen.classList.remove("mode-online");
    };
  }

  // Inicializa Changelog Module
  if (window.ChangelogManager) window.ChangelogManager.init();

  // RECONNECTION TRIGGER: Check for active session
  if (window.RoomManager && window.RoomManager.tentarReconexao) {
    // Pequeno delay para garantir que o Firebase inicializou

    setTimeout(() => {
      window.RoomManager.tentarReconexao();
    }, 800);
  }
});

