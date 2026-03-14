import React from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// swagger-editor UMD expects React + ReactDOM on window
window.React = React;
window.ReactDOM = ReactDOM;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

loadScript('/vendor/swagger-editor.js').then(() => {
  const root = createRoot(document.getElementById('root')!);
  root.render(<App />);
});
