import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import RootLayout from './layout.tsx';
import './index.css';

// Register PWA Service Worker for offline support & mobile installability
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.info('PWA Service worker registration note:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <RootLayout>
    <App />
  </RootLayout>
);
