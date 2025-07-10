module.exports = {
  // Required permissions: repo:status, read:org, read:user
  // Set GITHUB_TOKEN environment variable before running
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  ORG_NAME: 'desertcart',
  MAX_REPOS_DISPLAY: 10,
  MAX_CONTRIBUTORS_DISPLAY: 8,
  DAYS_FOR_RECENT_ACTIVITY: 7,
}
