/* =====================================================
   ESTRUTURA GERAL E RESET
   ===================================================== */
body,
html {
  height: 100%;
}
body {
  min-height: 100vh;
  margin: 0;
  background: #181c24
    url("https://raw.githubusercontent.com/AliceDeSa/Tellstones/refs/heads/main/T.webp")
    no-repeat center center fixed;
  background-size: cover;
  color: #f1f1f1;
  font-family: "Segoe UI", Arial, sans-serif;
}

/* =====================================================
           TÍTULOS E TEXTOS
           ===================================================== */
h1 {
  font-family: "Georgia", serif;
  font-size: 2.2em;
  letter-spacing: 2px;
  margin-bottom: 8px;
  color: #fff;
  text-shadow: 0 2px 8px #000a;
}
#lobby h2,
#lobby strong,
#lobby-codigo,
#game h2,
#game strong,
#game-codigo {
  color: #fff;
  text-shadow: 0 2px 8px #000a;
}
#vez {
  margin-bottom: 10px;
  font-size: 1.1em;
  color: #8ecfff;
  text-shadow: 0 2px 8px #000a;
}
label,
input,
#room-options label {
  color: #f1f1f1;
}
input[type="text"] {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #444;
  background: #222;
  color: #fff;
  margin-bottom: 10px;
}

/* =====================================================
           TELAS PRINCIPAIS (INICIAL, LOBBY, JOGO)
           ===================================================== */
#start-screen,
#lobby {
  max-width: 400px;
  margin: 40px auto;
  padding: 30px;
  background: rgba(24, 28, 36, 0.92);
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 2px 16px #0008;
  position: relative;
  z-index: 2;
  display: none;
}
#game {
  width: 100vw;
  height: 100vh;
  background: none;
  margin: 0;
  padding: 0;
  border-radius: 0;
  box-shadow: none;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 2;
  display: none;
}
#start-screen.active,
#lobby.active,
#game.active {
  display: block;
}
#lobby,
#start-screen {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* =====================================================
           LISTAS DE JOGADORES E ESPECTADORES
           ===================================================== */
#lobby ul,
#game ul {
  list-style: none;
  padding: 0;
  margin: 0 0 10px 0;
}
#lobby li,
#game li {
  color: #e0e0e0;
  margin-bottom: 4px;
  text-shadow: 0 1px 4px #000a;
}

/* =====================================================
           BOTÕES GERAIS E DE AÇÃO
           ===================================================== */
#lobby-iniciar,
#voltar-lobby {
  background: #2d8cff;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  font-size: 1em;
  cursor: pointer;
  margin-top: 20px;
  transition: background 0.2s;
}
#lobby-iniciar:hover,
#voltar-lobby:hover {
  background: #1a5fb4;
}
#start-screen button {
  margin: 10px;
  padding: 10px 20px;
  font-size: 1em;
  border-radius: 5px;
  border: none;
  background: #2d8cff;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
}
#start-screen button:hover {
  background: #1a5fb4;
}

/* =====================================================
           ÁREA DE CRÉDITOS
           ===================================================== */
#creditos {
  position: fixed;
  right: 20px;
  bottom: 10px;
  color: #f8f8ff;
  font-size: 0.95em;
  opacity: 0.7;
  z-index: 100;
  pointer-events: none;
  font-family: "Segoe UI", Arial, sans-serif;
  text-shadow: 0 1px 4px #000a;
}

/* =====================================================
           ÁREA DO TABULEIRO E PEDRAS
           ===================================================== */
#tabuleiro {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin: 30px 0 10px 0;
  min-height: 70px;
}
.token {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #222 linear-gradient(145deg, #333 60%, #111 100%);
  border: 2px solid #888;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5em;
  color: #fff;
  box-shadow: 0 2px 8px #000a;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s, border 0.2s;
}
.token.revealed {
  background: #2d8cff;
  border: 2px solid #fff;
  color: #fff;
}

#room-options,
#join-room {
  margin-top: 20px;
}

#game-mesa {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin: 30px 0 10px 0;
  min-height: 120px;
  gap: 32px;
}
#pedras-oficiais {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 24px;
}
.pedra-oficial {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #2d8cff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px #0003;
  user-select: none;
  overflow: hidden;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
.pedra-oficial img,
.pedra-oficial svg {
  width: 90%;
  height: 90%;
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  display: block;
  margin: auto;
  box-sizing: border-box;
}
#pano-mesa {
  width: 320px;
  height: 100px;
  background: linear-gradient(135deg, #eaeaea 80%, #b0b0b0 100%);
  border: 4px solid #2d8cff;
  border-radius: 18px;
  box-shadow: 0 4px 24px #0005;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
#moeda-btn {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: #ffd700;
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 64px;
  height: 64px;
  font-size: 2.2em;
  font-weight: bold;
  box-shadow: none;
  cursor: pointer;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, box-shadow 0.2s, opacity 0.5s;
  outline: none !important;
  border: none !important;
  background: none !important;
}
#moeda-btn:hover {
  background: #ffe066;
  box-shadow: none;
}
#moeda-btn:focus,
#moeda-btn:active {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  background: none !important;
}
#moeda-btn {
  outline: none !important;
  border: none !important;
  background: none !important;
  box-shadow: none !important;
}
#resultado-moeda {
  margin-top: 10px;
  font-size: 1.1em;
  color: #ffd700;
  text-shadow: 0 2px 8px #000a;
}

/* Cards de regras e ações */
#cards-info {
  position: fixed;
  top: 40px;
  right: 40px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  z-index: 20;
}
.card-info {
  background: rgba(24, 28, 36, 0.98);
  border: 2px solid #2d8cff;
  border-radius: 12px;
  box-shadow: 0 2px 16px #2226;
  padding: 16px 18px;
  min-width: 220px;
  max-width: 320px;
  font-size: 0.98em;
  color: #f1f1f1;
}
.card-info h3 {
  margin: 0 0 8px 0;
  color: #2d8cff;
  font-size: 1.1em;
}
.card-info ul {
  margin: 0 0 0 16px;
  padding: 0;
}
.card-info li {
  margin-bottom: 6px;
}

/* Botões de ação com identidade visual */
.acao-btn {
  background: linear-gradient(135deg, #2d8cff 70%, #1a5fb4 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 18px 28px;
  font-size: 1.15em;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 2px 12px #0005;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
}
.acao-btn:hover {
  background: linear-gradient(135deg, #1a5fb4 70%, #2d8cff 100%);
  transform: scale(1.05);
  box-shadow: 0 4px 18px #2224;
}
.acao-btn i {
  font-size: 1.2em;
  margin-right: 4px;
}

#painel-acoes {
  margin-top: 32px;
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  justify-content: center;
}

/* Tabuleiro maior */
#game-mesa {
  min-width: 700px;
  min-height: 220px;
  padding: 24px 0;
  gap: 48px;
}
#pedras-oficiais {
  gap: 32px;
  flex-direction: row;
  align-items: center;
}

/* Código da sala no canto superior esquerdo */
#codigo-sala-fixo {
  position: fixed;
  top: 18px;
  left: 18px;
  background: rgba(24, 28, 36, 0.92);
  color: #8ecfff;
  font-size: 1em;
  border-radius: 6px;
  padding: 6px 14px;
  z-index: 30;
  border: 1.5px solid #2d8cff;
  box-shadow: 0 2px 8px #0004;
  opacity: 0.85;
}

/* Esconder listas de jogadores/espectadores após início do jogo */
#game-jogadores,
#game-espectadores {
  display: none !important;
}

/* Ícones flutuantes para abrir cards */
#icones-flutuantes {
  position: fixed;
  top: 60px;
  right: 36px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  z-index: 50;
}
.icone-flutuante {
  width: 48px;
  height: 48px;
  background: #fff;
  border: 2px solid #2d8cff;
  border-radius: 50%;
  box-shadow: 0 2px 12px #0004;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2em;
  color: #2d8cff;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}
.icone-flutuante:hover {
  background: #e6f0ff;
  box-shadow: 0 4px 18px #2224;
}

/* Cards pop-up (regras e ações) */
.card-popup {
  position: fixed;
  top: 50%;
  right: 50%;
  transform: translate(50%, -50%);
  background: rgba(255, 255, 255, 0.98);
  color: #222;
  border: 2px solid #2d8cff;
  border-radius: 14px;
  box-shadow: 0 4px 32px #0005;
  min-width: 320px;
  max-width: 420px;
  padding: 28px 32px 22px 32px;
  z-index: 100;
  display: none;
  animation: popupIn 0.2s;
}
@keyframes popupIn {
  from {
    opacity: 0;
    transform: translate(50%, -60%);
  }
  to {
    opacity: 1;
    transform: translate(50%, -50%);
  }
}
.card-popup h3 {
  margin-top: 0;
  color: #2d8cff;
  font-size: 1.2em;
}
.card-popup .fechar-popup {
  position: absolute;
  top: 10px;
  right: 16px;
  font-size: 1.3em;
  color: #888;
  background: none;
  border: none;
  cursor: pointer;
}

/* Área de reserva de pedras à esquerda */
#reserva-pedras {
  display: none !important;
}

/* Toast interno */
#toast-interno {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: #2d8cff;
  color: #fff;
  padding: 18px 36px;
  border-radius: 10px;
  font-size: 1.1em;
  box-shadow: 0 2px 16px #0007;
  z-index: 200;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}
#toast-interno.mostrar {
  opacity: 1;
  pointer-events: auto;
}

/* Organização circular das pedras da reserva */
.circle-pedras {
  position: relative;
  width: 260px;
  height: 260px;
  margin: 0 auto;
  overflow-y: auto;
  max-height: 90vh;
}
.pedra-reserva {
  position: absolute;
  transition: top 0.7s cubic-bezier(0.77, 0, 0.175, 1),
    left 0.7s cubic-bezier(0.77, 0, 0.175, 1);
  max-width: 100%;
}
.pedra-pos0 {
  left: 50%;
  top: 0%;
  transform: translate(-50%, 0);
}
.pedra-pos1 {
  left: 90%;
  top: 22%;
  transform: translate(-50%, 0);
}
.pedra-pos2 {
  left: 90%;
  top: 68%;
  transform: translate(-50%, 0);
}
.pedra-pos3 {
  left: 50%;
  top: 90%;
  transform: translate(-50%, -100%);
}
.pedra-pos4 {
  left: 10%;
  top: 68%;
  transform: translate(-50%, -100%);
}
.pedra-pos5 {
  left: 10%;
  top: 22%;
  transform: translate(-50%, 0);
}
.pedra-pos6 {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
}

@media (max-width: 900px) {
  #cards-info {
    position: static;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    margin: 0 auto;
    top: unset;
    right: unset;
  }
  #game-mesa {
    min-width: 100vw;
    padding: 8px 0;
    gap: 12px;
  }
  .card-info {
    min-width: 0;
    max-width: 100vw;
    font-size: 0.95em;
  }
  #icones-flutuantes {
    top: unset;
    bottom: 24px;
    right: 16px;
    flex-direction: row;
    gap: 10px;
  }
  #reserva-pedras {
    left: 8px;
    top: 80px;
    gap: 10px;
  }
  .pedra-reserva {
    width: 64px;
    height: 64px;
  }
  .card-popup {
    min-width: 90vw;
    max-width: 98vw;
    padding: 18px 8px 14px 8px;
  }
}

#info-sala {
  position: fixed;
  top: 18px;
  left: 18px;
  background: rgba(24, 28, 36, 0.92);
  color: #8ecfff;
  font-size: 1em;
  border-radius: 8px;
  padding: 10px 18px;
  z-index: 30;
  border: 1.5px solid #2d8cff;
  box-shadow: 0 2px 8px #0004;
  opacity: 0.95;
}
#espectadores {
  font-size: 0.95em;
  color: #b0e0ff;
  margin-top: 6px;
}
#icone-acoes {
  position: fixed;
  top: 18px;
  right: 24px;
  font-size: 2.2em;
  background: #fff;
  border: 2px solid #2d8cff;
  border-radius: 50%;
  width: 54px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 12px #0004;
  z-index: 4000 !important;
  transition: background 0.2s, box-shadow 0.2s;
  width: 60px !important;
  height: 60px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: none;
}
#icone-acoes:hover {
  background: #e6f0ff;
  box-shadow: 0 4px 18px #2224;
}
#icone-acoes img {
  width: 54px !important;
  height: 54px !important;
  object-fit: contain;
  display: block;
}
#box-acoes {
  position: fixed;
  top: 50%;
  right: 24px;
  transform: translateY(-50%);
  background: #fff;
  color: #222;
  border: 2px solid #2d8cff;
  border-radius: 14px;
  box-shadow: 0 4px 32px #0005;
  min-width: 180px;
  max-width: 260px;
  padding: 24px 22px 18px 22px;
  z-index: 100;
  display: none;
}
#box-acoes h3 {
  margin-top: 0;
  color: #2d8cff;
  font-size: 1.1em;
}
#box-acoes ul {
  margin: 0 0 0 12px;
  padding: 0;
}
#box-acoes li {
  margin-bottom: 8px;
  font-size: 1em;
}
#tabuleiro-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
  width: auto;
  height: auto;
}
#tabuleiro-wrapper {
  position: relative;
  display: inline-block;
  width: 420px;
  height: 229px;
  border: 2px dashed red !important;
  margin: 0 !important;
  padding: 0 !important;
  vertical-align: top;
  box-sizing: content-box;
  border-left: 40px solid #2d8cff;
  border-right: 40px solid #2d8cff;
}
#pedras-mesa {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 20;
  margin: 0 !important;
  padding: 0 !important;
}
#tabuleiro {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  margin: 0;
  padding: 0;
}
#linha-central,
#pedras-mesa {
  position: absolute;
  left: 0;
  top: 0;
}
#moeda-btn {
  position: absolute;
  left: 50%;
  top: 18px;
  transform: translateX(-50%);
  background: #ffd700;
  color: #222;
  border: none;
  border-radius: 50%;
  width: 64px;
  height: 64px;
  font-size: 1.5em;
  font-weight: bold;
  box-shadow: none;
  cursor: pointer;
  transition: background 0.2s, opacity 0.5s;
  z-index: 20;
}
#moeda-btn:hover {
  background: #ffe066;
}
#circle-pedras {
  position: absolute;
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
  width: 260px;
  height: 260px;
  z-index: 30;
  pointer-events: auto;
}
.pedra-circulo,
.pedra-reserva {
  position: absolute;
  width: 68.39px;
  height: 68.39px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #2d8cff;
  box-shadow: 0 2px 8px #0006 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  transition: top 0.7s cubic-bezier(0.77, 0, 0.175, 1),
    left 0.7s cubic-bezier(0.77, 0, 0.175, 1);
  z-index: 31;
}
.pedra-reserva img {
  width: 90%;
  height: 90%;
  object-fit: contain;
  border-radius: 50%;
  display: block;
}
.pedra-reserva.dragging {
  opacity: 0.6;
  box-shadow: 0 4px 24px #2225;
  border: 2.5px solid #ffd700;
}

#reserva-pedras {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 30;
  align-items: center;
  pointer-events: auto;
  width: 80px;
  height: 260px; /* igual ao círculo */
  justify-content: center;
}

@media (max-width: 700px) {
  #tabuleiro {
    width: 98vw;
    min-width: 0;
  }
  #tabuleiro-container {
    width: 100vw;
    left: 50vw;
    top: 50vh;
    transform: translate(-50%, -50%);
  }
  #moeda-btn {
    width: 44px;
    height: 44px;
    font-size: 1em;
    top: 8px;
  }
  #circle-pedras {
    width: 180px;
    height: 180px;
    left: 2px;
  }
  .pedra-circulo,
  #pedra-central-animada {
    width: 48px;
    height: 48px;
  }
  .pedra-circulo img,
  #pedra-central-animada img {
    width: 40px;
    height: 40px;
  }
  .pedra-reserva {
    width: 48px;
    height: 48px;
  }
  .pedra-reserva img {
    width: 40px;
    height: 40px;
  }
}

#tabuleiro-center {
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
#tabuleiro-wrapper {
  position: relative;
  display: inline-block;
  width: 420px;
  height: 229px;
  border: 2px dashed red !important;
  margin: 0;
  padding: 0;
  vertical-align: top;
  box-sizing: content-box;
}
#tabuleiro {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  margin: 0;
  padding: 0;
}

#linha-central {
  position: absolute;
  left: 0;
  width: 100%;
  top: 50%;
  height: 2px;
  background: #2d8cff;
  opacity: 0.7;
  z-index: 10;
  pointer-events: none;
  transform: translateY(-50%);
}

#pedras-mesa {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 20;
  margin: 0 !important;
  padding: 0 !important;
}
.pedra-mesa {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  /* left é definido via JS */
  border: 2px solid #2d8cff;
  z-index: 5000 !important;
}

#pontos-centrais {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 30;
}

#notificacao-moeda {
  position: absolute;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  background: #2d8cff;
  color: #fff;
  padding: 16px 32px;
  border-radius: 12px;
  font-size: 1.2em;
  box-shadow: 0 2px 16px #0007;
  z-index: 1001;
  display: none;
}

@keyframes animarPedraMesa {
  0% {
    left: 0px;
    top: 50%;
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    left: 50%;
    top: 50%;
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
.pedra-animada-mesa {
  position: absolute;
  z-index: 1002;
  width: 80px;
  height: 80px;
  pointer-events: none;
  animation: animarPedraMesa 2s cubic-bezier(0.77, 0, 0.175, 1) forwards;
}

#carta-acoes {
  position: fixed;
  right: 32px;
  top: 90px;
  left: auto;
  transform: none;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 370px;
  max-width: 95vw;
  pointer-events: auto;
}
#img-carta-acoes {
  width: 370px;
  max-width: 95vw;
  height: auto;
  border-radius: 18px;
  box-shadow: 0 4px 32px #0007;
  position: relative;
  z-index: 1;
}
#conteudo-acoes {
  position: absolute;
  left: 50%;
  top: 2.7%;
  width: 325px;
  height: 438px;
  max-width: 80vw;
  transform: translate(-50%, 0);
  z-index: 2;
  color: #222;
  font-size: 1em;
  text-align: left;
  pointer-events: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  border: 2px dashed red !important;
  font-family: "Georgia", "Times New Roman", Times, serif;
}
#conteudo-acoes h3 {
  color: #111;
  font-family: "Georgia", "Times New Roman", Times, serif;
  text-align: center;
  font-size: 1.32em;
  font-weight: bold;
  margin-bottom: 14px;
  margin-top: 0;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 8px #fff6, 0 1px 0 #ccc;
}
#conteudo-acoes ul,
#conteudo-acoes li {
  list-style: none;
  margin: 0;
  padding: 0;
}
#conteudo-acoes li {
  font-family: "Georgia", "Times New Roman", Times, serif;
  font-size: 0.93em;
  margin-bottom: 7px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
#conteudo-acoes li strong {
  color: #111;
  font-family: "Georgia", "Times New Roman", Times, serif;
  font-weight: bold;
  font-size: 1em;
  margin-right: 2px;
}
#conteudo-acoes li span,
#conteudo-acoes .descricao-acao {
  color: #5f82aa;
  font-family: "Georgia", "Times New Roman", Times, serif;
  font-size: 0.93em;
  font-weight: normal;
}
#conteudo-acoes .acoes-segabar-intro {
  color: #111;
  font-family: "Georgia", "Times New Roman", Times, serif;
  font-size: 0.93em;
  margin-bottom: 6px;
  font-weight: bold;
  text-align: left;
}
#conteudo-acoes .acoes-segabar-lista > li {
  color: #111;
  font-family: "Georgia", "Times New Roman", Times, serif;
  font-size: 0.93em;
  margin-bottom: 4px;
  font-weight: bold;
  display: block;
}
#conteudo-acoes .acoes-segabar-lista > li > span {
  font-weight: normal;
  color: #5f82aa;
  margin-left: 4px;
}
#conteudo-acoes .acoes-segabar-lista {
  margin-left: 22px;
  margin-top: 6px;
}
#conteudo-acoes .acoes-segabar-lista ul li {
  color: #5f82aa;
  font-family: "Georgia", "Times New Roman", Times, serif;
  font-size: 0.91em;
  font-weight: normal;
  margin-bottom: 2px;
  list-style: disc inside;
  display: list-item;
}
@media (max-width: 400px) {
  #carta-acoes,
  #img-carta-acoes {
    width: 98vw;
    max-width: 98vw;
  }
  #conteudo-acoes {
    width: 90vw;
    max-width: 90vw;
  }
}

@keyframes jogarMoedaRPG {
  0% {
    transform: translateY(0) rotateY(0deg) scale(1);
  }
  20% {
    transform: translateY(-60px) rotateY(360deg) scale(1.1);
  }
  50% {
    transform: translateY(-120px) rotateY(720deg) scale(1.2);
  }
  80% {
    transform: translateY(-60px) rotateY(1080deg) scale(1.1);
  }
  100% {
    transform: translateY(0) rotateY(1440deg) scale(1);
  }
}
.moeda-animando {
  animation: jogarMoedaRPG 1.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  will-change: transform;
}

.moeda-girando {
  animation: girarMoedaRPG 1.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}
@keyframes girarMoedaRPG {
  0% {
    transform: rotateY(0deg);
  }
  100% {
    transform: rotateY(1800deg);
  }
}

#moeda-animada {
  width: 80px;
  height: 80px;
  position: relative;
  perspective: 600px;
  display: inline-block;
  transform-style: preserve-3d;
  background: none !important;
  box-shadow: none !important;
}
#moeda-frente,
#moeda-verso {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  object-position: 50% 52%;
  position: absolute;
  left: 0;
  top: 0;
  backface-visibility: hidden;
  transition: transform 0.6s;
  box-shadow: none;
  background: none;
}
#moeda-animada::after {
  content: "";
  display: block;
  position: absolute;
  left: 50%;
  top: 50%;
  width: 80px;
  height: 80px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: none;
  box-shadow: none;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
  background: none;
}
#moeda-btn:hover #moeda-animada::after {
  opacity: 1;
}

#escolha-cara-coroa button {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  color: #fff !important;
}

#escolha-cara-coroa button img {
  width: 80px !important;
  height: 80px !important;
  border-radius: 50%;
  object-fit: cover;
  object-position: 50% 52%;
  background: none;
  display: block;
  margin-bottom: 6px;
  padding: 0;
  box-shadow: none;
}

#game {
  display: none;
}
#game.active {
  display: block;
}
#info-sala {
  border: none !important;
}
#icone-acoes {
  border: none !important;
}
#box-acoes {
  border: none !important;
}
#tabuleiro-center {
  border: none !important;
}
#tabuleiro-wrapper {
  border: none !important;
}
#circle-pedras {
  border: none !important;
}
#carta-acoes {
  border: none !important;
}
#conteudo-acoes {
  border: none !important;
}
#pedra-central-animada {
  border: none !important;
}

/* Borda vermelha para depuração nas pedras da reserva e da mesa */
.pedra-reserva,
.pedra-mesa,
.pedra-oficial {
  border: 2px solid #2d8cff;
  z-index: 5000 !important;
}

.pedra-mesa > div,
.pedra-oficial > div {
  width: 100% !important;
  height: 100% !important;
  border-radius: 50% !important;
  background: #fff;
  border: 2px solid #2d8cff;
  box-sizing: border-box;
}

/* Animação de rodar em círculo */
.pedra-circulo.animar-circulo {
  animation: girarCirculo 0.8s cubic-bezier(0.77, 0, 0.175, 1) forwards;
}
@keyframes girarCirculo {
  0% {
    transform: scale(1) rotate(0deg);
  }
  100% {
    transform: scale(1.1) rotate(360deg);
  }
}

/* Animação para alinhar em diagonal */
.pedra-circulo.alinhar-diagonal {
  transition: left 0.8s cubic-bezier(0.77, 0, 0.175, 1),
    top 0.8s cubic-bezier(0.77, 0, 0.175, 1);
}

/* Força ocultação se algum outro CSS sobrescrever */
#game:not(.active),
#lobby:not(.active),
#start-screen:not(.active) {
  display: none !important;
}

.pedra-circulo.dragging,
.pedra-reserva.dragging {
  position: fixed !important;
  z-index: 99999 !important;
  pointer-events: none;
}

.ghost-pedra {
  background: #fff;
  border: 2px solid #2d8cff;
  border-radius: 50%;
  box-shadow: 0 2px 8px #0003;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  pointer-events: none;
}
.ghost-pedra img {
  width: 90%;
  height: 90%;
  object-fit: contain;
  border-radius: 50%;
  display: block;
}

/* Silhueta branca para slots de destino ao arrastar pedra da reserva */
.highlight-slot {
  transition: background 0.2s, border 0.2s;
  pointer-events: none;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 2.5px #fff8, 0 0 8px 2px #fff3 !important;
  border: 2.5px solid #fff !important;
  background: rgba(255, 255, 255, 0.55) !important;
}

.highlight-slot:hover,
.highlight-slot:active,
.highlight-slot:focus {
  box-shadow: 0 0 0 2.5px #fff8, 0 0 8px 2px #fff3 !important;
  border: 2.5px solid #fff !important;
  background: rgba(255, 255, 255, 0.55) !important;
}

/* Animação de flip para virar pedra */
@keyframes flipPedra {
  0% {
    transform: rotateY(0deg);
  }
  100% {
    transform: rotateY(180deg);
  }
}
.pedra-flip {
  animation: flipPedra 0.5s cubic-bezier(0.77, 0, 0.175, 1);
  backface-visibility: hidden;
}

.pedra-oficial,
.pedra-reserva,
.pedra-circulo,
.pedra-mesa {
  border: 2px solid #2d8cff;
  z-index: 5000 !important;
}

/* Ajustar espaçamento das pedras na reserva */
.pedra-circulo.pedra-reserva,
.pedra-reserva {
  margin-bottom: 12px !important;
}

.pedra-troca-selecionada {
  box-shadow: 0 0 0 2.5px #ffd70088, 0 0 8px 2px #fff3 !important;
  border: 2.5px solid #ffd700 !important;
  z-index: 10001 !important;
  transition: box-shadow 0.2s, border 0.2s;
}
.pedra-drop-alvo {
  box-shadow: 0 0 0 2.5px #ffd70088, 0 0 8px 2px #fff3 !important;
  border: 2.5px solid #ffd700 !important;
  z-index: 10001 !important;
  transition: box-shadow 0.2s, border 0.2s;
}

#btn-desafiar {
  margin: 24px auto 0 auto;
  display: block;
  font-size: 1.2em;
  padding: 12px 32px;
  border-radius: 8px;
  background: #2d8cff;
  color: #fff;
  border: none;
  box-shadow: 0 2px 8px #0004;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}
#btn-desafiar:hover {
  background: #1a5fb4;
  box-shadow: 0 4px 16px #2224;
}

#btn-segabar {
  margin: 16px auto 0 auto;
  display: block;
  font-size: 1.2em;
  padding: 12px 32px;
  border-radius: 8px;
  background: #ffd700;
  color: #222;
  border: none;
  box-shadow: 0 2px 8px #0004;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s, box-shadow 0.2s;
}
#btn-segabar:hover {
  background: #ffe066;
  box-shadow: 0 4px 16px #2224;
}

#toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: #2d8cff;
  color: #fff;
  padding: 18px 36px;
  border-radius: 10px;
  font-size: 1.1em;
  box-shadow: 0 2px 16px #0007;
  z-index: 99999 !important;
  opacity: 1;
  pointer-events: none;
  transition: opacity 0.3s;
  display: none;
}

.silhueta-espiada {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, #ffd700cc 60%, #fff00044 100%);
  box-shadow: 0 0 16px 4px #ffd70088, 0 0 32px 8px #fff00033;
  opacity: 0.7;
  pointer-events: none;
  z-index: 10001;
  animation: silhuetaFade 2.2s linear forwards;
  border: 3px solid #ffd700;
}
@keyframes silhuetaFade {
  0% {
    opacity: 0.8;
  }
  80% {
    opacity: 0.7;
  }
  100% {
    opacity: 0;
  }
}

/* Nova animação para borda-dourada-animada: igual ao highlight-slot/slot selecionado */
.borda-dourada-animada {
  border-color: #ffd700 !important;
  box-shadow: 0 0 0 4px #ffd700cc, 0 0 16px 6px #fff00055;
  animation: bordaDouradaSlotVolta 2.2s linear forwards;
}
@keyframes bordaDouradaSlotVolta {
  0% {
    border-color: #ffd700;
    box-shadow: 0 0 0 4px #ffd700cc, 0 0 16px 6px #fff00055;
  }
  80% {
    border-color: #ffd700;
    box-shadow: 0 0 0 4px #ffd700cc, 0 0 16px 6px #fff00055;
  }
  100% {
    border-color: #2d8cff;
    box-shadow: none;
  }
}

#placar-turno-central {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  font-size: 1.15em;
  border-radius: 10px;
  padding: 0;
  z-index: 100;
  box-shadow: none;
  text-align: center;
  min-width: 0;
  background: none !important;
}

#botoes-acoes-laterais {
  position: absolute;
  right: -170px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 18px;
  z-index: 100;
}
#botoes-acoes-laterais button {
  min-width: 120px;
  font-size: 1.1em;
  padding: 12px 28px;
  border-radius: 8px;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px #0004;
  font-weight: bold;
}

/* Padronização visual das pedras de escolha do desafio para igualar à .pedra-reserva */
#opcoes-desafio button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 2px solid #2d8cff;
  border-radius: 50%;
  width: 68.39px;
  height: 68.39px;
  cursor: pointer;
  box-shadow: 0 2px 8px #0007;
  margin: 0 6px;
  padding: 0;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s, border 0.2s;
}
#opcoes-desafio button img {
  width: 90%;
  height: 90%;
  object-fit: contain;
  border-radius: 50%;
  display: block;
  margin: 0 auto 2px auto;
  box-sizing: border-box;
}
#opcoes-desafio button span {
  font-size: 0.93em;
  color: #222;
  margin-top: 0;
  margin-bottom: 2px;
  display: block;
  text-align: center;
  font-family: "Georgia", "Times New Roman", Times, serif;
}
#opcoes-desafio {
  width: 740px;
  max-width: 98vw;
  min-width: 320px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}
.box-desafio {
  border: 2.5px solid #ffd700;
  border-radius: 12px;
  background: #23242a;
  padding: 8px 0 8px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 0 !important;
}
#opcoes-desafio .titulo-desafio {
  background: transparent !important;
  margin-bottom: 6px;
  border: none !important;
  box-shadow: none !important;
  width: 100%;
  text-align: center;
  color: #fff;
  font-size: 1em;
  padding: 0;
}
#opcoes-desafio .linha-pedras {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 0;
  margin-top: 0;
}

#opcoes-desafio .pedra-reserva {
  flex: none;
  width: 68.39px;
  height: 68.39px;
  aspect-ratio: 1/1;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #2d8cff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px #0006 !important;
  cursor: pointer;
  margin: 0 0;
  padding: 0;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s, border 0.2s;
}
#opcoes-desafio .pedra-reserva img {
  width: 90%;
  height: 90%;
  object-fit: contain;
  border-radius: 50%;
  display: block;
  margin: 0 auto;
  box-sizing: border-box;
}

#opcoes-desafio .pedra-label {
  font-size: 0.93em;
  color: #222;
  margin-top: 2px;
  text-align: center;
  font-family: "Georgia", "Times New Roman", Times, serif;
  background: none;
  border: none;
  box-shadow: none;
  pointer-events: none;
  line-height: 1.1;
  width: 100%;
  user-select: none;
}

.desafio-alvo {
  box-shadow: 0 0 0 4px #ffd700cc, 0 0 16px 6px #fff00055 !important;
  border: 3px solid #ffd700 !important;
  animation: bordaDouradaSlotVolta 2.2s linear forwards;
  z-index: 10001 !important;
}

@media (max-width: 800px) {
  #opcoes-desafio,
  #tabuleiro-wrapper {
    width: 98vw !important;
    min-width: 0;
    max-width: 100vw;
  }
}

/* Corrige botões de ação dentro de #opcoes-desafio para não ficarem circulares */
#opcoes-desafio .acao-btn {
  border-radius: 10px !important;
  width: auto !important;
  height: auto !important;
  min-width: 120px;
  min-height: 44px;
  padding: 12px 32px;
  background: linear-gradient(135deg, #2d8cff 70%, #1a5fb4 100%);
  color: #fff;
  font-size: 1.1em;
  font-weight: bold;
  box-shadow: 0 2px 12px #0005;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin: 0 12px;
  transition: background 0.2s, box-shadow 0.2s;
}
#opcoes-desafio .acao-btn:hover {
  background: linear-gradient(135deg, #1a5fb4 70%, #2d8cff 100%);
  box-shadow: 0 4px 18px #2224;
}

#opcoes-segabar {
  z-index: 50000 !important;
  position: relative !important;
  pointer-events: auto !important;
}
#opcoes-segabar .acao-btn {
  pointer-events: auto !important;
}

/* Marcadores de ponto (pontuação dos jogadores) */
.marcador-ponto {
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #222;
  border: 3px solid #8ecfff;
  box-shadow: 0 2px 8px #0007;
  z-index: 50;
  transition: background 0.3s, border 0.3s;
}
.marcador-ponto.marcador-esquerda[data-idx="0"] {
  left: 43px;
  top: 44px;
}
.marcador-ponto.marcador-esquerda[data-idx="1"] {
  left: 78px;
  top: 44px;
}
.marcador-ponto.marcador-esquerda[data-idx="2"] {
  left: 113px;
  top: 44px;
}
.marcador-ponto.marcador-direita[data-idx="0"] {
  left: 600px;
  top: 244px;
}
.marcador-ponto.marcador-direita[data-idx="1"] {
  left: 635px;
  top: 244px;
}
.marcador-ponto.marcador-direita[data-idx="2"] {
  left: 670px;
  top: 244px;
}
.marcador-ponto.preenchido {
  background: #ffd700;
  border-color: #ffd700;
  box-shadow: 0 0 12px 2px #ffd70099;
}

#tela-vitoria {
  display: none;
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  z-index: 99999;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}
#tela-vitoria.active {
  display: flex !important;
}
#tela-vitoria-conteudo {
  background: #232942;
  color: #fff;
  padding: 48px 60px;
  border-radius: 18px;
  box-shadow: 0 4px 32px #000a;
  text-align: center;
  max-width: 90vw;
}
#tela-vitoria-titulo {
  font-size: 2.2em;
  margin-bottom: 18px;
  color: #ffd700;
  text-shadow: 0 2px 8px #000a;
}
#tela-vitoria-msg {
  font-size: 1.25em;
  margin-bottom: 18px;
}
#btn-voltar-lobby {
  margin-top: 32px;
  font-size: 1.1em;
  padding: 12px 32px;
  border-radius: 8px;
  background: #2d8cff;
  color: #fff;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}
#btn-voltar-lobby:hover {
  background: #1a5fb4;
}

/* ===== Ko-fi Widget Customizado ===== */
body > .floatingchat-donate-button {
  position: fixed !important;
  right: 24px !important;
  left: auto !important;
  bottom: 24px !important;
  top: auto !important;
  width: 64px !important;
  height: 64px !important;
  border-radius: 50% !important;
  overflow: hidden !important;
  box-shadow: 0 2px 12px #794bc488 !important;
  background: #794bc4 !important;
  z-index: 99999 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
}
body > .floatingchat-donate-button img {
  width: 48px !important;
  height: 48px !important;
  border-radius: 50% !important;
  background: transparent !important;
  margin: 0 !important;
  box-shadow: none !important;
}
body > .floatingchat-donate-button span {
  display: none !important; /* Esconde qualquer texto ao lado do ícone */
}
