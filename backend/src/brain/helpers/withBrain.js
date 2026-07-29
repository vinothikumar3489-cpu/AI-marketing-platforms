import { getBrain } from '../index.js';

const MODULE_ADAPTER_MAP = {
  product: 'product',
  competitor: 'competitor',
  company: 'companyIntelligence',
  geo: 'geo',
  audience: 'audience',
  content: 'contentStudio',
  campaign: 'campaign',
  crm: 'crm',
  email: 'email',
  analytics: 'analytics',
  research: 'research',
  workflow: 'workflow',
  seo: 'seo',
};

export async function withBrain(requestData) {
  const brain = getBrain();
  if (!brain) return null;
  try {
    const brainResponse = await brain.process(requestData);
    return brainResponse.toControllerSummary();
  } catch (err) {
    return null;
  }
}

export async function brainProcess(module, action, params = {}) {
  const request = {
    module,
    action,
    ...params,
  };
  return withBrain(request);
}

export function getModuleAdapter(module) {
  const adapterName = MODULE_ADAPTER_MAP[module];
  if (!adapterName) return null;
  const brain = getBrain();
  if (!brain) return null;
  return brain.getEngine(adapterName);
}
