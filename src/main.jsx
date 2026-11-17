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
  const hadController = !!navigator.serviceWorker.controller;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // App instalada fica aberta muito tempo: procurar versões novas quando volta a ficar visível
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
  });
  // Uma versão nova acabou de ser instalada: avisar e atualizar com um toque
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || document.getElementById('pb-update')) return;
    const b = document.createElement('button');
    b.id = 'pb-update';
    b.type = 'button';
    b.textContent = 'NOVA VERSÃO INSTALADA — TOCA PARA ATUALIZAR';
    b.style.cssText = 'position:fixed;left:50%;top:calc(8px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:9999;'
      + 'padding:10px 14px;font:inherit;font-size:12px;letter-spacing:.1em;cursor:pointer;border-radius:4px;'
      + 'color:rgb(var(--cb));background:rgb(var(--c));border:0;box-shadow:0 0 16px rgb(var(--c) / .6);max-width:calc(100% - 32px)';
    b.addEventListener('click', () => window.location.reload());
    document.body.appendChild(b);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <Router>
    <App />
  </Router>
);
