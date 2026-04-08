import { useRef, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

// Sun direction matches the directional light at position [5, 3, 5] in Scene.jsx
const SUN_DIR = new THREE.Vector3(5, 3, 5).normalize();

// ── Shaders ──────────────────────────────────────────────────────────────────
// Uses mat3(modelMatrix) to get world-space normals so the terminator follows
// the real light direction regardless of how the EarthGroup is rotated.

const vertShader = `
varying vec2  vUv;
varying vec3  vWorldNormal;

void main() {
  vUv         = uv;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragShader = `
uniform sampler2D uNightMap;
uniform vec3      uSunDir;

varying vec2 vUv;
varying vec3 vWorldNormal;

void main() {
  float sunDot = dot(normalize(vWorldNormal), uSunDir);

  // Smooth terminator: fully dark when sunDot < -0.05, fades to 0 at sunDot = +0.15
  float nightBlend = clamp((-sunDot - 0.05) / 0.20, 0.0, 1.0);
  nightBlend = nightBlend * nightBlend; // quadratic — sharper terminator edge

  vec3 lights = texture2D(uNightMap, vUv).rgb;
  lights *= 1.8; // boost city light brightness

  gl_FragColor = vec4(lights * nightBlend, nightBlend);
}
`;

// ─────────────────────────────────────────────────────────────────────────────

export default function CityLights() {
  const nightMap = useLoader(TextureLoader, '/textures/earth_nightmap.jpg');

  useEffect(() => {
    if (nightMap) nightMap.colorSpace = THREE.SRGBColorSpace;
  }, [nightMap]);

  const uniforms = useRef({
    uNightMap: { value: null },
    uSunDir:   { value: SUN_DIR },
  });

  useEffect(() => {
    if (nightMap) uniforms.current.uNightMap.value = nightMap;
  }, [nightMap]);

  return (
    // scale=1.001 keeps the city lights just above the earth surface (no z-fighting)
    <mesh scale={1.001}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        vertexShader={vertShader}
        fragmentShader={fragShader}
        uniforms={uniforms.current}
        transparent={true}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
