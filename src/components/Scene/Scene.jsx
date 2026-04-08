import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import Globe from '../Globe/Globe';
import CloudLayer from '../Globe/CloudLayer';
import Atmosphere from '../Globe/Atmosphere';
import CountryOutlines from '../Globe/CountryOutlines';
import CityLights from '../Globe/CityLights';
import Moon from '../Globe/Moon';
import ISSSatellite from '../Globe/ISSSatellite';
import { Hubble, Tiangong, GPSConstellation, StarlinkTrain } from '../Globe/Satellites';
import GlobeInteraction from './GlobeInteraction';
import useAppStore from '../../store/useAppStore';

/**
 * EarthGroup — wraps Globe + CloudLayer + Atmosphere in one group.
 * Applies globeRotX, globeRotY, globeScale from the Zustand store every frame.
 * All children inherit the transform automatically.
 */
/**
 * SatelliteSystem — scales all satellite orbits with globeScale so they
 * always hug the Earth regardless of zoom level. Satellites remain in world
 * space (don't inherit Earth rotation) — only scale is shared.
 */
function SatelliteSystem() {
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    ref.current.scale.setScalar(useAppStore.getState().globeScale);
  });
  return (
    <group ref={ref}>
      <ISSSatellite />
      <Hubble />
      <Tiangong />
      <GPSConstellation />
      <StarlinkTrain />
    </group>
  );
}

function EarthGroup() {
  const groupRef = useRef();

  useFrame(() => {
    if (!groupRef.current) return;
    const { globeRotX, globeRotY, globeScale, isAutoRotating, activeGesture, _isDragging } =
      useAppStore.getState();

    // Auto-rotate globe (writes back to store so interaction hooks see it)
    if (isAutoRotating && activeGesture === 'none' && !_isDragging) {
      useAppStore.setState((s) => ({ globeRotY: s.globeRotY + 0.0005 }));
    }

    // Apply all transforms to the group (non-reactive read — no re-renders)
    const state = useAppStore.getState();
    groupRef.current.rotation.x = state.globeRotX;
    groupRef.current.rotation.y = state.globeRotY;
    groupRef.current.scale.setScalar(state.globeScale);
  });

  return (
    <group ref={groupRef}>
      <Globe />
      <CityLights />
      <CloudLayer />
      <Atmosphere />
      <CountryOutlines />
    </group>
  );
}

export default function Scene() {
  return (
    <Canvas
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      camera={{ position: [0, 0, 3], fov: 45, near: 0.1, far: 1000 }}
      onCreated={({ gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 3, 5]} intensity={2.0} />

      {/* Starfield */}
      <Stars radius={300} depth={60} count={6000} factor={4} saturation={0} fade speed={0.5} />

      <Suspense fallback={null}>
        {/* Earth system — all children share rotation + scale */}
        <EarthGroup />

        {/* Independent scene objects */}
        <Moon />

        {/* Satellite system — scales with globeScale so orbits always hug the Earth */}
        <SatelliteSystem />
      </Suspense>

      {/* Interaction handler (inside Canvas for useThree access) */}
      <GlobeInteraction />
    </Canvas>
  );
}
