import React, { useState, useRef, ReactNode } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '../SceneManager';

export interface InteractableProps {
    children: ReactNode;
    action?: InteractAction;
    onHover?: () => void;
    onUnhover?: () => void;
    onClick?: () => void;
    outlineColor?: string;
    cursorStyle?: 'pointer' | 'grab';
}

export type InteractAction =
    | { type: 'NAVIGATE'; zoneId: string }
    | { type: 'START_GAME'; mode: string }
    | { type: 'OPEN_UI'; panel: string }
    | { type: 'CUSTOM'; handler: () => void };

export const Interactable: React.FC<InteractableProps> = ({
    children,
    action,
    onHover,
    onUnhover,
    onClick,
    outlineColor = '#ffd700',
    cursorStyle = 'pointer',
}) => {
    const [hovered, setHovered] = useState(false);
    const { transitionTo } = useScene();
    const meshRef = useRef<THREE.Mesh>(null);

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = cursorStyle;

        if (onHover) onHover();
    };

    const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'auto';

        if (onUnhover) onUnhover();
    };

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();

        // Execute action if defined
        if (action) {
            switch (action.type) {
                case 'NAVIGATE':
                    console.log(`[Interactable] Navigate to: ${action.zoneId}`);
                    transitionTo(action.zoneId as any);
                    break;
                case 'START_GAME':
                    console.log(`[Interactable] Start game mode: ${action.mode}`);
                    // Bridge to existing game logic
                    if ((window as any).TutorialMode && action.mode === 'tutorial') {
                        (window as any).TutorialMode.start();
                    }
                    break;
                case 'OPEN_UI':
                    console.log(`[Interactable] Open UI panel: ${action.panel}`);
                    break;
                case 'CUSTOM':
                    action.handler();
                    break;
            }
        }

        if (onClick) onClick();
    };

    return (
        <group
            ref={meshRef as any}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
        >
            {children}

            {/* Optional outline effect when hovered */}
            {hovered && (
                <mesh scale={1.05}>
                    <boxGeometry />
                    <meshBasicMaterial color={outlineColor} wireframe />
                </mesh>
            )}
        </group>
    );
};
