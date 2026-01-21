const { BotBrain, PROFILES } = require('../../src/ai/BotBrain');

describe('BotBrain', () => {
    let bot;
    let mockState;

    beforeEach(() => {
        bot = new BotBrain('logical');
        // Initialize mock state
        mockState = {
            vez: 1, // Bot turn
            jogadores: [{ id: 'p1', pontos: 0 }, { id: 'p2', pontos: 0 }],
            mesa: Array(7).fill(null),
            reserva: [{ nome: 'Coroa' }, { nome: 'Espada' }]
        };
        // Mock global window if needed by some methods (though we try to avoid it)
        global.window = { estadoJogo: mockState };
    });

    test('should initialize with correct profile', () => {
        expect(bot.profile.name).toBe('Lógico');
        expect(bot.config.confidenceToPeek).toBeDefined();
    });

    test('observe should update memory when stone is revealed', () => {
        const action = { tipo: 'revelar', origem: 3, pedra: { nome: 'Coroa' } };
        bot.observe(action, mockState);

        const memory = bot.memory[3];
        expect(memory).toBeDefined();
        expect(memory.stoneName).toBe('Coroa');
        expect(memory.confidence).toBe(1.0);
    });

    test('decideMove should return a valid move structure', () => {
        // Setup state where place is possible
        mockState.reserva = [{ nome: 'Coroa' }];
        mockState.mesa[3] = null;

        const move = bot.decideMove(mockState);
        expect(move).toHaveProperty('type');
        console.log('Decided Move:', move.type);
    });

    test('decayMemory should reduce confidence over time', () => {
        // Plant a memory
        bot.updateMemory(0, 'Coroa', 1.0);

        // Mock time passing by modifying lastSeen? 
        // decayMemory uses Date.now(). Implementation is simple multiplication.
        bot.decayMemory();

        expect(bot.memory[0].confidence).toBeLessThan(1.0);
    });

    test('Bot should consider boasting if confident', () => {
        // Manually fill memory to high confidence
        for (let i = 0; i < 3; i++) {
            mockState.mesa[i] = { nome: 'Stone' + i, virada: true };
            bot.updateMemory(i, 'Stone' + i, 1.0);
        }

        // Force high boast weight for test or check if logic triggers
        // The logic 'decideMove' uses random weights, so strictly testing 'will boast' is hard without mocking Math.random
        // But we can check calculateAverageHiddenConfidence
        const avg = bot.calculateAverageHiddenConfidence(mockState);
        expect(avg).toBe(1.0);
    });
});
