import { useRef } from 'react';
import * as THREE from 'three';

// Front-face limb glow: intensity = 0 at center, high at edges
// Works by measuring how much the surface normal faces AWAY from camera
const vertShader = `
varying vec3 vNormal;
varying vec3 vPositionNormal;

void main() {
  vNormal = normalize(normalMatrix * normal);
  // Position in view space (normalized)
  vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragShader = `
uniform vec3 glowColor;
uniform float glowPower;

varying vec3 vNormal;
varying vec3 vPositionNormal;

void main() {
  // dot(normal, view_direction) — 1.0 at center facing camera, 0.0 at silhouette edge
  float facing = dot(vNormal, -vPositionNormal);
  // Invert: edge has high intensity, center has low
  float intensity = pow(1.0 - clamp(facing, 0.0, 1.0), glowPower);
  gl_FragColor = vec4(glowColor * intensity, intensity * 0.65);
}
`;

export default function Atmosphere() {
  const meshRef = useRef();

  const uniforms = useRef({
    glowColor: { value: new THREE.Vector3(0.1, 0.5, 1.0) }, // soft atmospheric blue
    glowPower: { value: 3.5 },
  });

  // No per-frame updates needed for front-face approach

  return (
    <mesh ref={meshRef} scale={1.08}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        vertexShader={vertShader}
        fragmentShader={fragShader}
        uniforms={uniforms.current}
        side={THREE.FrontSide}
        blending={THREE.AdditiveBlending}
        transparent={true}
        depthWrite={false}
        depthTest={true}
      />
    </mesh>
  );
}
