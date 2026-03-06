import React from 'react';
import { EffectComposer, Bloom, Vignette, SSAO } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

export const PostProcessing: React.FC = () => {
    return (
        <EffectComposer disableNormalPass={false}>
            {/* Bloom effect for glowing elements (fireplace, lights, etc) */}
            <Bloom
                intensity={0.5}
                luminanceThreshold={0.6}
                luminanceSmoothing={0.9}
                blendFunction={BlendFunction.ADD}
            />

            {/* Vignette for atmospheric depth */}
            <Vignette
                offset={0.3}
                darkness={0.5}
                blendFunction={BlendFunction.NORMAL}
            />

            {/* SSAO for ambient occlusion depth */}
            {/* SSAO for ambient occlusion depth */}
            {/*
            <SSAO
                blendFunction={BlendFunction.MULTIPLY}
                samples={16}
                radius={0.5}
                intensity={30}
                luminanceInfluence={0.6}
                color="black"
            />
            */}
        </EffectComposer>
    );
};
