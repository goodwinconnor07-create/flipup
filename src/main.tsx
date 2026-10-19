import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { boot } from './state/store';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { installPressEffects } from './ui/effects';
import './styles/global.css';
import './styles/screens.css';
import './styles/table.css';

boot();
installPressEffects();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
