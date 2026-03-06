import React, { createContext, useContext, useState, ReactNode } from 'react';

// Zone definitions
export type ZoneId = 'hub' | 'second-floor' | 'vip-room' | 'external' | 'gameplay';

export interface Zone {
    id: ZoneId;
    name: string;
    cameraPosition: [number, number, number];
    cameraTarget: [number, number, number];
    fov: number;
}

// Predefined zones
export const ZONES: Record<ZoneId, Zone> = {
    hub: {
        id: 'hub',
        name: 'Tavern Hub',
        cameraPosition: [0, 8, 18],
        cameraTarget: [0, 1, 0],
        fov: 70,
    },
    'second-floor': {
        id: 'second-floor',
        name: 'Second Floor',
        cameraPosition: [0, 5, 10],
        cameraTarget: [0, 2, 0],
        fov: 50,
    },
    'vip-room': {
        id: 'vip-room',
        name: 'VIP Room',
        cameraPosition: [5, 5, 5],
        cameraTarget: [0, 2, 0],
        fov: 45,
    },
    external: {
        id: 'external',
        name: 'External Area',
        cameraPosition: [0, 3, 15],
        cameraTarget: [0, 0, 0],
        fov: 60,
    },
    gameplay: {
        id: 'gameplay',
        name: 'Gameplay View',
        cameraPosition: [0, 2.5, 1.5],
        cameraTarget: [0, 0.5, 0],
        fov: 40,
    },
};

// Context for scene management
interface SceneContextValue {
    currentZone: ZoneId;
    transitionTo: (zoneId: ZoneId) => void;
    isTransitioning: boolean;
}

const SceneContext = createContext<SceneContextValue | null>(null);

export const useScene = () => {
    const context = useContext(SceneContext);
    if (!context) {
        throw new Error('useScene must be used within SceneProvider');
    }
    return context;
};

interface SceneProviderProps {
    children: ReactNode;
    initialZone?: ZoneId;
}

export const SceneProvider: React.FC<SceneProviderProps> = ({
    children,
    initialZone = 'hub'
}) => {
    const [currentZone, setCurrentZone] = useState<ZoneId>(initialZone);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const transitionTo = (zoneId: ZoneId) => {
        if (zoneId === currentZone || isTransitioning) return;

        console.log(`[SceneManager] Transitioning: ${currentZone} → ${zoneId}`);
        setIsTransitioning(true);

        // Simulate transition duration
        setTimeout(() => {
            setCurrentZone(zoneId);
            setIsTransitioning(false);
            console.log(`[SceneManager] Transition complete: ${zoneId}`);
        }, 1200); // Match camera animation duration
    };

    return (
        <SceneContext.Provider value={{ currentZone, transitionTo, isTransitioning }}>
            {children}
        </SceneContext.Provider>
    );
};
