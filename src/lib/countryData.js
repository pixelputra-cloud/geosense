import { geoContains } from 'd3-geo';

let features = null;
let loadPromise = null;

export async function loadCountryData() {
  if (features) return features;
  if (loadPromise) return loadPromise;

  loadPromise = fetch('/countries.geojson')
    .then((r) => r.json())
    .then((data) => {
      features = data.features;
      return features;
    });

  return loadPromise;
}

/**
 * Find the GeoJSON feature at the given lon/lat.
 * @param {number} lon  Longitude in degrees (-180 to 180)
 * @param {number} lat  Latitude in degrees (-90 to 90)
 * @returns {{ iso2: string, iso3: string, name: string } | null}
 */
export function getCountryAtPoint(lon, lat) {
  if (!features) return null;

  const match = features.find((f) => geoContains(f, [lon, lat]));
  if (!match) return null;

  const props = match.properties;
  let iso2 = props.ISO_A2 || props.iso_a2 || '';
  const iso3 = props.ISO_A3 || props.iso_a3 || '';
  const name = props.ADMIN || props.NAME || props.name || 'Unknown';

  // Some disputed territories have ISO_A2 = '-99'; fall back to first 2 of ISO3
  if (iso2 === '-99' || iso2 === '') {
    iso2 = iso3.slice(0, 2);
  }

  return { iso2: iso2.toLowerCase(), iso3, name };
}

/**
 * Like getCountryAtPoint but falls back to sampling nearby points when the
 * exact click lands in a border gap, ocean sliver, or just offshore.
 * Tries concentric rings at 0.5°, 1.5°, 2.5° radius before giving up.
 */
export function getNearestCountry(lon, lat) {
  const exact = getCountryAtPoint(lon, lat);
  if (exact) return exact;

  const radii = [0.5, 1.5, 2.5];
  for (const r of radii) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const sLon = lon + r * Math.cos(angle);
      const sLat = Math.max(-90, Math.min(90, lat + r * Math.sin(angle)));
      const hit = getCountryAtPoint(sLon, sLat);
      if (hit) return hit;
    }
  }
  return null;
}
