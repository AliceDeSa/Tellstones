// Logic for Coin Flip (Cara ou Coroa)
// Migrated from main.js
import LocaleManager from '../data/LocaleManager.js';
export const CoinFlip = {
    listenerRef: null,
    ultimoLadoNotificado: null,
    ultimoResultadoMoedaTocado: null,
    resetUI: function () {
        // Force hide notifications
        const notif = document.getElementById("notificacao-moeda");
        if (notif)
            notif.style.display = "none";
        // Force clear feedback message
        const feedbackDiv = document.getElementById("msg-feedback-cara-coroa");
        if (feedbackDiv)
            feedbackDiv.innerHTML = "";
        // Ensure CoinFlip modal is visible if needed (will be handled by data) 
        // but hide 'moeda-btn' if it exists
        const moedaBtn = document.getElementById("moeda-btn");
        if (moedaBtn)
            moedaBtn.style.display = "none";
    },
    definirEscolha: function (escolha) {
        if (!window.salaAtual || !window.nomeAtual)
            return;
        window.getDBRef("salas/" + window.salaAtual + "/caraCoroa/escolha").transaction(function (current) {
            if (current === null) {
                console.log("[DEBUG] Escolha de cara/coroa SALVA:", { nome: window.nomeAtual, escolha });
                return { nome: window.nomeAtual, escolha: escolha };
            }
            return;
        });
    },
    pararOuvirCaraCoroa: function () {
        if (this.listenerRef && window.salaAtual) {
            try {
                window.getDBRef("salas/" + window.salaAtual + "/caraCoroa").off("value", this.listenerRef);
            }
            catch (e) {
                console.warn("Erro ao remover listener moeda", e);
            }
        }
        this.listenerRef = null;
    },
    ouvirCaraCoroa: function () {
        if (!window.salaAtual)
            return;
        if (window.salaAtual === "MODO_TUTORIAL")
            return;
        this.pararOuvirCaraCoroa();
        // Reset UI immediately to prevent ghost notifications
        this.resetUI();
        this.listenerRef = window.getDBRef("salas/" + window.salaAtual + "/caraCoroa").on("value", (snap) => {
            const data = snap.val();
            // window.ultimoCaraCoroaData = data; // Legacy global??
            const escolhaDiv = document.getElementById("escolha-cara-coroa");
            const btnCara = document.getElementById("btn-cara");
            const btnCoroa = document.getElementById("btn-coroa");
            let feedbackDiv = document.getElementById("msg-feedback-cara-coroa");
            if (!feedbackDiv && escolhaDiv) {
                feedbackDiv = document.createElement("div");
                feedbackDiv.id = "msg-feedback-cara-coroa";
                // ... styles ...
                Object.assign(feedbackDiv.style, {
                    marginTop: "22px", fontSize: "1.25em", color: "#ffd700", textAlign: "center", width: "100%"
                });
                const parent = escolhaDiv.querySelector("div");
                if (parent)
                    parent.appendChild(feedbackDiv);
            }
            // Styling buttons
            if (btnCara) {
                btnCara.innerHTML = `<img src='assets/img/coins/classic/Cara.png' alt='Cara' style='width:80px;height:80px;border-radius:50%;margin-bottom:10px;box-shadow:0 2px 8px #0007;' /><span style='font-size:1.1em;'>Cara</span>`;
                Object.assign(btnCara.style, { fontSize: "1.3em", padding: "16px 32px", minWidth: "120px", display: "inline-flex", flexDirection: "column", alignItems: "center" });
                btnCara.onclick = () => this.definirEscolha("cara");
            }
            if (btnCoroa) {
                btnCoroa.innerHTML = `<img src='assets/img/coins/classic/Coroa.png' alt='Coroa' style='width:80px;height:80px;border-radius:50%;margin-bottom:10px;box-shadow:0 2px 8px #0007;' /><span style='font-size:1.1em;'>Coroa</span>`;
                Object.assign(btnCoroa.style, { fontSize: "1.3em", padding: "16px 32px", minWidth: "120px", display: "inline-flex", flexDirection: "column", alignItems: "center" });
                btnCoroa.onclick = () => this.definirEscolha("coroa");
            }
            if (!data || !data.escolha) {
                if (escolhaDiv)
                    escolhaDiv.style.display = "flex";
                if (btnCara)
                    btnCara.disabled = false;
                if (btnCoroa)
                    btnCoroa.disabled = false;
                if (feedbackDiv)
                    feedbackDiv.innerHTML = "";
                this.ultimoLadoNotificado = null;
                return;
            }
            // CRITICAL FIX: Stop infinite loop if already finalized
            if (data.sorteioFinalizado) {
                // Ensure cleanup if user refreshes page while finalized
                if (escolhaDiv)
                    escolhaDiv.style.display = "none";
                if (feedbackDiv)
                    feedbackDiv.innerHTML = "";
                const existingBtn = document.getElementById("moeda-btn");
                if (existingBtn)
                    existingBtn.style.display = "none";
                return;
            }
            // Verify my choice
            let minhaEscolha;
            if (window.nomeAtual === data.escolha.nome) {
                minhaEscolha = data.escolha.escolha;
            }
            else {
                minhaEscolha = data.escolha.escolha === "cara" ? "coroa" : "cara";
            }
            // window.escolhaJogador = minhaEscolha;
            if (!data.feedbackLiberado) {
                window.getDBRef("salas/" + window.salaAtual + "/caraCoroa/feedbackLiberado").set(Date.now());
                return;
            }
            if (escolhaDiv)
                escolhaDiv.style.display = "flex";
            if (btnCara)
                btnCara.disabled = true;
            if (btnCoroa)
                btnCoroa.disabled = true;
            if (feedbackDiv) {
                const text = LocaleManager.t('game.coinFlip.youGot').replace('{side}', minhaEscolha.toUpperCase());
                const wait = LocaleManager.t('game.coinFlip.waiting');
                feedbackDiv.innerHTML = `${text}<br><span style='font-size:0.95em;color:#ffd700;'>${wait}</span>`;
            }
            if (minhaEscolha !== this.ultimoLadoNotificado) {
                const text = LocaleManager.t('game.coinFlip.youGot').replace('{side}', minhaEscolha.toUpperCase());
                if (window.notificationManager)
                    window.notificationManager.showInternal(text);
                this.ultimoLadoNotificado = minhaEscolha;
            }
            const agora = Date.now();
            const tempoRestante = Math.max(0, 2500 - (agora - data.feedbackLiberado));
            setTimeout(() => {
                if (feedbackDiv)
                    feedbackDiv.innerHTML = "";
                if (escolhaDiv)
                    escolhaDiv.style.display = "none";
                if (!data || typeof data.resultado === "undefined") {
                    this.mostrarMoedaParaSorteioCriador();
                }
            }, tempoRestante);
            if (typeof data.resultado !== "undefined") {
                if (escolhaDiv)
                    escolhaDiv.style.display = "none";
                this.mostrarMoedaParaSorteioSincronizado(data.resultado, minhaEscolha);
            }
        });
    },
    // --- BUTTON CREATION & HANDLING LOGIC ---
    garantirBotao: function () {
        let btn = document.getElementById("moeda-btn");
        if (!btn) {
            console.log("[CoinFlip] Creating moeda-btn...");
            btn = document.createElement("button");
            btn.id = "moeda-btn";
            btn.title = "Lançar moeda";
            document.body.appendChild(btn);
            btn.innerHTML = `
                <span id="moeda-animada" style="display:inline-block;width:100px;height:100px;position:relative;perspective:600px;pointer-events:none;">
                    <img id="moeda-frente" src="assets/img/coins/classic/Cara.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:50% 52%;position:absolute;left:0;top:0;backface-visibility:hidden;transition:transform 0.6s;box-shadow:0 4px 12px rgba(0,0,0,0.5);background:#222;pointer-events:none;" />
                    <img id="moeda-verso" src="assets/img/coins/classic/Coroa.png" style="width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:50% 52%;position:absolute;left:0;top:0;backface-visibility:hidden;transform:rotateY(180deg);transition:transform 0.6s;box-shadow:0 4px 12px rgba(0,0,0,0.5);background:#222;pointer-events:none;" />
                </span>
            `;
        }
        // ALWAYS Force styles
        Object.assign(btn.style, {
            background: "transparent", border: "none", outline: "none",
            position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
            width: "120px", height: "120px", zIndex: "99999", cursor: "pointer", pointerEvents: "auto"
        });
        if (!btn.style.display)
            btn.style.display = "none";
    },
    mostrarMoedaParaSorteioCriador: function () {
        this.garantirBotao();
        const moedaBtn = document.getElementById("moeda-btn");
        if (!moedaBtn)
            return;
        window.getDBRef("salas/" + window.salaAtual + "/caraCoroa/resultado").once("value", (snapshot) => {
            if (snapshot.exists()) {
                moedaBtn.style.display = "none";
                moedaBtn.onclick = null;
                return;
            }
            window.getDBRef("salas/" + window.salaAtual + "/caraCoroa/escolha").once("value", (snapEscolha) => {
                if (!snapEscolha.exists()) {
                    if (window.notificationManager)
                        window.notificationManager.showInternal("Aguarde escolha de Cara ou Coroa!");
                    moedaBtn.style.display = "none";
                    return;
                }
                moedaBtn.style.display = "block";
                moedaBtn.onclick = () => {
                    moedaBtn.onclick = null;
                    const moedaAnimada = document.getElementById("moeda-animada");
                    if (moedaAnimada) {
                        moedaAnimada.classList.remove("moeda-girando");
                        void moedaAnimada.offsetWidth;
                        moedaAnimada.classList.add("moeda-girando");
                    }
                    window.getDBRef("salas/" + window.salaAtual + "/caraCoroa/resultado").transaction((current) => {
                        if (current === null)
                            return Math.random() < 0.5 ? 0 : 1;
                        return;
                    });
                };
            });
        });
    },
    mostrarMoedaParaSorteioSincronizado: function (resultado, minhaEscolha) {
        this.garantirBotao();
        const moedaBtn = document.getElementById("moeda-btn");
        const moedaAnimada = document.getElementById("moeda-animada");
        const moedaFrente = document.getElementById("moeda-frente");
        const moedaVerso = document.getElementById("moeda-verso");
        const somMoeda = document.getElementById("som-moeda");
        if (!moedaAnimada || !moedaFrente || !moedaVerso || !somMoeda)
            return;
        // Dedup animation play? Legacy had `ultimoResultadoMoedaTocado` check but logic was complex.
        // Assuming simple replay is fine or we check simple state.
        void moedaAnimada.offsetWidth;
        moedaAnimada.classList.add("moeda-girando");
        if (somMoeda) {
            somMoeda.currentTime = 0;
            somMoeda.play().catch(() => { });
        }
        const duracaoAudio = (somMoeda.duration && !isNaN(somMoeda.duration)) ? somMoeda.duration : 2.0;
        const tempoFlip = duracaoAudio * 800;
        setTimeout(() => {
            if (resultado === 0) {
                moedaFrente.style.transform = "rotateY(0deg)";
                moedaVerso.style.transform = "rotateY(180deg)";
            }
            else {
                moedaFrente.style.transform = "rotateY(180deg)";
                moedaVerso.style.transform = "rotateY(0deg)";
            }
            moedaAnimada.classList.remove("moeda-girando");
            const vitoria = (resultado === 0 && minhaEscolha === "cara") || (resultado === 1 && minhaEscolha === "coroa");
            const msg = vitoria ? LocaleManager.t('game.coinFlip.youWon') : LocaleManager.t('game.coinFlip.botWon');
            this.mostrarNotificacaoMoeda(msg);
            setTimeout(() => {
                if (moedaBtn) {
                    moedaBtn.style.opacity = "0";
                    setTimeout(() => {
                        moedaBtn.style.display = "none";
                        moedaBtn.remove();
                    }, 300);
                }
                this.mostrarNotificacaoMoeda("");
                this.tentarDefinirVencedorMoeda(resultado);
            }, 2500);
        }, tempoFlip);
    },
    mostrarNotificacaoMoeda: function (msg) {
        let notif = document.getElementById("notificacao-moeda");
        if (!notif) {
            notif = document.createElement("div");
            notif.id = "notificacao-moeda";
            // ... minimal styles ...
            Object.assign(notif.style, {
                position: "absolute", left: "50%", top: "40%", transform: "translate(-50%, -50%)",
                background: "transparent url('assets/img/ui/notification_icon.png') no-repeat center center",
                backgroundSize: "100% 100%", // Restore to stretch full image
                width: "700px", // Wider
                height: "220px", // Taller
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Cinzel', serif",
                textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                padding: "45px 80px 40px 80px", // More top padding to clear scroll header
                textAlign: "center", fontSize: "1.3em", zIndex: "1001",
                color: "#e0d6b4",
                pointerEvents: "none",
                border: "none", boxShadow: "none"
            });
            document.body.appendChild(notif);
        }
        if (msg && msg.trim() !== "") {
            notif.innerHTML = msg;
            notif.style.display = "flex"; // Flex to center
        }
        else {
            notif.style.display = "none";
        }
    },
    tentarDefinirVencedorMoeda: function (resultado) {
        // Trigger Alignment Animation immediately for all users (Visual)
        // Note: This relies on local state update below or independent listener?
        // Ideally, we trigger this visual transition via a sync point.
        // For now, we call it here to ensure it happens.
        if (window.sincronizarPedraCentralEAlinhamento) {
            console.log("[CoinFlip] Triggering Alignment...");
            window.sincronizarPedraCentralEAlinhamento();
        }
        if (window.salaAtual === "MODO_TUTORIAL")
            return;
        window.getDBRef("salas/" + window.salaAtual + "/caraCoroa/escolha").once("value", (snapEscolha) => {
            var _a;
            const escolhaData = snapEscolha.val();
            let nomeGanhador = null;
            const jogadores = window.estadoJogo.jogadores || [];
            if (escolhaData && jogadores.length > 0) {
                if (resultado === 0 && escolhaData.escolha === "cara")
                    nomeGanhador = escolhaData.nome;
                else if (resultado === 1 && escolhaData.escolha === "coroa")
                    nomeGanhador = escolhaData.nome;
                else {
                    // O outro ganhou
                    nomeGanhador = (_a = jogadores.find((j) => j.nome !== escolhaData.nome)) === null || _a === void 0 ? void 0 : _a.nome;
                }
            }
            if (nomeGanhador) {
                const idx = jogadores.findIndex((j) => j.nome === nomeGanhador);
                if (idx !== -1) {
                    window.getDBRef("salas/" + window.salaAtual + "/estadoJogo").once("value", (snapEstado) => {
                        const estado = snapEstado.val() || {};
                        estado.vez = idx;
                        window.getDBRef("salas/" + window.salaAtual + "/estadoJogo").set(estado);
                    });
                }
            }
            window.getDBRef("salas/" + window.salaAtual + "/caraCoroa/sorteioFinalizado").set(true);
        });
    }
};
// Global expose for existing calls??
window.CoinFlip = CoinFlip;
