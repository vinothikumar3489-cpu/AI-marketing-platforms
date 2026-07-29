import { getBrain } from '../brain/index.js';

const MODULE_BY_PREFIX = [
  { prefix: '/api/dashboard', module: 'dashboard' },
  { prefix: '/api/analysis', module: 'analytics' },
  { prefix: '/api/product-analysis', module: 'product' },
  { prefix: '/api/scrape', module: 'research' },
  { prefix: '/api/integrations', module: 'integrations' },
  { prefix: '/api/user', module: 'user' },
  { prefix: '/api/notifications', module: 'notification' },
  { prefix: '/api/automation', module: 'automation' },
  { prefix: '/api/campaign', module: 'campaign' },
  { prefix: '/api/content', module: 'content' },
  { prefix: '/api/crm', module: 'crm' },
  { prefix: '/api/email', module: 'email' },
  { prefix: '/api/chats', module: 'chat' },
];

const SKIP_PREFIXES = ['/api/version', '/api/health', '/api/webhooks', '/api/local-assets'];
const ROUTES_WITH_EXISTING_BRAIN = ['/product/', '/competitor/', '/seo/'];

function shouldSkip(path) {
  for (const skip of SKIP_PREFIXES) {
    if (path.startsWith(skip)) return true;
  }
  for (const marker of ROUTES_WITH_EXISTING_BRAIN) {
    if (path.includes(marker)) return true;
  }
  return false;
}

function mapPathToModule(path) {
  for (const { prefix, module } of MODULE_BY_PREFIX) {
    if (path.startsWith(prefix)) return module;
  }
  return 'chat';
}

function extractRequestContext(req) {
  const body = req.body || {};
  const params = req.params || {};
  const query = req.query || {};

  return {
    companyName: body.companyName || body.company_name || params.companyName || query.companyName || '',
    website: body.website || params.website || query.website || '',
    industry: body.industry || params.industry || query.industry || '',
    productName: body.productName || body.product_name || params.productName || query.productName || '',
    market: body.market || params.market || query.market || '',
    language: body.language || params.language || query.language || '',
    userId: req.user?.id || body.userId || params.userId || '',
    chatId: params.chatId || body.chatId || query.chatId || '',
    campaignId: params.campaignId || body.campaignId || query.campaignId || '',
    contactId: params.contactId || body.contactId || '',
    dealId: params.dealId || body.dealId || '',
    workflowId: params.workflowId || body.workflowId || '',
    payload: body,
    metadata: { ip: req.ip, method: req.method, path: req.path },
  };
}

export async function brainMiddleware(req, res, next) {
  if (shouldSkip(req.path)) return next();

  const brain = getBrain();
  if (!brain) return next();

  const module = mapPathToModule(req.path);
  const context = extractRequestContext(req);

  try {
    const response = await brain.process({
      module,
      action: req.method.toLowerCase(),
      ...context,
    });
    req.brainSummary = response?.toControllerSummary ? response.toControllerSummary() : null;
  } catch {
    req.brainSummary = null;
  }

  const originalJson = res.json.bind(res);
  res.json = (data) => {
    if (data && typeof data === 'object' && !data.brainSummary && req.brainSummary) {
      data.brainSummary = req.brainSummary;
    }
    return originalJson(data);
  };

  next();
}
