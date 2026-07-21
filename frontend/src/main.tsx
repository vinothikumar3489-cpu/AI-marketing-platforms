import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import { AuthProvider } from './context/AuthContext';

// Log frontend build info on startup
console.log('[FRONTEND BUILD INFO]', {
  gitCommit: import.meta.env.VITE_GIT_COMMIT || 'unknown',
  buildTimestamp: import.meta.env.VITE_BUILD_TIMESTAMP || new Date().toISOString(),
  frontendVersion: '1.0.0',
  environment: import.meta.env.MODE || 'development'
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
