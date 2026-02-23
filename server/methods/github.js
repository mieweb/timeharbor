import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { WebApp } from 'meteor/webapp';
import { Random } from 'meteor/random';
import axios from 'axios';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_OAUTH_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_OAUTH_TOKEN = 'https://github.com/login/oauth/access_token';
const GITHUB_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

/**
 * Handle common GitHub API errors and throw appropriate Meteor errors.
 * @param {Error} err - The error from axios
 * @param {string} fallbackMessage - Fallback error message
 */
function handleGitHubApiError(err, fallbackMessage) {
  if (err.response?.status === 401) {
    throw new Meteor.Error('invalid-token', 'GitHub token expired. Please reconnect in Profile settings.');
  }
  if (err.response?.status === 404) {
    throw new Meteor.Error('not-found', fallbackMessage);
  }
  throw new Meteor.Error('github-error', `${fallbackMessage}: ${err.message}`);
}

/**
 * In-memory store for pending OAuth state tokens.
 * Maps state → { userId, createdAt }
 * Entries expire after 10 minutes.
 */
const pendingOAuthStates = new Map();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

/** Purge expired OAuth states (called lazily). */
function purgeExpiredStates() {
  const now = Date.now();
  for (const [state, entry] of pendingOAuthStates) {
    if (now - entry.createdAt > OAUTH_STATE_TTL_MS) {
      pendingOAuthStates.delete(state);
    }
  }
}

/**
 * Read GitHub OAuth credentials from Meteor.settings.
 * Expected in settings.json under private.github.clientId / clientSecret.
 * @returns {{ clientId: string, clientSecret: string }}
 */
function getOAuthCredentials() {
  const gh = Meteor.settings?.private?.github;
  const clientId = gh?.clientId;
  const clientSecret = gh?.clientSecret;
  if (!clientId || !clientSecret) {
    throw new Meteor.Error(
      'github-oauth-not-configured',
      'GitHub OAuth is not configured. Set private.github.clientId and private.github.clientSecret in settings.json.'
    );
  }
  return { clientId, clientSecret };
}

/**
 * Build authorization headers for GitHub API requests.
 * @param {string} token - GitHub OAuth access token
 * @returns {Object} Headers object
 */
function buildGitHubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'TimeHarbor-App'
  };
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Retrieve the stored GitHub OAuth token for the current user.
 * Throws if not configured.
 * @param {string} userId
 * @returns {Promise<string>}
 */
async function getStoredGitHubToken(userId) {
  const user = await Meteor.users.findOneAsync(userId, {
    fields: { 'githubAuth.token': 1 }
  });
  const token = user?.githubAuth?.token;
  if (!token) {
    throw new Meteor.Error('github-not-configured', 'GitHub not connected. Connect via OAuth in Profile settings.');
  }
  return token;
}

/**
 * Render a minimal HTML page that posts a message to the opener and closes.
 * @param {string} status - 'success' or 'error'
 * @param {string} message - Display message
 * @param {Object} [data] - Additional data to pass
 * @returns {string} HTML page string
 */
/** Cached OAuth result HTML template (loaded once from private/templates/). */
const [oauthResultHtml, oauthResultCss] = await Promise.all([
  Assets.getTextAsync('templates/github-oauth-result.html'),
  Assets.getTextAsync('templates/github-oauth-result.css'),
]);
const oauthResultTemplate = oauthResultHtml.replace('{{STYLES}}', oauthResultCss);

function renderOAuthResultPage(status, message, data = {}) {
  // Escape </script> sequences in JSON to prevent breaking out of the script block
  const payload = JSON.stringify({ type: 'github-oauth-result', status, message, ...data })
    .replace(/</g, '\\u003c');
  const origin = JSON.stringify(Meteor.absoluteUrl()).replace(/</g, '\\u003c');

  return oauthResultTemplate
    .replace('{{STATUS_CLASS}}', escapeHtml(status))
    .replace('{{STATUS_HEADING}}', escapeHtml(status === 'success' ? 'Connected!' : 'Error'))
    .replace('{{MESSAGE}}', escapeHtml(message))
    .replace('{{PAYLOAD}}', payload)
    .replace('{{ORIGIN}}', origin);
}

/* ------------------------------------------------------------------ */
/*  GitHub OAuth callback — handles GET /api/github/callback          */
/* ------------------------------------------------------------------ */
WebApp.connectHandlers.use('/api/github/callback', async (req, res) => {
  try {
    const url = new URL(req.url, Meteor.absoluteUrl());
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(renderOAuthResultPage('error', 'Missing code or state parameter.'));
      return;
    }

    purgeExpiredStates();
    const pending = pendingOAuthStates.get(state);
    if (!pending) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(renderOAuthResultPage('error', 'Invalid or expired OAuth state. Please try again.'));
      return;
    }
    pendingOAuthStates.delete(state);

    const { clientId, clientSecret } = getOAuthCredentials();

    // Exchange code for access token
    const tokenRes = await axios.post(GITHUB_OAUTH_TOKEN, {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      state
    }, {
      headers: { Accept: 'application/json' },
      timeout: 10000
    });

    const accessToken = tokenRes.data?.access_token;
    if (!accessToken) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(renderOAuthResultPage('error', 'Failed to obtain access token from GitHub.'));
      return;
    }

    // Fetch the GitHub user profile
    const userRes = await axios.get(`${GITHUB_API_BASE}/user`, {
      headers: buildGitHubHeaders(accessToken),
      timeout: 8000
    });
    const ghLogin = userRes.data?.login;
    if (!ghLogin) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(renderOAuthResultPage('error', 'Could not retrieve GitHub username.'));
      return;
    }

    // Store the token in a private field (not under `profile` to avoid leaking via publications)
    await Meteor.users.updateAsync(pending.userId, {
      $set: {
        'githubAuth.token': accessToken,
        'githubAuth.login': ghLogin
      }
    });

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(renderOAuthResultPage('success', `Connected as ${ghLogin}`, { login: ghLogin }));
  } catch (err) {
    console.error('GitHub OAuth callback error:', err);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(renderOAuthResultPage('error', 'An unexpected error occurred. Please try again.'));
  }
});

export const githubMethods = {
  /**
   * Start the GitHub OAuth flow.
   * Returns the authorization URL to open in a popup.
   */
  async startGitHubOAuth() {
    if (!this.userId) throw new Meteor.Error('not-authorized');

    const { clientId } = getOAuthCredentials();
    const state = Random.secret(32);

    purgeExpiredStates();
    pendingOAuthStates.set(state, { userId: this.userId, createdAt: Date.now() });

    const callbackUrl = Meteor.absoluteUrl('api/github/callback');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'repo',
      state
    });

    return { url: `${GITHUB_OAUTH_AUTHORIZE}?${params.toString()}` };
  },

  /**
   * Remove the GitHub OAuth token for the logged-in user.
   */
  async removeGitHubToken() {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    await Meteor.users.updateAsync(this.userId, {
      $unset: { 'githubAuth': '' }
    });
    return true;
  },

  /**
   * Check if the current user has a GitHub token configured.
   */
  async hasGitHubToken() {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    const user = await Meteor.users.findOneAsync(this.userId, {
      fields: { 'githubAuth.token': 1, 'githubAuth.login': 1 }
    });
    return {
      configured: !!user?.githubAuth?.token,
      login: user?.githubAuth?.login || null
    };
  },

  /**
   * Search repositories the user has access to.
   * @param {string} query - Search string for repository name
   */
  async searchGitHubRepos(query) {
    check(query, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');

    const token = await getStoredGitHubToken(this.userId);
    const trimmed = query.trim();

    try {
      let url;
      let params;

      if (trimmed) {
        // Use the search API when there's a query
        url = `${GITHUB_API_BASE}/search/repositories`;
        params = {
          q: `${trimmed} in:name`,
          sort: 'updated',
          order: 'desc',
          per_page: 20
        };
      } else {
        // List user's repos when no query
        url = `${GITHUB_API_BASE}/user/repos`;
        params = {
          sort: 'updated',
          direction: 'desc',
          per_page: 20,
          type: 'all'
        };
      }

      const res = await axios.get(url, {
        headers: buildGitHubHeaders(token),
        params,
        timeout: 10000
      });

      const repos = trimmed ? (res.data?.items || []) : (res.data || []);
      return repos.map(repo => ({
        id: repo.id,
        fullName: repo.full_name,
        name: repo.name,
        owner: repo.owner?.login || '',
        description: repo.description || '',
        isPrivate: repo.private,
        openIssuesCount: repo.open_issues_count || 0,
        updatedAt: repo.updated_at
      }));
    } catch (err) {
      handleGitHubApiError(err, 'Failed to search repositories');
    }
  },

  /**
   * List issues for a given repository.
   * @param {string} owner - Repository owner
   * @param {string} repo  - Repository name
   * @param {Object} options - Filter options (state, query, page)
   */
  async getGitHubIssues(owner, repo, options) {
    check(owner, String);
    check(repo, String);
    check(options, Match.Maybe(Match.ObjectIncluding({
      state: Match.Maybe(String),
      query: Match.Maybe(String),
      page: Match.Maybe(Number)
    })));
    if (!this.userId) throw new Meteor.Error('not-authorized');
    if (!GITHUB_NAME_PATTERN.test(owner) || !GITHUB_NAME_PATTERN.test(repo)) {
      throw new Meteor.Error('invalid-input', 'Invalid repository owner or name.');
    }

    const token = await getStoredGitHubToken(this.userId);
    const state = options?.state || 'open';
    const searchQuery = (options?.query || '').trim();
    const page = options?.page || 1;

    try {
      let url;
      let params;

      if (searchQuery) {
        // Use search API for filtering by text
        url = `${GITHUB_API_BASE}/search/issues`;
        params = {
          q: `${searchQuery} repo:${owner}/${repo} is:issue state:${state}`,
          sort: 'updated',
          order: 'desc',
          per_page: 25,
          page
        };
      } else {
        // List issues directly
        url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues`;
        params = {
          state,
          sort: 'updated',
          direction: 'desc',
          per_page: 25,
          page
        };
      }

      const res = await axios.get(url, {
        headers: buildGitHubHeaders(token),
        params,
        timeout: 10000
      });

      const issues = searchQuery ? (res.data?.items || []) : (res.data || []);
      // Filter out pull requests (GitHub API returns PRs mixed with issues)
      return issues
        .filter(issue => !issue.pull_request)
        .map(issue => ({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          url: issue.html_url,
          labels: (issue.labels || []).map(l => ({ name: l.name, color: l.color })),
          assignee: issue.assignee?.login || null,
          createdAt: issue.created_at,
          updatedAt: issue.updated_at
        }));
    } catch (err) {
      handleGitHubApiError(err, `Repository ${owner}/${repo} not found or not accessible`);
    }
  }
};
