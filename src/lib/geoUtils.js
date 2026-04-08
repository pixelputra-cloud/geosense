/**
 * Convert a 3D point on a unit sphere to latitude/longitude in degrees.
 * Three.js convention: Y is up.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {{ lat: number, lon: number }}
 */
export function xyzToLatLon(x, y, z) {
  // Normalize
  const len = Math.sqrt(x * x + y * y + z * z);
  const nx = x / len;
  const ny = y / len;
  const nz = z / len;

  const lat = Math.asin(ny) * (180 / Math.PI);

  // latLonToXYZ maps lon=0 → +X axis (x = -sin(phi)*cos(theta), theta = lon+180°).
  // Inverse: theta = atan2(z, -x), then lon = theta*180/π - 180.
  // atan2 returns [-π, π] → theta·(180/π) - 180 ∈ [-360, 0] → wrap to [-180, 180].
  let lon = Math.atan2(nz, -nx) * (180 / Math.PI) - 180;
  if (lon < -180) lon += 360;

  return { lat, lon };
}

/**
 * Convert lat/lon (degrees) to a 3D point on a sphere of given radius.
 */
export function latLonToXYZ(lat, lon, radius = 1) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

/**
 * Given a world-space intersection point on the globe mesh,
 * apply the inverse of the mesh's world matrix to get local coords,
 * then convert to lat/lon.
 * @param {THREE.Vector3} worldPoint
 * @param {THREE.Matrix4} meshWorldMatrix
 * @returns {{ lat: number, lon: number }}
 */
export function worldPointToLatLon(worldPoint, meshWorldMatrix) {
  const localPoint = worldPoint.clone().applyMatrix4(meshWorldMatrix.clone().invert());
  return xyzToLatLon(localPoint.x, localPoint.y, localPoint.z);
}
