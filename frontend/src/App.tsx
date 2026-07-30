import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import AdminLayout from './components/AdminLayout';
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
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminHealthPage from './pages/admin/HealthPage';
import AdminLearningPage from './pages/admin/LearningPage';
import AdminGraphPage from './pages/admin/GraphPage';
import AdminAgentsPage from './pages/admin/AgentsPage';
import AdminMemoryPage from './pages/admin/MemoryPage';
import AdminRecommendationsPage from './pages/admin/RecommendationsPage';
import AdminDiagnosticsPage from './pages/admin/DiagnosticsPage';
import AdminPerformancePage from './pages/admin/PerformancePage';
import AdminExecutionsPage from './pages/admin/ExecutionsPage';
import IntelligenceLayout from './components/IntelligenceLayout';
import IntelligenceOverviewPage from './pages/admin/intelligence/OverviewPage';
import IntelligenceMarketPage from './pages/admin/intelligence/MarketPage';
import IntelligenceCompetitorsPage from './pages/admin/intelligence/CompetitorsPage';
import IntelligenceSeoPage from './pages/admin/intelligence/SeoPage';
import IntelligenceContentPage from './pages/admin/intelligence/ContentPage';
import IntelligenceCampaignPage from './pages/admin/intelligence/CampaignPage';
import IntelligenceLeadsPage from './pages/admin/intelligence/LeadsPage';
import IntelligenceAlertsPage from './pages/admin/intelligence/AlertsPage';
import IntelligenceTrendsPage from './pages/admin/intelligence/TrendsPage';
import IntelligenceInsightsPage from './pages/admin/intelligence/InsightsPage';
import { EmailWorkflow } from './components/email/EmailWorkflow';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="screen-loader">Loading platform...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminProtected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="screen-loader">Loading platform...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

console.info('[Frontend Build]', {
  commitSha: import.meta.env.VITE_COMMIT_SHA || 'unknown',
  mode: import.meta.env.MODE
});

export default function App() {
  const location = useLocation();
  const resetKey = location.pathname.split('/').pop() || 'root';
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/app" element={<Protected><ProjectProvider><AppLayout /></ProjectProvider></Protected>}>
        <Route index element={<ErrorBoundary resetKey={resetKey}><DashboardPage /></ErrorBoundary>} />
        <Route path="dashboard" element={<ErrorBoundary resetKey={resetKey}><DashboardPage /></ErrorBoundary>} />
        <Route path="growth-workspace" element={<ErrorBoundary resetKey={resetKey}><GrowthWorkspacePage /></ErrorBoundary>} />
        <Route path="product-intelligence" element={<Navigate to="/app/growth-workspace" replace />} />
        <Route path="seo" element={<ErrorBoundary resetKey={resetKey}><SEOIntelligencePage /></ErrorBoundary>} />
        <Route path="campaigns" element={<ErrorBoundary resetKey={resetKey}><CampaignIntelligencePage /></ErrorBoundary>} />
        <Route path="executive-story" element={<ErrorBoundary resetKey={resetKey}><ExecutiveStoryPage /></ErrorBoundary>} />
        <Route path="automation-center" element={<ErrorBoundary resetKey={resetKey}><AutomationCenterPage /></ErrorBoundary>} />
        <Route path="content-studio" element={<ErrorBoundary resetKey={resetKey}><ContentStudioPage /></ErrorBoundary>} />
        <Route path="email-builder" element={<ErrorBoundary resetKey={resetKey}><div style={{ padding: '24px', height: '100%', overflow: 'auto' }}><EmailWorkflow /></div></ErrorBoundary>} />
        <Route path="chat-history" element={<ErrorBoundary resetKey={resetKey}><ChatHistoryPage /></ErrorBoundary>} />
        <Route path="profile" element={<ErrorBoundary resetKey={resetKey}><ProfilePage /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary resetKey={resetKey}><SettingsPage /></ErrorBoundary>} />
      </Route>
      <Route path="/admin" element={<AdminProtected><AdminLayout /></AdminProtected>}>
        <Route index element={<Navigate to="/admin/brain/dashboard" replace />} />
        <Route path="brain/dashboard" element={<ErrorBoundary resetKey={resetKey}><AdminDashboardPage /></ErrorBoundary>} />
        <Route path="brain/health" element={<ErrorBoundary resetKey={resetKey}><AdminHealthPage /></ErrorBoundary>} />
        <Route path="brain/learning" element={<ErrorBoundary resetKey={resetKey}><AdminLearningPage /></ErrorBoundary>} />
        <Route path="brain/graph" element={<ErrorBoundary resetKey={resetKey}><AdminGraphPage /></ErrorBoundary>} />
        <Route path="brain/agents" element={<ErrorBoundary resetKey={resetKey}><AdminAgentsPage /></ErrorBoundary>} />
        <Route path="brain/memory" element={<ErrorBoundary resetKey={resetKey}><AdminMemoryPage /></ErrorBoundary>} />
        <Route path="brain/recommendations" element={<ErrorBoundary resetKey={resetKey}><AdminRecommendationsPage /></ErrorBoundary>} />
        <Route path="brain/diagnostics" element={<ErrorBoundary resetKey={resetKey}><AdminDiagnosticsPage /></ErrorBoundary>} />
        <Route path="brain/performance" element={<ErrorBoundary resetKey={resetKey}><AdminPerformancePage /></ErrorBoundary>} />
        <Route path="brain/executions" element={<ErrorBoundary resetKey={resetKey}><AdminExecutionsPage /></ErrorBoundary>} />
      </Route>
      <Route path="/admin/intelligence" element={<AdminProtected><IntelligenceLayout /></AdminProtected>}>
        <Route index element={<Navigate to="/admin/intelligence/overview" replace />} />
        <Route path="overview" element={<ErrorBoundary resetKey={resetKey}><IntelligenceOverviewPage /></ErrorBoundary>} />
        <Route path="market" element={<ErrorBoundary resetKey={resetKey}><IntelligenceMarketPage /></ErrorBoundary>} />
        <Route path="competitors" element={<ErrorBoundary resetKey={resetKey}><IntelligenceCompetitorsPage /></ErrorBoundary>} />
        <Route path="seo" element={<ErrorBoundary resetKey={resetKey}><IntelligenceSeoPage /></ErrorBoundary>} />
        <Route path="content" element={<ErrorBoundary resetKey={resetKey}><IntelligenceContentPage /></ErrorBoundary>} />
        <Route path="campaigns" element={<ErrorBoundary resetKey={resetKey}><IntelligenceCampaignPage /></ErrorBoundary>} />
        <Route path="leads" element={<ErrorBoundary resetKey={resetKey}><IntelligenceLeadsPage /></ErrorBoundary>} />
        <Route path="alerts" element={<ErrorBoundary resetKey={resetKey}><IntelligenceAlertsPage /></ErrorBoundary>} />
        <Route path="trends" element={<ErrorBoundary resetKey={resetKey}><IntelligenceTrendsPage /></ErrorBoundary>} />
        <Route path="insights" element={<ErrorBoundary resetKey={resetKey}><IntelligenceInsightsPage /></ErrorBoundary>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
