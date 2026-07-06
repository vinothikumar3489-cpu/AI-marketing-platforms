import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/app" element={<Protected><ProjectProvider><AppLayout /></ProjectProvider></Protected>}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="growth-workspace" element={<GrowthWorkspacePage />} />
        <Route path="product-intelligence" element={<Navigate to="/app/growth-workspace" replace />} />
        <Route path="seo" element={<SEOIntelligencePage />} />
        <Route path="campaigns" element={<CampaignIntelligencePage />} />
        <Route path="executive-story" element={<ExecutiveStoryPage />} />
        <Route path="automation-center" element={<AutomationCenterPage />} />
        <Route path="content-studio" element={<ContentStudioPage />} />
        <Route path="chat-history" element={<ChatHistoryPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
