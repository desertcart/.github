const fs = require('fs').promises;
const path = require('path');
const GitHubOrgAnalytics = require('./fetch-org-data');
const config = require('./config');

class ReadmeGenerator {
  constructor() {
    this.analytics = new GitHubOrgAnalytics();
  }

  async generate() {
    try {
      console.log('🚀 Starting README generation...');
      
      // Fetch organization data
      const orgData = await this.analytics.fetchOrganizationData();
      
      // Read template
      const templatePath = path.join(__dirname, 'template.md');
      const template = await fs.readFile(templatePath, 'utf8');
      
      // Generate sections
      const sections = this.generateSections(orgData);
      
      // Replace placeholders
      let readme = template;
      Object.entries(sections).forEach(([key, value]) => {
        readme = readme.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });
      
      // Write to profile README
      const profilePath = path.join(__dirname, '..', 'profile', 'README.md');
      await fs.writeFile(profilePath, readme);
      
      console.log('✅ README generated successfully!');
      console.log(`📊 Processed ${orgData.repositories.length} repositories`);
      console.log(`👥 Found ${orgData.members.length} team members`);
      
    } catch (error) {
      console.error('❌ Error generating README:', error.message);
      process.exit(1);
    }
  }

  generateSections(data) {
    return {
      ORG_NAME: data.organization.name || config.ORG_NAME,
      ORG_DESCRIPTION: data.organization.description || '*Building amazing software together*',
      METRICS_SECTION: this.generateMetricsSection(data.metrics),
      TOP_REPOS_SECTION: this.generateTopReposSection(data.repositories),
      TEAM_SECTION: this.generateTeamSection(data.members),
      TECH_STACK_SECTION: this.generateTechStackSection(data.metrics.topLanguages),
      QUICK_STATS_SECTION: this.generateQuickStatsSection(data.metrics, data.organization),
      LAST_UPDATED: data.lastUpdated
    };
  }

  generateMetricsSection(metrics) {
    return `
<div align="center">

| 📁 Repositories | ⭐ Total Stars | 🍴 Total Forks | 👥 Team Members |
|:---------------:|:--------------:|:---------------:|:---------------:|
| **${metrics.totalRepositories}** | **${metrics.totalStars.toLocaleString()}** | **${metrics.totalForks.toLocaleString()}** | **${metrics.totalMembers}** |

</div>`;
  }

  generateTopReposSection(repositories) {
    const topRepos = repositories
      .filter(repo => !repo.archived)
      .sort((a, b) => b.stars - a.stars)
      .slice(0, config.MAX_REPOS_DISPLAY);

    if (topRepos.length === 0) {
      return '*No public repositories to display*';
    }

    let section = '| Repository | Description | Language | ⭐ Stars | 🍴 Forks |\n';
    section += '|:-----------|:------------|:---------|:--------:|:--------:|\n';
    
    topRepos.forEach(repo => {
      const description = repo.description ? 
        (repo.description.length > 50 ? repo.description.substring(0, 47) + '...' : repo.description) : 
        '*No description*';
      
      section += `| **${repo.name}** | ${description} | ${repo.language || 'N/A'} | ${repo.stars} | ${repo.forks} |\n`;
    });

    return section;
  }

  generateTeamSection(members) {
    const displayMembers = members.slice(0, config.MAX_CONTRIBUTORS_DISPLAY);
    
    let section = '<div align="center">\n\n';
    
    // Create rows of 4 members each
    for (let i = 0; i < displayMembers.length; i += 4) {
      const row = displayMembers.slice(i, i + 4);
      
      row.forEach(member => {
        section += `<a href="https://github.com/${member.login}"><img src="${member.avatarUrl}" width="60" height="60" alt="${member.login}" style="border-radius: 50%; margin: 15px; padding: 3px; border: 2px solid #f0f0f0;"></a>`;
      });
      
      section += '\n\n';
    }
    
    if (members.length > config.MAX_CONTRIBUTORS_DISPLAY) {
      section += `*...and ${members.length - config.MAX_CONTRIBUTORS_DISPLAY} more amazing team members!*\n\n`;
    }
    
    section += '</div>';
    
    return section;
  }


  generateTechStackSection(topLanguages) {
    if (topLanguages.length === 0) {
      return '*No language data available*';
    }

    const languageEmojis = {
      'JavaScript': '🟨',
      'TypeScript': '🔷',
      'Python': '🐍',
      'Java': '☕',
      'Go': '🔵',
      'Rust': '🦀',
      'C++': '⚡',
      'C#': '💜',
      'PHP': '🐘',
      'Ruby': '💎',
      'Swift': '🍎',
      'Kotlin': '🟠',
      'Dart': '🎯',
      'Shell': '🐚',
      'HTML': '🌐',
      'CSS': '🎨'
    };

    let section = '<div align="center">\n\n';
    
    topLanguages.forEach(([language, count]) => {
      const emoji = languageEmojis[language] || '📝';
      section += `${emoji} **${language}** (${count} ${count === 1 ? 'repo' : 'repos'})  `;
    });
    
    section += '\n\n</div>';
    
    return section;
  }

  generateQuickStatsSection(metrics, orgInfo) {
    const avgStars = metrics.averageStars;
    const createdYear = new Date(orgInfo.createdAt).getFullYear();
    
    return `
<div align="center">

🎯 **Average Stars per Repository:** ${avgStars}  
📅 **Organization Founded:** ${createdYear}  
🏗️ **Active Repositories:** ${metrics.activeRepositories}  
📦 **Archived Projects:** ${metrics.archivedRepositories}

</div>`;
  }
}

// Run the generator
if (require.main === module) {
  const generator = new ReadmeGenerator();
  generator.generate();
}

module.exports = ReadmeGenerator;