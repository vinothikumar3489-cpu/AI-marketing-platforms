/**
 * Build Information Utility
 * Provides build fingerprinting for deployment verification
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDirectory = join(__dirname, '../..');

export const CONTENT_SCHEMA_VERSION = '1.0.0';
export const CONTENT_TYPE_REGISTRY_VERSION = '1.0.0';
export const BACKEND_VERSION = '1.0.0';

/**
 * Get git commit information
 */
async function getGitInfo() {
  try {
    const { stdout: commit } = await execAsync('git rev-parse HEAD', { cwd: rootDirectory });
    const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: rootDirectory });
    const { stdout: timestamp } = await execAsync('git log -1 --format=%ct', { cwd: rootDirectory });
    
    return {
      gitCommit: commit.trim(),
      gitBranch: branch.trim(),
      buildTimestamp: new Date(parseInt(timestamp.trim()) * 1000).toISOString()
    };
  } catch (error) {
    console.warn('[Build Info] Could not retrieve git information:', error.message);
    return {
      gitCommit: process.env.APP_COMMIT_SHA || 'unknown',
      gitBranch: process.env.APP_BRANCH || 'unknown',
      buildTimestamp: process.env.BUILD_TIMESTAMP || new Date().toISOString()
    };
  }
}

/**
 * Get build information for deployment verification
 */
export async function getBuildInfo() {
  const gitInfo = await getGitInfo();
  
  return {
    ...gitInfo,
    backendVersion: BACKEND_VERSION,
    contentSchemaVersion: CONTENT_SCHEMA_VERSION,
    contentTypeRegistryVersion: CONTENT_TYPE_REGISTRY_VERSION,
    rootDirectory,
    nodeEnv: process.env.NODE_ENV || 'development'
  };
}

/**
 * Log build information on startup
 */
export async function logBuildInfo() {
  const buildInfo = await getBuildInfo();
  
  console.log('[BUILD INFO]', {
    gitCommit: buildInfo.gitCommit,
    buildTimestamp: buildInfo.buildTimestamp,
    rootDirectory: buildInfo.rootDirectory,
    nodeEnv: buildInfo.nodeEnv,
    contentSchemaVersion: buildInfo.contentSchemaVersion
  });
}

/**
 * Middleware to add build headers to responses
 */
export function buildHeadersMiddleware(req, res, next) {
  const buildInfo = {
    commit: process.env.APP_COMMIT_SHA || 'unknown',
    buildTime: process.env.BUILD_TIMESTAMP || new Date().toISOString(),
    contentSchemaVersion: CONTENT_SCHEMA_VERSION
  };
  
  res.setHeader('X-App-Commit', buildInfo.commit);
  res.setHeader('X-App-Build-Time', buildInfo.buildTime);
  res.setHeader('X-Content-Schema-Version', buildInfo.contentSchemaVersion);
  
  next();
}
