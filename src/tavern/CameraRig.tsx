import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useScene, ZONES } from './SceneManager';
import * as THREE from 'three';

export const CameraRig: React.FC = () => {
    const { camera } = useThree();
    const { currentZone } = useScene();

    // Target position/rotation for smooth transitions
    const targetPosition = useRef(new THREE.Vector3());
    const targetLookAt = useRef(new THREE.Vector3());
    const currentLookAt = useRef(new THREE.Vector3());

    // Initialize camera on mount
    useEffect(() => {
        const zone = ZONES[currentZone];
        camera.position.set(...zone.cameraPosition);

        if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
            (camera as THREE.PerspectiveCamera).fov = zone.fov;
            camera.updateProjectionMatrix();
        }

        targetLookAt.current.set(...zone.cameraTarget);
        currentLookAt.current.copy(targetLookAt.current);
        camera.lookAt(currentLookAt.current);

        console.log(`[CameraRig] Initialized at zone: ${currentZone}`);
    }, []);

    // Update target when zone changes
    useEffect(() => {
        const zone = ZONES[currentZone];
        targetPosition.current.set(...zone.cameraPosition);
        targetLookAt.current.set(...zone.cameraTarget);

        // Update FOV with smooth transition
        if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
            (camera as THREE.PerspectiveCamera).fov = zone.fov;
            camera.updateProjectionMatrix();
        }

        console.log(`[CameraRig] Target updated: ${currentZone}`);
    }, [currentZone, camera]);

    // Smooth camera movement every frame
    useFrame((state, delta) => {
        const lerpFactor = Math.min(delta * 2.5, 1); // Smooth interpolation

        // Lerp position
        camera.position.lerp(targetPosition.current, lerpFactor);

        // Lerp look-at target
        currentLookAt.current.lerp(targetLookAt.current, lerpFactor);
        camera.lookAt(currentLookAt.current);
    });

    return null; // This component only manages camera, no visual output
};
