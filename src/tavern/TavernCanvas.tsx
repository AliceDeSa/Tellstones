import React from 'react';
import { Canvas } from '@react-three/fiber';
import { SceneProvider, useScene } from './SceneManager';
import { CameraRig } from './CameraRig';
import { Interactable } from './components/Interactable';
import { Lighting } from './components/Lighting';
import { PostProcessing } from './effects/PostProcessing';
import { TavernHub } from './zones/TavernHub';
import { VIPRoom } from './zones/VIPRoom';
import { SecondFloor } from './zones/SecondFloor';
import { ExternalArea } from './zones/ExternalArea';

// Scene content (uses hook, must be inside provider)
const TavernScene: React.FC = () => {
    const { currentZone } = useScene();

    return (
        <>
            <Lighting />
            <CameraRig />

            {/* Hub Zone */}
            {currentZone === 'hub' && (
                <>
                    <TavernHub />
                    {/* Ground plane for hub */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                        <planeGeometry args={[20, 20]} />
                        <meshStandardMaterial color="#2a2a2a" />
                    </mesh>
                </>
            )}

            {/* VIP Room Zone (Campaign) */}
            {currentZone === 'vip-room' && <VIPRoom />}

            {/* Second Floor Zone */}
            {currentZone === 'second-floor' && <SecondFloor />}

            {/* External Area Zone */}
            {currentZone === 'external' && <ExternalArea />}

            {/* Gameplay zone - placeholder */}
            {currentZone === 'gameplay' && (
                <>
                    <Interactable action={{ type: 'NAVIGATE', zoneId: 'hub' }}>
                        <mesh position={[0, 0.5, 0]}>
                            <boxGeometry args={[1, 1, 1]} />
                            <meshStandardMaterial color="orange" />
                        </mesh>
                    </Interactable>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                        <planeGeometry args={[20, 20]} />
                        <meshStandardMaterial color="#2a2a2a" />
                    </mesh>
                </>
            )}

            {/* Post-processing effects */}
            <PostProcessing />
        </>
    );
};

export const TavernCanvas: React.FC = () => {
    // Hidden by default, toggled by the "Teste 3D" button logic or dev tools
    // Actually, we need to expose a way to show it.
    // For now, let's keep it visible but rely on the parent container z-index logic or CSS.
    // Wait, the user wants the 3D scenario to ONLY open when the button is pressed.
    // So we should probably hide the canvas container entirely by default.
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
        console.log("[TavernCanvas] Mounted, waiting for ENTER_3D_TEST_MODE");
        // Listen for the custom event from main.ts
        const handleEnter3D = () => {
            console.log("[TavernCanvas] Received ENTER_3D_TEST_MODE event! Showing 3D Scene.");
            setIsVisible(true);
        };
        window.addEventListener('ENTER_3D_TEST_MODE', handleEnter3D);
        return () => window.removeEventListener('ENTER_3D_TEST_MODE', handleEnter3D);
    }, []);

    const [uiVisible, setUiVisible] = React.useState(true);

    const toggleUI = () => {
        const newState = !uiVisible;
        setUiVisible(newState);

        // Hide/show all legacy UI elements (excluding rotate overlay)
        const elementsToToggle = [
            'user-profile-container',
            'btn-mute-global',
            'placar-turno-central'
        ];

        elementsToToggle.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = newState ? '' : 'none';
            }
        });

        // Hide all elements with class 'screen'
        document.querySelectorAll('.screen').forEach((el: Element) => {
            (el as HTMLElement).style.display = newState ? '' : 'none';
        });

        // Hide Ko-fi widget
        const kofiWidget = document.querySelector('iframe[title*="kofi"]') as HTMLElement;
        if (kofiWidget) {
            kofiWidget.style.display = newState ? '' : 'none';
        }

        console.log(`[TavernCanvas] Legacy UI ${newState ? 'shown' : 'hidden'}`);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
            display: isVisible ? 'block' : 'none' // Controlled by state
        }}>
            <SceneProvider initialZone="hub">
                <Canvas shadows camera={{ position: [0, 8, 12], fov: 50 }}>
                    <TavernScene />
                </Canvas>

                {/* UI Overlay - increased z-index to be above Ko-fi */}
                <div style={{ position: 'absolute', bottom: 20, left: 20, color: 'white', background: 'rgba(0,0,0,0.7)', padding: '15px', borderRadius: '8px', fontFamily: 'monospace', zIndex: 100001 }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>🏗️ Phase 2: Core Systems</h3>
                    <p style={{ margin: '5px 0' }}>✅ SceneManager active</p>
                    <p style={{ margin: '5px 0' }}>✅ CameraRig transitions</p>
                    <p style={{ margin: '5px 0' }}>✅ Interactable objects</p>
                    <p style={{ margin: '10px 0 0 0', fontSize: '0.9em', opacity: 0.7 }}>Click cubes to navigate zones</p>

                    {/* Toggle Button */}
                    <button
                        onClick={toggleUI}
                        style={{
                            marginTop: '15px',
                            padding: '8px 16px',
                            background: uiVisible ? '#ff4444' : '#44ff44',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9em',
                            fontWeight: 'bold'
                        }}
                    >
                        {uiVisible ? '🚫 Hide Legacy UI' : '✅ Show Legacy UI'}
                    </button>
                </div>
            </SceneProvider>
        </div>
    );
};
