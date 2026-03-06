import React from 'react';
import { Interactable } from '../components/Interactable';

export const SecondFloor: React.FC = () => {
    return (
        <group>
            {/* ==================== FLOOR ==================== */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[25, 25]} />
                <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
            </mesh>

            {/* ==================== WALLS ==================== */}
            {/* Back wall */}
            <mesh position={[0, 2.5, -12.5]} receiveShadow>
                <boxGeometry args={[25, 5, 0.3]} />
                <meshStandardMaterial color="#2a1a0a" />
            </mesh>
            {/* Left wall */}
            <mesh position={[-12.5, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <boxGeometry args={[25, 5, 0.3]} />
                <meshStandardMaterial color="#2a1a0a" />
            </mesh>
            {/* Right wall */}
            <mesh position={[12.5, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <boxGeometry args={[25, 5, 0.3]} />
                <meshStandardMaterial color="#2a1a0a" />
            </mesh>
            {/* Front wall (with stairs opening) */}
            <mesh position={[-6, 2.5, 12.5]} receiveShadow>
                <boxGeometry args={[13, 5, 0.3]} />
                <meshStandardMaterial color="#2a1a0a" />
            </mesh>
            <mesh position={[6, 2.5, 12.5]} receiveShadow>
                <boxGeometry args={[13, 5, 0.3]} />
                <meshStandardMaterial color="#2a1a0a" />
            </mesh>

            {/* ==================== CEILING ==================== */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 5, 0]}>
                <planeGeometry args={[25, 25]} />
                <meshStandardMaterial color="#1a0a0a" />
            </mesh>

            {/* ==================== STAIRS DOWN (Return to Hub) ==================== */}
            <Interactable action={{ type: 'NAVIGATE', zoneId: 'hub' }}>
                <group position={[0, 0.3, 11]}>
                    {/* Stair steps going down */}
                    <mesh position={[0, 0, 0]} castShadow>
                        <boxGeometry args={[3, 0.3, 1.5]} />
                        <meshStandardMaterial color="#8B4513" emissive="#654321" emissiveIntensity={0.3} />
                    </mesh>
                    <mesh position={[0, -0.3, 1]} castShadow>
                        <boxGeometry args={[3, 0.3, 1.5]} />
                        <meshStandardMaterial color="#8B4513" emissive="#654321" emissiveIntensity={0.3} />
                    </mesh>
                    <mesh position={[0, -0.6, 2]} castShadow>
                        <boxGeometry args={[3, 0.3, 1.5]} />
                        <meshStandardMaterial color="#8B4513" emissive="#654321" emissiveIntensity={0.3} />
                    </mesh>
                    {/* Sign */}
                    <mesh position={[0, 1.5, -0.5]}>
                        <boxGeometry args={[2, 0.4, 0.1]} />
                        <meshBasicMaterial color="#FFD700" />
                    </mesh>
                </group>
            </Interactable>

            {/* ==================== BALCONY RAILING ==================== */}
            {/* Front railing (overlooking main floor) */}
            <mesh position={[0, 1, 10]} castShadow>
                <boxGeometry args={[20, 0.2, 0.3]} />
                <meshStandardMaterial color="#654321" />
            </mesh>
            {/* Railing posts */}
            <mesh position={[-8, 0.5, 10]} castShadow>
                <boxGeometry args={[0.2, 1, 0.2]} />
                <meshStandardMaterial color="#654321" />
            </mesh>
            <mesh position={[0, 0.5, 10]} castShadow>
                <boxGeometry args={[0.2, 1, 0.2]} />
                <meshStandardMaterial color="#654321" />
            </mesh>
            <mesh position={[8, 0.5, 10]} castShadow>
                <boxGeometry args={[0.2, 1, 0.2]} />
                <meshStandardMaterial color="#654321" />
            </mesh>

            {/* ==================== FURNITURE ==================== */}
            {/* Private tables */}
            <mesh position={[-8, 0.4, -8]} castShadow>
                <cylinderGeometry args={[1, 1, 0.8, 16]} />
                <meshStandardMaterial color="#8B4513" emissive="#654321" emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[8, 0.4, -8]} castShadow>
                <cylinderGeometry args={[1, 1, 0.8, 16]} />
                <meshStandardMaterial color="#8B4513" emissive="#654321" emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[0, 0.4, -8]} castShadow>
                <cylinderGeometry args={[1, 1, 0.8, 16]} />
                <meshStandardMaterial color="#8B4513" emissive="#654321" emissiveIntensity={0.3} />
            </mesh>

            {/* Bookshelf (left wall) */}
            <mesh position={[-11, 1.5, -5]} castShadow>
                <boxGeometry args={[2, 3, 1]} />
                <meshStandardMaterial color="#654321" />
            </mesh>

            {/* Decorative chest (right wall) */}
            <mesh position={[11, 0.5, -5]} castShadow>
                <boxGeometry args={[1.5, 1, 1]} />
                <meshStandardMaterial color="#8B7355" emissive="#654321" emissiveIntensity={0.2} />
            </mesh>

            {/* ==================== LIGHTING ==================== */}
            <ambientLight intensity={0.4} color="#2a1a2a" />
            <pointLight position={[0, 4, 0]} intensity={40} color="#FFD700" />
            <pointLight position={[-8, 3, -8]} intensity={25} color="#FFA500" />
            <pointLight position={[8, 3, -8]} intensity={25} color="#FFA500" />

            {/* Chandelier */}
            <mesh position={[0, 4.5, 0]} castShadow>
                <sphereGeometry args={[0.4, 16, 16]} />
                <meshBasicMaterial color="#FFD700" />
            </mesh>
        </group>
    );
};
