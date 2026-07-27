import { isSerpAPIConfigured, isSerpAPIAvailable, getSerpAPIStatus, getCachedSerpAPIStatus } from "../serpapi.service.js";
import { isDataForSEOConfigured, isDataForSEOAvailable, verifyDataForSEO, getDataForSEOConnectionStatus } from "../../providers/dataforseo.service.js";

const HEALTH_STATES = {
  CONNECTED: 'CONNECTED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  UNAVAILABLE: 'UNAVAILABLE',
  UNVERIFIED: 'UNVERIFIED',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
};

const FEATURES = {
  SERP_RESULTS: 'serpResults',
  AUTOCOMPLETE: 'autocomplete',
  TRENDS: 'trends',
  KEYWORD_VOLUME: 'keywordVolume',
  DOMAIN_DATA: 'domainData',
  TECHNICAL_AUDIT: 'technicalAudit',
  BACKLINKS: 'backlinks',
};

const PROVIDER_CAPABILITIES = {
  serpapi: {
    features: {
      [FEATURES.SERP_RESULTS]: true,
      [FEATURES.AUTOCOMPLETE]: true,
      [FEATURES.TRENDS]: true,
      [FEATURES.KEYWORD_VOLUME]: true,
      [FEATURES.DOMAIN_DATA]: false,
      [FEATURES.TECHNICAL_AUDIT]: true,
      [FEATURES.BACKLINKS]: false,
    },
    priority: 1,
  },
  dataforseo: {
    features: {
      [FEATURES.SERP_RESULTS]: true,
      [FEATURES.AUTOCOMPLETE]: false,
      [FEATURES.TRENDS]: false,
      [FEATURES.KEYWORD_VOLUME]: true,
      [FEATURES.DOMAIN_DATA]: true,
      [FEATURES.TECHNICAL_AUDIT]: true,
      [FEATURES.BACKLINKS]: true,
    },
    priority: 2,
  },
};

let _lastHealthCheck = { serpapi: null, dataforseo: null };
let _healthCacheTtl = 60000;

async function checkSerpapiHealth() {
  const cached = _lastHealthCheck.serpapi;
  if (cached && Date.now() - cached.timestamp < _healthCacheTtl) {
    return cached;
  }
  try {
    const status = await getSerpAPIStatus();
    let health = HEALTH_STATES.UNAVAILABLE;
    if (status.available && status.status === 'AVAILABLE') {
      health = HEALTH_STATES.CONNECTED;
    } else if (status.status === 'AUTHENTICATION_FAILED' || (status.statusCode === 401)) {
      health = HEALTH_STATES.INVALID_CREDENTIALS;
    } else if (status.status === 'RATE_LIMITED') {
      health = HEALTH_STATES.RATE_LIMITED;
    } else if (status.status === 'PAYMENT_REQUIRED') {
      health = HEALTH_STATES.PAYMENT_REQUIRED;
    }
    _lastHealthCheck.serpapi = { health, configured: status.configured, timestamp: Date.now(), searchesRemaining: status.searchesRemaining };
    return _lastHealthCheck.serpapi;
  } catch {
    _lastHealthCheck.serpapi = { health: _getCachedSerpapiHealth(), configured: isSerpAPIConfigured(), timestamp: Date.now() };
    return _lastHealthCheck.serpapi;
  }
}

function _getCachedSerpapiHealth() {
  try {
    const cached = getCachedSerpAPIStatus();
    if (cached.available) return HEALTH_STATES.CONNECTED;
    if (cached.status === 'AUTHENTICATION_FAILED') return HEALTH_STATES.INVALID_CREDENTIALS;
    return HEALTH_STATES.UNAVAILABLE;
  } catch {
    return HEALTH_STATES.UNAVAILABLE;
  }
}

async function checkDataForSEOHealth() {
  const cached = _lastHealthCheck.dataforseo;
  if (cached && Date.now() - cached.timestamp < _healthCacheTtl) {
    return cached;
  }
  if (!isDataForSEOConfigured()) {
    _lastHealthCheck.dataforseo = { health: HEALTH_STATES.NOT_CONFIGURED, configured: false, timestamp: Date.now() };
    return _lastHealthCheck.dataforseo;
  }
  const connStatus = getDataForSEOConnectionStatus();
  if (connStatus.connected && (connStatus.status === 'CONNECTED' || connStatus.status === 'AVAILABLE')) {
    _lastHealthCheck.dataforseo = { health: HEALTH_STATES.CONNECTED, configured: true, timestamp: Date.now() };
    return _lastHealthCheck.dataforseo;
  }
  if (connStatus.status === 'INVALID_CREDENTIALS') {
    _lastHealthCheck.dataforseo = { health: HEALTH_STATES.INVALID_CREDENTIALS, configured: true, timestamp: Date.now() };
    return _lastHealthCheck.dataforseo;
  }
  if (connStatus.status === 'PAYMENT_REQUIRED') {
    _lastHealthCheck.dataforseo = { health: HEALTH_STATES.PAYMENT_REQUIRED, configured: true, timestamp: Date.now() };
    return _lastHealthCheck.dataforseo;
  }
  if (connStatus.status === 'RATE_LIMITED') {
    _lastHealthCheck.dataforseo = { health: HEALTH_STATES.RATE_LIMITED, configured: true, timestamp: Date.now() };
    return _lastHealthCheck.dataforseo;
  }
  if (connStatus.status === 'UNVERIFIED' || connStatus.status === 'FAILED') {
    const verified = await _attemptDataForSEOReconnect();
    _lastHealthCheck.dataforseo = {
      health: verified ? HEALTH_STATES.CONNECTED : connStatus.status === 'UNVERIFIED' ? HEALTH_STATES.UNVERIFIED : HEALTH_STATES.FAILED,
      configured: true, timestamp: Date.now()
    };
    return _lastHealthCheck.dataforseo;
  }
  _lastHealthCheck.dataforseo = { health: HEALTH_STATES.UNAVAILABLE, configured: true, timestamp: Date.now() };
  return _lastHealthCheck.dataforseo;
}

async function _attemptDataForSEOReconnect() {
  try {
    const result = await verifyDataForSEO();
    return result.success === true;
  } catch {
    return false;
  }
}

export async function selectBestProviderForFeature(feature) {
  const serpapi = await checkSerpapiHealth();
  const dataforseo = await checkDataForSEOHealth();
  return _selectBestProvider(feature, serpapi, dataforseo);
}

function _selectBestProvider(feature, serpapi, dataforseo) {
  const serpapiSupports = PROVIDER_CAPABILITIES.serpapi.features[feature];
  const dataforseoSupports = PROVIDER_CAPABILITIES.dataforseo.features[feature];

  if (serpapiSupports && serpapi.health === HEALTH_STATES.CONNECTED) {
    return { provider: 'serpapi', confidence: serpapi.searchesRemaining > 100 ? 100 : 85, health: serpapi.health };
  }
  if (dataforseoSupports && dataforseo.health === HEALTH_STATES.CONNECTED) {
    return { provider: 'dataforseo', confidence: 80, health: dataforseo.health };
  }
  if (serpapiSupports && serpapi.health === HEALTH_STATES.RATE_LIMITED) {
    return { provider: 'serpapi', confidence: 40, health: serpapi.health };
  }
  if (dataforseoSupports && dataforseo.health === HEALTH_STATES.RATE_LIMITED) {
    return { provider: 'dataforseo', confidence: 40, health: dataforseo.health };
  }
  if (serpapiSupports && serpapi.health === HEALTH_STATES.PAYMENT_REQUIRED) {
    return { provider: 'serpapi', confidence: 20, health: serpapi.health };
  }
  if (dataforseoSupports && dataforseo.health === HEALTH_STATES.PAYMENT_REQUIRED) {
    return { provider: 'dataforseo', confidence: 20, health: dataforseo.health };
  }
  return { provider: null, confidence: 0, health: HEALTH_STATES.UNAVAILABLE };
}

export async function getCapabilityDrivenProviderStatus() {
  const serpapi = await checkSerpapiHealth();
  const dataforseo = await checkDataForSEOHealth();

  const availableFeatures = {};
  for (const feature of Object.values(FEATURES)) {
    const best = _selectBestProvider(feature, serpapi, dataforseo);
    if (best.provider) {
      availableFeatures[feature] = { provider: best.provider, confidence: best.confidence };
    }
  }

  const hasLiveSearch = availableFeatures[FEATURES.SERP_RESULTS] || availableFeatures[FEATURES.KEYWORD_VOLUME];
  const overallStatus = hasLiveSearch ? 'OPERATIONAL' : dataforseo.health === HEALTH_STATES.PAYMENT_REQUIRED ? 'PAYMENT_REQUIRED' : 'DEGRADED';

  return {
    overallStatus,
    serpapi,
    dataforseo,
    availableFeatures,
    featureCount: Object.keys(availableFeatures).length,
    totalFeatures: Object.values(FEATURES).length,
  };
}

export function getCachedCapabilityDrivenProviderStatus() {
  const serpapiHealth = _getCachedSerpapiHealth();
  const connStatus = getDataForSEOConnectionStatus();
  const dataforseoHealth = connStatus.connected ? HEALTH_STATES.CONNECTED : HEALTH_STATES.UNAVAILABLE;

  const dataforseo = { health: dataforseoHealth, configured: isDataForSEOConfigured() };
  const serpapi = { health: serpapiHealth, configured: isSerpAPIConfigured() };

  const availableFeatures = {};
  for (const feature of Object.values(FEATURES)) {
    const best = _selectBestProvider(feature, serpapi, dataforseo);
    if (best.provider) {
      availableFeatures[feature] = { provider: best.provider, confidence: best.confidence };
    }
  }

  return { serpapi, dataforseo, availableFeatures };
}

export { HEALTH_STATES, FEATURES };
