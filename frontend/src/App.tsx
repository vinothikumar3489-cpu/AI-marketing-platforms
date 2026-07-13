import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { ProjectProvider } from './context/ProjectContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GrowthWorkspacePage from './pages/GrowthWorkspacePage';
import SEOIntelligencePage from './pages/SEOIntelligencePage';
import CampaignIntelligencePage from './pages/CampaignIntelligencePage';
import AutomationCenterPage from './pages/AutomationCenterPage';
import ChatHistoryPage from './pages/ChatHistoryPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ExecutiveStoryPage from './pages/ExecutiveStoryPage';
import ContentStudioPage from './pages/ContentStudioPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="screen-loader">Loading platform...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

console.info('[Frontend Build]', {
  commitSha: import.meta.env.VITE_COMMIT_SHA || 'unknown',
  mode: import.meta.env.MODE
});

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/app" element={<Protected><ProjectProvider><AppLayout /></ProjectProvider></Protected>}>
        <Route index element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
        <Route path="dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
        <Route path="growth-workspace" element={<ErrorBoundary><GrowthWorkspacePage /></ErrorBoundary>} />
        <Route path="product-intelligence" element={<Navigate to="/app/growth-workspace" replace />} />
        <Route path="seo" element={<ErrorBoundary><SEOIntelligencePage /></ErrorBoundary>} />
        <Route path="campaigns" element={<ErrorBoundary><CampaignIntelligencePage /></ErrorBoundary>} />
        <Route path="executive-story" element={<ErrorBoundary><ExecutiveStoryPage /></ErrorBoundary>} />
        <Route path="automation-center" element={<ErrorBoundary><AutomationCenterPage /></ErrorBoundary>} />
        <Route path="content-studio" element={<ErrorBoundary><ContentStudioPage /></ErrorBoundary>} />
        <Route path="chat-history" element={<ErrorBoundary><ChatHistoryPage /></ErrorBoundary>} />
        <Route path="profile" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
