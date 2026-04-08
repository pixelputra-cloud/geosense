import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useAppStore from '../../store/useAppStore';
import { loadCountryData, getNearestCountry } from '../../lib/countryData';
import { worldPointToLatLon } from '../../lib/geoUtils';
import { fetchNewsSummary } from '../../lib/claudeApi';

/**
 * Handles mouse/touch interaction for globe rotation, zoom, and country clicks.
 * Lives inside <Canvas> so it has access to useThree().
 */
export default function GlobeInteraction() {
  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const dragDistance = useRef(0);
  const touchStartDist = useRef(0);
  const touchStartScale = useRef(1);

  // Pre-load country data
  useEffect(() => {
    loadCountryData();
  }, []);

  // Handle gesture point lookup from useHandGesture hook
  useEffect(() => {
    const handleGesturePoint = async (e) => {
      const { ndcX, ndcY } = e.detail;
      const globeMesh = useAppStore.getState().globeMeshRef.current;
      if (!globeMesh) return;

      raycaster.current.setFromCamera({ x: ndcX, y: ndcY }, camera);
      const intersects = raycaster.current.intersectObject(globeMesh, false);
      if (!intersects.length) return;

      const { lat, lon } = worldPointToLatLon(intersects[0].point, globeMesh.matrixWorld);
      const country = getNearestCountry(lon, lat);
      if (!country) return;

      const store = useAppStore.getState();
      const cached = store.countryCache[country.iso2];
      if (cached) {
        store.selectCountry(country);
        store.setNewsSummary(cached);
        return;
      }

      store.selectCountry(country);
      try {
        const summary = await fetchNewsSummary(country.name, country.iso2);
        useAppStore.getState().setNewsSummary(summary);
        useAppStore.getState().cacheNews(country.iso2, summary);
      } catch (_) {
        useAppStore.getState().setNewsError();
      }
    };

    window.addEventListener('geosense:pointLookup', handleGesturePoint);
    return () => window.removeEventListener('geosense:pointLookup', handleGesturePoint);
  }, [camera]);

  const handleCountryClick = useRef(async (clientX, clientY) => {
    const canvas = gl.domElement;
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera({ x: ndcX, y: ndcY }, camera);

    const globeMesh = useAppStore.getState().globeMeshRef.current;
    if (!globeMesh) return;

    const intersects = raycaster.current.intersectObject(globeMesh, false);
    if (!intersects.length) return;

    const { lat, lon } = worldPointToLatLon(
      intersects[0].point,
      globeMesh.matrixWorld
    );

    const country = getNearestCountry(lon, lat);
    if (!country) return;

    const store = useAppStore.getState();

    // Check cache first
    const cached = store.countryCache[country.iso2];
    if (cached) {
      store.selectCountry(country);
      store.setNewsSummary(cached);
      return;
    }

    store.selectCountry(country);
    try {
      const summary = await fetchNewsSummary(country.name, country.iso2);
      useAppStore.getState().setNewsSummary(summary);
      useAppStore.getState().cacheNews(country.iso2, summary);
    } catch (_) {
      useAppStore.getState().setNewsError();
    }
  });

  useEffect(() => {
    const canvas = gl.domElement;

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      isDragging.current = true;
      dragDistance.current = 0;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      useAppStore.getState().setAutoRotating(false);
      useAppStore.setState({ _isDragging: true });
    };

    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      dragDistance.current += Math.abs(dx) + Math.abs(dy);
      lastMouse.current = { x: e.clientX, y: e.clientY };

      const state = useAppStore.getState();
      const sensitivity = 0.004;
      useAppStore.getState().setGlobeRotation(
        state.globeRotX + dy * sensitivity,
        state.globeRotY + dx * sensitivity
      );
    };

    const onMouseUp = (e) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      useAppStore.setState({ _isDragging: false });

      // Resume auto-rotate after 2s of no interaction
      setTimeout(() => {
        if (!isDragging.current) {
          useAppStore.getState().setAutoRotating(true);
        }
      }, 2000);

      // Click (no drag) → country lookup
      if (dragDistance.current < 5 && e.button === 0) {
        handleCountryClick.current(e.clientX, e.clientY);
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      const state = useAppStore.getState();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      state.setGlobeScale(state.globeScale + delta);
      useAppStore.getState().setAutoRotating(false);
      setTimeout(() => useAppStore.getState().setAutoRotating(true), 1500);
    };

    // Touch support
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging.current = true;
        dragDistance.current = 0;
        lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        useAppStore.getState().setAutoRotating(false);
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist.current = Math.sqrt(dx * dx + dy * dy);
        touchStartScale.current = useAppStore.getState().globeScale;
      }
    };

    const onTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && isDragging.current) {
        const dx = e.touches[0].clientX - lastMouse.current.x;
        const dy = e.touches[0].clientY - lastMouse.current.y;
        dragDistance.current += Math.abs(dx) + Math.abs(dy);
        lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const state = useAppStore.getState();
        const sensitivity = 0.004;
        state.setGlobeRotation(
          state.globeRotX + dy * sensitivity,
          state.globeRotY + dx * sensitivity
        );
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = touchStartScale.current * (dist / touchStartDist.current);
        useAppStore.getState().setGlobeScale(scale);
      }
    };

    const onTouchEnd = (e) => {
      if (e.touches.length === 0) {
        if (isDragging.current && dragDistance.current < 10) {
          const touch = e.changedTouches[0];
          handleCountryClick.current(touch.clientX, touch.clientY);
        }
        isDragging.current = false;
        setTimeout(() => useAppStore.getState().setAutoRotating(true), 2000);
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [camera, gl]);

  return null;
}
