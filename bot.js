class TellstonesBot {
    constructor(name) {
        this.name = name;
        this.memory = {}; // Simula memória das pedras
    }

    fazerJogada(estado) {
        const mesa = estado.mesa;
        const reserva = estado.reserva;
        const vez = estado.vez;
        const botIdx = estado.jogadores.findIndex(j => j.nome === this.name);

        if (vez !== botIdx % 2) return null;

        // Lógica específica para o Tutorial
        if (window.salaAtual === "MODO_TUTORIAL" && window.tellstonesTutorial) {
            const tutorial = window.tellstonesTutorial;
            if (tutorial.passo === 4) {
                // Forçar um desafio em uma pedra virada para baixo
                const viradas = mesa.map((p, i) => p && p.virada ? i : null).filter(i => i !== null);
                if (viradas.length > 0) return { tipo: 'desafiar', idx: viradas[0] };
            }
            if (tutorial.passo === 6) {
                return { tipo: 'segabar' };
            }
        }

        // 1. Prioridade: Se gabar se souber todas (com chance de blefe ou erro)
        if (this._deveSeGabar(mesa)) {
            return { tipo: 'segabar' };
        }

        // 2. Prioridade: Desafiar se oponente errou
        const desafio = this._decidirDesafio(mesa);
        if (desafio) return desafio;

        // 3. Ação normal
        if (reserva && reserva.length > 0 && estado.centralAlinhada) {
            // Colocar pedra
            const slotsValidos = this._getSlotsValidos(mesa);
            const slot = slotsValidos[Math.floor(Math.random() * slotsValidos.length)];
            return { tipo: 'colocar', slot: slot, pedraIdx: 0 };
        }

        // 4. Esconder, Mover ou Espiar
        const acoes = ['esconder', 'mover', 'espiar'];
        const acao = acoes[Math.floor(Math.random() * acoes.length)];

        if (acao === 'esconder') {
            const abertas = mesa.map((p, i) => p && !p.virada ? i : null).filter(i => i !== null);
            if (abertas.length > 0) {
                return { tipo: 'esconder', idx: abertas[Math.floor(Math.random() * abertas.length)] };
            }
        }

        if (acao === 'espiar') {
            const viradas = mesa.map((p, i) => p && p.virada ? i : null).filter(i => i !== null);
            if (viradas.length > 0) {
                return { tipo: 'espiar', idx: viradas[Math.floor(Math.random() * viradas.length)] };
            }
        }

        return { tipo: 'mover' }; // Fallback
    }

    _getSlotsValidos(mesa) {
        const ocupados = mesa.map(p => p !== null);
        if (!ocupados.includes(true)) return [3];
        let slots = [];
        for (let i = 0; i < 7; i++) {
            if (!ocupados[i] && ((i > 0 && ocupados[i - 1]) || (i < 6 && ocupados[i + 1]))) {
                slots.push(i);
            }
        }
        return slots;
    }

    _deveSeGabar(mesa) {
        const viradas = mesa.filter(p => p && p.virada).length;
        return viradas >= 3 && Math.random() < 0.3; // Simplificado
    }

    _decidirDesafio(mesa) {
        const viradas = mesa.map((p, i) => p && p.virada ? i : null).filter(i => i !== null);
        if (viradas.length > 0 && Math.random() < 0.2) {
            return { tipo: 'desafiar', idx: viradas[0] };
        }
        return null;
    }

    responderDesafio(estado) {
        const desafio = estado.desafio;
        if (!desafio) return null;

        if (desafio.tipo === 'normal') {
            // Desafio normal: Bot tem que adivinhar a pedra desafiada
            // No Tutorial, errar propositalmente em Tellstones é uma boa forma de ensinar (dar ponto ao jogador)
            if (window.salaAtual === "MODO_TUTORIAL") {
                const pedraReal = estado.mesa[desafio.idxPedra];
                const pedrasOficiais = ["Coroa", "Espada", "Balança", "Cavalo", "Escudo", "Bandeira", "Martelo"];
                const idxReal = pedrasOficiais.indexOf(pedraReal.nome);

                // Chutar próximo item da lista (errado)
                let idxChute = (idxReal + 1) % 7;
                return { tipo: 'responder_desafio', idx: idxChute };
            }

            // Lógica normal
            const pedraReal = estado.mesa[desafio.idxPedra];
            const pedrasOficiais = ["Coroa", "Espada", "Balança", "Cavalo", "Escudo", "Bandeira", "Martelo"];
            if (pedraReal) {
                const idx = pedrasOficiais.indexOf(pedraReal.nome);
                return { tipo: 'responder_desafio', idx: idx >= 0 ? idx : 0 };
            }
            return { tipo: 'responder_desafio', idx: 0 };
        }

        if (desafio.tipo === 'segabar') {
            // No tutorial, acreditar para simplificar
            return { tipo: 'acreditar' };
        }

        return null;
    }
}
