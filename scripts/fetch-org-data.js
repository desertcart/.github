const { Octokit } = require('@octokit/rest');
const moment = require('moment');
const config = require('./config');

class GitHubOrgAnalytics {
  constructor() {
    this.octokit = new Octokit({
      auth: config.GITHUB_TOKEN
    });
    this.org = config.ORG_NAME;
  }

  async fetchOrganizationData() {
    try {
      console.log(`Fetching data for organization: ${this.org}`);
      
      const [
        orgInfo,
        repositories,
        members,
        recentActivity
      ] = await Promise.all([
        this.getOrganizationInfo(),
        this.getRepositories(),
        this.getMembers(),
        this.getRecentActivity()
      ]);

      return {
        organization: orgInfo,
        repositories: repositories,
        members: members,
        activity: recentActivity,
        metrics: this.calculateMetrics(repositories, members),
        lastUpdated: moment().utc().format('YYYY-MM-DD HH:mm UTC')
      };
    } catch (error) {
      console.error('Error fetching organization data:', error.message);
      throw error;
    }
  }

  async getOrganizationInfo() {
    const { data } = await this.octokit.rest.orgs.get({
      org: this.org
    });
    
    return {
      name: data.name || data.login,
      description: data.description,
      location: data.location,
      blog: data.blog,
      publicRepos: data.public_repos,
      followers: data.followers,
      following: data.following,
      createdAt: data.created_at
    };
  }

  async getRepositories() {
    const { data } = await this.octokit.rest.repos.listForOrg({
      org: this.org,
      type: 'all',
      sort: 'updated',
      per_page: 100
    });

    return data.map(repo => ({
      name: repo.name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      size: repo.size,
      updatedAt: repo.updated_at,
      createdAt: repo.created_at,
      private: repo.private,
      archived: repo.archived
    }));
  }

  async getMembers() {
    const { data } = await this.octokit.rest.orgs.listMembers({
      org: this.org,
      per_page: 100
    });

    return data.map(member => ({
      login: member.login,
      id: member.id,
      avatarUrl: member.avatar_url,
      type: member.type
    }));
  }

  async getRecentActivity() {
    const since = moment().subtract(config.DAYS_FOR_RECENT_ACTIVITY, 'days').toISOString();
    const activities = [];

    try {
      // Get recent releases
      const releases = await this.octokit.rest.repos.listForOrg({
        org: this.org,
        type: 'all',
        per_page: 50
      });

      for (const repo of releases.data.slice(0, 10)) {
        try {
          const { data: repoReleases } = await this.octokit.rest.repos.listReleases({
            owner: this.org,
            repo: repo.name,
            per_page: 5
          });

          repoReleases.forEach(release => {
            if (moment(release.published_at).isAfter(since)) {
              activities.push({
                type: 'release',
                repo: repo.name,
                title: release.name || release.tag_name,
                date: release.published_at,
                url: release.html_url
              });
            }
          });
        } catch (error) {
          // Skip repos we can't access
          continue;
        }
      }

      return activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.warn('Could not fetch recent activity:', error.message);
      return [];
    }
  }

  calculateMetrics(repositories, members) {
    const activeRepos = repositories.filter(repo => !repo.archived);
    const totalStars = repositories.reduce((sum, repo) => sum + repo.stars, 0);
    const totalForks = repositories.reduce((sum, repo) => sum + repo.forks, 0);
    const languages = {};
    
    repositories.forEach(repo => {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }
    });

    const topLanguages = Object.entries(languages)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    return {
      totalRepositories: repositories.length,
      activeRepositories: activeRepos.length,
      archivedRepositories: repositories.length - activeRepos.length,
      totalStars,
      totalForks,
      totalMembers: members.length,
      topLanguages,
      averageStars: Math.round(totalStars / repositories.length) || 0
    };
  }
}

module.exports = GitHubOrgAnalytics;