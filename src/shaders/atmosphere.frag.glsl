uniform vec3 glowColor;
varying float intensity;

void main() {
  vec3 glow = glowColor * intensity;
  gl_FragColor = vec4(glow, intensity * 0.85);
}
