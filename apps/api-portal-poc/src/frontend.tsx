/**
 * Entry point for the React app.
 * Included in index.html via script tag.
 */
import { createRoot } from 'react-dom/client';
import { App } from './App';

function start() {
  const root = createRoot(document.getElementById('root')!);
  root.render(<App />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
