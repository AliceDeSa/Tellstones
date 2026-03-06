import React from 'react';

export const Lighting: React.FC = () => {
    return (
        <>
            {/* Ambient fill light - INCREASED for visibility */}
            <ambientLight intensity={0.8} color="#ffffff" />

            {/* Main warm light (fireplace/candles) - INCREASED */}
            <pointLight
                position={[0, 3, 0]}
                intensity={120}
                color="#ff9944"
                distance={20}
                decay={1.5}
            />

            {/* Accent lights per table - INCREASED */}
            <pointLight position={[-3, 2, 2]} intensity={40} color="#ffcc88" />
            <pointLight position={[3, 2, 2]} intensity={40} color="#ffcc88" />

            {/* Window moonlight (directional) - INCREASED */}
            <directionalLight
                position={[5, 8, -5]}
                intensity={2}
                color="#ffffff"
            />

            {/* Additional overhead light for full visibility */}
            <pointLight position={[0, 10, 0]} intensity={100} color="#ffffff" distance={30} />
        </>
    );
};
