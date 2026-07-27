import fetch from 'node-fetch';

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI;

const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

let _tokens = null;

export function getAuthUrl(state) {
  if (!CLIENT_ID) return null;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI || 'http://localhost:5000/api/integrations/google/callback',
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES.join(' '),
    ...(state ? { state } : {})
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function getTokensFromCode(code) {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('Search Console OAuth not configured');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI || 'http://localhost:5000/api/integrations/google/callback',
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const tokens = await response.json();
  _tokens = tokens;
  return tokens;
}

export async function refreshTokens(refreshToken) {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('Search Console OAuth not configured');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const tokens = await response.json();
  _tokens = { ..._tokens, ...tokens };
  return tokens;
}

export function setCredentials(tokens) {
  _tokens = tokens;
  return true;
}

export function getSearchConsoleStatus() {
  return {
    configured: !!(CLIENT_ID && CLIENT_SECRET),
    authenticated: !!(_tokens?.access_token),
    enabled: process.env.GOOGLE_SEARCH_CONSOLE_ENABLED === 'true'
  };
}

async function getAccessToken() {
  if (!_tokens?.access_token) throw new Error('Search Console not authenticated');

  if (_tokens.expiry_date && Date.now() > _tokens.expiry_date - 60000) {
    if (_tokens.refresh_token) {
      await refreshTokens(_tokens.refresh_token);
    } else {
      throw new Error('Token expired and no refresh token available');
    }
  }

  return _tokens.access_token;
}

async function searchConsoleRequest(path, method = 'GET', body = null) {
  const token = await getAccessToken();
  const url = `https://www.googleapis.com/webmasters/v3${path}`;

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);

  if (response.status === 401) {
    if (_tokens.refresh_token) {
      await refreshTokens(_tokens.refresh_token);
      return searchConsoleRequest(path, method, body);
    }
    throw new Error('Search Console authentication failed');
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Search Console API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function listSites() {
  const data = await searchConsoleRequest('/sites');
  return data.siteEntry || [];
}

export async function verifySite(siteUrl) {
  return await searchConsoleRequest(`/sites/${encodeURIComponent(siteUrl)}`, 'PUT');
}

export async function getSiteMetrics(siteUrl, days = 28) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const formatDate = (d) => d.toISOString().split('T')[0];
  const encodedSite = encodeURIComponent(siteUrl);

  const runQuery = async (dimensions, rowLimit = 1) => {
    try {
      const data = await searchConsoleRequest(
        `/sites/${encodedSite}/searchAnalytics/query`,
        'POST',
        {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions,
          rowLimit,
          aggregationType: 'auto'
        }
      );
      return data.rows || [];
    } catch {
      return [];
    }
  };

  const [summaryRows, topQueryRows, topPageRows, countryRows, deviceRows] = await Promise.all([
    runQuery(['query'], 1),
    runQuery(['query'], 25),
    runQuery(['page'], 25),
    runQuery(['country'], 10),
    runQuery(['device'], 5)
  ]);

  const summary = summaryRows[0] || null;

  return {
    success: true,
    data: {
      clicks: summary?.clicks ?? null,
      impressions: summary?.impressions ?? null,
      ctr: summary?.ctr ?? null,
      avgPosition: summary?.avgPosition ?? null,
      topQueries: topQueryRows.map(r => ({
        query: r.keys?.[0] || '',
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.avgPosition ?? 0
      })),
      topPages: topPageRows.map(r => ({
        page: r.keys?.[0] || '',
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.avgPosition ?? 0
      })),
      countries: countryRows.map(r => ({
        country: r.keys?.[0] || '',
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.avgPosition ?? 0
      })),
      devices: deviceRows.map(r => ({
        device: r.keys?.[0] || '',
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.avgPosition ?? 0
      })),
      period: { start: formatDate(startDate), end: formatDate(endDate), days },
      source: 'Google Search Console',
      status: 'measured'
    }
  };
}
