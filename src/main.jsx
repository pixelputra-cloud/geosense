import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './App.jsx';

// WebGL availability check
const testCanvas = document.createElement('canvas');
const hasWebGL =
  !!(testCanvas.getContext('webgl2') || testCanvas.getContext('webgl'));

if (!hasWebGL) {
  document.getElementById('root').innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      color: #E8EDF5;
      font-family: 'Space Mono', monospace;
      text-align: center;
      background: #050810;
      padding: 40px;
    ">
      <div>
        <div style="font-size: 3rem; margin-bottom: 16px;">🌍</div>
        <h2 style="font-family: Georgia, serif; font-size: 1.5rem; margin-bottom: 12px;">WebGL Required</h2>
        <p style="color: #7A8BA6; font-size: 0.8rem; max-width: 300px; margin: 0 auto;">
          GeoSense requires WebGL to render the 3D globe. Please enable WebGL in your browser settings or use a modern browser like Chrome, Firefox, or Edge.
        </p>
      </div>
    </div>
  `;
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
