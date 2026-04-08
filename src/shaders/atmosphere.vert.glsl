uniform vec3 viewVector;
uniform float fresnelBias;
uniform float fresnelScale;
uniform float fresnelPower;

varying float intensity;

void main() {
  vec3 vNormal = normalize(normalMatrix * normal);
  vec3 vNormel = normalize(normalMatrix * viewVector);
  intensity = fresnelBias + fresnelScale * pow(1.0 + dot(vNormal, vNormel), fresnelPower);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
