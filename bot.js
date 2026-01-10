class TellstonesBot {
    constructor(nome = "Bot", nivel = "medio") {
        this.nome = nome;
        this.nivel = nivel;
        // Memória: Array de 7 posições (índices da mesa)
        // Cada slot: { nome: "Espada", confianca: 1.0 } ou null
        this.memoria = Array(7).fill(null);
        this.turnosSemVer = Array(7).fill(0);

        // Configurações de decaimento por nível
        this.config = {
            facil: { decaimento: 0.15, erroTroca: 0.8 },
            medio: { decaimento: 0.05, erroTroca: 0.4 },
            dificil: { decaimento: 0.01, erroTroca: 0.1 }
        }[nivel] || { decaimento: 0.05, erroTroca: 0.4 };
    }

    // Chamado a cada ação do jogo para atualizar a memória do bot
    observarAcao(acao, estadoJogo) {
        // Aplica decaimento natural em tudo
        this._aplicarDecaimento();

        const mesa = estadoJogo.mesa || [];

        if (acao.tipo === "colocar") {
            // Viu a pedra sendo colocada (assume-se que entra virada para cima ou bot viu)
            // Em Tellstones, coloca-se virada para cima (virada=false)
            const pedra = mesa[acao.slot];
            if (pedra) {
                this.memoria[acao.slot] = { nome: pedra.nome, confianca: 1.0 };
                this.turnosSemVer[acao.slot] = 0;
            }
        } else if (acao.tipo === "virar") {
            // Pedra foi virada. Se estava visível, bot reforça memória.
            // Se estava invisível e foi revelada, bot vê.
            // Se foi escondida, bot lembra do que era.
            if (this.memoria[acao.idx]) {
                this.memoria[acao.idx].confianca = 1.0; // Reforça ao interagir
            }
        } else if (acao.tipo === "trocar") {
            // Troca de posição confunde o bot (simula perda de rastreio)
            const idxA = acao.origem;
            const idxB = acao.destino;

            const memA = this.memoria[idxA];
            const memB = this.memoria[idxB];

            // Troca na memória
            this.memoria[idxA] = memB;
            this.memoria[idxB] = memA;

            // Penalidade de confusão na troca
            if (this.memoria[idxA]) this.memoria[idxA].confianca *= (1 - this.config.erroTroca);
            if (this.memoria[idxB]) this.memoria[idxB].confianca *= (1 - this.config.erroTroca);
        } else if (acao.tipo === "espiar") {
            // Se o BOT espiou, confiança vai a 100%
            if (acao.autor === this.nome) {
                const pedraReal = mesa[acao.idx];
                if (pedraReal) {
                    this.memoria[acao.idx] = { nome: pedraReal.nome, confianca: 1.0 };
                }
            } else {
                // Se o OPONENTE espiou, bot não vê nada (informação privada), 
                // mas sabe que o oponente sabe (pode ser usado em lógica avançada de blefe)
            }
        } else if (acao.tipo === "revelar" || acao.tipo === "desafiar") {
            // Se algo foi revelado publicamente
            if (acao.idx !== undefined && mesa[acao.idx]) {
                this.memoria[acao.idx] = { nome: mesa[acao.idx].nome, confianca: 1.0 };
            }
        }
    }

    _aplicarDecaimento() {
        for (let i = 0; i < 7; i++) {
            if (this.memoria[i]) {
                this.memoria[i].confianca -= this.config.decaimento;
                if (this.memoria[i].confianca < 0) this.memoria[i].confianca = 0;

                // Pequena chance de esquecer totalmente se confiança for muito baixa
                if (this.memoria[i].confianca < 0.2 && Math.random() < 0.1) {
                    this.memoria[i] = null;
                }
            }
        }
    }

    // Decide a próxima jogada baseado no estado atual
    async decidirAcao(estadoJogo) {
        // Simula tempo de pensamento
        await new Promise(r => setTimeout(r, 1500));

        const mesa = estadoJogo.mesa;
        const reserva = estadoJogo.reserva;

        // 1. TENTATIVA DE VITÓRIA (Desafiar)
        // Se o bot tem certeza de uma pedra escondida do oponente (virada), desafia.
        // Regra: Pode desafiar qualquer pedra virada.
        const pedrasViradas = mesa.map((p, i) => ({ p, i })).filter(item => item.p && item.p.virada);

        // Filtra quais dessas o bot lembra com alta confiança (> 0.8)
        const alvosConfiantes = pedrasViradas.filter(item => {
            const mem = this.memoria[item.i];
            return mem && mem.confianca > 0.85;
        });

        if (alvosConfiantes.length > 0) {
            // Desafia uma pedra que ele sabe qual é
            const alvo = alvosConfiantes[Math.floor(Math.random() * alvosConfiantes.length)];
            return { tipo: "desafiar", idx: alvo.i };
        }

        // 2. JOGAR PEDRA (Se houver e mesa estiver alinhada)
        // Bot prefere colocar pedras para encher a mesa
        if (reserva.length > 0 && estadoJogo.centralAlinhada) {
            // Acha slots vazios validos (ao lado de existentes ou centro)
            const slots = this._getSlotsValidos(mesa);
            if (slots.length > 0) {
                const slot = slots[Math.floor(Math.random() * slots.length)];
                return { tipo: "colocar", slot: slot, pedraIdx: 0 };
            }
        }

        // 3. AÇÕES DE MEMÓRIA (Virar, Trocar, Espiar)
        const acoesPossiveis = [];

        // Virar (Esconder) - Se tem pedra visível
        const visiveis = mesa.map((p, i) => ({ p, i })).filter(item => item.p && !item.p.virada);
        if (visiveis.length > 0) acoesPossiveis.push("virar");

        // Espiar - Se tem pedra virada que o bot esqueceu (confiança baixa)
        const esquecidas = pedrasViradas.filter(item => {
            const mem = this.memoria[item.i];
            return !mem || mem.confianca < 0.4;
        });
        if (esquecidas.length > 0 && estadoJogo.pontos > 0) { // Custa 1 ponto? (Regra oficial) - Simplificado aqui
            acoesPossiveis.push("espiar");
        }

        // Trocar - Se tem pelo menos 2 pedras na mesa
        const pedrasMesa = mesa.map((p, i) => i).filter(i => mesa[i]);
        if (pedrasMesa.length >= 2) acoesPossiveis.push("trocar");

        // Escolha ponderada
        if (acoesPossiveis.length === 0) return { tipo: "passar" }; // Não deve acontecer

        const escolha = acoesPossiveis[Math.floor(Math.random() * acoesPossiveis.length)];

        if (escolha === "virar") {
            const alvo = visiveis[Math.floor(Math.random() * visiveis.length)];
            return { tipo: "esconder", idx: alvo.i };
        }

        if (escolha === "espiar") {
            // Espia a que ele tem menos certeza
            const alvo = esquecidas[Math.floor(Math.random() * esquecidas.length)];
            return { tipo: "espiar", idx: alvo.i };
        }

        if (escolha === "trocar") {
            // Troca duas aleatórias
            const a = pedrasMesa[Math.floor(Math.random() * pedrasMesa.length)];
            let b = pedrasMesa[Math.floor(Math.random() * pedrasMesa.length)];
            while (a === b) {
                b = pedrasMesa[Math.floor(Math.random() * pedrasMesa.length)];
            }
            return { tipo: "trocar", origem: a, destino: b };
        }

        return { tipo: "passar" };
    }

    // Resposta a um desafio
    async responderDesafio(estadoJogo, desafio) {
        await new Promise(r => setTimeout(r, 1000));

        if (desafio.tipo === 'segabar') {
            // Se Gabar: Oponente diz que sabe tudo. 
            // Bot duvida se achar que o oponente está blefando OU se o bot souber alguma pedra que o oponente errou (avançado)
            // Lógica simples: Duvida 40% das vezes
            return Math.random() < 0.4 ? { tipo: "duvidar" } : { tipo: "acreditar" };
        }

        // Desafio Normal: "Qual é esta pedra?"
        const idx = desafio.idxPedra;
        const memoria = this.memoria[idx];
        const pedrasOficiais = ["Coroa", "Espada", "Balança", "Cavalo", "Escudo", "Bandeira", "Martelo"];

        if (memoria && memoria.confianca > 0.3) {
            // Tenta responder com o que lembra
            const idxResposta = pedrasOficiais.indexOf(memoria.nome);
            if (idxResposta !== -1) return { tipo: "responder_desafio", idx: idxResposta };
        }

        // Se não lembra, chuta aleatório (mas tenta não repetir as visíveis)
        // (Simplificado: aleatório total)
        const chute = Math.floor(Math.random() * 7);
        return { tipo: "responder_desafio", idx: chute };
    }

    // Auxiliares
    _getSlotsValidos(mesa) {
        const ocupados = mesa.map(p => p !== null);
        if (!ocupados.includes(true)) return [3]; // Começa no meio
        let slots = [];
        for (let i = 0; i < 7; i++) {
            // Vazio E vizinho de ocupado
            if (!ocupados[i] && ((i > 0 && ocupados[i - 1]) || (i < 6 && ocupados[i + 1]))) {
                slots.push(i);
            }
        }
        return slots;
    }
}

// Exporta para uso global (simples)
window.TellstonesBot = TellstonesBot;
