import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import { AuthProvider } from './context/AuthContext';

// Build metadata logging for development/debug
function getBuildMetadata() {
  const branch = import.meta.env.VITE_GIT_BRANCH || 'unknown';
  const commitSha = import.meta.env.VITE_GIT_COMMIT_SHA || 'unknown';
  const mode = import.meta.env.MODE || 'development';
  
  const metadata = {
    branch,
    commitSha,
    mode
  };
  
  if (mode === 'development') {
    console.log('📦 Frontend Build Metadata:', JSON.stringify(metadata, null, 2));
  }
  
  return metadata;
}

getBuildMetadata();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
