import https from "https";
import { logEvidenceError } from "../../utils/evidence-logger.js";

export async function collectGitHubEvidence(githubUrls) {
  const result = {
    repos: [],
    error: null,
  };

  const token = process.env.GITHUB_TOKEN || null;
  if (!token) {
    result.error = "No GITHUB_TOKEN configured";
    return result;
  }

  if (!githubUrls || githubUrls.length === 0) return result;

  const visited = new Set();
  for (const url of githubUrls) {
    const repoPath = extractRepoPath(url);
    if (!repoPath || visited.has(repoPath)) continue;
    visited.add(repoPath);

    try {
      const repoData = await fetchGitHubRepo(repoPath, token);
      if (repoData) {
        result.repos.push({
          fullName: repoData.full_name || repoPath,
          description: repoData.description || null,
          stars: repoData.stargazers_count ?? null,
          forks: repoData.forks_count ?? null,
          openIssues: repoData.open_issues_count ?? null,
          language: repoData.language || null,
          updatedAt: repoData.updated_at || null,
          latestRelease: null,
          contributorsCount: null,
        });

        const release = await fetchGitHubLatestRelease(repoPath, token);
        if (release) {
          result.repos[result.repos.length - 1].latestRelease = {
            tagName: release.tag_name || null,
            name: release.name || null,
            publishedAt: release.published_at || null,
          };
        }

        const contributors = await fetchGitHubContributors(repoPath, token);
        if (contributors != null) {
          result.repos[result.repos.length - 1].contributorsCount = contributors;
        }
      }
    } catch (err) {
      logEvidenceError("githubEvidence", url, err);
    }
  }

  return result;
}

function extractRepoPath(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;
    const parts = parsed.pathname.replace(/^\//, "").replace(/\/$/, "").split("/");
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    return null;
  } catch {
    return null;
  }
}

function githubApi(path, token) {
  return new Promise((resolve) => {
    const options = {
      hostname: "api.github.com",
      path: path,
      headers: {
        "User-Agent": "market-genesis-ai",
        "Accept": "application/vnd.github.v3+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 10000,
    };

    https.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk.toString(); });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    }).on("error", () => resolve(null))
      .on("timeout", function () { this.destroy(); resolve(null); });
  });
}

async function fetchGitHubRepo(repoPath, token) {
  const data = await githubApi(`/repos/${repoPath}`, token);
  if (data && data.id) return data;
  return null;
}

async function fetchGitHubLatestRelease(repoPath, token) {
  const data = await githubApi(`/repos/${repoPath}/releases/latest`, token);
  if (data && data.tag_name) return data;
  return null;
}

async function fetchGitHubContributors(repoPath, token) {
  const data = await githubApi(`/repos/${repoPath}/contributors?per_page=1&anon=false`, token);
  if (Array.isArray(data)) {
    return data.length;
  }
  return null;
}
