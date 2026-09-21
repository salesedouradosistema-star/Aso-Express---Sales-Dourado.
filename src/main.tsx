import 'firebase/app';
import 'firebase/auth';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent uncaught cross-origin frame access SecurityErrors in sandboxed iframes
function isCrossOriginSecurityError(msg: unknown, err?: unknown): boolean {
  try {
    const errObj = (err && typeof err === 'object') ? (err as { message?: string; name?: string }) : null;
    const fullText = (
      String(msg || '') + ' ' +
      String(errObj?.message || '') + ' ' +
      String(errObj?.name || '') + ' ' +
      String(err || '')
    ).toLowerCase();
    return (
      fullText.includes('blocked a frame with origin') ||
      fullText.includes('cross-origin frame') ||
      fullText.includes('securityerror') ||
      errObj?.name === 'SecurityError'
    );
  } catch {
    return false;
  }
}

const prevOnError = window.onerror;
window.onerror = function (message, source, lineno, colno, error) {
  if (isCrossOriginSecurityError(message, error)) {
    console.warn('Cross-origin frame error intercepted (main.tsx window.onerror):', message);
    return true;
  }
  if (typeof prevOnError === 'function') {
    return prevOnError.apply(this, [message, source, lineno, colno, error]);
  }
  return false;
};

window.addEventListener('error', (event) => {
  const msg = event?.message || event?.error?.message || '';
  if (isCrossOriginSecurityError(msg, event?.error)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    console.warn('Cross-origin frame error intercepted (main.tsx error event):', msg);
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const msg = typeof reason === 'string' ? reason : (reason?.message || reason?.name || '');
  if (isCrossOriginSecurityError(msg, reason)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    console.warn('Cross-origin frame rejection intercepted (main.tsx unhandledrejection):', msg);
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
