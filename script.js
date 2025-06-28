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

// Função para gerar código de sala aleatório
function gerarCodigoSala() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Função para criar sala
function criarSala(modo) {
  const codigo = gerarCodigoSala();
  const salaRef = db.ref('salas/' + codigo);
  salaRef.set({
    modo: modo,
    jogadores: {},
    espectadores: {},
    status: 'lobby',
    criadaEm: Date.now()
  });
  return codigo;
}

// Função para entrar em sala
function entrarSala(codigo, nome, tipo) {
  const salaRef = db.ref('salas/' + codigo + '/' + (tipo === 'espectador' ? 'espectadores' : 'jogadores'));
  const novoRef = salaRef.push();
  novoRef.set({ nome: nome });
}

// Função utilitária para alternar telas
function mostrarTela(tela) {
  document.getElementById('start-screen').classList.remove('active');
  document.getElementById('lobby').classList.remove('active');
  document.getElementById('game').classList.remove('active');
  document.getElementById(tela).classList.add('active');
}

// Botões de navegação
if (document.getElementById('create-room-btn')) {
  document.getElementById('create-room-btn').onclick = function() {
    document.getElementById('room-options').style.display = 'block';
    document.getElementById('join-room').style.display = 'none';
    mostrarTela('start-screen');
    // Sincronizar nome se já preenchido no campo de entrar
    const nomeEntrar = document.getElementById('nome-entrar').value.trim();
    if (nomeEntrar) {
      document.getElementById('nome-criar').value = nomeEntrar;
    }
  };
}
if (document.getElementById('join-room-btn')) {
  document.getElementById('join-room-btn').onclick = function() {
    document.getElementById('room-options').style.display = 'none';
    document.getElementById('join-room').style.display = 'block';
    mostrarTela('start-screen');
    // Sincronizar nome se já preenchido no campo de criar
    const nomeCriar = document.getElementById('nome-criar').value.trim();
    if (nomeCriar) {
      document.getElementById('nome-entrar').value = nomeCriar;
    }
  };
}

let salaAtual = null;
let nomeAtual = null;
let souCriador = false;

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.style.display = 'block';
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.style.display = 'none'; }, 400);
  }, 2200);
}

let ultimosJogadores = [];
let ultimosEspectadores = [];

// Estado do jogo
let estadoJogo = {
  jogadores: [], // [{nome, pontos, id}]
  mesa: [], // [{nome, url, virada: false}]
  reserva: [], // pedras restantes do jogador atual
  pedraCentral: null, // pedra central do jogo
  vez: 0 // índice do jogador da vez
};

// Função para inicializar o estado do jogo
function inicializarJogo(jogadores) {
  const pedrasOficiais = [
    { nome: 'Coroa', url: 'https://github.com/AliceDeSa/Tellstones/raw/main/Coroa.svg' },
    { nome: 'Espada', url: 'https://github.com/AliceDeSa/Tellstones/raw/main/espada.svg' },
    { nome: 'Balança', url: 'https://github.com/AliceDeSa/Tellstones/raw/main/Balança.svg' },
    { nome: 'Cavalo', url: 'https://github.com/AliceDeSa/Tellstones/raw/main/cavalo.svg' },
    { nome: 'Escudo', url: 'https://github.com/AliceDeSa/Tellstones/raw/main/escudo.svg' },
    { nome: 'Bandeira', url: 'https://github.com/AliceDeSa/Tellstones/raw/main/bandeira.svg' },
    { nome: 'Martelo', url: 'https://github.com/AliceDeSa/Tellstones/raw/main/martelo.svg' }
  ];
  const pedrasEmbaralhadas = pedrasOficiais.sort(() => Math.random() - 0.5);
  const pedraCentral = pedrasEmbaralhadas.shift();
  estadoJogo = {
    jogadores: jogadores.map(j => ({nome: j.nome, pontos: 0, id: j.id || j.nome})),
    mesa: [],
    reserva: pedrasEmbaralhadas,
    pedraCentral: pedraCentral,
    vez: 0
  };
}

// Atualiza placar e turno
function atualizarPlacarETurno() {
  const placarDiv = document.getElementById('placar-jogo');
  const turnoDiv = document.getElementById('turno-jogo');
  placarDiv.innerHTML = estadoJogo.jogadores.map((j, i) => `<span${i===estadoJogo.vez?' style="text-decoration:underline;"':''}>${j.nome}: ${j.pontos}</span>`).join(' <b>|</b> ');
  turnoDiv.innerHTML = `Vez de <strong>${estadoJogo.jogadores[estadoJogo.vez].nome}</strong>`;
}

// Renderiza a mesa
function renderizarMesa() {
  console.log('renderizarMesa chamada');
  const mesaDiv = document.getElementById('tabuleiro');
  mesaDiv.innerHTML = `
    <img src="https://github.com/AliceDeSa/Tellstones/blob/main/2deea767-8022-4e5e-8118-ba10d8df14bd.jpg?raw=true" alt="Tabuleiro Tellstones" style="max-width:100%;height:auto;border-radius:18px;box-shadow:0 4px 24px #0005;"/>
  `;
}

// Função para mostrar lobby
function mostrarLobby(codigo, nome, criador=false) {
  salaAtual = codigo;
  nomeAtual = nome;
  souCriador = criador;
  mostrarTela('lobby');
  document.getElementById('lobby-codigo').innerText = 'Código da sala: ' + codigo;
  document.getElementById('lobby-iniciar').style.display = criador ? 'inline-block' : 'none';
  // Remove listener antigo se existir
  if (window.lobbyListener) {
    window.lobbyListener.off();
  }
  window.lobbyListener = db.ref('salas/' + codigo);
  window.lobbyListener.on('value', function(snapshot) {
    const sala = snapshot.val();
    // Jogadores
    const jogadores = sala && sala.jogadores ? Object.values(sala.jogadores) : [];
    document.getElementById('lobby-jogadores').innerHTML = jogadores.map(j => `<li>${j.nome}</li>`).join('');
    // Espectadores
    const espectadores = sala && sala.espectadores ? Object.values(sala.espectadores) : [];
    document.getElementById('lobby-espectadores').innerHTML = espectadores.map(e => `<li>${e.nome}</li>`).join('');
    // Notificação de novo jogador
    jogadores.forEach(j => {
      if (!ultimosJogadores.some(u => u.nome === j.nome) && j.nome !== nomeAtual) {
        showToast(`${j.nome} entrou como jogador!`);
      }
    });
    ultimosJogadores = jogadores;
    // Notificação de novo espectador
    espectadores.forEach(e => {
      if (!ultimosEspectadores.some(u => u.nome === e.nome) && e.nome !== nomeAtual) {
        showToast(`${e.nome} entrou como espectador!`);
      }
    });
    ultimosEspectadores = espectadores;
    // Notificação de início de partida
    if (sala && sala.notificacao) {
      showToast(sala.notificacao);
      db.ref('salas/' + codigo + '/notificacao').remove();
    }
    // Se status mudar para jogo, mostrar tela do jogo
    if (sala && sala.status === 'jogo') {
      mostrarJogo(codigo, jogadores, espectadores);
    }
  });
}

// Função para mostrar tela de jogo moderna
function mostrarJogo(codigo, jogadores, espectadores) {
  console.log('mostrarJogo chamado', {codigo, jogadores, espectadores});
  mostrarTela('game');
  // Torna o container #game totalmente invisível ao iniciar a partida
  const game = document.getElementById('game');
  game.style.background = 'none';
  game.style.boxShadow = 'none';
  game.style.borderRadius = '0';
  game.style.border = 'none';
  // Atualizar info sala e espectadores
  atualizarInfoSala(codigo, espectadores);
  // Embaralhar pedras e renderizar
  renderizarPedrasCirculo(estadoJogo.reserva, estadoJogo.pedraCentral);
  // Outras lógicas do jogo...
  mostrarEscolhaCaraCoroa();
  const somMoeda = document.getElementById('som-moeda');
  if (somMoeda) somMoeda.load();
}

// Funções para abrir/fechar pop-ups
function abrirPopup(id) {
  if (id === 'popup-acoes') {
    document.getElementById(id).innerHTML = `
      <button class="fechar-popup" onclick="fecharPopup('popup-acoes')">✖</button>
      <h3>Ações Possíveis</h3>
      <ul>
        <li><strong>Colocar:</strong> <span class='descricao-acao'>Adiciona pedra à mesa.</span></li>
        <li><strong>Esconder:</strong> <span class='descricao-acao'>Vira uma pedra para baixo.</span></li>
        <li><strong>Mover:</strong> <span class='descricao-acao'>Muda posição de uma pedra.</span></li>
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
  }
  document.getElementById(id).style.display = 'block';
}
function fecharPopup(id) {
  document.getElementById(id).style.display = 'none';
}
// Eventos dos ícones flutuantes
const iconeAcoes = document.getElementById('icone-acoes');
if (iconeAcoes) {
  iconeAcoes.onclick = function() {
    const carta = document.getElementById('carta-acoes');
    if (carta.style.display === 'block') {
      carta.style.display = 'none';
    } else {
      document.getElementById('conteudo-acoes').innerHTML = `
        <h3>Ações Possíveis</h3>
        <ul>
          <li><strong>Colocar:</strong> <span class='descricao-acao'>Adiciona pedra à mesa.</span></li>
          <li><strong>Esconder:</strong> <span class='descricao-acao'>Vira uma pedra para baixo.</span></li>
          <li><strong>Mover:</strong> <span class='descricao-acao'>Muda posição de uma pedra.</span></li>
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
      carta.style.display = 'block';
    }
  };
}
// Toast interno
function showToastInterno(msg) {
  const toast = document.getElementById('toast-interno');
  toast.innerText = msg;
  toast.classList.add('mostrar');
  setTimeout(() => {
    toast.classList.remove('mostrar');
  }, 2200);
}
// Substituir alert/prompt por showToastInterno nas ações
function acaoDesafiar() { showToastInterno('Ação: Desafiar (implementar lógica)'); }
function acaoSeGabar() { showToastInterno('Ação: Se Gabar (implementar lógica)'); }

// Botão iniciar jogo
if (document.getElementById('lobby-iniciar')) {
  document.getElementById('lobby-iniciar').onclick = function() {
    db.ref('salas/' + salaAtual + '/notificacao').set('A partida irá começar!');
    setTimeout(() => {
      db.ref('salas/' + salaAtual + '/status').set('jogo');
      showToast('Jogo iniciado!');
    }, 600);
  };
}
// Botão entrar sala
if (document.getElementById('enter-room-btn')) {
  document.getElementById('enter-room-btn').onclick = function() {
    const codigo = document.getElementById('room-code').value.trim().toUpperCase();
    const nome = document.getElementById('nome-entrar').value.trim();
    const tipo = document.querySelector('input[name="tipo-entrada"]:checked').value;
    if (!codigo) return alert('Digite o código da sala!');
    if (!nome) return alert('Digite seu nome!');
    entrarSala(codigo, nome, tipo);
    mostrarLobby(codigo, nome, false);
  };
}
// Botão criar sala
if (document.getElementById('start-game-btn')) {
  document.getElementById('start-game-btn').onclick = function() {
    const modo = document.querySelector('input[name="mode"]:checked').value;
    const nome = document.getElementById('nome-criar').value.trim();
    if (!nome) return alert('Digite seu nome!');
    const codigo = criarSala(modo);
    entrarSala(codigo, nome, 'jogador');
    document.getElementById('codigo-sala-criada').innerText = 'Código da sala: ' + codigo;
    mostrarLobby(codigo, nome, true);
  };
}
// Ao carregar, mostrar tela inicial
window.onload = function() {
  mostrarTela('start-screen');
  // Descomente a linha abaixo para testar a tela de jogo diretamente:
  // mostrarJogo('TESTE', [{nome: 'Alice'}, {nome: 'Bob'}], [{nome: 'Ana'}]);
};

// --- Drag & Drop e ações interativas ---

// Drag & drop da reserva para o tabuleiro (Colocar)
function setupDragDropReserva() {
  console.log('setupDragDropReserva chamado');
  const pedrasReserva = document.querySelectorAll('.pedra-reserva');
  pedrasReserva.forEach(pedra => {
    pedra.onmousedown = null; // Remove qualquer evento anterior
    pedra.addEventListener('mousedown', function(e) {
      console.log('mousedown na pedra da reserva', pedra, e);
      e.preventDefault();
      // Cria pedra fantasma
      const rect = pedra.getBoundingClientRect();
      const ghost = pedra.cloneNode(true);
      ghost.style.position = 'fixed';
      ghost.style.left = rect.left + 'px';
      ghost.style.top = rect.top + 'px';
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      ghost.style.pointerEvents = 'none';
      ghost.style.opacity = '0.85';
      ghost.style.zIndex = 9999;
      ghost.classList.add('dragging');
      document.body.appendChild(ghost);
      // Esconde a original
      pedra.style.opacity = '0';
      pedra.style.pointerEvents = 'none';
      // Mouse move
      function onMove(ev) {
        ghost.style.left = (ev.clientX - rect.width/2) + 'px';
        ghost.style.top = (ev.clientY - rect.height/2) + 'px';
      }
      function onUp(ev) {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        // Restaura a pedra original
        pedra.style.opacity = '';
        pedra.style.pointerEvents = '';
        // Detecta se soltou sobre a mesa
        const mesa = document.getElementById('tabuleiro-wrapper');
        const mesaRect = mesa.getBoundingClientRect();
        if (
          ev.clientX >= mesaRect.left && ev.clientX <= mesaRect.right &&
          ev.clientY >= mesaRect.top && ev.clientY <= mesaRect.bottom
        ) {
          // Decide posição: esquerda ou direita
          const pedrasMesa = estadoJogo.mesa;
          let pos = 0; // default esquerda
          if (pedrasMesa.length > 0) {
            // Se soltou à direita da última pedra
            const slotWidth = mesa.offsetWidth / 7;
            const xRel = ev.clientX - mesaRect.left;
            pos = xRel < mesa.offsetWidth/2 ? 0 : pedrasMesa.length;
          }
          // Anima fantasma até o slot
          const larguraPedra = rect.width;
          const slotWidth = mesa.offsetWidth / 7;
          const leftFinal = mesaRect.left + (pos === 0 ? slotWidth/2 : mesa.offsetWidth - slotWidth/2) - larguraPedra/2;
          const topFinal = mesaRect.top + mesa.offsetHeight/2 - larguraPedra/2;
          ghost.animate([
            { left: ghost.style.left, top: ghost.style.top },
            { left: leftFinal + 'px', top: topFinal + 'px' }
          ], {
            duration: 400,
            easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
            fill: 'forwards'
          });
          setTimeout(() => {
            ghost.remove();
            // Atualiza estado do jogo
            const idx = Array.from(pedra.parentNode.children).indexOf(pedra);
            const pedraObj = estadoJogo.reserva[idx];
            estadoJogo.reserva.splice(idx,1);
            if (pos === 0) {
              // Adiciona à esquerda, sem sobrescrever a peça central
              estadoJogo.mesa = [ {...pedraObj, virada: false}, ...estadoJogo.mesa ];
            } else {
              // Adiciona à direita
              estadoJogo.mesa = [ ...estadoJogo.mesa, {...pedraObj, virada: false} ];
            }
            renderizarMesa();
            renderizarPedrasReserva();
            setupMesaInteractions();
            showToastInterno('Pedra colocada!');
          }, 400);
        } else {
          ghost.remove();
        }
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

// Drag & drop no tabuleiro para mover/trocar
function setupMesaInteractions() {
  const pedrasMesa = document.querySelectorAll('.pedra-oficial');
  pedrasMesa.forEach((pedra, idx) => {
    // Drag para mover/trocar
    pedra.setAttribute('draggable', 'true');
    pedra.ondragstart = (e) => {
      pedra.classList.add('dragging');
      e.dataTransfer.setData('idx', idx);
    };
    pedra.ondragend = () => {
      pedra.classList.remove('dragging');
    };
    pedra.ondragover = (e) => { e.preventDefault(); };
    pedra.ondrop = (e) => {
      e.preventDefault();
      const fromIdx = parseInt(e.dataTransfer.getData('idx'));
      if (fromIdx === idx) return;
      // Trocar se soltar sobre outra, mover se soltar em espaço vazio
      // Aqui, sempre troca
      const temp = estadoJogo.mesa[fromIdx];
      estadoJogo.mesa[fromIdx] = estadoJogo.mesa[idx];
      estadoJogo.mesa[idx] = temp;
      renderizarMesa();
      setupMesaInteractions();
      showToastInterno('Pedras trocadas!');
    };
    // Dois cliques para esconder/espiar
    let clickTimeout = null;
    pedra.onclick = () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
        // Dois cliques
        const p = estadoJogo.mesa[idx];
        if (!p.virada) {
          p.virada = true;
          showToastInterno('Pedra escondida!');
        } else {
          showToastInterno('Você espiou: ' + p.nome);
        }
        renderizarMesa();
        setupMesaInteractions();
      } else {
        clickTimeout = setTimeout(() => { clickTimeout = null; }, 250);
      }
    };
  });
}

// --- Renderizar código da sala e espectadores ---
function atualizarInfoSala(codigo, espectadores) {
  document.getElementById('codigo-sala-valor').innerText = codigo;
  document.getElementById('lista-espectadores').innerHTML = espectadores.map(e => `<span>${e.nome}</span>`).join(', ');
  // Exibe o info-sala se houver código OU espectadores
  const infoSala = document.getElementById('info-sala');
  if ((!codigo || codigo.trim() === '') && (!espectadores || espectadores.length === 0)) {
    infoSala.style.display = 'none';
  } else {
    infoSala.style.display = '';
  }
}

// --- Renderizar pedras em círculo ---
function renderizarPedrasCirculo(pedras, pedraCentral) {
  const circle = document.getElementById('circle-pedras');
  // Se a pedra central já foi colocada, renderize verticalmente
  if (!pedraCentral) {
    circle.style.display = 'none';
    renderizarPedrasVerticais(pedras);
    return;
  } else {
    circle.style.display = '';
    // Remova o vertical se existir
    const vertical = document.getElementById('vertical-pedras');
    if (vertical) vertical.remove();
  }
  circle.innerHTML = '';
  // Cálculo circular
  const angStep = 360 / pedras.length;
  const raio = 100;
  pedras.forEach((p, i) => {
    const ang = (angStep * i - 90) * Math.PI / 180;
    const x = Math.cos(ang) * raio + 90;
    const y = Math.sin(ang) * raio + 90;
    const div = document.createElement('div');
    div.className = 'pedra-circulo pedra-reserva';
    div.style.left = x + 'px';
    div.style.top = y + 'px';
    div.innerHTML = `<img src="${p.url}" alt="${p.nome}" draggable="false">`;
    // Evento de drag igual ao anterior
    div.onmousedown = function(e) {
      e.preventDefault();
      e.stopPropagation();
      const rect = div.getBoundingClientRect();
      const ghost = div.cloneNode(true);
      ghost.style.position = 'fixed';
      ghost.style.left = rect.left + 'px';
      ghost.style.top = rect.top + 'px';
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      ghost.style.pointerEvents = 'none';
      ghost.style.opacity = '0.85';
      ghost.style.zIndex = 9999;
      ghost.classList.add('dragging');
      document.body.appendChild(ghost);
      div.style.opacity = '0';
      div.style.pointerEvents = 'none';
      function onMove(ev) {
        ghost.style.left = (ev.clientX - rect.width/2) + 'px';
        ghost.style.top = (ev.clientY - rect.height/2) + 'px';
      }
      function onUp(ev) {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        div.style.opacity = '';
        div.style.pointerEvents = '';
        // Detecta se soltou sobre a mesa
        const mesa = document.getElementById('tabuleiro-wrapper');
        const mesaRect = mesa.getBoundingClientRect();
        if (
          ev.clientX >= mesaRect.left && ev.clientX <= mesaRect.right &&
          ev.clientY >= mesaRect.top && ev.clientY <= mesaRect.bottom
        ) {
          const pedraObj = estadoJogo.reserva[i];
          estadoJogo.reserva.splice(i,1);
          estadoJogo.mesa = [ ...estadoJogo.mesa, {...pedraObj, virada: false} ];
          renderizarMesa();
          setupDragDropVertical();
          setupMesaInteractions();
          showToastInterno('Pedra colocada!');
        }
        ghost.remove();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    circle.appendChild(div);
  });
  // Pedra central (agora interativa também)
  if (pedraCentral) {
    const central = document.createElement('div');
    central.className = 'pedra-circulo pedra-reserva pedra-central';
    central.style.left = '90px';
    central.style.top = '90px';
    central.innerHTML = `<img src="${pedraCentral.url}" alt="${pedraCentral.nome}" draggable="false">`;
    central.onmousedown = function(e) {
      e.preventDefault();
      e.stopPropagation();
      const rect = central.getBoundingClientRect();
      const ghost = central.cloneNode(true);
      ghost.style.position = 'fixed';
      ghost.style.left = rect.left + 'px';
      ghost.style.top = rect.top + 'px';
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      ghost.style.pointerEvents = 'none';
      ghost.style.opacity = '0.85';
      ghost.style.zIndex = 9999;
      ghost.classList.add('dragging');
      document.body.appendChild(ghost);
      central.style.opacity = '0';
      central.style.pointerEvents = 'none';
      function onMove(ev) {
        ghost.style.left = (ev.clientX - rect.width/2) + 'px';
        ghost.style.top = (ev.clientY - rect.height/2) + 'px';
      }
      function onUp(ev) {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        central.style.opacity = '';
        central.style.pointerEvents = '';
        const mesa = document.getElementById('tabuleiro-wrapper');
        const mesaRect = mesa.getBoundingClientRect();
        if (
          ev.clientX >= mesaRect.left && ev.clientX <= mesaRect.right &&
          ev.clientY >= mesaRect.top && ev.clientY <= mesaRect.bottom
        ) {
          estadoJogo.mesa = [ ...estadoJogo.mesa, {...estadoJogo.pedraCentral, virada: false} ];
          estadoJogo.pedraCentral = null;
          renderizarMesa();
          setupMesaInteractions();
          showToastInterno('Pedra central colocada!');
          console.log('Chamando renderizarPedrasCirculo para alinhar vertical');
          renderizarPedrasCirculo(estadoJogo.reserva, null);
        }
        ghost.remove();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    circle.appendChild(central);
  }
}

// --- Drag & drop das pedras alinhadas na vertical ---
function setupDragDropVertical() {
  const pedrasVerticais = document.querySelectorAll('#circle-pedras .pedra-circulo:not(.pedra-central)');
  pedrasVerticais.forEach((div, idx) => {
    div.onmousedown = function(e) {
      window.dragAtivo = true;
      e.preventDefault();
      e.stopPropagation();
      const rect = div.getBoundingClientRect();
      const ghost = div.cloneNode(true);
      ghost.style.position = 'fixed';
      ghost.style.left = rect.left + 'px';
      ghost.style.top = rect.top + 'px';
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      ghost.style.pointerEvents = 'none';
      ghost.style.opacity = '0.85';
      ghost.style.zIndex = 9999;
      ghost.classList.add('dragging');
      document.body.appendChild(ghost);

      div.style.opacity = '0';
      div.style.pointerEvents = 'none';

      function onMove(ev) {
        ghost.style.left = (ev.clientX - rect.width/2) + 'px';
        ghost.style.top = (ev.clientY - rect.height/2) + 'px';
      }
      function onUp(ev) {
        window.dragAtivo = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        div.style.opacity = '';
        div.style.pointerEvents = '';
        // Detecta se soltou sobre a mesa
        const mesa = document.getElementById('tabuleiro-wrapper');
        const mesaRect = mesa.getBoundingClientRect();
        if (
          ev.clientX >= mesaRect.left && ev.clientX <= mesaRect.right &&
          ev.clientY >= mesaRect.top && ev.clientY <= mesaRect.bottom
        ) {
          const pedrasRestantes = document.querySelectorAll('#circle-pedras .pedra-circulo:not(.pedra-central)');
          const idxAtual = Array.from(pedrasRestantes).indexOf(div);
          const pedraObj = estadoJogo.reserva[idxAtual];
          estadoJogo.reserva.splice(idxAtual,1);
          estadoJogo.mesa = [ ...estadoJogo.mesa, {...pedraObj, virada: false} ];
          renderizarMesa();
          renderizarPedrasCirculo(estadoJogo.reserva, null); // <-- re-renderiza e realinha
          setupMesaInteractions();
          showToastInterno('Pedra colocada!');
        }
        ghost.remove();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
  });
}

// --- Moeda e animação da pedra central ---
let pedraCentralAnimada = null;
function moverPedraParaSlot(pedra, slotIndex) {
  // Cria um array de 7 posições, todas nulas
  const pedras = Array(7).fill(null);
  // Coloca a pedra no slot desejado
  pedras[slotIndex] = pedra;
  // Renderiza as pedras (só uma aparecerá)
  renderizarPedrasMesa(
    pedras.map(p => p ? p : {nome: '', url: ''}) // evita erro se slot for null
  );
}

// Função para mostrar notificação flutuante
function mostrarNotificacaoMoeda(msg) {
  let notif = document.getElementById('notificacao-moeda');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'notificacao-moeda';
    document.body.appendChild(notif);
  }
  notif.innerText = msg;
  notif.style.display = 'block';
  setTimeout(() => {
    notif.style.display = 'none';
  }, 1800);
}

// Supondo que você tem as variáveis nomeJogador1 e nomeJogador2
let nomeJogador1 = 'Alice';
let nomeJogador2 = 'Bob';

// Lógica do botão da moeda
const pedraCentral = {nome: 'Coroa', url: 'https://github.com/AliceDeSa/Tellstones/raw/main/Coroa.svg'};
const moedaBtn = document.getElementById('moeda-btn');
const moedaAnimada = document.getElementById('moeda-animada');
const moedaFrente = document.getElementById('moeda-frente');
const moedaVerso = document.getElementById('moeda-verso');
const somMoeda = document.getElementById('som-moeda');

moedaBtn.onclick = function() {
  somMoeda.currentTime = 0;
  somMoeda.play(); // TOCA O SOM IMEDIATAMENTE AO CLICAR

  moedaAnimada.classList.remove('moeda-girando');
  void moedaAnimada.offsetWidth;
  moedaAnimada.classList.add('moeda-girando');

  const resultado = Math.random() < 0.5 ? 0 : 1;

  setTimeout(() => {
    // Garante que a moeda pare reta
    if (resultado === 0) {
      moedaFrente.style.transform = 'rotateY(0deg)';
      moedaVerso.style.transform = 'rotateY(180deg)';
    } else {
      moedaFrente.style.transform = 'rotateY(180deg)';
      moedaVerso.style.transform = 'rotateY(0deg)';
    }
    moedaAnimada.classList.remove('moeda-girando');
  }, 1300);
};

// Função para animar a peça do canto esquerdo até o slot central
function animarPedraParaMesa(pedra, slotIndex) {
  const wrapper = document.getElementById('tabuleiro-wrapper');
  const larguraWrapper = wrapper.offsetWidth;
  const larguraPedra = 80;
  const slots = 7;
  const slotLargura = larguraWrapper / slots;
  // Posição final
  const leftFinal = (slotLargura * slotIndex) + (slotLargura / 2) - (larguraPedra / 2);
  // Cria a pedra animada
  let animada = document.createElement('div');
  animada.className = 'pedra-mesa pedra-oficial pedra-animada-mesa';
  animada.style.left = '0px';
  animada.style.top = '50%';
  animada.innerHTML = `<img src="${pedra.url}" alt="${pedra.nome}" draggable="false">`;
  wrapper.appendChild(animada);
  // Força reflow para garantir início da animação
  void animada.offsetWidth;
  animada.style.left = leftFinal + 'px';
  animada.style.top = '50%';
  animada.style.transform = 'translateY(-50%)';
  // Após a animação, remove a pedra animada e fixa no tabuleiro
  setTimeout(() => {
    animada.remove();
    moverPedraParaSlot(pedra, slotIndex);
  }, 1200);
}

// --- Exemplo de uso inicial ---
// Embaralhar pedras e renderizar
const pedrasOficiais = [
  { nome: 'Coroa', url: 'https://github.com/AliceDeSa/Tellstones/raw/main/Coroa.svg' },
  { nome: 'Espada', url: 'https://github.com/AliceDeSa/Tellstones/raw/main/espada.svg' },
  { nome: 'Balança', url: 'https://github.com/AliceDeSa/Tellstones/raw/main/Balança.svg' },
  { nome: 'Cavalo', url: 'https://github.com/AliceDeSa/Tellstones/raw/main/cavalo.svg' },
  { nome: 'Escudo', url: 'https://github.com/AliceDeSa/Tellstones/raw/main/escudo.svg' },
  { nome: 'Bandeira', url: 'https://github.com/AliceDeSa/Tellstones/raw/main/bandeira.svg' },
  { nome: 'Martelo', url: 'https://github.com/AliceDeSa/Tellstones/raw/main/martelo.svg' }
];
function embaralhar(array) {
  return array.map(a => [Math.random(), a]).sort((a, b) => a[0] - b[0]).map(a => a[1]);
}
document.addEventListener('DOMContentLoaded', function() {
  // Embaralha as pedras e separa a central
  const pedrasEmbaralhadas = embaralhar(pedrasOficiais);
  const pedraCentral = pedrasEmbaralhadas.shift(); // Remove a primeira pedra
  estadoJogo.reserva = pedrasEmbaralhadas; // 6 pedras
  estadoJogo.pedraCentral = pedraCentral;  // 1 pedra
  renderizarPedrasCirculo(estadoJogo.reserva, estadoJogo.pedraCentral);
  atualizarInfoSala('ABC123', [{nome:'Ana'},{nome:'João'}]);
});

const wrapper = document.getElementById('tabuleiro-wrapper');
const img = document.getElementById('tabuleiro');
img.onload = function() {
  renderizarPontosCentrais();
  if (typeof ajustarWrapperTabuleiro === 'function') ajustarWrapperTabuleiro();
};
if (img.complete) {
  renderizarPontosCentrais();
  if (typeof ajustarWrapperTabuleiro === 'function') ajustarWrapperTabuleiro();
}

function renderizarPontosCentrais() {
  const wrapper = document.getElementById('tabuleiro-wrapper');
  const pontosDiv = document.getElementById('pontos-centrais');
  pontosDiv.innerHTML = '';
  const larguraWrapper = wrapper.offsetWidth;
  const slots = 7;
  const slotLargura = larguraWrapper / slots;
  for (let i = 0; i < slots; i++) {
    const ponto = document.createElement('div');
    ponto.className = 'ponto-verde';
    // Centraliza o ponto no centro do slot
    const left = (slotLargura * i) + (slotLargura / 2);
    ponto.style.left = left + 'px';
    pontosDiv.appendChild(ponto);
  }
}

function renderizarPedrasMesa(pedras) {
  pedrasAtuais = pedras; // Salva referência para usar no resize
  const wrapper = document.getElementById('tabuleiro-wrapper');
  const pedrasMesa = document.getElementById('pedras-mesa');
  pedrasMesa.innerHTML = '';
  const larguraWrapper = wrapper.offsetWidth;
  const larguraPedra = 80; // mesmo valor do CSS
  const slots = 7;
  const slotLargura = larguraWrapper / slots;

  pedras.forEach((p, i) => {
    if (p && p.url) { // Só cria a div se houver pedra válida
      const div = document.createElement('div');
      div.className = 'pedra-mesa pedra-oficial';
      const left = (slotLargura * i) + (slotLargura / 2) - (larguraPedra / 2);
      div.style.left = left + 'px';
      div.innerHTML = `<img src="${p.url}" alt="${p.nome}" draggable="false">`;
      pedrasMesa.appendChild(div);
    }
  });
}

// Chamar ao carregar e ao redimensionar
window.addEventListener('resize', renderizarPontosCentrais);
document.addEventListener('DOMContentLoaded', renderizarPontosCentrais);

function mostrarEscolhaCaraCoroa() {
  document.getElementById('escolha-cara-coroa').style.display = 'flex';
}
let escolhaJogador = null;
document.getElementById('btn-cara').onclick = function() {
  escolhaJogador = 'cara';
  document.getElementById('escolha-cara-coroa').style.display = 'none';
  mostrarMoedaParaSorteio();
};
document.getElementById('btn-coroa').onclick = function() {
  escolhaJogador = 'coroa';
  document.getElementById('escolha-cara-coroa').style.display = 'none';
  mostrarMoedaParaSorteio();
};

// Função para mostrar e lançar a moeda após a escolha
function mostrarMoedaParaSorteio() {
  // Centraliza e exibe a moeda normalmente
  const moedaBtn = document.getElementById('moeda-btn');
  moedaBtn.style.display = 'block';
  // Lógica de animação já existente
  moedaBtn.onclick = function() {
    moedaAnimada.classList.remove('moeda-girando');
    void moedaAnimada.offsetWidth;
    moedaAnimada.classList.add('moeda-girando');
    const resultado = Math.random() < 0.5 ? 0 : 1;
    setTimeout(() => {
      somMoeda.currentTime = 0;
      somMoeda.play();
      if (resultado === 0) {
        moedaFrente.style.transform = 'rotateY(0deg)';
        moedaVerso.style.transform = 'rotateY(180deg)';
      } else {
        moedaFrente.style.transform = 'rotateY(180deg)';
        moedaVerso.style.transform = 'rotateY(0deg)';
      }
      moedaAnimada.classList.remove('moeda-girando');
      // Exibe o resultado
      if ((resultado === 0 && escolhaJogador === 'cara') || (resultado === 1 && escolhaJogador === 'coroa')) {
        mostrarNotificacaoMoeda('Você ganhou o sorteio! Você começa.');
      } else {
        mostrarNotificacaoMoeda('O adversário ganhou o sorteio e começa.');
      }
      // Só some a moeda após 2 segundos do resultado
      setTimeout(() => {
        // Suaviza a moeda sumindo
        moedaBtn.style.opacity = '0';
      setTimeout(() => {
        moedaBtn.style.display = 'none';
          // Espera 1s antes de animar a peça central
          setTimeout(() => {
            const circle = document.getElementById('circle-pedras');
            const centralDiv = circle.querySelector('.pedra-central');
            if (centralDiv) {
              const img = centralDiv.querySelector('img');
              if (img) {
                // Calcula centro da peça central no círculo e centro do tabuleiro
                const tabuleiroCenter = document.getElementById('tabuleiro-center');
                const centerRect = tabuleiroCenter.getBoundingClientRect();
                const rect = centralDiv.getBoundingClientRect();
                const wrapper = document.getElementById('tabuleiro-wrapper');
                const wrapperRect = wrapper.getBoundingClientRect();
                const larguraPedra = rect.width;
                // Centro da peça central no círculo (relativo ao tabuleiro-center)
                const leftStart = rect.left - centerRect.left + rect.width / 2;
                const topStart = rect.top - centerRect.top + rect.height / 2;
                // Centro do tabuleiro (relativo ao tabuleiro-center)
                const leftFinal = wrapperRect.left - centerRect.left + (wrapper.offsetWidth / 2);
                const topFinal = wrapperRect.top - centerRect.top + (wrapper.offsetHeight / 2);
                // Cria pedra animada centralizada
                const pedraAnimada = document.createElement('div');
                pedraAnimada.className = 'pedra-mesa pedra-oficial pedra-animada-mesa';
                pedraAnimada.style.position = 'absolute';
                pedraAnimada.style.left = leftStart + 'px';
                pedraAnimada.style.top = topStart + 'px';
                pedraAnimada.style.width = larguraPedra + 'px';
                pedraAnimada.style.height = larguraPedra + 'px';
                pedraAnimada.style.transform = 'translate(-50%, -50%)';
                pedraAnimada.innerHTML = `<img src="${img.src}" alt="${img.alt}" draggable="false">`;
                tabuleiroCenter.appendChild(pedraAnimada);
                // Remove a peça central do círculo visualmente
                centralDiv.style.visibility = 'hidden';
                // Anima para o centro do tabuleiro
                pedraAnimada.animate([
                  { left: leftStart + 'px', top: topStart + 'px', transform: 'translate(-50%, -50%)' },
                  { left: leftFinal + 'px', top: topFinal + 'px', transform: 'translate(-50%, -50%)' }
                ], {
                  duration: 2000,
                  easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
                  fill: 'forwards'
                });
                setTimeout(() => {
                  pedraAnimada.remove();
                  centralDiv.remove();
                  // Mostra a pedra no tabuleiro, no slot central (3)
                  const pedra = { nome: img.alt, url: img.src };
                  moverPedraParaSlot(pedra, 3);
                }, 2000);
              }
            }
      }, 1000);
        }, 500); // tempo da transição de opacidade
      }, 2000);
    }, 1300);
  };
}

// Função para renderizar pedras verticalmente usando Flexbox
function renderizarPedrasVerticais(pedras) {
  let container = document.getElementById('vertical-pedras');
  if (!container) {
    // Cria o container se não existir
    container = document.createElement('div');
    container.id = 'vertical-pedras';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.height = '260px';
    container.style.justifyContent = 'center';
    container.style.position = 'absolute';
    container.style.left = '24px';
    container.style.top = '50%';
    container.style.transform = 'translateY(-50%)';
    container.style.zIndex = '30';
    // Adiciona o container ao DOM (exemplo: ao lado do círculo)
    const parent = document.getElementById('circle-pedras').parentNode;
    parent.appendChild(container);
  }
  container.innerHTML = '';
  pedras.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'pedra-circulo pedra-reserva';
    div.style.margin = '8px 0';
    div.innerHTML = `<img src="${p.url}" alt="${p.nome}" draggable="false">`;
    // Drag robusto igual ao padrão do círculo
    div.onmousedown = function(e) {
      window.dragAtivo = true;
      e.preventDefault();
      e.stopPropagation();
      const rect = div.getBoundingClientRect();
      const ghost = div.cloneNode(true);
      ghost.style.position = 'fixed';
      ghost.style.left = rect.left + 'px';
      ghost.style.top = rect.top + 'px';
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      ghost.style.pointerEvents = 'none';
      ghost.style.opacity = '0.85';
      ghost.style.zIndex = 9999;
      ghost.classList.add('dragging');
      document.body.appendChild(ghost);
      div.style.opacity = '0';
      div.style.pointerEvents = 'none';
      function onMove(ev) {
        ghost.style.left = (ev.clientX - rect.width/2) + 'px';
        ghost.style.top = (ev.clientY - rect.height/2) + 'px';
      }
      function onUp(ev) {
        window.dragAtivo = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        div.style.opacity = '';
        div.style.pointerEvents = '';
        // Detecta se soltou sobre a mesa
        const mesa = document.getElementById('tabuleiro-wrapper');
        const mesaRect = mesa.getBoundingClientRect();
        if (
          ev.clientX >= mesaRect.left && ev.clientX <= mesaRect.right &&
          ev.clientY >= mesaRect.top && ev.clientY <= mesaRect.bottom
        ) {
          const idxAtual = Array.from(container.children).indexOf(div);
          const pedraObj = pedras[idxAtual];
          pedras.splice(idxAtual,1);
          estadoJogo.mesa = [ ...estadoJogo.mesa, {...pedraObj, virada: false} ];
          renderizarMesa();
          renderizarPedrasVerticais(pedras); // Atualiza o vertical
          setupMesaInteractions();
          showToastInterno('Pedra colocada!');
        }
        ghost.remove();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    container.appendChild(div);
  });
}

// Exemplo de uso:
// Para alinhar as pedras restantes verticalmente, chame:
// renderizarPedrasVerticais(estadoJogo.reserva);
//
// Para voltar ao círculo, use renderizarPedrasCirculo(estadoJogo.reserva, estadoJogo.pedraCentral);
// ... restante do código ...

document.addEventListener('DOMContentLoaded', function() {
  // Exemplo: conectar botão de alinhamento
  const btn = document.getElementById('btn-alinhar-vertical');
  if (btn) {
    btn.onclick = function() {
      renderizarPedrasVerticais(estadoJogo.reserva);
      document.getElementById('circle-pedras').style.display = 'none';
    };
  }
}); 
