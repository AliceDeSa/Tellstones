const GameRules = require('../../src/core/GameRules');

describe('GameRules', () => {

    test('createInitialState should initialize valid game state', () => {
        const players = [{ nome: 'Alice' }, { nome: 'Bob' }];
        const stones = [{ nome: 'A' }, { nome: 'B' }, { nome: 'C' }];

        const state = GameRules.createInitialState(players, stones);

        expect(state.jogadores).toHaveLength(2);
        expect(state.vez).toBe(1); // Starts with P2 (Index 1) as per rules logic (usually P2 starts or random)
        expect(state.mesa).toHaveLength(7);
        expect(state.pedraCentral).toBeDefined();
        expect(state.pedraCentral.virada).toBe(false);
    });

    test('calcularSlotsValidos should return only center slot (3) when table is empty', () => {
        const emptyTable = Array(7).fill(null);
        const slots = GameRules.calcularSlotsValidos(emptyTable);
        // Assuming rules: If empty, only center (3) is valid.
        // Need to verify exact logic in implementation.
        // Based on viewed file: 
        // if (mesa.filter((p) => p && p.nome && p.url).length === 0) return [3];
        expect(slots).toEqual([3]);
    });

    test('calcularSlotsValidos should return adjacent slots', () => {
        const table = Array(7).fill(null);
        // Place stone at center (3)
        table[3] = { nome: 'Stone', url: 'img.png' };

        const slots = GameRules.calcularSlotsValidos(table);
        // Valid should be 2 and 4 (left and right of 3)
        expect(slots).toContain(2);
        expect(slots).toContain(4);
        expect(slots).not.toContain(3); // Occupied
        expect(slots.length).toBe(2);
    });

});
