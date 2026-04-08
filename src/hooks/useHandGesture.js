import { useEffect, useRef, useCallback } from 'react';
import useAppStore from '../store/useAppStore';
import { createHandsInstance, createCamera, stopCamera, LANDMARKS } from '../lib/mediapipe';
import { setLatestLandmarks } from '../components/WebcamPreview/WebcamPreview';
import { loadCountryData } from '../lib/countryData';

// ─── Geometry helpers ────────────────────────────────────────────────────────
function dist2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function ema(prev, next, alpha = 0.55) {
  return alpha * next + (1 - alpha) * prev;
}

// ─── Landmark classifier ─────────────────────────────────────────────────────
function classifyGesture(lm) {
  if (!lm || lm.length < 21) return 'none';
  const L = LANDMARKS;

  const isIndexExtended  = lm[L.INDEX_TIP].y  < lm[L.INDEX_PIP].y;
  const isMiddleExtended = lm[L.MIDDLE_TIP].y < lm[L.MIDDLE_PIP].y;
  const isRingExtended   = lm[L.RING_TIP].y   < lm[L.RING_PIP].y;
  const isPinkyExtended  = lm[L.PINKY_TIP].y  < lm[L.PINKY_PIP].y;

  const handSize  = dist2D(lm[L.WRIST], lm[L.MIDDLE_MCP]);
  const pinchDist = dist2D(lm[L.THUMB_TIP], lm[L.INDEX_TIP]);
  const isPinching = handSize > 0 && (pinchDist / handSize) < 0.4;

  const extCount = [isIndexExtended, isMiddleExtended, isRingExtended, isPinkyExtended]
    .filter(Boolean).length;

  // Spread: all 4 fingers extended AND wide index-to-pinky gap
  const spreadDist = dist2D(lm[L.INDEX_TIP], lm[L.PINKY_TIP]);
  const isSpread   = extCount === 4 && handSize > 0 && (spreadDist / handSize) > 0.9;

  if (extCount === 0)                                                              return 'fist';
  if (isPinching && extCount <= 2)                                                 return 'pinch';
  if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) return 'point';
  if (isSpread)                                                                    return 'spread';
  if (extCount >= 3)                                                               return 'open_palm';
  return 'none';
}

// ─── Main hook ───────────────────────────────────────────────────────────────
export default function useHandGesture(videoEl) {
  // Action state refs
  const isRotating      = useRef(false);
  const isSpreading     = useRef(false); // spread → depth zoom
  const isPinchActive   = useRef(false); // pinch → country card (300ms hold)
  const isPointing      = useRef(false); // point → country card (400ms hold, legacy)
  const pointFired      = useRef(false);
  const pointTimer      = useRef(null);
  const pinchFired      = useRef(false);
  const pinchTimer      = useRef(null);
  const pinchMidpoint   = useRef(null);  // thumb+index midpoint for raycasting
  const idleTimer       = useRef(null);

  // Motion tracking refs
  const prevWrist         = useRef(null);
  const smoothDx          = useRef(0);
  const smoothDy          = useRef(0);
  const prevHandSize      = useRef(null); // apparent hand size for depth detection
  const smoothSizeDelta   = useRef(0);    // EMA of frame-to-frame hand size change

  const reset = useCallback(() => {
    isRotating.current      = false;
    isSpreading.current     = false;
    isPinchActive.current   = false;
    isPointing.current      = false;
    pointFired.current      = false;
    pinchFired.current      = false;
    clearTimeout(pointTimer.current);
    clearTimeout(pinchTimer.current);
    pointTimer.current      = null;
    pinchTimer.current      = null;
    pinchMidpoint.current   = null;
    smoothDx.current        = 0;
    smoothDy.current        = 0;
    prevWrist.current       = null;
    prevHandSize.current    = null;
    smoothSizeDelta.current = 0;
  }, []);

  // Fire country lookup from point gesture (index fingertip)
  const firePointLookup = useCallback(() => {
    if (pointFired.current) return;
    pointFired.current = true;
    const { fingertipPosition } = useAppStore.getState();
    if (!fingertipPosition) return;
    const { x, y } = fingertipPosition;
    window.dispatchEvent(
      new CustomEvent('geosense:pointLookup', {
        detail: { ndcX: x * 2 - 1, ndcY: -(y * 2 - 1) },
      })
    );
  }, []);

  // Fire country lookup from pinch gesture (thumb+index midpoint)
  const firePinchLookup = useCallback(() => {
    if (pinchFired.current) return;
    pinchFired.current = true;
    const pos = pinchMidpoint.current;
    if (!pos) return;
    window.dispatchEvent(
      new CustomEvent('geosense:pointLookup', {
        detail: { ndcX: pos.x * 2 - 1, ndcY: -(pos.y * 2 - 1) },
      })
    );
  }, []);

  useEffect(() => {
    if (!videoEl) return;

    useAppStore.getState().setMediaPipeLoading(true);
    loadCountryData();

    let mounted = true;

    const onResults = (results) => {
      if (!mounted) return;

      const lm         = results.multiHandLandmarks?.[0] ?? null;
      const confidence = results.multiHandedness?.[0]?.score ?? 0;

      setLatestLandmarks(lm);

      // ── No hand detected ───────────────────────────────────────────────────
      if (!lm || lm.length < 21) {
        if (!idleTimer.current) {
          idleTimer.current = setTimeout(() => {
            reset();
            useAppStore.getState().setGesture('none', 0, null);
            useAppStore.getState().setAutoRotating(true);
            idleTimer.current = null;
          }, 400);
        }
        return;
      }

      clearTimeout(idleTimer.current);
      idleTimer.current = null;

      const gesture = classifyGesture(lm);

      // ── Mirror X to match CSS scaleX(-1) video display ────────────────────
      const indexTip = { x: 1 - lm[LANDMARKS.INDEX_TIP].x, y: lm[LANDMARKS.INDEX_TIP].y };
      const wrist    = { x: 1 - lm[LANDMARKS.WRIST].x,     y: lm[LANDMARKS.WRIST].y };

      // ── Palm delta (wrist velocity for rotation) ──────────────────────────
      let palmDelta = { dx: 0, dy: 0 };
      if (prevWrist.current) {
        const rawDx = wrist.x - prevWrist.current.x;
        const rawDy = wrist.y - prevWrist.current.y;
        smoothDx.current = ema(smoothDx.current, rawDx);
        smoothDy.current = ema(smoothDy.current, rawDy);
        palmDelta = { dx: smoothDx.current, dy: smoothDy.current };
      }
      prevWrist.current = { x: wrist.x, y: wrist.y };

      // ── Apparent hand size (depth proxy for zoom) ─────────────────────────
      // Use raw (un-mirrored) landmarks — scale is symmetric
      const rawHandSize = dist2D(lm[LANDMARKS.WRIST], lm[LANDMARKS.MIDDLE_MCP]);
      if (prevHandSize.current !== null) {
        const rawDelta = rawHandSize - prevHandSize.current;
        smoothSizeDelta.current = ema(smoothSizeDelta.current, rawDelta, 0.35);
      }
      prevHandSize.current = rawHandSize;

      // ── Pinch midpoint (mirrored X for country card targeting) ─────────────
      if (gesture === 'pinch') {
        const thumbTip = { x: 1 - lm[LANDMARKS.THUMB_TIP].x, y: lm[LANDMARKS.THUMB_TIP].y };
        const idxTip   = { x: 1 - lm[LANDMARKS.INDEX_TIP].x,  y: lm[LANDMARKS.INDEX_TIP].y };
        pinchMidpoint.current = {
          x: (thumbTip.x + idxTip.x) / 2,
          y: (thumbTip.y + idxTip.y) / 2,
        };
      }

      // ── State transitions ──────────────────────────────────────────────────
      if (gesture === 'fist' || gesture === 'none') {
        reset();
        if (gesture === 'fist' && !idleTimer.current) {
          idleTimer.current = setTimeout(() => {
            useAppStore.getState().dismissCard();
            useAppStore.getState().setAutoRotating(true);
            idleTimer.current = null;
          }, 500);
        }

      } else if (gesture === 'open_palm') {
        isRotating.current    = true;
        isSpreading.current   = false;
        isPinchActive.current = false;
        isPointing.current    = false;
        clearTimeout(pointTimer.current);
        clearTimeout(pinchTimer.current);
        pointTimer.current = null;
        pinchTimer.current = null;
        useAppStore.getState().setAutoRotating(false);

      } else if (gesture === 'spread') {
        isSpreading.current   = true;
        isRotating.current    = false;
        isPinchActive.current = false;
        isPointing.current    = false;
        clearTimeout(pointTimer.current);
        clearTimeout(pinchTimer.current);
        pointTimer.current = null;
        pinchTimer.current = null;

      } else if (gesture === 'pinch') {
        isSpreading.current = false;
        isRotating.current  = false;
        isPointing.current  = false;
        if (!isPinchActive.current) {
          isPinchActive.current = true;
          pinchFired.current    = false;
          clearTimeout(pinchTimer.current);
          // Fire country lookup after 300ms hold
          pinchTimer.current = setTimeout(() => {
            if (isPinchActive.current && !pinchFired.current) firePinchLookup();
            pinchTimer.current = null;
          }, 300);
        }

      } else if (gesture === 'point') {
        if (!isPointing.current) {
          isPointing.current    = true;
          isRotating.current    = false;
          isSpreading.current   = false;
          isPinchActive.current = false;
          pointFired.current    = false;
          clearTimeout(pointTimer.current);
          pointTimer.current = setTimeout(() => {
            if (isPointing.current && !pointFired.current) firePointLookup();
            pointTimer.current = null;
          }, 400);
        }
      }

      // ── Apply gesture effects ──────────────────────────────────────────────

      // Open palm → rotate Y-axis only (lateral wrist movement)
      if (isRotating.current && gesture === 'open_palm') {
        const sensitivity = 2.0;
        const state = useAppStore.getState();
        state.setGlobeRotation(
          state.globeRotX,
          state.globeRotY - palmDelta.dx * sensitivity
        );
      }

      // Spread → zoom via apparent hand size change
      // Hand closer to camera → appears larger → sizeDelta > 0 → zoom in
      // Hand further from camera → appears smaller → sizeDelta < 0 → zoom out
      if (isSpreading.current && gesture === 'spread') {
        const zoomSensitivity = 8;
        const state = useAppStore.getState();
        state.setGlobeScale(state.globeScale + smoothSizeDelta.current * zoomSensitivity);
      }

      // ── Update store ───────────────────────────────────────────────────────
      useAppStore.getState().setGesture(
        gesture,
        confidence,
        { x: indexTip.x, y: indexTip.y },
        palmDelta,
        0
      );
    };

    let camera = null;

    const init = async () => {
      try {
        const hands = await createHandsInstance(onResults);
        useAppStore.getState().setMediaPipeLoading(false);
        camera = await createCamera(videoEl, hands);
        await camera.start();
        useAppStore.getState().setWebcamActive(true);
      } catch (err) {
        useAppStore.getState().setMediaPipeLoading(false);
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
          useAppStore.getState().setPermissionDenied(true);
        } else {
          console.warn('MediaPipe init error:', err.message);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      reset();
      clearTimeout(idleTimer.current);
      stopCamera();
      useAppStore.getState().setWebcamActive(false);
      useAppStore.getState().setGesture('none', 0, null);
    };
  }, [videoEl, reset, firePointLookup, firePinchLookup]);

  return null;
}
