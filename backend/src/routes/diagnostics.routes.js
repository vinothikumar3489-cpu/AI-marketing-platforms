import { Router } from 'express';
import { isDataForSEOConfigured, isDataForSEOAvailable, getDataForSEOStatus } from "../providers/dataforseo.service.js";
import { getAIProviderDiagnostics } from "../domains/ai/services/aiOrchestrator.service.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const diagnosticsRouter = Router();

diagnosticsRouter.use(requireAuth);

diagnosticsRouter.get('/providers', async (req, res) => {
  const aiProviders = getAIProviderDiagnostics();
  const dataForSEO = getDataForSEOStatus();

  return res.json({
    success: true,
    aiProviders,
    dataForSEO,
    summary: {
      aiProvidersConfigured: aiProviders.filter(p => p.configured).length,
      aiProvidersAvailable: aiProviders.filter(p => p.status === 'AVAILABLE').length,
      aiProvidersInCooldown: aiProviders.filter(p => p.cooldownActive).length,
      dataForSEOConfigured: dataForSEO.configured,
      dataForSEOAvailable: dataForSEO.available,
    }
  });
});

export default diagnosticsRouter;
