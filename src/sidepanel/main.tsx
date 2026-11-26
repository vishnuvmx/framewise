import '@fontsource-variable/dm-sans';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/sidepanel/App';
import '@/sidepanel/styles/index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
