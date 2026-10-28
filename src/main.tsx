import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { boot } from './state/store';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { installPressEffects, installTapGuard } from './ui/effects';
import { installSoundUnlock } from './ui/sound';
import { installDesktopScale } from './ui/useDesktop';
import './styles/global.css';
import './styles/screens.css';
import './styles/table.css';
import './styles/desktop.css';
import './styles/replay.css';
import './styles/home.css';
import './styles/party.css';

boot();
installPressEffects();
installTapGuard();
installSoundUnlock();
installDesktopScale();

// After one visit the app opens without a connection (see public/sw.js). Only in the built app.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
