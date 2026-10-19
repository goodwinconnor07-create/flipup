import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { boot } from './state/store';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { installPressEffects } from './ui/effects';
import { installSoundUnlock } from './ui/sound';
import './styles/global.css';
import './styles/screens.css';
import './styles/table.css';
import './styles/train.css';

boot();
installPressEffects();
installSoundUnlock();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
