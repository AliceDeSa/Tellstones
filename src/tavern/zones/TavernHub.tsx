import React from 'react';
import { Interactable } from '../components/Interactable';

export const TavernHub: React.FC = () => {
    return (
        <group>
            {/* ==================== FLOOR ==================== */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[30, 30]} />
                <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
            </mesh>

            {/* ==================== OUTER WALLS ONLY ==================== */}
            {/* Back wall (Entrance side) */}
            <mesh position={[0, 2.5, 15]} receiveShadow>
                <boxGeometry args={[30, 5, 0.3]} />
                <meshStandardMaterial color="#3a2a1a" />
            </mesh>
            {/* Left wall */}
            <mesh position={[-15, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <boxGeometry args={[30, 5, 0.3]} />
                <meshStandardMaterial color="#3a2a1a" />
            </mesh>
            {/* Right wall */}
            <mesh position={[15, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <boxGeometry args={[30, 5, 0.3]} />
                <meshStandardMaterial color="#3a2a1a" />
            </mesh>
            {/* Front wall (Game Room side) */}
            <mesh position={[0, 2.5, -15]} receiveShadow>
                <boxGeometry args={[30, 5, 0.3]} />
                <meshStandardMaterial color="#3a2a1a" />
            </mesh>

            {/* ==================== FRENTE: SALA DE JOGOS (3 Tables) ==================== */}
            {/* Tutorial Table (Left) */}
            <Interactable action={{ type: 'START_GAME', mode: 'tutorial' }}>
                <group position={[-6, 0, -12]}>
                    <mesh position={[0, 0.75, 0]} castShadow>
                        <boxGeometry args={[2.5, 0.1, 3.5]} />
                        <meshStandardMaterial color="#CD853F" emissive="#8B4513" emissiveIntensity={0.5} />
                    </mesh>
                    <mesh position={[0, 1.8, 0]}>
                        <boxGeometry args={[2, 0.4, 0.1]} />
                        <meshBasicMaterial color="#32CD32" />
                    </mesh>
                </group>
            </Interactable>

            {/* PvE Table (Center) */}
            <Interactable action={{ type: 'NAVIGATE', zoneId: 'gameplay' }}>
                <group position={[0, 0, -12]}>
                    <mesh position={[0, 0.75, 0]} castShadow>
                        <boxGeometry args={[2.5, 0.1, 3.5]} />
                        <meshStandardMaterial color="#CD853F" emissive="#8B4513" emissiveIntensity={0.5} />
                    </mesh>
                    <mesh position={[0, 1.8, 0]}>
                        <boxGeometry args={[2, 0.4, 0.1]} />
                        <meshBasicMaterial color="#ffaa00" />
                    </mesh>
                </group>
            </Interactable>

            {/* Online Table (Right) */}
            <Interactable action={{ type: 'START_GAME', mode: 'online' }}>
                <group position={[6, 0, -12]}>
                    <mesh position={[0, 0.75, 0]} castShadow>
                        <boxGeometry args={[2.5, 0.1, 3.5]} />
                        <meshStandardMaterial color="#CD853F" emissive="#8B4513" emissiveIntensity={0.5} />
                    </mesh>
                    <mesh position={[0, 1.8, 0]}>
                        <boxGeometry args={[2, 0.4, 0.1]} />
                        <meshBasicMaterial color="#00aaff" />
                    </mesh>
                </group>
            </Interactable>

            {/* ==================== DIREITA: BALCÃO DO TABERNEIRO ==================== */}
            <Interactable action={{ type: 'OPEN_UI', panelId: 'shop' }}>
                <group position={[13, 0, 0]}>
                    {/* Counter */}
                    <mesh position={[0, 1, 0]} castShadow>
                        <boxGeometry args={[1.5, 2, 10]} />
                        <meshStandardMaterial color="#8B4513" emissive="#654321" emissiveIntensity={0.3} />
                    </mesh>
                    {/* Sign */}
                    <mesh position={[0, 2.5, 0]}>
                        <boxGeometry args={[1.2, 0.4, 0.1]} />
                        <meshBasicMaterial color="#FFD700" />
                    </mesh>
                </group>
            </Interactable>

            {/* Shopkeeper NPC */}
            <mesh position={[13.5, 1.5, 0]} castShadow>
                <capsuleGeometry args={[0.4, 1.2, 8, 16]} />
                <meshStandardMaterial color="#D2691E" emissive="#8B4513" emissiveIntensity={0.5} />
            </mesh>

            {/* ==================== ESQUERDA FRENTE: PORTA SALA VIP ==================== */}
            <Interactable action={{ type: 'NAVIGATE', zoneId: 'vip-room' }}>
                <group position={[-12, 0, -8]}>
                    {/* Door frame */}
                    <mesh position={[0, 1.5, 0]} castShadow>
                        <boxGeometry args={[0.3, 3, 2]} />
                        <meshStandardMaterial color="#FFD700" emissive="#DAA520" emissiveIntensity={0.6} />
                    </mesh>
                    {/* Sign above door */}
                    <mesh position={[0, 3.2, 0]}>
                        <boxGeometry args={[0.1, 0.4, 1.5]} />
                        <meshBasicMaterial color="#FFD700" />
                    </mesh>
                </group>
            </Interactable>

            {/* ==================== ESQUERDA TRÁS: ESCADA 2º ANDAR ==================== */}
            <Interactable action={{ type: 'NAVIGATE', zoneId: 'second-floor' }}>
                <group position={[-12, 0.3, 10]}>
                    {/* Stair steps */}
                    <mesh position={[0, 0, 0]} castShadow>
                        <boxGeometry args={[2, 0.3, 1.5]} />
                        <meshStandardMaterial color="#228B22" emissive="#006400" emissiveIntensity={0.4} />
                    </mesh>
                    <mesh position={[0, 0.3, -1]} castShadow>
                        <boxGeometry args={[2, 0.3, 1.5]} />
                        <meshStandardMaterial color="#228B22" emissive="#006400" emissiveIntensity={0.4} />
                    </mesh>
                    <mesh position={[0, 0.6, -2]} castShadow>
                        <boxGeometry args={[2, 0.3, 1.5]} />
                        <meshStandardMaterial color="#228B22" emissive="#006400" emissiveIntensity={0.4} />
                    </mesh>
                </group>
            </Interactable>

            {/* ==================== ATRÁS: ENTRADA + QUADRO DE COMUNICADOS ==================== */}
            {/* Entrance door area */}
            <mesh position={[0, 0.1, 14]} receiveShadow>
                <boxGeometry args={[3, 0.2, 1.5]} />
                <meshStandardMaterial color="#2F4F4F" emissive="#1C1C1C" emissiveIntensity={0.2} />
            </mesh>

            {/* Notice Board (Right side of entrance) */}
            <Interactable action={{ type: 'OPEN_UI', panelId: 'notices' }}>
                <group position={[5, 1.5, 13.5]}>
                    <mesh rotation={[0, Math.PI, 0]}>
                        <boxGeometry args={[2, 2.5, 0.1]} />
                        <meshStandardMaterial color="#8B4513" />
                    </mesh>
                    <mesh position={[0, 0, -0.06]} rotation={[0, Math.PI, 0]}>
                        <planeGeometry args={[1.8, 2.3]} />
                        <meshBasicMaterial color="#F5DEB3" />
                    </mesh>
                </group>
            </Interactable>

            {/* ==================== CENTRO: LAREIRA E DECORAÇÃO ==================== */}
            {/* Central Fireplace */}
            <mesh position={[0, 0.6, 0]} castShadow>
                <boxGeometry args={[2, 1.2, 1.5]} />
                <meshStandardMaterial color="#FF4500" emissive="#FF6347" emissiveIntensity={1.5} />
            </mesh>

            {/* Ambient tables */}
            <mesh position={[-4, 0.4, 5]} castShadow>
                <cylinderGeometry args={[0.8, 0.8, 0.8, 16]} />
                <meshStandardMaterial color="#8B4513" emissive="#654321" emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[4, 0.4, 5]} castShadow>
                <cylinderGeometry args={[0.8, 0.8, 0.8, 16]} />
                <meshStandardMaterial color="#8B4513" emissive="#654321" emissiveIntensity={0.3} />
            </mesh>

            {/* ==================== EXTRAS ==================== */}
            {/* Leaderboard (Right wall) */}
            <Interactable action={{ type: 'OPEN_UI', panelId: 'leaderboard' }}>
                <group position={[13.5, 2, -8]}>
                    <mesh rotation={[0, -Math.PI / 2, 0]}>
                        <boxGeometry args={[2.5, 3, 0.1]} />
                        <meshStandardMaterial color="#DAA520" emissive="#B8860B" emissiveIntensity={0.5} />
                    </mesh>
                </group>
            </Interactable>

            {/* Musician NPC (Front left corner) */}
            <mesh position={[-10, 1, -12]} castShadow>
                <capsuleGeometry args={[0.4, 1, 8, 16]} />
                <meshStandardMaterial color="#87CEEB" emissive="#4682B4" emissiveIntensity={0.5} />
            </mesh>

            {/* Chandeliers */}
            <mesh position={[0, 4.5, -8]} castShadow>
                <sphereGeometry args={[0.4, 16, 16]} />
                <meshBasicMaterial color="#FFD700" />
            </mesh>
            <mesh position={[0, 4.5, 8]} castShadow>
                <sphereGeometry args={[0.4, 16, 16]} />
                <meshBasicMaterial color="#FFD700" />
            </mesh>
        </group>
    );
};
