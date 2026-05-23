import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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

// Hide the initial loading spinner
const loader = document.getElementById('app-loading');
if (loader) {
  loader.style.opacity = '0';
  setTimeout(() => {
    loader.remove();
  }, 500);
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
