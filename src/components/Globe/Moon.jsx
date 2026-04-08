import { useRef, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

const ORBIT_RADIUS = 5;
const ORBIT_SPEED = 0.002;

export default function Moon() {
  const groupRef = useRef();
  const meshRef = useRef();
  const moonTexture = useLoader(TextureLoader, '/textures/moon.jpg');

  useEffect(() => {
    if (moonTexture) {
      moonTexture.colorSpace = THREE.SRGBColorSpace;
    }
  }, [moonTexture]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += ORBIT_SPEED;
    // Moon faces Earth (synchronous rotation)
    if (meshRef.current) {
      meshRef.current.rotation.y -= ORBIT_SPEED;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} position={[ORBIT_RADIUS, 0.5, 0]}>
        <sphereGeometry args={[0.27, 32, 32]} />
        <meshPhongMaterial
          map={moonTexture}
          shininess={5}
        />
      </mesh>
    </group>
  );
}
