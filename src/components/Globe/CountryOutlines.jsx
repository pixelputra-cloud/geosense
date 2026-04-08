import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useAppStore from '../../store/useAppStore';
import { latLonToXYZ } from '../../lib/geoUtils';
import { loadCountryData } from '../../lib/countryData';

const BORDER_RADIUS   = 1.003;
const SELECTED_RADIUS = 1.004;
const FILL_RADIUS     = 1.002;

// ─── GeoJSON helpers ──────────────────────────────────────────────────────────

function extractRings(feature) {
  const { type, coordinates } = feature.geometry;
  if (type === 'Polygon')      return coordinates;
  if (type === 'MultiPolygon') return coordinates.flat(1);
  return [];
}

function ringToSegmentVerts(ring, radius) {
  const verts = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    const a = latLonToXYZ(lat1, lon1, radius);
    const b = latLonToXYZ(lat2, lon2, radius);
    verts.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  return verts;
}

function ringToFillVerts(ring, radius) {
  const pts = ring.slice(0, -1);
  let sumLon = 0, sumLat = 0;
  for (const [lon, lat] of pts) { sumLon += lon; sumLat += lat; }
  const c = latLonToXYZ(sumLat / pts.length, sumLon / pts.length, radius);

  const verts = [];
  for (let i = 0; i < pts.length; i++) {
    const [lon1, lat1] = pts[i];
    const [lon2, lat2] = pts[(i + 1) % pts.length];
    const p1 = latLonToXYZ(lat1, lon1, radius);
    const p2 = latLonToXYZ(lat2, lon2, radius);
    verts.push(c.x,  c.y,  c.z);
    verts.push(p1.x, p1.y, p1.z);
    verts.push(p2.x, p2.y, p2.z);
  }
  return verts;
}

function buildGeometry(floatArray) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(floatArray, 3));
  return geo;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CountryOutlines() {
  const [features, setFeatures] = useState(null);

  // Read selectedCountry reactively via Zustand selector hook
  // (works because CountryOutlines is a normal React component, not inside useFrame)
  const selectedCountry = useAppStore((state) => state.selectedCountry);

  const bordersRef      = useRef();
  const selectedLineRef = useRef();
  const selectedFillRef = useRef();

  // ── Load GeoJSON once ──────────────────────────────────────────────────────
  useEffect(() => {
    loadCountryData().then(setFeatures);
  }, []);

  // ── Build all-borders geometry once features load ─────────────────────────
  useEffect(() => {
    if (!features || !bordersRef.current) return;

    const allVerts = [];
    for (const f of features) {
      for (const ring of extractRings(f)) {
        ringToSegmentVerts(ring, BORDER_RADIUS).forEach(v => allVerts.push(v));
      }
    }

    const geo = buildGeometry(new Float32Array(allVerts));
    const old = bordersRef.current.geometry;
    bordersRef.current.geometry = geo;
    if (old) old.dispose();
  }, [features]);

  // ── Rebuild selected geometry whenever selectedCountry changes ─────────────
  useEffect(() => {
    const lineObj = selectedLineRef.current;
    const fillObj = selectedFillRef.current;
    if (!lineObj || !fillObj) return;

    // Clear when nothing selected
    if (!selectedCountry || !features) {
      const emptyGeo = new THREE.BufferGeometry();
      lineObj.geometry.dispose();
      lineObj.geometry = emptyGeo.clone();
      fillObj.geometry.dispose();
      fillObj.geometry = emptyGeo;
      lineObj.material.opacity = 0;
      fillObj.material.opacity = 0;
      return;
    }

    const iso = selectedCountry.iso2?.toLowerCase();
    const feature = features.find((f) => {
      const code = (f.properties.ISO_A2 || f.properties.iso_a2 || '').toLowerCase();
      return code === iso;
    });

    if (!feature) return;

    // Selected border
    const lineVerts = [];
    for (const ring of extractRings(feature)) {
      ringToSegmentVerts(ring, SELECTED_RADIUS).forEach(v => lineVerts.push(v));
    }
    const lineGeo = buildGeometry(new Float32Array(lineVerts));
    lineObj.geometry.dispose();
    lineObj.geometry = lineGeo;

    // Selected fill
    const fillVerts = [];
    for (const ring of extractRings(feature)) {
      ringToFillVerts(ring, FILL_RADIUS).forEach(v => fillVerts.push(v));
    }
    const fillGeo = buildGeometry(new Float32Array(fillVerts));
    fillObj.geometry.dispose();
    fillObj.geometry = fillGeo;

  }, [selectedCountry, features]);

  // ── Pulse animation ────────────────────────────────────────────────────────
  useFrame(({ clock }) => {
    if (!selectedLineRef.current || !selectedFillRef.current) return;
    if (!selectedCountry) return;

    const t = (Math.sin(clock.getElapsedTime() * 2.5) + 1) / 2; // 0→1
    selectedLineRef.current.material.opacity = 0.6 + t * 0.4;   // 0.6→1.0
    selectedFillRef.current.material.opacity = 0.07 + t * 0.10; // 0.07→0.17
  });

  return (
    <group>
      {/* All country borders — single merged draw call */}
      <lineSegments ref={bordersRef}>
        <bufferGeometry />
        <lineBasicMaterial
          color="#7ecfff"
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </lineSegments>

      {/* Selected country border — cyan pulse */}
      <lineSegments ref={selectedLineRef}>
        <bufferGeometry />
        <lineBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineSegments>

      {/* Selected country fill — semi-transparent cyan */}
      <mesh ref={selectedFillRef}>
        <bufferGeometry />
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </group>
  );
}
