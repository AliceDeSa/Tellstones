import React, { useState, useEffect } from 'react';
import { Interactable } from '../components/Interactable';

// Campaign opponent data
interface Opponent {
    id: number;
    name: string;
    difficulty: string;
    color: string;
    position: [number, number, number];
}

const OPPONENTS: Opponent[] = [
    { id: 1, name: 'Novato', difficulty: 'Fácil', color: '#90EE90', position: [-8, 0, -6] },
    { id: 2, name: 'Aprendiz', difficulty: 'Fácil', color: '#98FB98', position: [-4, 0, -6] },
    { id: 3, name: 'Veterano', difficulty: 'Médio', color: '#FFD700', position: [0, 0, -6] },
    { id: 4, name: 'Elite', difficulty: 'Médio', color: '#FFA500', position: [4, 0, -6] },
    { id: 5, name: 'Mestre', difficulty: 'Difícil', color: '#FF6347', position: [8, 0, -6] },
    { id: 6, name: 'Campeão', difficulty: 'Difícil', color: '#DC143C', position: [-6, 0, 2] },
    { id: 7, name: 'Lenda', difficulty: 'Muito Difícil', color: '#8B008B', position: [-2, 0, 2] },
    { id: 8, name: 'Grande Mestre', difficulty: 'Extremo', color: '#4B0082', position: [2, 0, 6] }, // Final boss - centered
];

export const VIPRoom: React.FC = () => {
    // TODO: Replace with actual save system integration
    const [defeatedOpponents, setDefeatedOpponents] = useState<number[]>([]);

    // Check if opponent is unlocked
    const isUnlocked = (opponentId: number): boolean => {
        if (opponentId === 8) {
            // Final boss unlocks only after defeating all 7 previous opponents
            return defeatedOpponents.length >= 7;
        }
        // All other opponents are unlocked from start
        return true;
    };

    // Check if opponent is defeated
    const isDefeated = (opponentId: number): boolean => {
        return defeatedOpponents.includes(opponentId);
    };

    const handleOpponentClick = (opponent: Opponent) => {
        if (!isUnlocked(opponent.id)) {
            console.log(`[VIP Room] Opponent ${opponent.name} is locked!`);
            return;
        }

        console.log(`[VIP Room] Starting battle with ${opponent.name}`);
        // TODO: Trigger campaign battle
        // EventBus.emit('START_CAMPAIGN_BATTLE', { opponentId: opponent.id });
    };

    return (
        <group>
            {/* ==================== FLOOR ==================== */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[25, 20]} />
                <meshStandardMaterial color="#2a1a1a" roughness={0.8} />
            </mesh>

            {/* ==================== WALLS ==================== */}
            {/* Back wall */}
            <mesh position={[0, 2.5, -10]} receiveShadow>
                <boxGeometry args={[25, 5, 0.3]} />
                <meshStandardMaterial color="#1a0a0a" />
            </mesh>
            {/* Left wall */}
            <mesh position={[-12.5, 2.5, -5]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <boxGeometry args={[10, 5, 0.3]} />
                <meshStandardMaterial color="#1a0a0a" />
            </mesh>
            {/* Right wall */}
            <mesh position={[12.5, 2.5, -5]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <boxGeometry args={[10, 5, 0.3]} />
                <meshStandardMaterial color="#1a0a0a" />
            </mesh>
            {/* Front wall (with exit) */}
            <mesh position={[-6, 2.5, 10]} receiveShadow>
                <boxGeometry args={[13, 5, 0.3]} />
                <meshStandardMaterial color="#1a0a0a" />
            </mesh>
            <mesh position={[6, 2.5, 10]} receiveShadow>
                <boxGeometry args={[13, 5, 0.3]} />
                <meshStandardMaterial color="#1a0a0a" />
            </mesh>

            {/* ==================== EXIT DOOR ==================== */}
            <Interactable action={{ type: 'NAVIGATE', zoneId: 'hub' }}>
                <group position={[0, 1.5, 9.5]}>
                    <mesh>
                        <boxGeometry args={[2, 3, 0.2]} />
                        <meshStandardMaterial color="#8B4513" emissive="#654321" emissiveIntensity={0.3} />
                    </mesh>
                    <mesh position={[0, 1.8, 0]}>
                        <boxGeometry args={[1.5, 0.3, 0.1]} />
                        <meshBasicMaterial color="#FFD700" />
                    </mesh>
                </group>
            </Interactable>

            {/* ==================== CAMPAIGN OPPONENTS ==================== */}
            {OPPONENTS.map((opponent) => {
                const unlocked = isUnlocked(opponent.id);
                const defeated = isDefeated(opponent.id);

                return (
                    <Interactable
                        key={opponent.id}
                        action={{ type: 'START_GAME', mode: 'campaign', data: { opponentId: opponent.id } }}
                    >
                        <group position={opponent.position}>
                            {/* Pedestal */}
                            <mesh position={[0, 0.3, 0]} castShadow>
                                <cylinderGeometry args={[0.8, 1, 0.6, 8]} />
                                <meshStandardMaterial
                                    color={unlocked ? opponent.color : '#333333'}
                                    emissive={unlocked ? opponent.color : '#111111'}
                                    emissiveIntensity={unlocked ? 0.4 : 0.1}
                                    opacity={unlocked ? 1 : 0.5}
                                    transparent={!unlocked}
                                />
                            </mesh>

                            {/* Opponent representation (sphere for now) */}
                            <mesh position={[0, 1.5, 0]} castShadow>
                                <sphereGeometry args={[0.5, 16, 16]} />
                                <meshStandardMaterial
                                    color={unlocked ? opponent.color : '#222222'}
                                    emissive={unlocked ? opponent.color : '#000000'}
                                    emissiveIntensity={unlocked ? 0.6 : 0}
                                    opacity={unlocked ? 1 : 0.3}
                                    transparent={!unlocked}
                                />
                            </mesh>

                            {/* Status indicator */}
                            {defeated && (
                                <mesh position={[0, 2.5, 0]}>
                                    <boxGeometry args={[0.3, 0.3, 0.3]} />
                                    <meshBasicMaterial color="#00FF00" />
                                </mesh>
                            )}

                            {!unlocked && opponent.id === 8 && (
                                <mesh position={[0, 2.5, 0]}>
                                    <boxGeometry args={[0.4, 0.4, 0.4]} />
                                    <meshBasicMaterial color="#FF0000" />
                                </mesh>
                            )}

                            {/* Name plate */}
                            <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                                <planeGeometry args={[1.5, 0.3]} />
                                <meshBasicMaterial
                                    color={unlocked ? '#F5DEB3' : '#333333'}
                                    opacity={unlocked ? 1 : 0.5}
                                    transparent={!unlocked}
                                />
                            </mesh>
                        </group>
                    </Interactable>
                );
            })}

            {/* ==================== FINAL BOSS SPOTLIGHT ==================== */}
            {isUnlocked(8) && (
                <pointLight
                    position={[2, 5, 6]}
                    intensity={80}
                    color="#9370DB"
                    distance={10}
                    decay={2}
                />
            )}

            {/* ==================== AMBIENT LIGHTING ==================== */}
            <ambientLight intensity={0.3} color="#2a1a2a" />
            <pointLight position={[0, 4, -5]} intensity={30} color="#FFD700" />
            <pointLight position={[-8, 3, 0]} intensity={20} color="#8B4789" />
            <pointLight position={[8, 3, 0]} intensity={20} color="#8B4789" />

            {/* Chandeliers */}
            <mesh position={[0, 4.5, -3]} castShadow>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshBasicMaterial color="#FFD700" />
            </mesh>
            <mesh position={[0, 4.5, 3]} castShadow>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshBasicMaterial color="#FFD700" />
            </mesh>
        </group>
    );
};
