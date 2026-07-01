// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

// Global error reporter to catch and display unhandled runtime errors on the screen
if (typeof window !== 'undefined') {
  window.onerror = function (message, source, lineno, colno, error) {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.bottom = '20px';
    div.style.left = '20px';
    div.style.right = '20px';
    div.style.background = '#ef4444';
    div.style.color = '#ffffff';
    div.style.padding = '15px';
    div.style.zIndex = '999999';
    div.style.borderRadius = '8px';
    div.style.fontFamily = 'monospace';
    div.style.fontSize = '12px';
    div.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    div.innerHTML = `<strong>GLOBAL ERROR:</strong> ${message}<br/><small>${source}:${lineno}:${colno}</small><br/>${error ? error.stack : ''}`;
    document.body.appendChild(div);
    return false;
  };

  window.onunhandledrejection = function (event) {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.bottom = '120px';
    div.style.left = '20px';
    div.style.right = '20px';
    div.style.background = '#f59e0b';
    div.style.color = '#ffffff';
    div.style.padding = '15px';
    div.style.zIndex = '999999';
    div.style.borderRadius = '8px';
    div.style.fontFamily = 'monospace';
    div.style.fontSize = '12px';
    div.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    div.innerHTML = `<strong>UNHANDLED REJECTION:</strong> ${event.reason}<br/>${event.reason && event.reason.stack ? event.reason.stack : ''}`;
    document.body.appendChild(div);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
