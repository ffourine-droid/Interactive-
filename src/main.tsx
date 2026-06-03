import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Analytics } from '@vercel/analytics/react';

// Define global navigation helpers for dynamic syllabus/CBC HTML materials
(window as any).openStrand = function(strandId?: any, strandName?: string) {
  console.log("Syllabus Strand navigation requested:", strandId, strandName);
  const ev = new CustomEvent('open-strand', { 
    detail: { strandId: strandId || '', strandName: strandName || '' } 
  });
  window.dispatchEvent(ev);
};

(window as any).openSubstrand = function(subStrandId?: any, subStrandName?: string) {
  console.log("Syllabus Sub-strand navigation requested:", subStrandId, subStrandName);
  const ev = new CustomEvent('open-substrand', { 
    detail: { subStrandId: subStrandId || '', subStrandName: subStrandName || '' } 
  });
  window.dispatchEvent(ev);
};

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
    <Analytics />
  </StrictMode>,
);

// Hide the initial loading spinner instantly
const loader = document.getElementById('app-loading');
if (loader) {
  loader.style.display = 'none';
  loader.remove();
}

// Register Service Worker for Offline Support
if ('serviceWorker' in navigator) {
  const isDevOrSandbox = window.location.hostname === 'localhost' || 
                         window.location.hostname.includes('run.app') || 
                         window.location.hostname.includes('aistudio');

  if (isDevOrSandbox) {
    // Unregister any active service workers in development / preview sandbox
    // to prevent reverse proxy asset blocking, CORS, and cache poisoning
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister().then(success => {
          if (success) console.log('Successfully unregistered stale SW in sandbox/dev env');
        });
      }
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered: ', registration);
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
}
