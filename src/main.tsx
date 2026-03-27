import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('Faith Trainer: Initializing main.tsx');

const renderApp = () => {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element with id "root" not found in DOM.');
    }
    
    console.log('Faith Trainer: Root element found, starting render');
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    console.log('Faith Trainer: Render call completed');
  } catch (error) {
    console.error('Faith Trainer: Critical rendering error:', error);
    const errorContainer = document.createElement('div');
    errorContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; color: black; padding: 20px; font-family: monospace; z-index: 9999; overflow: auto;';
    errorContainer.innerHTML = `
      <h1 style="color: #e11d48; margin-bottom: 16px;">Ошибка запуска приложения</h1>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px;">
        <p><strong>Сообщение:</strong> ${error instanceof Error ? error.message : String(error)}</p>
        <p><strong>Стек:</strong></p>
        <pre style="font-size: 12px; color: #475569;">${error instanceof Error ? error.stack : 'No stack trace available'}</pre>
      </div>
      <p style="margin-top: 20px; color: #64748b; font-size: 14px;">Попробуйте обновить страницу или проверить настройки SSL в Cloudflare.</p>
    `;
    document.body.appendChild(errorContainer);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
