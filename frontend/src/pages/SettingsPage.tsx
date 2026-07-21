import { useState, useEffect } from 'react';
import { Card, PageHeader } from '../components/UI';

interface BuildInfo {
  gitCommit: string;
  gitBranch: string;
  buildTimestamp: string;
  backendVersion: string;
  contentSchemaVersion: string;
  contentTypeRegistryVersion: string;
  nodeEnv: string;
}

export default function SettingsPage() {
  const [backendBuildInfo, setBackendBuildInfo] = useState<BuildInfo | null>(null);
  const [frontendBuildInfo, setFrontendBuildInfo] = useState<any>(null);
  const [versionMismatch, setVersionMismatch] = useState(false);

  useEffect(() => {
    // Frontend build info
    const frontendInfo = {
      gitCommit: import.meta.env.VITE_GIT_COMMIT || 'unknown',
      buildTimestamp: import.meta.env.VITE_BUILD_TIMESTAMP || new Date().toISOString(),
      frontendVersion: '1.0.0',
      environment: import.meta.env.MODE || 'development'
    };
    setFrontendBuildInfo(frontendInfo);

    // Fetch backend build info
    fetch('/api/system/build-info')
      .then(res => res.json())
      .then(data => {
        setBackendBuildInfo(data);
        // Check for version mismatch
        if (frontendInfo.gitCommit !== data.gitCommit && 
            frontendInfo.gitCommit !== 'unknown' && 
            data.gitCommit !== 'unknown') {
          setVersionMismatch(true);
        }
      })
      .catch(err => {
        console.error('Failed to fetch backend build info:', err);
      });
  }, []);

  const handleForceRefresh = () => {
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.reload();
  };

  return (
    <div>
      <PageHeader 
        eyebrow="Settings" 
        title="Settings" 
        subtitle="Provider keys are managed only in backend environment variables."
      />
      
      <Card>
        <h2>Platform Settings</h2>
        <p>Dark SaaS UI enabled. Backend API URL is configured using VITE_API_URL.</p>
      </Card>

      <Card style={{ marginTop: '20px' }}>
        <h3>Diagnostics</h3>
        
        {versionMismatch && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fee2e2', 
            border: '1px solid #ef4444', 
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <strong style={{ color: '#dc2626' }}>⚠️ Version Mismatch Detected</strong>
            <p style={{ marginTop: '8px', color: '#dc2626' }}>
              Frontend and backend commits do not match. This may cause compatibility issues.
            </p>
            <button 
              onClick={handleForceRefresh}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              Force Refresh
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4>Frontend Build Info</h4>
            <pre style={{ 
              backgroundColor: '#f3f4f6', 
              padding: '12px', 
              borderRadius: '6px',
              fontSize: '12px',
              overflow: 'auto'
            }}>
              {JSON.stringify(frontendBuildInfo, null, 2)}
            </pre>
          </div>
          
          <div>
            <h4>Backend Build Info</h4>
            <pre style={{ 
              backgroundColor: '#f3f4f6', 
              padding: '12px', 
              borderRadius: '6px',
              fontSize: '12px',
              overflow: 'auto'
            }}>
              {JSON.stringify(backendBuildInfo, null, 2)}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
}
