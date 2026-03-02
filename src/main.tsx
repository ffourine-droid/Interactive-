import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('AZILEARN BOOTING v1.0.5 - ' + new Date().toISOString());

// Global error handler for mobile debugging
window.onerror = function(message, source, lineno, colno, error) {
  const errorMsg = `Error: ${message}\nSource: ${source}\nLine: ${lineno}`;
  console.error(errorMsg);
  // Only alert in development or if it's a critical crash
  if (window.location.hostname !== 'localhost') {
    // Optional: Add a UI fallback here
  }
  return false;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
