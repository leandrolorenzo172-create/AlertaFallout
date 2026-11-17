import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, MemoryRouter } from 'react-router-dom';
import App from './App';
import { IS_ARTIFACT } from '@/api/base44Client';
import './index.css';
import { applyTheme } from './theme';

applyTheme(); // aplica o tema guardado antes de desenhar a app

// Dentro do artefacto do claude.ai o endereço não pode mudar: usa-se um router em memória.
// Fora do claude.ai usa-se o endereço com # para funcionar em qualquer alojamento estático.
const Router = IS_ARTIFACT ? MemoryRouter : HashRouter;

// App instalável e com arranque sem internet. Dentro do claude.ai não se regista (o artefacto não o permite).
if (!IS_ARTIFACT && import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <Router>
    <App />
  </Router>
);
