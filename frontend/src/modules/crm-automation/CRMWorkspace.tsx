import { useState } from 'react';
import { LayoutDashboard, Users, Building, Trello, CheckSquare, Workflow, Upload, Brain } from 'lucide-react';
import { CRMDashboard } from './CRMDashboard';
import { CRMContactsPage } from './CRMContactsPage';
import { CRMCompaniesPage } from './CRMCompaniesPage';
import { CRMPipelineBoard } from './CRMPipelineBoard';
import { CRMTasksPage } from './CRMTasksPage';
import { CRMWorkflowList } from './CRMWorkflowList';
import { CRMImportWizard } from './CRMImportWizard';
import { AICopilotDashboard } from '../sales-copilot/AICopilotDashboard';
import { DealInsightsPanel } from '../sales-copilot/DealInsightsPanel';
import { MeetingPrepPanel } from '../sales-copilot/MeetingPrepPanel';
import { CopilotMemoryTimeline } from '../sales-copilot/CopilotMemoryTimeline';
import { SalesSidekickWidget } from '../sales-copilot/SalesSidekickWidget';
import { useProject } from '../../context/ProjectContext';

type Tab = 'dashboard' | 'contacts' | 'companies' | 'pipeline' | 'tasks' | 'workflows' | 'import' | 'copilot' | 'copilot-details';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'contacts', label: 'Contacts', icon: Users },
  { key: 'companies', label: 'Companies', icon: Building },
  { key: 'pipeline', label: 'Pipeline', icon: Trello },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'workflows', label: 'Workflows', icon: Workflow },
  { key: 'import', label: 'Import', icon: Upload },
  { key: 'copilot', label: 'AI Copilot', icon: Brain },
];

export function CRMWorkspace() {
  const { selectedChatId } = useProject();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [copilotView, setCopilotView] = useState<string>('dashboard');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [showCompanyDetail, setShowCompanyDetail] = useState(false);

  function handleCopilotNavigate(view: string) {
    setCopilotView(view);
    setActiveTab('copilot');
  }

  function handleViewCompany(companyId: string) {
    setSelectedCompanyId(companyId);
    setShowCompanyDetail(true);
  }

  function handleViewActivityTimeline() {
    setShowActivityTimeline(!showActivityTimeline);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div style={{
        display: 'flex', gap: '0', background: '#0f1729',
        borderBottom: '1px solid #293245', padding: '0 4px', overflowX: 'auto',
      }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 16px', border: 'none', cursor: 'pointer',
            whiteSpace: 'nowrap', fontSize: '13px', fontWeight: activeTab === key ? 600 : 400,
            background: activeTab === key ? 'rgba(83,167,255,0.1)' : 'transparent',
            color: activeTab === key ? '#53a7ff' : '#6b7a93',
            borderBottom: activeTab === key ? '2px solid #53a7ff' : '2px solid transparent',
            transition: 'all 0.15s ease',
          }}>
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }}>
        {activeTab === 'dashboard' && <CRMDashboard />}
        {activeTab === 'contacts' && <CRMContactsPage />}
        {activeTab === 'companies' && showCompanyDetail && selectedCompanyId ? (
          <CRMCompanyDetail companyId={selectedCompanyId} onBack={() => setShowCompanyDetail(false)} />
        ) : (
          <CRMCompaniesPage onViewCompany={handleViewCompany} />
        )}
        {activeTab === 'pipeline' && <CRMPipelineBoard />}
        {activeTab === 'tasks' && <CRMTasksPage />}
        {activeTab === 'workflows' && <CRMWorkflowList />}
        {activeTab === 'import' && <CRMImportWizard />}
        {activeTab === 'copilot' && copilotView === 'dashboard' && <AICopilotDashboard />}
        {activeTab === 'copilot' && copilotView === 'insights' && (
          <DealInsightsPanel chatId={selectedChatId} dealId={selectedDealId || ''} dealName={undefined} />
        )}
        {activeTab === 'copilot' && copilotView === 'timeline' && (
          <CopilotMemoryTimeline chatId={selectedChatId} contactId={selectedContactId || undefined} dealId={selectedDealId || undefined} />
        )}
        {activeTab === 'copilot' && copilotView === 'proposals' && (
          <DealInsightsPanel chatId={selectedChatId} dealId={selectedDealId || ''} dealName={undefined} />
        )}
        {activeTab === 'copilot' && (copilotView === 'health' || copilotView === 'alerts') && <AICopilotDashboard />}
      </div>

      {selectedChatId && (
        <SalesSidekickWidget chatId={selectedChatId} onNavigate={handleCopilotNavigate} />
      )}
    </div>
  );
}
