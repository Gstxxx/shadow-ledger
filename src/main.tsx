import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './art/game-ui.css';
import App from './App.tsx';

const root = document.getElementById('root')!;
// Botões e controles com o visual de jogo do kit de arte (.g-skin estiliza os .btn existentes).
root.classList.add('g-skin');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
