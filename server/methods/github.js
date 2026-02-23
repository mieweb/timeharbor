import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import axios from 'axios';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Build authorization headers for GitHub API requests.
 * @param {string} token - GitHub Personal Access Token
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
 * Retrieve the stored GitHub PAT for the current user.
 * Throws if not configured.
 * @param {string} userId
 * @returns {Promise<string>}
 */
async function getStoredGitHubToken(userId) {
  const user = await Meteor.users.findOneAsync(userId, {
    fields: { 'profile.githubToken': 1 }
  });
  const token = user?.profile?.githubToken;
  if (!token) {
    throw new Meteor.Error('github-not-configured', 'GitHub token not configured. Add your Personal Access Token in Profile settings.');
  }
  return token;
}

export const githubMethods = {
  /**
   * Save a GitHub Personal Access Token for the logged-in user.
   * Validates the token against the GitHub API before storing.
   */
  async saveGitHubToken(token) {
    check(token, String);
    if (!this.userId) throw new Meteor.Error('not-authorized');

    const trimmed = token.trim();
    if (!trimmed) {
      // Clear the token
      await Meteor.users.updateAsync(this.userId, {
        $unset: { 'profile.githubToken': '' }
      });
      return { cleared: true };
    }

    // Validate token by calling the GitHub user endpoint
    try {
      const res = await axios.get(`${GITHUB_API_BASE}/user`, {
        headers: buildGitHubHeaders(trimmed),
        timeout: 8000
      });
      const ghLogin = res.data?.login;
      if (!ghLogin) throw new Error('Invalid response');

      await Meteor.users.updateAsync(this.userId, {
        $set: {
          'profile.githubToken': trimmed,
          'profile.githubLogin': ghLogin
        }
      });
      return { login: ghLogin };
    } catch (err) {
      if (err.response?.status === 401) {
        throw new Meteor.Error('invalid-token', 'GitHub token is invalid or expired. Please generate a new one.');
      }
      throw new Meteor.Error('github-error', 'Failed to verify GitHub token. Please try again.');
    }
  },

  /**
   * Remove the GitHub token for the logged-in user.
   */
  async removeGitHubToken() {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    await Meteor.users.updateAsync(this.userId, {
      $unset: { 'profile.githubToken': '', 'profile.githubLogin': '' }
    });
    return true;
  },

  /**
   * Check if the current user has a GitHub token configured.
   */
  async hasGitHubToken() {
    if (!this.userId) throw new Meteor.Error('not-authorized');
    const user = await Meteor.users.findOneAsync(this.userId, {
      fields: { 'profile.githubToken': 1, 'profile.githubLogin': 1 }
    });
    return {
      configured: !!user?.profile?.githubToken,
      login: user?.profile?.githubLogin || null
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
      if (err.response?.status === 401) {
        throw new Meteor.Error('invalid-token', 'GitHub token expired. Please update it in Profile settings.');
      }
      throw new Meteor.Error('github-error', `Failed to search repositories: ${err.message}`);
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
      if (err.response?.status === 401) {
        throw new Meteor.Error('invalid-token', 'GitHub token expired. Please update it in Profile settings.');
      }
      if (err.response?.status === 404) {
        throw new Meteor.Error('not-found', `Repository ${owner}/${repo} not found or not accessible.`);
      }
      throw new Meteor.Error('github-error', `Failed to fetch issues: ${err.message}`);
    }
  }
};
