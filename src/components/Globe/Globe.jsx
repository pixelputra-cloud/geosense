import { useRef, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import useAppStore from '../../store/useAppStore';

export default function Globe() {
  const meshRef = useRef();

  const [dayMap, specMap, normalMap] = useLoader(TextureLoader, [
    '/textures/earth_daymap.jpg',
    '/textures/earth_specular.jpg',
    '/textures/earth_normal.jpg',
  ]);

  useEffect(() => {
    if (dayMap)    dayMap.colorSpace    = THREE.SRGBColorSpace;
    if (specMap)   specMap.colorSpace   = THREE.LinearSRGBColorSpace;
    if (normalMap) normalMap.colorSpace = THREE.LinearSRGBColorSpace;
  }, [dayMap, specMap, normalMap]);

  // Register mesh ref in store for raycasting (used by GlobeInteraction)
  useEffect(() => {
    if (meshRef.current) {
      useAppStore.getState().globeMeshRef.current = meshRef.current;
    }
  }, []);

  return (
    <mesh ref={meshRef} name="earth">
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhongMaterial
        map={dayMap}
        specularMap={specMap}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.05, 0.05)}
        specular={new THREE.Color(0x333333)}
        shininess={15}
      />
    </mesh>
  );
}
