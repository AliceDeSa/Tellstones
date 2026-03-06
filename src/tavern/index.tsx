import React from 'react';
import { createRoot } from 'react-dom/client';
import { TavernCanvas } from './TavernCanvas';

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    const rootElement = document.getElementById('tavern-root');

    if (rootElement) {
        const root = createRoot(rootElement);
        root.render(
            <React.StrictMode>
                <TavernCanvas />
            </React.StrictMode>
        );
        console.log('[Tavern3D] React root mounted');
    } else {
        console.warn('[Tavern3D] Root element #tavern-root not found');
    }
});
