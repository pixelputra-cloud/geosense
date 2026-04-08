import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const ORBIT_RADIUS = 1.12;
const ORBIT_SPEED = 0.003;
const INCLINATION = 15 * (Math.PI / 180); // 15 degree inclination

export default function ISSSatellite() {
  const groupRef = useRef();
  const tiltRef = useRef();

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += ORBIT_SPEED;
  });

  return (
    <group rotation={[INCLINATION, 0, 0]}>
      <group ref={groupRef}>
        {/* ISS body */}
        <mesh position={[ORBIT_RADIUS, 0, 0]}>
          <boxGeometry args={[0.025, 0.006, 0.012]} />
          <meshStandardMaterial color="#C8D8E8" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Solar panels */}
        <mesh position={[ORBIT_RADIUS, 0, 0]}>
          <boxGeometry args={[0.006, 0.002, 0.055]} />
          <meshStandardMaterial color="#1A3A6A" metalness={0.3} roughness={0.6} />
        </mesh>
        {/* Amber thruster glow */}
        <pointLight
          position={[ORBIT_RADIUS, 0, 0]}
          color="#FFB830"
          intensity={0.4}
          distance={0.3}
          decay={2}
        />
      </group>
    </group>
  );
}
