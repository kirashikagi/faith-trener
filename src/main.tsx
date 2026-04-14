import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Доступно обновление приложения. Обновить сейчас?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('Приложение готово к работе оффлайн');
  },
});

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
