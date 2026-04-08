import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Shared: faint orbit ring ──────────────────────────────────────────────
function OrbitRing({ radius, inclination = 0, color = '#ffffff', opacity = 0.08 }) {
  const points = useMemo(() => {
    const pts = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    return pts;
  }, [radius]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  return (
    <group rotation={[inclination, 0, 0]}>
      <line geometry={geometry}>
        <lineBasicMaterial color={color} transparent opacity={opacity} />
      </line>
    </group>
  );
}

// ─── Hubble Space Telescope ─────────────────────────────────────────────────
// Real orbit: 547 km, 28.5° inclination
export function Hubble() {
  const groupRef = useRef();
  const RADIUS = 1.16;
  const SPEED  = 0.0022;
  const INC    = 28.5 * (Math.PI / 180);

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += SPEED;
  });

  return (
    <>
      <OrbitRing radius={RADIUS} inclination={INC} color="#aaccff" opacity={0.1} />
      <group rotation={[INC, 0, 0]}>
        <group ref={groupRef}>
          <group position={[RADIUS, 0, 0]}>
            {/* Main barrel */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.008, 0.008, 0.038, 10]} />
              <meshStandardMaterial color="#c8d0d8" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Aperture cap */}
            <mesh position={[0.019, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.0085, 0.006, 0.004, 10]} />
              <meshStandardMaterial color="#888ea0" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Solar wings */}
            <mesh position={[0, 0.022, 0]}>
              <boxGeometry args={[0.055, 0.001, 0.014]} />
              <meshStandardMaterial color="#1a3060" metalness={0.2} roughness={0.7} />
            </mesh>
            <mesh position={[0, -0.022, 0]}>
              <boxGeometry args={[0.055, 0.001, 0.014]} />
              <meshStandardMaterial color="#1a3060" metalness={0.2} roughness={0.7} />
            </mesh>
            {/* Blue glow */}
            <pointLight color="#4488ff" intensity={0.3} distance={0.25} decay={2} />
          </group>
        </group>
      </group>
    </>
  );
}

// ─── Tiangong Space Station ─────────────────────────────────────────────────
// Real orbit: ~390 km, 41.5° inclination
export function Tiangong() {
  const groupRef = useRef();
  const RADIUS = 1.13;
  const SPEED  = 0.0038;
  const INC    = 41.5 * (Math.PI / 180);

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += SPEED;
  });

  return (
    <>
      <OrbitRing radius={RADIUS} inclination={INC} color="#ffddaa" opacity={0.09} />
      <group rotation={[INC, 0, 0]}>
        <group ref={groupRef}>
          <group position={[RADIUS, 0, 0]}>
            {/* Core module */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.007, 0.007, 0.028, 10]} />
              <meshStandardMaterial color="#e8e4d8" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Lab module */}
            <mesh position={[0.022, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.005, 0.005, 0.016, 8]} />
              <meshStandardMaterial color="#ddd8cc" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Solar arrays (4 panels, distinctive red-tipped) */}
            <mesh position={[0, 0.018, 0]}>
              <boxGeometry args={[0.048, 0.001, 0.011]} />
              <meshStandardMaterial color="#162850" metalness={0.2} roughness={0.6} />
            </mesh>
            <mesh position={[0, -0.018, 0]}>
              <boxGeometry args={[0.048, 0.001, 0.011]} />
              <meshStandardMaterial color="#162850" metalness={0.2} roughness={0.6} />
            </mesh>
            {/* Red-orange engine glow */}
            <pointLight color="#ff6622" intensity={0.35} distance={0.2} decay={2} />
          </group>
        </group>
      </group>
    </>
  );
}

// ─── GPS Satellite (Block III style) ───────────────────────────────────────
// Real orbit: ~20,200 km (MEO), 55° inclination. 4 evenly-spaced in one plane.
export function GPSConstellation() {
  const groupRef = useRef();
  const RADIUS = 1.60;
  const SPEED  = 0.00045; // much slower — MEO
  const INC    = 55 * (Math.PI / 180);

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += SPEED;
  });

  // 4 satellites evenly spaced
  const offsets = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

  return (
    <>
      <OrbitRing radius={RADIUS} inclination={INC} color="#88ffcc" opacity={0.07} />
      <group rotation={[INC, 0, 0]}>
        <group ref={groupRef}>
          {offsets.map((offset, i) => {
            const x = Math.cos(offset) * RADIUS;
            const z = Math.sin(offset) * RADIUS;
            return (
              <group key={i} position={[x, 0, z]}>
                {/* Body */}
                <mesh>
                  <boxGeometry args={[0.014, 0.014, 0.018]} />
                  <meshStandardMaterial color="#d4c87a" metalness={0.6} roughness={0.3} />
                </mesh>
                {/* Wide solar wings */}
                <mesh>
                  <boxGeometry args={[0.06, 0.001, 0.018]} />
                  <meshStandardMaterial color="#0d2244" metalness={0.2} roughness={0.7} />
                </mesh>
                {/* Signal antenna dish */}
                <mesh position={[0, 0.012, 0]}>
                  <cylinderGeometry args={[0.008, 0.004, 0.004, 8]} />
                  <meshStandardMaterial color="#aaaaaa" metalness={0.8} roughness={0.2} />
                </mesh>
                <pointLight color="#22ff88" intensity={0.15} distance={0.3} decay={2} />
              </group>
            );
          })}
        </group>
      </group>
    </>
  );
}

// ─── Starlink Formation ─────────────────────────────────────────────────────
// Real orbit: ~550 km, 53° inclination. Train of 6 flat panels.
export function StarlinkTrain() {
  const groupRef = useRef();
  const RADIUS = 1.10;
  const SPEED  = 0.0055; // LEO — fastest orbit
  const INC    = 53 * (Math.PI / 180);

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += SPEED;
  });

  // 6 satellites in a trail, spaced 0.012 apart along the orbit direction
  const trail = [-0.030, -0.018, -0.006, 0.006, 0.018, 0.030];

  return (
    <>
      <OrbitRing radius={RADIUS} inclination={INC} color="#ffffff" opacity={0.06} />
      <group rotation={[INC, 0, 0]}>
        <group ref={groupRef}>
          {trail.map((offset, i) => (
            <group key={i} position={[RADIUS, 0, offset]}>
              {/* Flat chassis */}
              <mesh>
                <boxGeometry args={[0.006, 0.0015, 0.014]} />
                <meshStandardMaterial color="#dddddd" metalness={0.7} roughness={0.2} />
              </mesh>
              {/* Single long solar panel */}
              <mesh position={[0, 0.004, 0]}>
                <boxGeometry args={[0.003, 0.0008, 0.028]} />
                <meshStandardMaterial color="#112244" metalness={0.3} roughness={0.6} />
              </mesh>
            </group>
          ))}
          {/* One shared light for the cluster */}
          <pointLight
            position={[RADIUS, 0, 0]}
            color="#ffffff"
            intensity={0.12}
            distance={0.2}
            decay={2}
          />
        </group>
      </group>
    </>
  );
}
