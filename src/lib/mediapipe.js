/**
 * MediaPipe Hands initialization.
 * Uses CDN locateFile override — required for WASM resolution in bundled builds.
 */

let handsInstance = null;
let cameraInstance = null;

const isMobile = typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches;

export async function createHandsInstance(onResults) {
  // MediaPipe Hands is loaded via CDN script tag — use window global
  // Falls back to npm import if global not available
  const HandsClass = window.Hands ?? (await import('@mediapipe/hands').then(
    m => m.Hands ?? m.default?.Hands ?? m.default
  ));

  const hands = new HandsClass({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: isMobile ? 0 : 1,  // lighter model on mobile
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
  });

  hands.onResults(onResults);
  handsInstance = hands;
  return hands;
}

/**
 * Bypass @mediapipe/camera_utils Camera class — it doesn't support facingMode
 * on mobile. Use getUserMedia directly so we can request the front camera.
 */
export async function createCamera(videoEl, hands) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width:  { ideal: 320 },
      height: { ideal: 240 },
      facingMode: 'user',   // front camera on mobile, front/default on desktop
    },
    audio: false,
  });

  videoEl.srcObject = stream;
  await videoEl.play();

  let running = true;

  const frameLoop = async () => {
    if (!running) return;
    if (videoEl.readyState >= 2) {
      await hands.send({ image: videoEl });
    }
    requestAnimationFrame(frameLoop);
  };
  requestAnimationFrame(frameLoop);

  cameraInstance = {
    start: () => Promise.resolve(),   // already started above
    stop: () => {
      running = false;
      stream.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    },
  };

  return cameraInstance;
}

export function stopCamera() {
  if (cameraInstance) {
    cameraInstance.stop();
    cameraInstance = null;
  }
  if (handsInstance) {
    handsInstance.close();
    handsInstance = null;
  }
}

/**
 * Landmark indices for hand skeleton
 */
export const LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

// Connections for drawing skeleton
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17],            // Palm
];
