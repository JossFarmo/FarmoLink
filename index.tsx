
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

/**
 * O FarmoLink agora utiliza uma arquitetura Backend-for-Frontend (BFF).
 * As chaves de API são gerenciadas exclusivamente no servidor Node.js
 * para garantir segurança e compatibilidade com builds Android/Capacitor.
 */

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
