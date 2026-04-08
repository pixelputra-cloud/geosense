import { useRef, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

export default function CloudLayer() {
  const meshRef = useRef();
  const cloudTexture = useLoader(TextureLoader, '/textures/earth_clouds.jpg');

  useEffect(() => {
    if (cloudTexture) cloudTexture.colorSpace = THREE.SRGBColorSpace;
  }, [cloudTexture]);

  // Clouds drift slightly relative to the globe surface (wind simulation)
  // The EarthGroup handles the main rotation/scale — this just adds a small local offset
  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += 0.0002; // slow eastward drift
  });

  return (
    <mesh ref={meshRef} scale={1.005}>
      <sphereGeometry args={[1, 48, 48]} />
      <meshPhongMaterial
        map={cloudTexture}
        transparent={true}
        opacity={0.3}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}
