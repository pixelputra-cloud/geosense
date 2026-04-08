import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // Globe transform
  globeRotX: 0,
  globeRotY: 0,
  globeScale: 1,
  isAutoRotating: true,

  // Gesture state
  activeGesture: 'none', // 'open_palm' | 'pinch' | 'point' | 'fist' | 'none'
  gestureConfidence: 0,
  fingertipPosition: null, // { x, y } in screen-space 0-1
  palmDelta: { dx: 0, dy: 0 },
  pinchDistance: 0,
  isWebcamActive: false,
  isMediaPipeLoading: false,
  isPermissionDenied: false,

  // Country
  selectedCountry: null, // { iso2, iso3, name }
  countryCardState: 'idle', // 'idle' | 'loading' | 'loaded' | 'error'
  newsSummary: null,
  countryCache: {},

  // UI
  showOnboarding: typeof window !== 'undefined'
    ? !localStorage.getItem('geosense_onboarded')
    : false,
  showWebcamPreview: true,

  // Globe mesh ref for raycasting (set from Globe component)
  globeMeshRef: { current: null },

  // Actions
  setGlobeTransform: (rotX, rotY, scale) =>
    set({ globeRotX: rotX, globeRotY: rotY, globeScale: scale }),

  setGlobeRotation: (rotX, rotY) =>
    set({ globeRotX: rotX, globeRotY: rotY }),

  setGlobeScale: (scale) =>
    set({ globeScale: Math.max(0.5, Math.min(4.0, scale)) }),

  setAutoRotating: (val) => set({ isAutoRotating: val }),

  setGesture: (type, confidence, tip, palmDelta, pinchDistance) =>
    set({
      activeGesture: type,
      gestureConfidence: confidence,
      fingertipPosition: tip,
      palmDelta: palmDelta || { dx: 0, dy: 0 },
      pinchDistance: pinchDistance || 0,
    }),

  setWebcamActive: (val) => set({ isWebcamActive: val }),
  setMediaPipeLoading: (val) => set({ isMediaPipeLoading: val }),
  setPermissionDenied: (val) => set({ isPermissionDenied: val }),

  selectCountry: (country) =>
    set({
      selectedCountry: country,
      countryCardState: 'loading',
      newsSummary: null,
    }),

  setNewsSummary: (text) =>
    set({ newsSummary: text, countryCardState: 'loaded' }),

  setNewsError: () =>
    set({ countryCardState: 'error' }),

  cacheNews: (isoCode, text) =>
    set((state) => ({
      countryCache: { ...state.countryCache, [isoCode]: text },
    })),

  dismissCard: () =>
    set({
      selectedCountry: null,
      countryCardState: 'idle',
      newsSummary: null,
    }),

  toggleWebcamPreview: () =>
    set((state) => ({ showWebcamPreview: !state.showWebcamPreview })),

  dismissOnboarding: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('geosense_onboarded', '1');
    }
    set({ showOnboarding: false });
  },
}));

export default useAppStore;
