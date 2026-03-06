import React from 'react';
import { Interactable } from '../components/Interactable';

export const ExternalArea: React.FC = () => {
    return (
        <group>
            {/* ==================== GROUND (Outdoor) ==================== */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[40, 40]} />
                <meshStandardMaterial color="#3a5a3a" roughness={0.95} /> {/* Grass-like */}
            </mesh>

            {/* ==================== TAVERN EXTERIOR WALL ==================== */}
            {/* Back wall (tavern entrance) */}
            <mesh position={[0, 2.5, -20]} receiveShadow>
                <boxGeometry args={[15, 5, 0.5]} />
                <meshStandardMaterial color="#4a3a2a" />
            </mesh>

            {/* ==================== ENTRANCE DOOR (Return to Hub) ==================== */}
            <Interactable action={{ type: 'NAVIGATE', zoneId: 'hub' }}>
                <group position={[0, 1.5, -19.5]}>
                    <mesh>
                        <boxGeometry args={[2.5, 3, 0.3]} />
                        <meshStandardMaterial color="#654321" emissive="#8B4513" emissiveIntensity={0.3} />
                    </mesh>
                    {/* Sign above door */}
                    <mesh position={[0, 2, 0]}>
                        <boxGeometry args={[3, 0.5, 0.1]} />
                        <meshBasicMaterial color="#FFD700" />
                    </mesh>
                </group>
            </Interactable>

            {/* ==================== OUTDOOR ELEMENTS ==================== */}
            {/* Trees */}
            <group position={[-15, 0, -10]}>
                {/* Trunk */}
                <mesh position={[0, 1.5, 0]} castShadow>
                    <cylinderGeometry args={[0.5, 0.6, 3, 8]} />
                    <meshStandardMaterial color="#654321" />
                </mesh>
                {/* Foliage */}
                <mesh position={[0, 3.5, 0]} castShadow>
                    <sphereGeometry args={[2, 8, 8]} />
                    <meshStandardMaterial color="#2d5016" />
                </mesh>
            </group>

            <group position={[15, 0, -10]}>
                {/* Trunk */}
                <mesh position={[0, 1.5, 0]} castShadow>
                    <cylinderGeometry args={[0.5, 0.6, 3, 8]} />
                    <meshStandardMaterial color="#654321" />
                </mesh>
                {/* Foliage */}
                <mesh position={[0, 3.5, 0]} castShadow>
                    <sphereGeometry args={[2, 8, 8]} />
                    <meshStandardMaterial color="#2d5016" />
                </mesh>
            </group>

            <group position={[-12, 0, 10]}>
                {/* Trunk */}
                <mesh position={[0, 1.5, 0]} castShadow>
                    <cylinderGeometry args={[0.5, 0.6, 3, 8]} />
                    <meshStandardMaterial color="#654321" />
                </mesh>
                {/* Foliage */}
                <mesh position={[0, 3.5, 0]} castShadow>
                    <sphereGeometry args={[2, 8, 8]} />
                    <meshStandardMaterial color="#2d5016" />
                </mesh>
            </group>

            {/* Fence posts */}
            <mesh position={[-18, 0.8, 0]} castShadow>
                <boxGeometry args={[0.3, 1.6, 30]} />
                <meshStandardMaterial color="#654321" />
            </mesh>
            <mesh position={[18, 0.8, 0]} castShadow>
                <boxGeometry args={[0.3, 1.6, 30]} />
                <meshStandardMaterial color="#654321" />
            </mesh>

            {/* Barrels (decorative) */}
            <mesh position={[-5, 0.5, -18]} castShadow>
                <cylinderGeometry args={[0.6, 0.6, 1, 16]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>
            <mesh position={[5, 0.5, -18]} castShadow>
                <cylinderGeometry args={[0.6, 0.6, 1, 16]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>

            {/* Crates */}
            <mesh position={[-7, 0.5, -17]} castShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#A0826D" />
            </mesh>
            <mesh position={[7, 0.5, -17]} castShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#A0826D" />
            </mesh>

            {/* Campfire area */}
            <group position={[0, 0, 10]}>
                {/* Fire pit */}
                <mesh position={[0, 0.3, 0]} castShadow>
                    <cylinderGeometry args={[1.5, 1.5, 0.6, 16]} />
                    <meshStandardMaterial color="#2a2a2a" />
                </mesh>
                {/* Fire */}
                <mesh position={[0, 0.8, 0]}>
                    <coneGeometry args={[0.5, 1, 8]} />
                    <meshBasicMaterial color="#FF4500" />
                </mesh>
                {/* Logs around fire */}
                <mesh position={[-2, 0.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.3, 0.3, 1.5, 8]} />
                    <meshStandardMaterial color="#654321" />
                </mesh>
                <mesh position={[2, 0.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.3, 0.3, 1.5, 8]} />
                    <meshStandardMaterial color="#654321" />
                </mesh>
            </group>

            {/* ==================== LIGHTING (Outdoor/Night) ==================== */}
            <ambientLight intensity={0.3} color="#1a1a3a" />
            {/* Moonlight */}
            <directionalLight
                position={[10, 15, 5]}
                intensity={1.5}
                color="#aaccff"
                castShadow
            />
            {/* Campfire light */}
            <pointLight position={[0, 1, 10]} intensity={60} color="#FF6347" distance={15} />
            {/* Tavern door light */}
            <pointLight position={[0, 3, -19]} intensity={30} color="#FFD700" />
        </group>
    );
};
