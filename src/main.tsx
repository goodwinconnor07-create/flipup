import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { boot } from './state/store';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { installPressEffects } from './ui/effects';
import { installSoundUnlock } from './ui/sound';
import { installDesktopScale } from './ui/useDesktop';
import './styles/global.css';
import './styles/screens.css';
import './styles/table.css';
import './styles/desktop.css';
import './styles/train.css';
import './styles/home.css';

boot();
installPressEffects();
installSoundUnlock();
installDesktopScale();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
