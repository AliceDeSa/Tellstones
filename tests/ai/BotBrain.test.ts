import { BotBrain } from '../../src/ai/BotBrain';

describe('BotBrain', () => {
    let bot: BotBrain;
    let mockState: any;

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
        (global as any).window = { estadoJogo: mockState };
    });

    test('should initialize with correct profile', () => {
        expect(bot.profile.name).toBe('Stratega');
    });

    test('decideMove should return a valid move structure', () => {
        // Setup state where place is possible
        mockState.mesa[3] = null;
        mockState.reserva = [{ nome: 'Coroa' }];

        const move = bot.decideMove(mockState);
        expect(move).toHaveProperty('type');
        console.log('Decided Move:', move.type);
    });
});
