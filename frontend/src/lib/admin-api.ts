import { api } from './api';

export interface BrainDashboard {
  status: string;
  version: string;
  brainIQ: number;
  learningScore: number;
  knowledgeCoverage: number;
  entityCount: number;
  relationshipCount: number;
  recommendationAccuracy: number;
  averageConfidence: number;
  executionCount: number;
  averageProcessingTime: number;
  activeAgents: number;
  overallHealth: string;
}

export interface EngineHealth {
  name: string;
  status: string;
  brainIQ?: number;
  executions?: number;
}

export interface BrainHealth {
  engines: Record<string, EngineHealth>;
  database: string;
  redis: string;
  llmProviders: string;
  overall: string;
  lastChecked: string;
}

export interface LearningData {
  score: any;
  summary: any;
  trends: any;
  rulePerformance: any;
  engine: any;
}

export interface GraphData {
  entityCount: number;
  relationshipCount: number;
  duplicateRate: number;
  averageConfidence: number;
  entityTypes: Record<string, any>;
  relationshipTypes: Record<string, any>;
  newestEntities: any[];
  health: any;
}

export interface AgentInfo {
  name: string;
  status: string;
  capabilities: string[];
  dependencies: string[];
  metrics: { invocations: number; avgTime: number; failures: number };
  lastExecution: string | null;
}

export interface AgentData {
  agents: AgentInfo[];
  status: any;
  health: any;
}

export interface ExecutionRecord {
  id: string;
  module: string;
  company: string;
  product: string;
  agentsUsed: string[];
  processingTime: number;
  brainIQ: number;
  confidence: number;
  status: string;
  timestamp: string;
}

export async function getBrainDashboard() {
  return api.get<{ success: boolean; dashboard: BrainDashboard }>('/admin/brain/dashboard');
}

export async function getBrainHealth() {
  return api.get<{ success: boolean; health: BrainHealth }>('/admin/brain/health');
}

export async function getBrainLearning() {
  return api.get<{ success: boolean; learning: LearningData }>('/admin/brain/learning');
}

export async function getBrainGraph() {
  return api.get<{ success: boolean; graph: GraphData }>('/admin/brain/graph');
}

export async function getBrainAgents() {
  return api.get<{ success: boolean; agents: AgentInfo[]; status: any; health: any }>('/admin/brain/agents');
}

export async function getBrainMemory() {
  return api.get<{ success: boolean; memory: any }>('/admin/brain/memory');
}

export async function getBrainRecommendations() {
  return api.get<{ success: boolean; recommendations: any }>('/admin/brain/recommendations');
}

export async function getBrainPerformance() {
  return api.get<{ success: boolean; performance: any }>('/admin/brain/performance');
}

export async function getBrainExecutions() {
  return api.get<{ success: boolean; executions: ExecutionRecord[] }>('/admin/brain/executions');
}

export interface DiagnosticsData {
  pipeline: string;
  currentRequest: any;
  engineTimings: Record<string, { status: string; latency: number | null }>;
  errors: any[];
  warnings: any[];
  databaseLatency: number | null;
  memoryUsage: { rss: number; heapTotal: number; heapUsed: number } | null;
  graphLatency: number | null;
  learningLatency: number | null;
  timestamp: string;
}

export async function getBrainDiagnostics() {
  return api.get<{ success: boolean; diagnostics: DiagnosticsData }>('/admin/brain/diagnostics');
}
