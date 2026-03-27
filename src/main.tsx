import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('Faith Trainer initializing...');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');
  
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log('Faith Trainer rendered successfully');
} catch (error) {
  console.error('Faith Trainer rendering failed:', error);
  document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>Rendering Error</h1><pre>${error instanceof Error ? error.stack : String(error)}</pre></div>`;
}
